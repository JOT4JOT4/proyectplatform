import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import dayjs from 'dayjs';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, ApiError } from '../services/apiClient';
import type { Space, SpaceAvailability, OccupiedSlot } from '../services/apiTypes';

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

function overlaps(slot: TimeSlot, occupied: OccupiedSlot) {
  return slot.startTime < occupied.endTime && slot.endTime > occupied.startTime;
}

export default function ReservasScreen() {
  const { token } = useAuth();
  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [search, setSearch] = React.useState('');
  const [selectedZone, setSelectedZone] = React.useState<string | null>(null);
  const [selectedType, setSelectedType] = React.useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = React.useState<TimeSlot | null>(null);
  const [availabilityMap, setAvailabilityMap] = React.useState<Record<string, SpaceAvailability>>({});

  React.useEffect(() => {
    (async () => {
      try {
        const response = await apiGet<Space[]>('/spaces?page=1&limit=100', token);
        setSpaces(response.filter((s) => s.isActive !== false));
      } catch (err) {
        console.warn(err instanceof ApiError ? err.message : 'Error cargando espacios');
      }
    })();
  }, [token]);

  const loadAvailability = async (spaceId: string, date: string) => {
    const data = await apiGet<SpaceAvailability>(`/spaces/${spaceId}/availability?date=${date}`, token);
    setAvailabilityMap((prev) => ({ ...prev, [spaceId]: data }));
  };

  const filteredSpaces = spaces.filter((space) => {
    if (search && !space.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedZone && space.zone !== selectedZone) return false;
    if (selectedType && space.type !== selectedType) return false;

    if (selectedSlot) {
      const availability = availabilityMap[space.id];
      if (!availability) return false;
      const ocupado = availability.ocupiedSlots.some((occ) => overlaps(selectedSlot, occ));
      if (ocupado) return false;
    }

    return true;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Espacios disponibles</Text>

      {/* Barra buscadora */}
      <TextInput
        style={styles.searchBar}
        placeholder="Buscar por nombre..."
        value={search}
        onChangeText={setSearch}
      />

      {/* Filtros */}
      <View style={styles.filtersRow}>
        <TouchableOpacity onPress={() => setSelectedZone(null)}>
          <Text>{selectedZone ?? 'Todas las zonas'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedType(null)}>
          <Text>{selectedType ?? 'Todos los tipos'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedSlot(null)}>
          <Text>{selectedSlot?.label ?? 'Todos los bloques'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredSpaces}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => loadAvailability(item.id, dayjs().format('YYYY-MM-DD'))}
          >
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text>{item.zone} • {item.type}</Text>
            {selectedSlot && <Text>Bloque {selectedSlot.label} disponible</Text>}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  header: { fontSize: 20, fontWeight: '800', marginBottom: 12 },
  searchBar: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 8, marginBottom: 12 },
  filtersRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 },
  card: { padding: 12, backgroundColor: '#003057', borderRadius: 12, marginBottom: 8 },
  cardTitle: { color: '#fff', fontWeight: '700' },
});
