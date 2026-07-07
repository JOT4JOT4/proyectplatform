import React from 'react';
import {  View,  Text,  StyleSheet,  FlatList,  TouchableOpacity,  Modal, Pressable,  ScrollView,  Alert,  Image, TextInput,
} from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPost, ApiError } from '../services/apiClient';
import type { OccupiedSlot, ReservationRecord, Space, SpaceAvailability, SpacesResponse } from '../services/apiTypes';

dayjs.locale('es');

type TimeSlot = {
  code: string;
  label: string;
  startTime: string;
  endTime: string;
};

type FilterPicker = 'zone' | 'type' | 'date' | null;

type PickerOption = {
  label: string;
  value: string | null;
  description?: string;
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

function overlaps(slot: { startTime: string; endTime: string }, occupied: { startTime: string; endTime: string }) {
  return slot.startTime < occupied.endTime && slot.endTime > occupied.startTime;
}

function isSlotOccupied(startTime: string, endTime: string, occupiedSlots: OccupiedSlot[]) {
  return occupiedSlots.some((occupied) => overlaps({ startTime, endTime }, occupied));
}

function getSlotLabel(slot: TimeSlot | null) {
  return slot?.label ?? 'Sin bloque seleccionado';
}

function getSlotKey(slot: TimeSlot) {
  return `${slot.startTime}-${slot.endTime}`;
}

function isPastSlot(slot: { startTime: string; endTime: string }, date: dayjs.Dayjs) {
  const slotEnd = dayjs(`${date.format('YYYY-MM-DD')} ${slot.endTime}`, 'YYYY-MM-DD HH:mm');
  return slotEnd.isBefore(dayjs());
}

function getSubBlocks(baseBlock: TimeSlot, divisions: number): TimeSlot[] {
  if (divisions <= 1) return [baseBlock];

  const [startH, startM] = baseBlock.startTime.split(':').map(Number);
  const [endH, endM] = baseBlock.endTime.split(':').map(Number);

  const startTotalMinutes = startH * 60 + startM;
  const endTotalMinutes = endH * 60 + endM;
  const totalDuration = endTotalMinutes - startTotalMinutes;

  const slotDuration = Math.floor(totalDuration / divisions);
  const subBlocks: TimeSlot[] = [];

  for (let i = 0; i < divisions; i++) {
    const slotStartTotal = startTotalMinutes + i * slotDuration;
    const slotEndTotal = slotStartTotal + slotDuration;

    const formatTime = (totalMin: number) => {
      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    const startTime = formatTime(slotStartTotal);
    const endTime = formatTime(slotEndTotal);

    subBlocks.push({
      code: `${baseBlock.code}-sub-${i + 1}`,
      label: `${baseBlock.code} - Sub ${i + 1} (${startTime} - ${endTime})`,
      startTime,
      endTime,
    });
  }

  return subBlocks;
}

function getBaseBlockStatus(baseBlock: TimeSlot, divisions: number, occupiedSlots: OccupiedSlot[]) {
  if (divisions <= 1) {
    return isSlotOccupied(baseBlock.startTime, baseBlock.endTime, occupiedSlots) ? 'occupied' : 'free';
  }

  const subs = getSubBlocks(baseBlock, divisions);
  const occupiedCount = subs.filter((sub) => isSlotOccupied(sub.startTime, sub.endTime, occupiedSlots)).length;

  if (occupiedCount === subs.length) {
    return 'occupied';
  } else if (occupiedCount > 0) {
    return 'partial';
  }
  return 'free';
}


function splitSlot(slot: TimeSlot): TimeSlot[] {
  const start = dayjs(slot.startTime, 'HH:mm');
  const end = dayjs(slot.endTime, 'HH:mm');
  const mid = start.add(end.diff(start) / 2, 'millisecond');

  return [
    { code: slot.code + '-1', label: `${slot.code}a ${start.format('HH:mm')} - ${mid.format('HH:mm')}`, startTime: start.format('HH:mm'), endTime: mid.format('HH:mm') },
    { code: slot.code + '-2', label: `${slot.code}b ${mid.format('HH:mm')} - ${end.format('HH:mm')}`, startTime: mid.format('HH:mm'), endTime: end.format('HH:mm') },
  ];
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
  const [activePicker, setActivePicker] = React.useState<FilterPicker>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const dateOptions = React.useMemo(() => buildDateOptions(14), []);
  const [search, setSearch] = React.useState('');
  const [subSlots, setSubSlots] = React.useState<TimeSlot[]>([]);
  const [selectedBaseBlock, setSelectedBaseBlock] = React.useState<string | null>(null);
 const [showDatePicker, setShowDatePicker] = React.useState(false);



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
      setSelectedBaseBlock(null);
      setSubSlots([]);
      return;
    }

    let active = true;

    (async () => {
      try {
        const data = await apiGet<SpaceAvailability>(`/spaces/${selectedSpace.id}/availability?date=${selectedDate.format('YYYY-MM-DD')}`, token);

        if (active) {
          setAvailability(data);
          const divisions = data.divisions ?? 1;
          setSubSlots([]);
          if (divisions <= 1) {
            const firstAvailableSlot = TIME_SLOTS.find((slot) => !data.ocupiedSlots.some((occupied) => overlaps(slot, occupied))) ?? null;
            setSelectedSlot(firstAvailableSlot);
            setSelectedBaseBlock(firstAvailableSlot?.code ?? null);
          } else {
            setSelectedSlot(null);
            setSelectedBaseBlock(null);
          }
        }
      } catch (requestError) {
        if (active) {
          const message = requestError instanceof ApiError ? requestError.message : 'No se pudo consultar la disponibilidad del espacio.';
          setError(message);
          setAvailability(emptyAvailability);
          setSelectedSlot(null);
          setSelectedBaseBlock(null);
          setSubSlots([]);
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

      return true;
    });
  }, [spaces, search, selectedZone, selectedType]);


  const uniqueZones = React.useMemo(() => Array.from(new Set(spaces.map((space) => space.zone).filter(Boolean))).sort(), [spaces]);
  const uniqueTypes = React.useMemo(() => Array.from(new Set(spaces.map((space) => space.type).filter(Boolean))).sort(), [spaces]);
  const availableSlotsCount = React.useMemo(() => {
    return TIME_SLOTS.filter((slot) => !availability.ocupiedSlots.some((occupied) => overlaps(slot, occupied))).length;
  }, [availability.ocupiedSlots]);

  const openSpaceDetail = (space: Space) => {
    setSelectedSpace(space);
    setShowSpaceModal(true);
  };

  const closePicker = () => setActivePicker(null);

  const openPicker = (picker: Exclude<FilterPicker, null>) => setActivePicker(picker);

  const clearFilters = () => {
    setSearch('');
    setSelectedZone(null);
    setSelectedType(null);
    setSelectedDate(dayjs());
    closePicker();
  };

  const getPickerTitle = () => {
    switch (activePicker) {
      case 'zone':
        return 'Filtrar por zona';
      case 'type':
        return 'Filtrar por tipo';
      case 'date':
        return 'Filtrar por día';
      default:
        return '';
    }
  };

  const getPickerOptions = (): PickerOption[] => {
    switch (activePicker) {
      case 'zone':
        return [{ label: 'Todas las zonas', value: null }, ...uniqueZones.map((zone) => ({ label: zone, value: zone }))];
      case 'type':
        return [{ label: 'Todos los tipos', value: null }, ...uniqueTypes.map((type) => ({ label: type, value: type }))];
      case 'date':
        return dateOptions.map((option) => ({
          label: option.label,
          value: option.value.format('YYYY-MM-DD'),
          description: option.shortLabel,
        }));
      default:
        return [];
    }
  };

  const selectPickerOption = (value: string | null) => {
    if (activePicker === 'zone') {
      setSelectedZone(value);
    }

    if (activePicker === 'type') {
      setSelectedType(value);
    }

    if (activePicker === 'date' && value) {
      setSelectedDate(dayjs(value));
    }

    closePicker();
  };

  const selectedDayLabel = selectedDate.isSame(dayjs(), 'day') ? 'Hoy' : selectedDate.format('DD/MM');

  const closeSpaceModal = () => {
    setShowSpaceModal(false);
    setSelectedSpace(null);
    setSelectedSlot(null);
    setAvailability(emptyAvailability);
  };

  const handleConfirmReservation = async () => {
    if (!selectedSpace || !selectedSlot) {
      Alert.alert('Falta información', 'Selecciona un espacio y un bloque o subbloque horario.');
      return;
    }

    if (isPastSlot(selectedSlot, selectedDate)) {
      Alert.alert('Reserva no permitida', 'No puedes reservar en un horario que ya ocurrió.');
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

      Alert.alert('Reserva realizada', 'Tu reserva se pudo llevar a cabo.');
      closeSpaceModal();
      await loadSpaces();
    } catch (requestError) {
      const message =
        requestError instanceof ApiError ? requestError.message : 'No se pudo crear la reserva.';

      if (message.toLowerCase().includes('límite semanal')) {
        Alert.alert('Reserva rechazada', 'Has alcanzado tu límite semanal de reservas.');
      } else if (message.toLowerCase().includes('tiempo máximo')) {
        Alert.alert('Reserva rechazada', 'No puedes reservar fuera del tiempo máximo permitido.');
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <View style={styles.container}>
      <Text style={styles.header}>Espacios disponibles</Text>
      <Text style={styles.subheader}>Consulta espacios y reserva un bloque disponible.</Text>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchBar}
          placeholder="Buscar espacio por nombre..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.filterPanel}>
        <Text style={styles.filterPanelTitle}>Filtros</Text>
        <View style={styles.filterGrid}>
          <TouchableOpacity style={styles.dropdownButton} onPress={() => openPicker('zone')}>
            <Text style={styles.dropdownLabel}>Zona</Text>
            <Text style={styles.dropdownValue} numberOfLines={1}>{selectedZone ?? 'Todas'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dropdownButton} onPress={() => openPicker('type')}>
            <Text style={styles.dropdownLabel}>Tipo</Text>
            <Text style={styles.dropdownValue} numberOfLines={1}>{selectedType ?? 'Todos'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowDatePicker(true)}>
            <Text style={styles.dropdownLabel}>Día</Text>
            <Text style={styles.dropdownValue} numberOfLines={1}>
              {selectedDate.isSame(dayjs(), 'day') ? 'Hoy' : selectedDate.format('DD/MM/YYYY')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
          <Text style={styles.clearButtonText}>Limpiar filtros</Text>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <Modal transparent={true} animationType="fade">
          <View style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)'
          }}>
            <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 8 }}>
              <DateTimePicker
                value={selectedDate.toDate()}
                mode="date"
                display="default"   // usa "default" para Android, "spinner"/"inline" para iOS
                locale="es-ES"
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) {
                    setSelectedDate(dayjs(date));
                  }
                }}
              />
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={{ marginTop: 10, textAlign: 'center', color: 'blue' }}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

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

      <Modal visible={activePicker !== null} transparent animationType="fade">
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{getPickerTitle()}</Text>
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {getPickerOptions().map((option) => {
                const selected =
                  (activePicker === 'date' && option.value === selectedDate.format('YYYY-MM-DD')) ||
                  (activePicker === 'zone' && option.value === selectedZone) ||
                  (activePicker === 'type' && option.value === selectedType) ||
                  (option.value === null && ((activePicker === 'zone' && !selectedZone) || (activePicker === 'type' && !selectedType)));

                return (
                  <TouchableOpacity
                    key={`${option.label}-${option.value ?? 'all'}`}
                    style={[styles.dateOption, selected && styles.dateOptionSelected]}
                    onPress={() => selectPickerOption(option.value)}
                  >
                    <Text style={[styles.dateOptionLabel, selected && styles.dateOptionLabelSelected]}>{option.label}</Text>
                    {option.description ? (
                      <Text style={[styles.dateOptionMeta, selected && styles.dateOptionMetaSelected]}>{option.description}</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Pressable style={styles.primaryButton} onPress={closePicker}>
              <Text style={styles.primaryButtonText}>Cerrar</Text>
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
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Permitidos</Text>
                  <Text style={styles.summaryValue} numberOfLines={2}>
                    {selectedSpace?.allowedTimeSlots?.length ? selectedSpace.allowedTimeSlots.map((slotKey) => getSlotLabel(TIME_SLOTS.find((slot) => getSlotKey(slot) === slotKey) ?? null)).join(' · ') : 'Todos los bloques válidos'}
                  </Text>
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
              {availability.divisions && availability.divisions > 1 ? (
                <Text style={styles.infoLabel}>
                  El horario para esta fecha tiene {availability.divisions} divisiones. Selecciona un bloque base para ver sus subdivisiones:
                </Text>
              ) : null}

              <View style={styles.slotGrid}>
                {TIME_SLOTS.map((slot) => {
                  const divisions = availability.divisions ?? 1;
                  const status = getBaseBlockStatus(slot, divisions, availability.ocupiedSlots);
                  const isOccupied = status === 'occupied';
                  const isPartial = status === 'partial';
                  const allowedBySpace = !selectedSpace?.allowedTimeSlots?.length || selectedSpace.allowedTimeSlots.includes(getSlotKey(slot));
                  const past = isPastSlot(slot, selectedDate);
                  
                  const disabled = isOccupied || !allowedBySpace || past;
                  const selected = selectedBaseBlock === slot.code;

                  let displayLabel = slot.label;
                  if (isOccupied) {
                    displayLabel = `${slot.code} (Ocupado)`;
                  } else if (isPartial && divisions > 1) {
                    displayLabel = `${slot.code} (Parcial)`;
                  }

                  return (
                    <TouchableOpacity
                      key={slot.code}
                      style={[
                        styles.slotButton, 
                        disabled && styles.slotButtonDisabled, 
                        selected && styles.slotButtonSelected,
                        isPartial && !selected && styles.slotButtonPartial
                      ]}
                      onPress={() => {
                        if (!disabled) {
                          setSelectedBaseBlock(slot.code);
                          if (divisions <= 1) {
                            setSelectedSlot(slot);
                            setSubSlots([]);
                          } else {
                            setSelectedSlot(null); // Requiere seleccionar una subdivisión
                            setSubSlots(getSubBlocks(slot, divisions));
                          }
                        }
                      }}
                      disabled={disabled}
                    >
                      <Text style={[
                        styles.slotButtonText, 
                        selected && styles.slotButtonTextSelected,
                        isPartial && !selected && styles.slotButtonTextPartial
                      ]}>
                        {displayLabel}{past ? ' (pasado)' : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Renderizar subbloques si existen */}
              {subSlots.length > 0 && (
                <View style={styles.subSlotGrid}>
                  {subSlots.map((sub) => {
                    const past = isPastSlot(sub, selectedDate);
                    const occupied = isSlotOccupied(sub.startTime, sub.endTime, availability.ocupiedSlots);
                    const disabled = past || occupied;
                    const selected = selectedSlot?.code === sub.code;

                    return (
                      <TouchableOpacity
                        key={sub.code}
                        style={[styles.slotButton, disabled && styles.slotButtonDisabled, selected && styles.slotButtonSelected]}
                        onPress={() => !disabled && setSelectedSlot(sub)}
                        disabled={disabled}
                      >
                        <Text style={[styles.slotButtonText, selected && styles.slotButtonTextSelected]}>
                          {sub.label}{past ? ' (pasado)' : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}


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
  searchWrap: {
    marginBottom: 12,
  },
  filterPanel: {
    backgroundColor: '#F5F8FC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
  },
  filterPanelTitle: {
    color: '#081026',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  filterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dropdownButton: {
    flexGrow: 1,
    minWidth: '30%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D9E3F0',
  },
  dropdownLabel: {
    color: '#3D4B63',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  dropdownValue: {
    color: '#081026',
    fontWeight: '800',
  },
  clearButton: {
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  clearButtonText: {
    color: '#0059e9',
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
  pickerList: {
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
    borderColor: '#D9E3F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  filterChipSelected: {
    backgroundColor: '#0059e9',
  },
  slotFilterRow: {
    flexDirection: 'row',
    marginBottom: 12,
},
  slotButtonPartial: {
    borderWidth: 2,
    borderColor: '#ff9800',
    backgroundColor: '#fff9e6',
  },
  slotButtonTextPartial: {
    color: '#b26a00',
  },
  infoLabel: {
    color: '#3D4B63',
    fontSize: 12,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  subSlotGrid: {
    flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
  marginTop: 12,
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