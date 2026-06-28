import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, ApiError } from '../services/apiClient';
import type { ReservationRecord } from '../services/apiTypes';

export default function HistorialScreen() {
  const { token, user } = useAuth();
  const [items, setItems] = React.useState<ReservationRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token || !user?.id) {
      setItems([]);
      return;
    }

    let active = true;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiGet<ReservationRecord[]>(`/reservations/user/${user.id}`, token);

        if (active) {
          setItems(Array.isArray(data) ? data : []);
        }
      } catch (requestError) {
        if (active) {
          const message = requestError instanceof ApiError ? requestError.message : 'No se pudo cargar el historial desde el backend.';
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
  }, [token, user?.id]);

  return (
    <View style={styles.container}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <Text style={styles.header}>Historial de reservas</Text>
      <Text style={styles.subheader}>Tus reservas reales consultadas desde el backend.</Text>

      {isLoading ? <Text style={styles.note}>Cargando historial...</Text> : null}
      {error ? <Text style={styles.note}>{error}</Text> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={<Text style={styles.emptyState}>Aún no tienes reservas registradas.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{item.space?.name ?? 'Espacio reservado'}</Text>
            <Text style={styles.rowMeta}>{item.date} • {item.startTime} - {item.endTime}</Text>
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
    backgroundColor: '#ffffff',
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
  note: {
    color: '#A8B4C8',
    marginBottom: 10,
  },
  emptyState: {
    color: '#3D4B63',
    marginTop: 12,
  },
  row: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#003057',
    marginBottom: 12,
  },
  rowTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  rowMeta: {
    color: '#CFE4FF',
    marginTop: 6,
  },
  rowStatus: {
    color: '#fff',
    marginTop: 6,
    fontWeight: '700',
  },
});