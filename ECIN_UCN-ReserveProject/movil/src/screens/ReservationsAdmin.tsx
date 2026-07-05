import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, Modal, StyleSheet, ScrollView, TextInput, Pressable } from 'react-native';
import dayjs from 'dayjs';
import { apiGet, apiPatch, apiPost, apiDelete, ApiError } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import type { ReservationRecord, BackendUser, UserPenalty, UserWarning } from '../services/apiTypes';

const IMMINENT_WINDOW_MINUTES = 20;

function toReservationMoment(reservation: ReservationRecord) {
  return dayjs(`${reservation.date}T${reservation.startTime}`);
}

function getStatusLabel(status: ReservationRecord['status']) {
  switch (status) {
    case 'active':
      return 'Activa';
    case 'pending':
      return 'Pendiente';
    case 'cancelled':
      return 'Cancelada';
    case 'completed':
      return 'Completada';
    default:
      return status;
  }
}

export default function ReservationsAdmin() {
  const { token } = useAuth();
  const [reservations, setReservations] = React.useState<ReservationRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedUser, setSelectedUser] = React.useState<BackendUser | null>(null);
  const [selectedReservations, setSelectedReservations] = React.useState<ReservationRecord[]>([]);
  const [selectedPenalties, setSelectedPenalties] = React.useState<UserPenalty[]>([]);
  const [selectedWarnings, setSelectedWarnings] = React.useState<UserWarning[]>([]);
  const [showUserModal, setShowUserModal] = React.useState(false);
  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [cancelTarget, setCancelTarget] = React.useState<ReservationRecord | null>(null);
  const [cancelReason, setCancelReason] = React.useState('');
  const [weeklyLimit, setWeeklyLimit] = React.useState('');

  const loadReservations = React.useCallback(async () => {
    const data = await apiGet<ReservationRecord[]>('/reservations', token);
    const ordered = [...data].sort((left, right) => toReservationMoment(left).valueOf() - toReservationMoment(right).valueOf());
    setReservations(ordered);
  }, [token]);

  React.useEffect(() => {
    let active = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        await loadReservations();
      } catch (requestError) {
        if (active) {
          const message = requestError instanceof ApiError ? requestError.message : 'No se pudieron cargar las reservas.';
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [loadReservations]);

  const refreshUserPanel = React.useCallback(async (userId: string) => {
    const [history, penalties, warnings, users] = await Promise.all([
      apiGet<ReservationRecord[]>(`/reservations/user/${userId}`, token),
      apiGet<UserPenalty[]>(`/users/${userId}/penalties`, token),
      apiGet<UserWarning[]>(`/users/${userId}/warnings`, token),
      apiGet<BackendUser[]>(`/users`, token),
    ]);

    const user = users.find((item) => item.id === userId) ?? null;
    setSelectedUser(user);
    setSelectedReservations(history.sort((left, right) => toReservationMoment(left).valueOf() - toReservationMoment(right).valueOf()));
    setSelectedPenalties(penalties);
    setSelectedWarnings(warnings);
    setWeeklyLimit(user?.maxWeeklyReservations !== null && user?.maxWeeklyReservations !== undefined ? String(user.maxWeeklyReservations) : '');
    setShowUserModal(true);
  }, [token]);

  const openUserHistory = async (userId?: string) => {
    if (!userId) {
      return;
    }

    try {
      setLoading(true);
      await refreshUserPanel(userId);
    } catch (requestError) {
      Alert.alert('Error', requestError instanceof ApiError ? requestError.message : 'No se pudo cargar el historial del usuario');
    } finally {
      setLoading(false);
    }
  };

  const openCancelModal = (reservation: ReservationRecord) => {
    setCancelTarget(reservation);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const cancelReservation = async () => {
    if (!cancelTarget) {
      return;
    }

    const reason = cancelReason.trim();

    if (!reason) {
      Alert.alert('Falta el motivo', 'Debes indicar un motivo para cancelar la reserva.');
      return;
    }

    try {
      setLoading(true);
      await apiPatch(`/reservations/${cancelTarget.id}/cancel`, { reason }, token);
      setShowCancelModal(false);
      setCancelTarget(null);
      setCancelReason('');
      await loadReservations();

      if (showUserModal && selectedUser?.id) {
        await refreshUserPanel(selectedUser.id);
      }
    } catch (requestError) {
      Alert.alert('Error', requestError instanceof ApiError ? requestError.message : 'No se pudo cancelar la reserva');
    } finally {
      setLoading(false);
    }
  };

  const updateWeeklyLimit = async () => {
    if (!selectedUser) {
      return;
    }

    const parsedLimit = weeklyLimit.trim() === '' ? null : Number.parseInt(weeklyLimit, 10);

    if (parsedLimit !== null && Number.isNaN(parsedLimit)) {
      Alert.alert('Dato inválido', 'El límite semanal debe ser un número válido o vacío para quitar el límite.');
      return;
    }

    try {
      setLoading(true);
      await apiPatch(`/users/${selectedUser.id}/weekly-limit`, { maxWeeklyReservations: parsedLimit }, token);
      Alert.alert('Límite actualizado');
      await refreshUserPanel(selectedUser.id);
    } catch (requestError) {
      Alert.alert('Error', requestError instanceof ApiError ? requestError.message : 'No se pudo actualizar el límite');
    } finally {
      setLoading(false);
    }
  };

  const blockUser = async () => {
    if (!selectedUser) {
      return;
    }

    try {
      setLoading(true);
      const today = dayjs().format('YYYY-MM-DD');
      await apiPost(`/users/${selectedUser.id}/penalties`, {
        startDate: today,
        endDate: today,
        reason: 'Bloqueo administrativo',
      }, token);
      Alert.alert('Usuario bloqueado');
      await refreshUserPanel(selectedUser.id);
    } catch (requestError) {
      Alert.alert('Error', requestError instanceof ApiError ? requestError.message : 'No se pudo bloquear al usuario');
    } finally {
      setLoading(false);
    }
  };

  const unblockPenalty = async (penaltyId: string) => {
    if (!selectedUser) {
      return;
    }

    try {
      setLoading(true);
      await apiDelete(`/users/${selectedUser.id}/penalties/${penaltyId}`, token);
      Alert.alert('Usuario desbloqueado');
      await refreshUserPanel(selectedUser.id);
    } catch (requestError) {
      Alert.alert('Error', requestError instanceof ApiError ? requestError.message : 'No se pudo desbloquear al usuario');
    } finally {
      setLoading(false);
    }
  };

  const imminentThreshold = dayjs().add(IMMINENT_WINDOW_MINUTES, 'minute');

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Reservas actuales</Text>
      <Text style={styles.subheader}>Las reservas se ordenan por cercanía para identificar qué sala debes abrir primero.</Text>

      {loading ? <Text style={styles.note}>Cargando...</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={reservations}
        keyExtractor={(reservation) => reservation.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const reservationMoment = toReservationMoment(item);
          const isImminent = reservationMoment.isAfter(dayjs()) && reservationMoment.isBefore(imminentThreshold);
          const isPastDue = reservationMoment.isBefore(dayjs()) && item.status !== 'completed' && item.status !== 'cancelled';

          return (
            <View style={[styles.card, isImminent && styles.cardImminent, isPastDue && styles.cardPastDue]}>
              <View style={styles.cardTopRow}>
                <View style={styles.cardTitleWrap}>
                  <Text style={styles.cardTitle}>{index + 1}. {item.space?.name ?? 'Espacio desconocido'}</Text>
                  <Text style={styles.cardMeta}>{item.date} • {item.startTime} - {item.endTime}</Text>
                </View>
                <View style={[styles.statusBadge, item.status === 'active' ? styles.statusActive : item.status === 'pending' ? styles.statusPending : styles.statusNeutral]}>
                  <Text style={styles.statusBadgeText}>{getStatusLabel(item.status)}</Text>
                </View>
              </View>

              <Text style={styles.userLine}>
                Usuario: {item.user?.firstName ?? ''} {item.user?.lastName ?? ''} ({item.user?.email ?? 'Sin email'})
              </Text>

              <Text style={styles.detailLine}>Bloque reservado: {item.startTime} - {item.endTime}</Text>

              {isImminent ? <Text style={styles.imminentText}>Abre esta sala ahora: inicia en menos de 20 minutos.</Text> : null}
              {isPastDue ? <Text style={styles.pastDueText}>Este horario ya pasó y sigue pendiente de cierre.</Text> : null}

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.secondaryAction} onPress={() => openUserHistory(item.user?.id)}>
                  <Text style={styles.secondaryActionText}>Ver historial</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dangerAction} onPress={() => openCancelModal(item)}>
                  <Text style={styles.dangerActionText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={showCancelModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancelar reserva</Text>
            <Text style={styles.modalSubtitle}>
              {cancelTarget?.space?.name ?? 'Espacio desconocido'} • {cancelTarget?.date} • {cancelTarget?.startTime} - {cancelTarget?.endTime}
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Motivo de cancelación"
              value={cancelReason}
              onChangeText={setCancelReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowCancelModal(false)}>
                <Text style={styles.secondaryButtonText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={cancelReservation}>
                <Text style={styles.primaryButtonText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showUserModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.userModalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Historial del usuario</Text>
              <Text style={styles.modalSubtitle}>
                {selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName} • ${selectedUser.email}` : 'Sin usuario seleccionado'}
              </Text>

              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>Límite semanal</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. 3"
                  value={weeklyLimit}
                  onChangeText={setWeeklyLimit}
                  keyboardType="numeric"
                />
                <TouchableOpacity style={styles.primaryButton} onPress={updateWeeklyLimit}>
                  <Text style={styles.primaryButtonText}>Guardar límite</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.sectionBox}>
                <Text style={styles.sectionTitle}>Acciones de cuenta</Text>
                <TouchableOpacity style={styles.secondaryAction} onPress={blockUser}>
                  <Text style={styles.secondaryActionText}>Bloquear usuario</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionTitle}>Reservas del usuario</Text>
              {selectedReservations.map((reservation) => (
                <View key={reservation.id} style={styles.historyItem}>
                  <Text style={styles.historyItemTitle}>{reservation.space?.name ?? 'Espacio'}</Text>
                  <Text style={styles.historyItemMeta}>{reservation.date} • {reservation.startTime} - {reservation.endTime}</Text>
                  <Text style={styles.historyItemMeta}>Estado: {getStatusLabel(reservation.status)}</Text>
                </View>
              ))}

              <Text style={styles.sectionTitle}>Penalizaciones activas</Text>
              {selectedPenalties.map((penalty) => (
                <View key={penalty.id} style={styles.historyItem}>
                  <Text style={styles.historyItemTitle}>{penalty.reason}</Text>
                  <Text style={styles.historyItemMeta}>{penalty.startDate} - {penalty.endDate}</Text>
                  <TouchableOpacity style={styles.dangerAction} onPress={() => unblockPenalty(penalty.id)}>
                    <Text style={styles.dangerActionText}>Desbloquear</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <Text style={styles.sectionTitle}>Advertencias</Text>
              {selectedWarnings.map((warning) => (
                <View key={warning.id} style={styles.historyItem}>
                  <Text style={styles.historyItemTitle}>{warning.reason}</Text>
                  <Text style={styles.historyItemMeta}>{warning.date}</Text>
                </View>
              ))}

              <TouchableOpacity style={styles.closeButton} onPress={() => setShowUserModal(false)}>
                <Text style={styles.closeButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  header: {
    color: '#003057',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  subheader: {
    color: '#3D4B63',
    marginBottom: 14,
  },
  note: {
    color: '#3D4B63',
    marginBottom: 10,
  },
  errorText: {
    color: '#b42318',
    marginBottom: 10,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#003057',
    marginBottom: 12,
  },
  cardImminent: {
    backgroundColor: '#0f7a3e',
  },
  cardPastDue: {
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardMeta: {
    color: '#CFE4FF',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusActive: {
    backgroundColor: '#14532d',
  },
  statusPending: {
    backgroundColor: '#b45309',
  },
  statusNeutral: {
    backgroundColor: '#475569',
  },
  statusBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  userLine: {
    color: '#fff',
    marginTop: 10,
    fontWeight: '700',
  },
  detailLine: {
    color: '#fff',
    marginTop: 6,
    fontWeight: '700',
  },
  imminentText: {
    color: '#dcfce7',
    marginTop: 8,
    fontWeight: '800',
  },
  pastDueText: {
    color: '#fde68a',
    marginTop: 8,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  secondaryAction: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#E6EEF8',
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryActionText: {
    color: '#003057',
    fontWeight: '800',
  },
  dangerAction: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#FEE4E2',
    paddingVertical: 10,
    alignItems: 'center',
  },
  dangerActionText: {
    color: '#b42318',
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
  },
  userModalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    maxHeight: '90%',
  },
  modalTitle: {
    color: '#081026',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalSubtitle: {
    color: '#3D4B63',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#D9E3F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
    color: '#081026',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D9E3F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 10,
    color: '#081026',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#0059e9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0059e9',
    fontWeight: '700',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#0059e9',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  sectionBox: {
    backgroundColor: '#F5F8FC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#081026',
    fontWeight: '800',
    marginBottom: 10,
    marginTop: 4,
  },
  historyItem: {
    backgroundColor: '#F5F8FC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  historyItemTitle: {
    color: '#081026',
    fontWeight: '800',
    marginBottom: 4,
  },
  historyItemMeta: {
    color: '#3D4B63',
    marginBottom: 4,
  },
  closeButton: {
    borderRadius: 14,
    backgroundColor: '#003057',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
});import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, Modal, StyleSheet } from 'react-native';
import { apiGet, apiPatch, apiPost, ApiError } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import type { ReservationRecord } from '../services/apiTypes';

export default function ReservationsAdmin() {
  const { token } = useAuth();
  const [reservations, setReservations] = React.useState<ReservationRecord[]>([]);
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [userReservations, setUserReservations] = React.useState<ReservationRecord[]>([]);
  const [showUserModal, setShowUserModal] = React.useState(false);

  const loadReservations = async () => {
    const data = await apiGet<ReservationRecord[]>('/reservations', token);
    setReservations(data);
  };

  React.useEffect(() => { loadReservations(); }, []);

  const cancelReservation = async (id: string) => {
    try {
      await apiPatch(`/reservations/${id}/cancel`, { reason: 'Cancelación admin' }, token);
      await loadReservations();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo cancelar');
    }
  };

  const openUserHistory = async (userId: string) => {
    try {
      const data = await apiGet<ReservationRecord[]>(`/reservations/user/${userId}`, token);
      setUserReservations(data);
      setSelectedUserId(userId);
      setShowUserModal(true);
    } catch (err) {
      Alert.alert('Error', 'No se pudo cargar el historial del usuario');
    }
  };

  const blockUser = async () => {
    if (!selectedUserId) return;
    await apiPost(`/users/${selectedUserId}/penalties`, {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      reason: 'Bloqueo administrativo'
    }, token);
    Alert.alert('Usuario bloqueado');
  };

  const setWeeklyLimit = async (limit: number) => {
    if (!selectedUserId) return;
    await apiPatch(`/users/${selectedUserId}/weekly-limit`, { maxWeeklyReservations: limit }, token);
    Alert.alert('Límite semanal actualizado');
  };

  return (
    <View>
      <FlatList
        data={reservations}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.space?.name ?? 'Espacio desconocido'} - {item.date}</Text>
            <TouchableOpacity onPress={() => item.user?.id && openUserHistory(item.user.id)}>
              <Text style={styles.userLink}>
                Usuario: {item.user?.firstName ?? ''} {item.user?.lastName ?? ''} ({item.user?.email ?? 'Sin email'})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => cancelReservation(item.id)}>
              <Text>Cancelar reserva</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={showUserModal} transparent animationType="slide">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Historial del usuario</Text>
          <FlatList
            data={userReservations}
            keyExtractor={(r) => r.id}
            renderItem={({ item }) => (
              <Text>{item.date} - {item.space?.name ?? 'Espacio'}</Text>
            )}
          />
          <TouchableOpacity onPress={() => setWeeklyLimit(3)}>
            <Text>Limitar a 3 reservas/semana</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={blockUser}>
            <Text>Bloquear usuario</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowUserModal(false)}>
            <Text>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, backgroundColor: '#eee', marginBottom: 8 },
  userLink: { color: '#0059e9', fontWeight: '700' },
  modal: { flex: 1, backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', marginBottom: 12 }
});
