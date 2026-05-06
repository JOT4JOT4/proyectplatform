import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, ApiError } from '../services/apiClient';
import type { HistorialReserva } from '../services/apiTypes';

const HISTORY: HistorialReserva[] = [
  { id: 'h1', title: 'Sala A - 2026-04-20', status: 'Completada' },
  { id: 'h2', title: 'Sala B - 2026-04-30', status: 'Pendiente' },
];

export default function HistorialScreen() {
  const { token } = useAuth();
  const [items, setItems] = React.useState<HistorialReserva[]>(HISTORY);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiGet<HistorialReserva[]>('/historial', token);

        if (active && Array.isArray(data) && data.length > 0) {
          setItems(data);
        }
      } catch (requestError) {
        if (requestError instanceof ApiError && requestError.status === 404) {
          return;
        }

        if (active) {
          setError('Se muestra historial de ejemplo mientras el backend no expone /historial.');
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
  }, [token]);

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <Text style={styles.header}>Historial de reservas</Text>
      {isLoading ? <Text style={styles.note}>Cargando historial autenticado...</Text> : null}
      {error ? <Text style={styles.note}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowStatus}>{item.status}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#081026',
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
  row: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
  },
  rowTitle: {
    color: '#EAF2FF',
    fontWeight: '700',
  },
  rowStatus: {
    marginTop: 6,
    color: '#A8B4C8',
    fontSize: 13,
  },
});
