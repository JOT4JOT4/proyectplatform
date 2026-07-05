import React from 'react';
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
