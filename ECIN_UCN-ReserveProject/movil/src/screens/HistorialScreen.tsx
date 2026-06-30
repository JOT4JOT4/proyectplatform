import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, apiPatch, ApiError } from '../services/apiClient';
import type { ReservationRecord } from '../services/apiTypes';

export default function HistorialScreen() {
  const { token, user } = useAuth();
  const [items, setItems] = React.useState<ReservationRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const loadHistory = React.useCallback(async () => {
    if (!token || !user?.id) {
      return [] as ReservationRecord[];
    }

    const data = await apiGet<ReservationRecord[]>(`/reservations/user/${user.id}`, token);
    return Array.isArray(data) ? data : [];
  }, [token, user?.id]);

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
        const data = await loadHistory();

        if (active) {
          setItems(data);
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
  }, [loadHistory, token, user?.id]);

  const refreshHistory = React.useCallback(async () => {
    const data = await loadHistory();
    setItems(data);
  }, [loadHistory]);

  const handleReservationAction = React.useCallback(
    async (reservationId: string, action: 'confirm' | 'cancel') => {
      if (!token) {
        return;
      }

      const actionLabel = action === 'confirm' ? 'confirmar' : 'cancelar';

      Alert.alert(
        `¿${actionLabel.charAt(0).toUpperCase()}${actionLabel.slice(1)} reserva?`,
        'La acción se enviará al backend y solo afectará tu propia reserva.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Continuar',
            style: action === 'cancel' ? 'destructive' : 'default',
            onPress: async () => {
              try {
                setActionLoadingId(reservationId);
                setError(null);
                await apiPatch(`/reservations/${reservationId}/${action}`, {}, token);
                await refreshHistory();
              } catch (requestError) {
                const message = requestError instanceof ApiError ? requestError.message : `No se pudo ${actionLabel} la reserva.`;
                setError(message);
              } finally {
                setActionLoadingId(null);
              }
            },
          },
        ],
      );
    },
    [refreshHistory, token],
  );

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

            {(item.status === 'pending' || item.status === 'active') ? (
              <View style={styles.actionsRow}>
                {item.status === 'pending' ? (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    disabled={actionLoadingId === item.id}
                    onPress={() => handleReservationAction(item.id, 'confirm')}
                  >
                    <Text style={styles.actionButtonText}>Confirmar</Text>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelButton]}
                  disabled={actionLoadingId === item.id}
                  onPress={() => handleReservationAction(item.id, 'cancel')}
                >
                  <Text style={styles.actionButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            ) : null}
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
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#0059e9',
  },
  cancelButton: {
    backgroundColor: '#a61b1b',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '800',
  },
});