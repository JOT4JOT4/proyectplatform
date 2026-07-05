import React from 'react';
import {  View,  Text,  StyleSheet,  FlatList,  TouchableOpacity,  Modal, Pressable,  ScrollView,  Alert,  Image, TextInput,
} from 'react-native';
import dayjs from 'dayjs';
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

function getSlotLabel(slot: TimeSlot | null) {
  return slot?.label ?? 'Sin bloque seleccionado';
}

function buildDateOptions(daysAhead = 14) {
  return Array.from({ length: daysAhead }, (_, index) => {
    const date = dayjs().add(index, 'day');
    return {
      value: date,
      label: date.format('dddd, DD/MM/YYYY'),
      shortLabel: date.format('DD/MM'),
    };
  });
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
  const dateOptions = React.useMemo(() => buildDateOptions(14), []);
  const [search, setSearch] = React.useState('');

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
          const message = requestError instanceof ApiError ? requestError.message : 'No se pudieron cargar los espacios.';
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
    if (search && !space.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedZone && space.zone !== selectedZone) return false;
    if (selectedType && space.type !== selectedType) return false;

    if (selectedSlot) {
      const ocupado = availability.ocupiedSlots.some((occ) => overlaps(selectedSlot, occ));
      if (ocupado) return false;
    }
    return true;
    });
  }, [spaces, search, selectedZone, selectedType, selectedSlot, availability]);


  const uniqueZones = React.useMemo(() => Array.from(new Set(spaces.map((space) => space.zone).filter(Boolean))).sort(), [spaces]);
  const uniqueTypes = React.useMemo(() => Array.from(new Set(spaces.map((space) => space.type).filter(Boolean))).sort(), [spaces]);
  const availableSlotsCount = React.useMemo(() => {
    return TIME_SLOTS.filter((slot) => !availability.ocupiedSlots.some((occupied) => overlaps(slot, occupied))).length;
  }, [availability.ocupiedSlots]);

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
      <Text style={styles.subheader}>Consulta espacios y reserva un bloque disponible.</Text>
      <TextInput style={styles.searchBar}
          placeholder="Buscar espacio por nombre..."
          value={search}
          onChangeText={setSearch}
          />
      <View style={styles.filtersRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {uniqueZones.map((zone) => (
            <TouchableOpacity
              key={zone}
              style={[styles.filterChip, selectedZone === zone && styles.filterChipSelected]}
              onPress={() => setSelectedZone(selectedZone === zone ? null : zone)}
            >
              <Text style={styles.filterChipText}>{zone}</Text>
            </TouchableOpacity>
          ))}
          {uniqueTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.filterChip, selectedType === type && styles.filterChipSelected]}
              onPress={() => setSelectedType(selectedType === type ? null : type)}
            >
              <Text style={styles.filterChipText}>{type}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={styles.slotFilterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TIME_SLOTS.map((slot) => (
            <TouchableOpacity
              key={slot.code}
              style={[styles.slotButton, selectedSlot?.code === slot.code && styles.slotButtonSelected]}
              onPress={() => setSelectedSlot(selectedSlot?.code === slot.code ? null : slot)}
            >
              <Text style={[styles.slotButtonText, selectedSlot?.code === slot.code && styles.slotButtonTextSelected]}>
                {slot.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>


      {isLoading ? <Text style={styles.note}>Cargando información...</Text> : null}
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
            <ScrollView style={styles.dateList} showsVerticalScrollIndicator={false}>
              {dateOptions.map((option) => {
                const selected = option.value.format('YYYY-MM-DD') === selectedDate.format('YYYY-MM-DD');

                return (
                  <TouchableOpacity
                    key={option.value.format('YYYY-MM-DD')}
                    style={[styles.dateOption, selected && styles.dateOptionSelected]}
                    onPress={() => setSelectedDate(option.value)}
                  >
                    <Text style={[styles.dateOptionLabel, selected && styles.dateOptionLabelSelected]}>{option.label}</Text>
                    <Text style={[styles.dateOptionMeta, selected && styles.dateOptionMetaSelected]}>{option.shortLabel}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Pressable style={styles.primaryButton} onPress={() => setShowDateModal(false)}>
              <Text style={styles.primaryButtonText}>Usar fecha</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={showSpaceModal} transparent animationType="slide">
        <View style={styles.modalWrap}>
          <View style={styles.modalCardLarge}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.heroCard}>
                {selectedSpace?.imageUrl ? (
                  <Image source={{ uri: selectedSpace.imageUrl }} style={styles.heroImage} />
                ) : (
                  <View style={styles.heroImageFallback}>
                    <Text style={styles.heroImageFallbackText}>Espacio</Text>
                  </View>
                )}

                <Text style={styles.modalTitle}>{selectedSpace?.name ?? 'Detalle del espacio'}</Text>
                <Text style={styles.detailLine}>{selectedSpace?.zone ?? '—'} • {selectedSpace?.type ?? '—'}</Text>

                <View style={styles.badgeRow}>
                  <View style={styles.badge}><Text style={styles.badgeText}>Capacidad {selectedSpace?.capacity ?? 0}</Text></View>
                  <View style={styles.badge}><Text style={styles.badgeText}>{selectedSpace?.subspaces?.length ?? 0} subespacios</Text></View>
                </View>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.sectionTitle}>Detalle de la reserva</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Fecha</Text>
                  <Text style={styles.summaryValue}>{selectedDate.format('DD/MM/YYYY')}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Bloque</Text>
                  <Text style={styles.summaryValue}>{getSlotLabel(selectedSlot)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Disponibles</Text>
                  <Text style={styles.summaryValue}>{availableSlotsCount} bloques libres</Text>
                </View>
              </View>

              {selectedSpace?.description ? (
                <View style={styles.infoCard}>
                  <Text style={styles.sectionTitle}>Descripción</Text>
                  <Text style={styles.detailDescription}>{selectedSpace.description}</Text>
                </View>
              ) : null}

              {selectedSpace?.subspaces?.length ? (
                <View style={styles.infoCard}>
                  <Text style={styles.sectionTitle}>Subespacios asociados</Text>
                  <Text style={styles.subspaceText} numberOfLines={3}>
                    {selectedSpace.subspaces.map((subspace) => subspace.name).join(' · ')}
                  </Text>
                </View>
              ) : null}

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
                      <Text style={[styles.slotButtonText, selected && styles.slotButtonTextSelected]}>{slot.label}</Text>
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
  dateList: {
    maxHeight: 320,
    marginBottom: 14,
  },
  dateOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F5F8FC',
    marginBottom: 10,
  },
  dateOptionSelected: {
    backgroundColor: '#003057',
  },
  dateOptionLabel: {
    color: '#081026',
    fontWeight: '800',
  },
  dateOptionLabelSelected: {
    color: '#fff',
  },
  dateOptionMeta: {
    color: '#3D4B63',
    marginTop: 4,
    fontSize: 12,
  },
  dateOptionMetaSelected: {
    color: '#CFE4FF',
  },
  modalCardLarge: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    maxHeight: '90%',
  },
  modalScrollContent: {
    paddingBottom: 4,
  },
  heroCard: {
    marginBottom: 14,
  },
  heroImage: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: '#E6EEF8',
  },
  heroImageFallback: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    marginBottom: 14,
    backgroundColor: '#003057',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImageFallbackText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
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
  infoCard: {
    backgroundColor: '#F5F8FC',
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
  },
  summaryCard: {
    backgroundColor: '#EAF2FF',
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
  },
  sectionTitle: {
    color: '#081026',
    fontWeight: '800',
    marginBottom: 10,
    fontSize: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  summaryLabel: {
    color: '#3D4B63',
    fontWeight: '700',
  },
  summaryValue: {
    color: '#081026',
    fontWeight: '800',
    flexShrink: 1,
    textAlign: 'right',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    backgroundColor: '#F5F8FC',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  badgeText: {
    color: '#003057',
    fontWeight: '700',
    fontSize: 12,
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
  slotButtonTextSelected: {
    color: '#fff',
  },
  subspaceText: {
    color: '#3D4B63',
    lineHeight: 20,
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
  searchBar: {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  padding: 8,
  marginBottom: 12,
},
filterChipSelected: {
  backgroundColor: '#0059e9',
},
slotFilterRow: {
  flexDirection: 'row',
  marginBottom: 12,
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