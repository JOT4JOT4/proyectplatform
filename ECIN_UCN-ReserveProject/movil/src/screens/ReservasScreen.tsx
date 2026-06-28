import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import dayjs from 'dayjs';
import DateTimePicker from 'react-native-ui-datepicker';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPost, ApiError } from '../services/apiClient';
import type { OccupiedSlot, ReservationRecord, Space, SpaceAvailability, SpacesResponse } from '../services/apiTypes';

type TimeSlot = {
  code: string;
  label: string;
  startTime: string;
  endTime: string;
};

const TIME_SLOTS: TimeSlot[] = [
  { code: 'A', label: 'A 08:10 - 09:40', startTime: '08:10', endTime: '09:40' },
  { code: 'B', label: 'B 09:55 - 11:25', startTime: '09:55', endTime: '11:25' },
  { code: 'C', label: 'C 11:40 - 13:10', startTime: '11:40', endTime: '13:10' },
  { code: 'C2', label: 'C2 13:10 - 14:30', startTime: '13:10', endTime: '14:30' },
  { code: 'D', label: 'D 14:30 - 16:00', startTime: '14:30', endTime: '16:00' },
  { code: 'E', label: 'E 16:15 - 17:45', startTime: '16:15', endTime: '17:45' },
  { code: 'F', label: 'F 18:00 - 19:30', startTime: '18:00', endTime: '19:30' },
  { code: 'G', label: 'G 19:45 - 21:15', startTime: '19:45', endTime: '21:15' },
  { code: 'H', label: 'H 21:30 - 23:00', startTime: '21:30', endTime: '23:00' },
];

const emptyAvailability: SpaceAvailability = {
  spaceId: '',
  date: '',
  timezone: 'America/Santiago',
  ocupiedSlots: [],
};

function normalizeSpacesResponse(response: SpacesResponse | Space[] | { data?: Space[] }): Space[] {
  if (Array.isArray(response)) {
    return response;
  }

  if ('data' in response && Array.isArray(response.data)) {
    return response.data;
  }

  return [];
}

function overlaps(slot: TimeSlot, occupied: OccupiedSlot) {
  return slot.startTime < occupied.endTime && slot.endTime > occupied.startTime;
}

export default function ReservasScreen() {
  const { token } = useAuth();
  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [selectedSpace, setSelectedSpace] = React.useState<Space | null>(null);
  const [selectedDate, setSelectedDate] = React.useState(dayjs());
  const [selectedZone, setSelectedZone] = React.useState<string | null>(null);
  const [selectedType, setSelectedType] = React.useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = React.useState<TimeSlot | null>(null);
  const [availability, setAvailability] = React.useState<SpaceAvailability>(emptyAvailability);
  const [showSpaceModal, setShowSpaceModal] = React.useState(false);
  const [showDateModal, setShowDateModal] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadSpaces = React.useCallback(async () => {
    const response = await apiGet<SpacesResponse | Space[] | { data?: Space[] }>('/spaces?page=1&limit=100', token);
    const mappedSpaces = normalizeSpacesResponse(response).filter((space) => space.isActive !== false);
    setSpaces(mappedSpaces);
    return mappedSpaces;
  }, [token]);

  React.useEffect(() => {
    let active = true;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        await loadSpaces();
      } catch (requestError) {
        if (active) {
          const message = requestError instanceof ApiError ? requestError.message : 'No se pudieron cargar los espacios desde el backend.';
          setError(message);
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
  }, [loadSpaces]);

  React.useEffect(() => {
    if (!selectedSpace) {
      setAvailability(emptyAvailability);
      setSelectedSlot(null);
      return;
    }

    let active = true;

    (async () => {
      try {
        const data = await apiGet<SpaceAvailability>(`/spaces/${selectedSpace.id}/availability?date=${selectedDate.format('YYYY-MM-DD')}`, token);

        if (active) {
          setAvailability(data);
          const firstAvailableSlot = TIME_SLOTS.find((slot) => !data.ocupiedSlots.some((occupied) => overlaps(slot, occupied))) ?? null;
          setSelectedSlot(firstAvailableSlot);
        }
      } catch (requestError) {
        if (active) {
          const message = requestError instanceof ApiError ? requestError.message : 'No se pudo consultar la disponibilidad del espacio.';
          setError(message);
          setAvailability(emptyAvailability);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [selectedSpace, selectedDate, token]);

  const filteredSpaces = React.useMemo(() => {
    return spaces.filter((space) => {
      if (selectedZone && space.zone !== selectedZone) return false;
      if (selectedType && space.type !== selectedType) return false;
      return true;
    });
  }, [spaces, selectedZone, selectedType]);

  const uniqueZones = React.useMemo(() => Array.from(new Set(spaces.map((space) => space.zone).filter(Boolean))).sort(), [spaces]);
  const uniqueTypes = React.useMemo(() => Array.from(new Set(spaces.map((space) => space.type).filter(Boolean))).sort(), [spaces]);

  const openSpaceDetail = (space: Space) => {
    setSelectedSpace(space);
    setShowSpaceModal(true);
  };

  const closeSpaceModal = () => {
    setShowSpaceModal(false);
    setSelectedSpace(null);
    setSelectedSlot(null);
    setAvailability(emptyAvailability);
  };

  const handleConfirmReservation = async () => {
    if (!selectedSpace || !selectedSlot) {
      Alert.alert('Falta información', 'Selecciona un espacio y un bloque horario.');
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        spaceId: selectedSpace.id,
        date: selectedDate.format('YYYY-MM-DD'),
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
      };

      await apiPost<ReservationRecord>('/reservations', payload, token);
      Alert.alert('Reserva creada', 'Tu solicitud fue enviada correctamente.');
      closeSpaceModal();
      await loadSpaces();
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : 'No se pudo crear la reserva.';
      Alert.alert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <Text style={styles.header}>Espacios disponibles</Text>
      <Text style={styles.subheader}>Consulta espacios reales del backend y reserva un bloque disponible.</Text>

      <View style={styles.filtersRow}>
        <TouchableOpacity style={styles.filterChip} onPress={() => setShowDateModal(true)}>
          <Text style={styles.filterChipText}>{selectedDate.format('YYYY-MM-DD')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip} onPress={() => setSelectedZone(null)}>
          <Text style={styles.filterChipText}>{selectedZone ?? 'Todas las zonas'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterChip} onPress={() => setSelectedType(null)}>
          <Text style={styles.filterChipText}>{selectedType ?? 'Todos los tipos'}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? <Text style={styles.note}>Cargando información desde el backend...</Text> : null}
      {error ? <Text style={styles.note}>{error}</Text> : null}

      <FlatList
        data={filteredSpaces}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={styles.emptyState}>No hay espacios para mostrar con los filtros actuales.</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => openSpaceDetail(item)}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>{item.zone} • {item.type} • {item.capacity ?? 0} cupos</Text>
            {item.description ? <Text style={styles.cardDescription}>{item.description}</Text> : null}
            {item.subspaces?.length ? <Text style={styles.cardSubspaces}>{item.subspaces.length} subespacio(s) asociado(s)</Text> : null}
          </TouchableOpacity>
        )}
      />

      <Modal visible={showDateModal} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Selecciona fecha</Text>
            <DateTimePicker
              mode="single"
              date={selectedDate.toDate()}
              onChange={(params) => {
                if (params?.date) {
                  setSelectedDate(dayjs(params.date));
                }
              }}
            />
            <Pressable style={styles.primaryButton} onPress={() => setShowDateModal(false)}>
              <Text style={styles.primaryButtonText}>Usar fecha</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showSpaceModal} transparent animationType="slide">
        <View style={styles.modalWrap}>
          <View style={styles.modalCardLarge}>
            <Text style={styles.modalTitle}>{selectedSpace?.name ?? 'Detalle del espacio'}</Text>
            <Text style={styles.detailLine}>{selectedSpace?.zone ?? '—'} • {selectedSpace?.type ?? '—'}</Text>
            <Text style={styles.detailLine}>Capacidad: {selectedSpace?.capacity ?? 0}</Text>
            {selectedSpace?.description ? <Text style={styles.detailDescription}>{selectedSpace.description}</Text> : null}

            <Text style={styles.sectionLabel}>Horarios ocupados</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotRow}>
              {availability.ocupiedSlots.length > 0 ? availability.ocupiedSlots.map((slot, index) => (
                <View key={`${slot.startTime}-${slot.endTime}-${index}`} style={styles.occupiedSlot}>
                  <Text style={styles.occupiedSlotText}>{slot.startTime} - {slot.endTime}</Text>
                </View>
              )) : <Text style={styles.emptyInline}>No hay bloques ocupados para esta fecha.</Text>}
            </ScrollView>

            <Text style={styles.sectionLabel}>Bloque a reservar</Text>
            <View style={styles.slotGrid}>
              {TIME_SLOTS.map((slot) => {
                const occupied = availability.ocupiedSlots.some((occupiedSlot) => overlaps(slot, occupiedSlot));
                const selected = selectedSlot?.code === slot.code;

                return (
                  <TouchableOpacity
                    key={slot.code}
                    style={[styles.slotButton, occupied && styles.slotButtonDisabled, selected && styles.slotButtonSelected]}
                    onPress={() => !occupied && setSelectedSlot(slot)}
                    disabled={occupied}
                  >
                    <Text style={styles.slotButtonText}>{slot.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={closeSpaceModal}>
                <Text style={styles.secondaryButtonText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleConfirmReservation}>
                <Text style={styles.primaryButtonText}>Reservar</Text>
              </TouchableOpacity>
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
    backgroundColor: '#ffffff',
    padding: 16,
  },
  glowTop: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 180,
    backgroundColor: '#003057',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -80,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: '#003057',
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
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    backgroundColor: '#003057',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  filterChipText: {
    color: '#fff',
    fontWeight: '700',
  },
  note: {
    color: '#A8B4C8',
    marginBottom: 10,
  },
  emptyState: {
    color: '#3D4B63',
    marginTop: 24,
  },
  card: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#003057',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  cardMeta: {
    color: '#CFE4FF',
    marginBottom: 8,
  },
  cardDescription: {
    color: '#fff',
    lineHeight: 19,
  },
  cardSubspaces: {
    marginTop: 8,
    color: '#CFE4FF',
    fontSize: 12,
  },
  modalWrap: {
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
  modalCardLarge: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    maxHeight: '90%',
  },
  modalTitle: {
    color: '#081026',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  detailLine: {
    color: '#3D4B63',
    marginBottom: 4,
  },
  detailDescription: {
    color: '#081026',
    marginTop: 10,
    lineHeight: 20,
  },
  sectionLabel: {
    color: '#0059e9',
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  slotRow: {
    gap: 8,
    flexGrow: 1,
  },
  occupiedSlot: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#E6EEF8',
    marginRight: 8,
  },
  occupiedSlotText: {
    color: '#3D4B63',
    fontSize: 12,
  },
  emptyInline: {
    color: '#3D4B63',
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#E6EEF8',
  },
  slotButtonDisabled: {
    opacity: 0.4,
  },
  slotButtonSelected: {
    backgroundColor: '#0059e9',
  },
  slotButtonText: {
    color: '#081026',
    fontSize: 12,
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
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
});