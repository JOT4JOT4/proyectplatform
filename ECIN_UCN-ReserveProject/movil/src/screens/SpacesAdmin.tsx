import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, TextInput, Alert, StyleSheet, ScrollView } from 'react-native';
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import type { Space, SpacesResponse } from '../services/apiTypes';

type SpaceTypeValue = 'room' | 'table';
type FilterPicker = 'zone' | 'type' | null;

type TimeSlot = {
  code: string;
  label: string;
  startTime: string;
  endTime: string;
};

type SpaceFormState = {
  name: string;
  zone: string;
  type: SpaceTypeValue;
  description: string;
  imageUrl: string;
  capacity: string;
  isActive: boolean;
  allowedTimeSlots: string[];
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

const EMPTY_FORM: SpaceFormState = {
  name: '',
  zone: '',
  type: 'table',
  description: '',
  imageUrl: '',
  capacity: '1',
  isActive: true,
  allowedTimeSlots: [],
};

function normalizeSpacesResponse(response: Space[] | SpacesResponse | { data?: Space[] }): Space[] {
  if (Array.isArray(response)) {
    return response;
  }

  if ('data' in response && Array.isArray(response.data)) {
    return response.data;
  }

  return [];
}

function getTimeSlotKey(slot: TimeSlot) {
  return `${slot.startTime}-${slot.endTime}`;
}

function getTimeSlotLabel(key: string) {
  const slot = TIME_SLOTS.find((item) => getTimeSlotKey(item) === key);
  return slot?.label ?? key;
}

export default function SpacesAdmin() {
  const { token } = useAuth();
  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [search, setSearch] = React.useState('');
  const [selectedZone, setSelectedZone] = React.useState<string | null>(null);
  const [selectedType, setSelectedType] = React.useState<string | null>(null);
  const [activePicker, setActivePicker] = React.useState<FilterPicker>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [editingSpace, setEditingSpace] = React.useState<Space | null>(null);
  const [form, setForm] = React.useState<SpaceFormState>(EMPTY_FORM);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const uniqueZones = React.useMemo(() => Array.from(new Set(spaces.map((space) => space.zone).filter(Boolean))).sort(), [spaces]);
  const uniqueTypes = React.useMemo(() => Array.from(new Set(spaces.map((space) => space.type).filter(Boolean))).sort(), [spaces]);

  const loadSpaces = React.useCallback(async () => {
    const response = await apiGet<Space[] | SpacesResponse | { data?: Space[] }>('/spaces/admin?page=1&limit=100', token);
    const mappedSpaces = normalizeSpacesResponse(response);
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

  const filteredSpaces = React.useMemo(() => {
    return spaces.filter((space) => {
      const normalizedSearch = search.trim().toLowerCase();

      if (normalizedSearch && !space.name.toLowerCase().includes(normalizedSearch) && !space.zone.toLowerCase().includes(normalizedSearch)) {
        return false;
      }

      if (selectedZone && space.zone !== selectedZone) {
        return false;
      }

      if (selectedType && space.type !== selectedType) {
        return false;
      }

      return true;
    });
  }, [spaces, search, selectedZone, selectedType]);

  const closePicker = () => setActivePicker(null);

  const openPicker = (picker: Exclude<FilterPicker, null>) => setActivePicker(picker);

  const openCreate = () => {
    setEditingSpace(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (space: Space) => {
    setEditingSpace(space);
    setForm({
      name: space.name,
      zone: space.zone,
      type: (space.type as SpaceTypeValue) ?? 'table',
      description: space.description ?? '',
      imageUrl: space.imageUrl ?? '',
      capacity: String(space.capacity ?? 1),
      isActive: space.isActive !== false,
      allowedTimeSlots: space.allowedTimeSlots ?? [],
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSpace(null);
    setForm(EMPTY_FORM);
  };

  const toggleAllowedSlot = (slot: TimeSlot) => {
    const slotKey = getTimeSlotKey(slot);
    setForm((current) => ({
      ...current,
      allowedTimeSlots: current.allowedTimeSlots.includes(slotKey)
        ? current.allowedTimeSlots.filter((key) => key !== slotKey)
        : [...current.allowedTimeSlots, slotKey],
    }));
  };

  const resetAllowedSlots = () => {
    setForm((current) => ({ ...current, allowedTimeSlots: [] }));
  };

  const handleSave = async () => {
    const nextName = form.name.trim();
    const nextZone = form.zone.trim();

    if (!nextName || !nextZone) {
      Alert.alert('Faltan datos', 'Debes completar nombre y zona.');
      return;
    }

    const payload = {
      name: nextName,
      zone: nextZone,
      type: form.type,
      description: form.description.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      capacity: Number.parseInt(form.capacity, 10) || 1,
      isActive: form.isActive,
      allowedTimeSlots: form.allowedTimeSlots,
    };

    try {
      setIsLoading(true);
      if (editingSpace) {
        await apiPatch(`/spaces/${editingSpace.id}`, payload, token);
      } else {
        await apiPost('/spaces', payload, token);
      }

      closeModal();
      await loadSpaces();
    } catch (requestError) {
      Alert.alert('Error', requestError instanceof ApiError ? requestError.message : 'No se pudo guardar el espacio');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (spaceId: string) => {
    Alert.alert('Eliminar espacio', 'Esta acción quitará el espacio del sistema o lo desactivará si tiene reservas asociadas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoading(true);
            await apiDelete(`/spaces/${spaceId}`, token);
            await loadSpaces();
          } catch (requestError) {
            Alert.alert('Error', requestError instanceof ApiError ? requestError.message : 'No se pudo eliminar');
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  const handleHide = async (spaceId: string) => {
    try {
      setIsLoading(true);
      await apiPatch(`/spaces/${spaceId}`, { isActive: false }, token);
      await loadSpaces();
    } catch (requestError) {
      Alert.alert('Error', requestError instanceof ApiError ? requestError.message : 'No se pudo ocultar');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedZoneLabel = selectedZone ?? 'Todas';
  const selectedTypeLabel = selectedType ?? 'Todos';

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Gestión de espacios</Text>
      <Text style={styles.subheader}>Busca, crea y edita espacios con reglas reales de disponibilidad.</Text>

      <TextInput
        style={styles.searchBar}
        placeholder="Buscar por nombre o zona..."
        value={search}
        onChangeText={setSearch}
      />

      <View style={styles.filterPanel}>
        <Text style={styles.filterPanelTitle}>Filtros</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity style={styles.filterButton} onPress={() => openPicker('zone')}>
            <Text style={styles.filterLabel}>Zona</Text>
            <Text style={styles.filterValue} numberOfLines={1}>{selectedZoneLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.filterButton} onPress={() => openPicker('type')}>
            <Text style={styles.filterLabel}>Tipo</Text>
            <Text style={styles.filterValue} numberOfLines={1}>{selectedTypeLabel}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            setSearch('');
            setSelectedZone(null);
            setSelectedType(null);
          }}
        >
          <Text style={styles.clearButtonText}>Limpiar filtros</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.createButton} onPress={openCreate}>
        <Text style={styles.createButtonText}>Crear espacio</Text>
      </TouchableOpacity>

      {isLoading ? <Text style={styles.note}>Cargando...</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={filteredSpaces}
        keyExtractor={(space) => space.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyState}>No hay espacios para mostrar.</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, item.isActive === false && styles.cardInactive]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleWrap}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>{item.zone} • {item.type} • {item.capacity ?? 1} cupos</Text>
              </View>
              <View style={[styles.statusBadge, item.isActive === false ? styles.statusBadgeInactive : styles.statusBadgeActive]}>
                <Text style={styles.statusBadgeText}>{item.isActive === false ? 'Oculto' : 'Activo'}</Text>
              </View>
            </View>

            {item.description ? <Text style={styles.cardDescription}>{item.description}</Text> : null}

            <View style={styles.slotSummaryRow}>
              <Text style={styles.slotSummaryLabel}>Bloques permitidos</Text>
              <Text style={styles.slotSummaryValue} numberOfLines={2}>
                {item.allowedTimeSlots?.length ? item.allowedTimeSlots.map(getTimeSlotLabel).join(' · ') : 'Todos los bloques'}
              </Text>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.secondaryAction} onPress={() => openEdit(item)}>
                <Text style={styles.secondaryActionText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryAction} onPress={() => handleHide(item.id)}>
                <Text style={styles.secondaryActionText}>Ocultar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dangerAction} onPress={() => handleDelete(item.id)}>
                <Text style={styles.dangerActionText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={activePicker !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pickerCard}>
            <Text style={styles.modalTitle}>{activePicker === 'zone' ? 'Selecciona una zona' : 'Selecciona un tipo'}</Text>
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {activePicker === 'zone' ? (
                <>
                  <TouchableOpacity style={styles.pickerOption} onPress={() => { setSelectedZone(null); closePicker(); }}>
                    <Text style={styles.pickerOptionText}>Todas las zonas</Text>
                  </TouchableOpacity>
                  {uniqueZones.map((zone) => (
                    <TouchableOpacity key={zone} style={styles.pickerOption} onPress={() => { setSelectedZone(zone); closePicker(); }}>
                      <Text style={styles.pickerOptionText}>{zone}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <>
                  <TouchableOpacity style={styles.pickerOption} onPress={() => { setSelectedType(null); closePicker(); }}>
                    <Text style={styles.pickerOptionText}>Todos los tipos</Text>
                  </TouchableOpacity>
                  {uniqueTypes.map((type) => (
                    <TouchableOpacity key={type} style={styles.pickerOption} onPress={() => { setSelectedType(type); closePicker(); }}>
                      <Text style={styles.pickerOptionText}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
            <TouchableOpacity style={styles.primaryButton} onPress={closePicker}>
              <Text style={styles.primaryButtonText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.formCard}>
            <Text style={styles.modalTitle}>{editingSpace ? 'Editar espacio' : 'Crear espacio'}</Text>

            <TextInput style={styles.input} placeholder="Nombre del espacio" value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} />
            <TextInput style={styles.input} placeholder="Zona" value={form.zone} onChangeText={(value) => setForm((current) => ({ ...current, zone: value }))} />

            <Text style={styles.sectionLabel}>Zonas sugeridas</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {uniqueZones.map((zone) => (
                <TouchableOpacity key={zone} style={[styles.chip, form.zone === zone && styles.chipSelected]} onPress={() => setForm((current) => ({ ...current, zone }))}>
                  <Text style={[styles.chipText, form.zone === zone && styles.chipTextSelected]}>{zone}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.sectionLabel}>Tipo</Text>
            <View style={styles.typeRow}>
              {([
                { label: 'Sala', value: 'room' as SpaceTypeValue },
                { label: 'Mesa', value: 'table' as SpaceTypeValue },
              ]).map((option) => (
                <TouchableOpacity key={option.value} style={[styles.typeButton, form.type === option.value && styles.typeButtonSelected]} onPress={() => setForm((current) => ({ ...current, type: option.value }))}>
                  <Text style={[styles.typeButtonText, form.type === option.value && styles.typeButtonTextSelected]}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput style={styles.input} placeholder="Descripción" value={form.description} onChangeText={(value) => setForm((current) => ({ ...current, description: value }))} multiline />
            <TextInput style={styles.input} placeholder="URL de imagen" value={form.imageUrl} onChangeText={(value) => setForm((current) => ({ ...current, imageUrl: value }))} />
            <TextInput style={styles.input} placeholder="Capacidad" keyboardType="numeric" value={form.capacity} onChangeText={(value) => setForm((current) => ({ ...current, capacity: value }))} />

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Espacio visible</Text>
              <TouchableOpacity style={[styles.toggleButton, form.isActive && styles.toggleButtonOn]} onPress={() => setForm((current) => ({ ...current, isActive: !current.isActive }))}>
                <Text style={styles.toggleButtonText}>{form.isActive ? 'Activo' : 'Oculto'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Bloques permitidos</Text>
            <View style={styles.slotActionsRow}>
              <TouchableOpacity style={styles.smallAction} onPress={resetAllowedSlots}>
                <Text style={styles.smallActionText}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.smallAction} onPress={() => setForm((current) => ({ ...current, allowedTimeSlots: [] }))}>
                <Text style={styles.smallActionText}>Limpiar</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.slotRow}>
              {TIME_SLOTS.map((slot) => {
                const slotKey = getTimeSlotKey(slot);
                const selected = form.allowedTimeSlots.includes(slotKey);

                return (
                  <TouchableOpacity key={slot.code} style={[styles.slotButton, selected && styles.slotButtonSelected]} onPress={() => toggleAllowedSlot(slot)}>
                    <Text style={[styles.slotButtonText, selected && styles.slotButtonTextSelected]}>{slot.code}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={styles.slotHint}>
              {form.allowedTimeSlots.length ? form.allowedTimeSlots.map(getTimeSlotLabel).join(' · ') : 'Si no seleccionas bloques, el espacio permitirá todos los bloques válidos.'}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.secondaryButton} onPress={closeModal}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
                <Text style={styles.primaryButtonText}>Guardar</Text>
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
  searchBar: {
    borderWidth: 1,
    borderColor: '#D9E3F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  filterPanel: {
    backgroundColor: '#F5F8FC',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  filterPanelTitle: {
    color: '#081026',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
  },
  filterButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D9E3F0',
  },
  filterLabel: {
    color: '#3D4B63',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  filterValue: {
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
  createButton: {
    backgroundColor: '#003057',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '800',
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
  cardInactive: {
    opacity: 0.72,
  },
  cardHeader: {
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
  statusBadgeActive: {
    backgroundColor: '#14532d',
  },
  statusBadgeInactive: {
    backgroundColor: '#7c2d12',
  },
  statusBadgeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  cardDescription: {
    color: '#fff',
    lineHeight: 19,
    marginTop: 10,
  },
  slotSummaryRow: {
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 10,
  },
  slotSummaryLabel: {
    color: '#CFE4FF',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  slotSummaryValue: {
    color: '#fff',
    fontWeight: '700',
    lineHeight: 18,
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
  pickerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    maxHeight: '80%',
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    maxHeight: '92%',
  },
  modalTitle: {
    color: '#081026',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  pickerList: {
    maxHeight: 320,
    marginBottom: 14,
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: '#F5F8FC',
    marginBottom: 10,
  },
  pickerOptionText: {
    color: '#081026',
    fontWeight: '800',
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
  sectionLabel: {
    color: '#003057',
    fontWeight: '800',
    marginTop: 6,
    marginBottom: 8,
  },
  chipRow: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    backgroundColor: '#E6EEF8',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#0059e9',
  },
  chipText: {
    color: '#003057',
    fontWeight: '800',
  },
  chipTextSelected: {
    color: '#fff',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  typeButton: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: '#E6EEF8',
    paddingVertical: 10,
    alignItems: 'center',
  },
  typeButtonSelected: {
    backgroundColor: '#003057',
  },
  typeButtonText: {
    color: '#003057',
    fontWeight: '800',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  toggleLabel: {
    color: '#081026',
    fontWeight: '700',
  },
  toggleButton: {
    borderRadius: 999,
    backgroundColor: '#E6EEF8',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  toggleButtonOn: {
    backgroundColor: '#14532d',
  },
  toggleButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
  slotActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  smallAction: {
    borderRadius: 999,
    backgroundColor: '#E6EEF8',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  smallActionText: {
    color: '#003057',
    fontWeight: '800',
  },
  slotRow: {
    gap: 8,
    paddingBottom: 4,
  },
  slotButton: {
    borderRadius: 12,
    backgroundColor: '#E6EEF8',
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  slotButtonSelected: {
    backgroundColor: '#0059e9',
  },
  slotButtonText: {
    color: '#081026',
    fontSize: 12,
    fontWeight: '800',
  },
  slotButtonTextSelected: {
    color: '#fff',
  },
  slotHint: {
    color: '#3D4B63',
    marginTop: 8,
    lineHeight: 18,
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