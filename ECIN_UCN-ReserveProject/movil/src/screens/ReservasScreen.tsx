import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPost, ApiError } from '../services/apiClient';
import { Alert } from 'react-native';
import type { Reserva } from '../services/apiTypes';
import DateTimePicker from 'react-native-ui-datepicker';
import dayjs from 'dayjs';

// Map backend response to Reserva type
interface BackendReservation {
  id: string;
  spaceTitle: string;
  spaceDescription?: string;
  reservationDate: string;
  reservationSlot: string;
  area?: string | null;
  tipo?: string | null;
  space?: Record<string, any>;
}

const mapBackendToReserva = (backend: BackendReservation): Reserva => ({
  id: backend.id,
  title: backend.spaceTitle,
  details: backend.spaceDescription || '',
  description: backend.spaceDescription,
  date: backend.reservationDate,
  slot: backend.reservationSlot,
  area: backend.area ?? undefined,
  tipo: backend.tipo ?? undefined,
});

export default function ReservasScreen() {
  const { token } = useAuth();
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<Reserva[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reservationTarget, setReservationTarget] = React.useState<Reserva | null>(null);
  const [showReserveModal, setShowReserveModal] = React.useState(false);
  // filter state
  const [selectedSlot, setSelectedSlot] = React.useState<string | null>(null);
  const [selectedArea, setSelectedArea] = React.useState<string | null>(null);
  const [selectedTipo, setSelectedTipo] = React.useState<string | null>(null);

  const [showDateModal, setShowDateModal] = React.useState(false);
  const [showSlotModal, setShowSlotModal] = React.useState(false);
  const [showAreaModal, setShowAreaModal] = React.useState(false);
  const [showTipoModal, setShowTipoModal] = React.useState(false);
  // date picker state
  const [date, setDate] = React.useState(dayjs());
  const selectedDate = React.useMemo(() => date.format('YYYY-MM-DD'), [date]);

  const timeSlots = [
    { code: 'A', label: 'A 08:10 - 09:40' },
    { code: 'B', label: 'B 09:55 - 11:25' },
    { code: 'C', label: 'C 11:40 - 13:10' },
    { code: 'C2', label: 'C2 13:10 - 14:30' },
    { code: 'D', label: 'D 14:30 - 16:00' },
    { code: 'E', label: 'E 16:15 - 17:45' },
    { code: 'F', label: 'F 18:00 - 19:30' },
    { code: 'G', label: 'G 19:45 - 21:15' },
    { code: 'H', label: 'H 21:30 - 23:00' },
  ];

  const uniqueDates = React.useMemo(() => {
    const s = new Set<string>();
    items.forEach((r) => r.date && s.add(r.date));
    return Array.from(s).sort();
  }, [items]);

  const uniqueAreas = React.useMemo(() => {
    const s = new Set<string>();
    items.forEach((r) => r.area && s.add(r.area));
    return Array.from(s).sort();
  }, [items]);

  const uniqueTipos = React.useMemo(() => {
    const s = new Set<string>();
    items.forEach((r) => r.tipo && s.add(r.tipo));
    return Array.from(s).sort();
  }, [items]);

  const toggle = (id: string) => setExpanded((s) => (s === id ? null : id));

  const loadReservations = React.useCallback(async () => {
    try {
      const data = await apiGet<BackendReservation[]>('/reservas', token);

      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapBackendToReserva);
        setItems(mapped);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error loading reservations:', err);
      throw err;
    }
  }, [token]);

  const handleReserve = (item: Reserva) => {
    setReservationTarget(item);
    setShowReserveModal(true);
  };

  const buildReservationPayload = React.useCallback((item: Reserva) => {
    const parentSpace = items.find((space) => space.children?.some((child) => child.id === item.id)) ?? null;

    return {
      reservationDate: item.date ?? selectedDate,
      reservationSlot: item.slot ?? selectedSlot,
      space: {
        id: item.id,
        title: item.title,
        description: item.description ?? item.details,
        area: item.area ?? null,
        tipo: item.tipo ?? null,
        isSubspace: Boolean(parentSpace),
        parentSpaceId: parentSpace?.id ?? null,
        parentSpaceTitle: parentSpace?.title ?? null,
      },
      filtersApplied: {
        date: selectedDate,
        slot: selectedSlot,
        area: selectedArea,
        tipo: selectedTipo,
      },
      requestedAt: dayjs().toISOString(),
    };
  }, [items, selectedArea, selectedDate, selectedSlot, selectedTipo]);

  const handleConfirmReservation = async () => {
    if (!reservationTarget) return;

    const payload = buildReservationPayload(reservationTarget);
    try {
      setIsLoading(true);
      const created = await apiPost<BackendReservation | unknown>('/reservas', payload, token);

      let createdReserva: Reserva;
      
      if (created && typeof created === 'object' && 'id' in created) {
        createdReserva = mapBackendToReserva(created as BackendReservation);
      } else {
        createdReserva = {
          ...reservationTarget,
          id: `local-${Date.now()}`,
          date: payload.reservationDate,
          slot: payload.reservationSlot ?? undefined,
          area: payload.space.area ?? undefined,
          tipo: payload.space.tipo ?? undefined,
          description: payload.space.description ?? reservationTarget.description ?? reservationTarget.details,
        };
      }

      setItems((current) => [createdReserva, ...current]);
      setShowReserveModal(false);
      setReservationTarget(null);
      Alert.alert('Reserva creada', 'Tu reserva se ha enviado correctamente.');

      void loadReservations();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Error al crear la reserva.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    let active = true;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const hadRemoteData = await loadReservations();

        if (active && !hadRemoteData) {
          setError('No hay reservas disponibles en el servidor.');
          setItems([]);
        }
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.status === 404) {
          return;
        }

        if (active) {
          setError('No se puede encontrar reservas');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [loadReservations, token]);

  // derived filtered items
  const filtered = React.useMemo(() => {
    return items.filter((it) => {
      if (selectedDate && it.date !== selectedDate) return false;
      if (selectedSlot && it.slot !== selectedSlot) return false;
      if (selectedArea && it.area !== selectedArea) return false;
      if (selectedTipo && it.tipo !== selectedTipo) return false;
      return true;
    });
  }, [items, selectedDate, selectedSlot, selectedArea, selectedTipo]);

  const reservePreview = React.useMemo(() => (reservationTarget ? buildReservationPayload(reservationTarget) : null), [reservationTarget, buildReservationPayload]);

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <Text style={styles.header}>Reservas disponibles</Text>
      {isLoading ? <Text style={styles.note}>Cargando reservas autenticadas...</Text> : null}
      {error ? <Text style={styles.note}>{error}</Text> : null}

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowDateModal(true)}>
          <Text style={styles.filterText}>{selectedDate ?? 'Fecha'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowSlotModal(true)}>
          <Text style={styles.filterText}>{selectedSlot ?? 'Bloque'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowAreaModal(true)}>
          <Text style={styles.filterText}>{selectedArea ?? 'Area'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowTipoModal(true)}>
          <Text style={styles.filterText}>{selectedTipo ?? 'Tipo'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearButton} onPress={() => { setDate(dayjs()); setSelectedSlot(null); setSelectedArea(null); setSelectedTipo(null); }}>
          <Text style={styles.clearText}>Limpiar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => toggle(item.id)}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardMeta}>{item.date ?? ''} {item.slot ? `• ${item.slot}` : ''} {item.area ? `• ${item.area}` : ''}</Text>
              <Text style={styles.cardDescription}>{item.description ?? item.details}</Text>
            </TouchableOpacity>

            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.reserveButton} onPress={() => handleReserve(item)}>
                <Text style={styles.reserveButtonText}>Reservar</Text>
              </TouchableOpacity>
            </View>

            {expanded === item.id ? (
              <View style={styles.childrenWrap}>
                <Text style={styles.childrenTitle}>Subespacios</Text>
                {(item.children ?? []).length > 0 ? (
                  item.children?.map((child) => (
                    <View key={child.id} style={styles.childCard}>
                      <Text style={styles.childTitle}>{child.title}</Text>
                      <Text style={styles.childMeta}>{child.date ?? ''} {child.slot ? `• ${child.slot}` : ''} {child.tipo ? `• ${child.tipo}` : ''}</Text>
                      <Text style={styles.childDescription}>{child.description ?? child.details}</Text>
                      <TouchableOpacity style={styles.childReserveButton} onPress={() => handleReserve(child)}>
                        <Text style={styles.childReserveButtonText}>Reservar</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                ) : (
                  <Text style={styles.childEmpty}>Este espacio no tiene subespacios reservables.</Text>
                )}
              </View>
            ) : null}
          </View>
        )}
      />

      {/* Modals */}
      <Modal visible={showDateModal} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Selecciona fecha</Text>
            <Text style={styles.availableDatesLabel}>Disponibles: {uniqueDates.join(' • ')}</Text>

            <DateTimePicker
              mode="single"
              date={date.toDate()}
              onChange={(params) => {
                if (params?.date) {
                  setDate(dayjs(params.date));
                }
              }}
            />
            <Pressable
              onPress={() => setShowDateModal(false)}
              style={styles.dateConfirmButton}
            >
              <Text style={styles.dateConfirmText}>Usar fecha</Text>
            </Pressable>
            <Pressable onPress={() => setShowDateModal(false)} style={styles.modalClose}><Text>Cerrar</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showSlotModal} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Selecciona horario</Text>
            <FlatList data={timeSlots} keyExtractor={(s) => s.code} renderItem={({ item }) => (
              <Pressable onPress={() => { setSelectedSlot(item.code); setShowSlotModal(false); }} style={styles.modalRow}>
                <Text>{item.label}</Text>
              </Pressable>
            )} />
            <Pressable onPress={() => setShowSlotModal(false)} style={styles.modalClose}><Text>Cerrar</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showAreaModal} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Selecciona área</Text>
            <FlatList data={uniqueAreas} keyExtractor={(s) => s} renderItem={({ item }) => (
              <Pressable onPress={() => { setSelectedArea(item); setShowAreaModal(false); }} style={styles.modalRow}>
                <Text>{item}</Text>
              </Pressable>
            )} />
            <Pressable onPress={() => setShowAreaModal(false)} style={styles.modalClose}><Text>Cerrar</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showTipoModal} animationType="slide" transparent>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Selecciona tipo</Text>
            <FlatList data={uniqueTipos} keyExtractor={(s) => s} renderItem={({ item }) => (
              <Pressable onPress={() => { setSelectedTipo(item); setShowTipoModal(false); }} style={styles.modalRow}>
                <Text>{item}</Text>
              </Pressable>
            )} />
            <Pressable onPress={() => setShowTipoModal(false)} style={styles.modalClose}><Text>Cerrar</Text></Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showReserveModal} animationType="fade" transparent>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Confirmar reserva</Text>
            <Text style={styles.reserveSummaryTitle}>{reservationTarget?.title ?? 'Sin selección'}</Text>
            <Text style={styles.reserveSummaryText}>{reservationTarget?.description ?? reservationTarget?.details}</Text>

            <View style={styles.summaryBox}>
              <Text style={styles.payloadLabel}>Resumen de reserva</Text>
              <Text style={styles.summaryLine}>Fecha: {reservePreview?.reservationDate ?? '—'}</Text>
              <Text style={styles.summaryLine}>Horario: {reservePreview?.reservationSlot ?? '—'}</Text>
              <Text style={styles.summaryLine}>Área: {reservePreview?.space.area ?? '—'}</Text>
              <Text style={styles.summaryLine}>Tipo: {reservePreview?.space.tipo ?? '—'}</Text>
              {reservePreview?.space.isSubspace ? (
                <Text style={styles.summaryLine}>Subespacio de: {reservePreview.space.parentSpaceTitle ?? '—'}</Text>
              ) : null}
              <Text style={styles.summaryLine}>Solicitado: {reservePreview ? dayjs(reservePreview.requestedAt).format('YYYY-MM-DD HH:mm') : '—'}</Text>
            </View>

            <View style={styles.reserveActions}>
              <Pressable onPress={() => { setShowReserveModal(false); setReservationTarget(null); }} style={styles.reserveSecondaryButton}>
                <Text style={styles.reserveSecondaryText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleConfirmReservation} style={styles.reservePrimaryButton}>
                <Text style={styles.reservePrimaryText}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#081026',
    padding: 16,
  },
  header: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  glowTop: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 180,
    backgroundColor: 'rgba(88, 160, 255, 0.18)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -80,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: 'rgba(110, 231, 183, 0.12)',
  },
  note: {
    color: '#A8B4C8',
    marginBottom: 10,
  },
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgb(185, 233, 252)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#0059e9',
    fontWeight: '700',
    fontSize: 16,
  },
  cardMeta: {
    marginTop: 6,
    color: '#001f50',
    fontSize: 12,
  },
  cardDescription: {
    marginTop: 8,
    color: '#001f50',
    fontSize: 13,
    lineHeight: 18,
  },
  cardActions: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  reserveButton: {
    backgroundColor: '#0059e9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  reserveButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  childrenWrap: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 89, 233, 0.15)',
    gap: 10,
  },
  childrenTitle: {
    color: '#0059e9',
    fontWeight: '700',
    fontSize: 14,
  },
  childCard: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 89, 233, 0.10)',
  },
  childTitle: {
    color: '#00358a',
    fontWeight: '700',
  },
  childMeta: {
    marginTop: 4,
    color: '#00358a',
    fontSize: 12,
  },
  reserveSummaryTitle: {
    color: '#0059e9',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  reserveSummaryText: {
    color: '#00358a',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  availableDatesLabel: {
    color: '#3D4B63',
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 16,
  },
  payloadBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 89, 233, 0.12)',
    borderRadius: 10,
    padding: 10,
    backgroundColor: 'rgba(8, 16, 38, 0.03)',
  },
  payloadLabel: {
    color: '#0059e9',
    fontWeight: '700',
    marginBottom: 8,
  },
  payloadScroll: {
    maxHeight: 220,
  },
  payloadText: {
    color: '#081026',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: 'monospace',
  },
  summaryBox: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 89, 233, 0.12)',
    borderRadius: 10,
    padding: 10,
    backgroundColor: 'rgba(8, 16, 38, 0.03)',
  },
  summaryLine: {
    color: '#081026',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  reserveActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  reserveSecondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 89, 233, 0.18)',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  reserveSecondaryText: {
    color: '#0059e9',
    fontWeight: '700',
  },
  reservePrimaryButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#0059e9',
  },
  reservePrimaryText: {
    color: '#fff',
    fontWeight: '700',
  },
  childDescription: {
    marginTop: 6,
    color: '#00358a',
    fontSize: 13,
    lineHeight: 18,
  },
  childReserveButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#081026',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  childReserveButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  childEmpty: {
    color: '#00358a',
    fontSize: 13,
  },
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  filterButton: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  filterText: {
    color: '#CFE4FF',
    fontSize: 13,
  },
  clearButton: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearText: {
    color: '#A8B4C8',
    fontSize: 13,
  },
  modalWrap: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    maxHeight: '70%'
  },
  modalTitle: {
    fontWeight: '700',
    marginBottom: 8,
  },
  modalSubtitle: {
    marginTop: 4,
    marginBottom: 6,
    color: '#3D4B63',
    fontSize: 13,
  },
  availableDates: {
    color: '#6B7A95',
    fontSize: 12,
    marginBottom: 12,
  },
  dateConfirmButton: {
    marginTop: 12,
    backgroundColor: '#081026',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  dateConfirmText: {
    color: '#fff',
    fontWeight: '700',
  },
  modalRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#8d8d8d',
  },
  modalClose: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 8,
  },
});
