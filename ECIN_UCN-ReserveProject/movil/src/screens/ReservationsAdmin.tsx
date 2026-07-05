import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import { apiGet, apiPatch, ApiError } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import type { ReservationRecord } from '../services/apiTypes';


export default function ReservationsAdmin() {
  const { token } = useAuth();
  const [reservations, setReservations] = React.useState<ReservationRecord[]>([]);

  const loadReservations = async () => {
    const data = await apiGet<ReservationRecord[]>('/reservations', token);
    setReservations(data);
  };

  React.useEffect(() => { loadReservations(); }, []);

  const cancelReservation = async (id: string) => {
    try {
      await apiPatch(`/reservations/${id}/cancel`, {}, token);
      await loadReservations();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo cancelar');
    }
  };

  const blockUser = async (userId: string) => {
    await apiPatch(`/users/${userId}/block`, { blocked: true }, token);
    Alert.alert('Usuario bloqueado');
  };

  const setWeeklyLimit = async (userId: string, limit: number) => {
    await apiPatch(`/users/${userId}`, { weeklyLimit: limit }, token);
    Alert.alert('Límite actualizado');
  };


  return (
    <View>
      <FlatList
  data={reservations}
  keyExtractor={(r) => r.id}
  renderItem={({ item }) => (
    <View style={{ padding: 12, backgroundColor: '#eee', marginBottom: 8 }}>
      <Text>{item.space?.name ?? 'Espacio desconocido'} - {item.date}</Text>
      <Text>Usuario: {item.user?.firstName ?? 'Sin nombre'} {item.user?.lastName ?? 'Sin apellido'} ({item.user?.email ?? 'Sin email'})</Text>

      <TouchableOpacity onPress={() => cancelReservation(item.id)}>
        <Text>Cancelar</Text>
      </TouchableOpacity>

      {item.user?.id && (
        <>
          <TouchableOpacity onPress={() => blockUser(item.user?.id!)}>
            <Text>Bloquear usuario</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setWeeklyLimit(item.user?.id!, 3)}>
            <Text>Limitar a 3 reservas/semana</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )}
/>

    </View>
  );
}
