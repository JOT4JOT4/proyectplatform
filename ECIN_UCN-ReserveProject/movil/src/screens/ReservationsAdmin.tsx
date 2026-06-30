import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Alert, Modal, StyleSheet } from 'react-native';
import { apiGet, apiPost, apiPatch, ApiError } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import type { ReservationRecord, Space, BackendUser } from '../services/apiTypes';

export default function ReservationsAdmin() {
  const { token } = useAuth();
  const [reservations, setReservations] = React.useState<ReservationRecord[]>([]);
  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [users, setUsers] = React.useState<BackendUser[]>([]);
  const [cancelModal, setCancelModal] = React.useState<{ id: string | null, reason: string }>({ id: null, reason: '' });
  const [createModal, setCreateModal] = React.useState<{ visible: boolean, userId: string, spaceId: string, date: string, startTime: string, endTime: string }>({
    visible: false, userId: '', spaceId: '', date: '', startTime: '', endTime: ''
  });

  // Cargar reservas y espacios
  const loadData = async () => {
    if (!token) return;
    try {
      const [reservationsResponse, spacesResponse, usersResponse] = await Promise.all([
        apiGet<ReservationRecord[]>('/reservations', token),
        apiGet<Space[]>('/spaces', token),
        apiGet<BackendUser[]>('/users', token),
      ]);
      setReservations(reservationsResponse);
      setSpaces(spacesResponse);
      setUsers(usersResponse);
    } catch (err) {
      console.warn('Error cargando datos', err);
    }
  };

  React.useEffect(() => {
    loadData();

    // Ejemplo de tiempo real con polling (puedes reemplazar con WebSocket)
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Cancelar reserva con motivo
  const handleCancelReservation = async () => {
    if (!token || !cancelModal.id) return;
    try {
      await apiPatch(`/reservations/${cancelModal.id}/cancel`, { reason: cancelModal.reason }, token);
      setCancelModal({ id: null, reason: '' });
      await loadData();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo cancelar la reserva');
    }
  };

  // Crear reserva para otro usuario
  const handleCreateReservation = async () => {
    if (!token) return;
    try {
      await apiPost('/reservations', {
        userId: createModal.userId,
        spaceId: createModal.spaceId,
        date: createModal.date,
        startTime: createModal.startTime,
        endTime: createModal.endTime,
      }, token);
      setCreateModal({ ...createModal, visible: false });
      await loadData();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo crear la reserva');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Reservas actuales</Text>
      {reservations.map(r => (
        <View key={r.id} style={styles.card}>
          <Text>{r.space?.name} • {r.date} {r.startTime}-{r.endTime}</Text>
          <Text>Usuario: {r.user?.email}</Text>
          <Text>Estado: {r.status}</Text>
          {r.status === 'active' || r.status === 'pending' ? (
            <TouchableOpacity onPress={() => setCancelModal({ id: r.id, reason: '' })}>
              <Text style={styles.cancelButton}>Cancelar con motivo</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ))}

      <TouchableOpacity style={styles.createButton} onPress={() => setCreateModal({ ...createModal, visible: true })}>
        <Text style={styles.createButtonText}>Crear reserva para otro usuario</Text>
      </TouchableOpacity>

      {/* Modal cancelar */}
      <Modal visible={!!cancelModal.id} transparent animationType="slide">
        <View style={styles.modal}>
          <Text>Motivo de cancelación</Text>
          <TextInput
            style={styles.input}
            value={cancelModal.reason}
            onChangeText={(text) => setCancelModal({ ...cancelModal, reason: text })}
          />
          <TouchableOpacity onPress={handleCancelReservation}><Text>Confirmar</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setCancelModal({ id: null, reason: '' })}><Text>Cerrar</Text></TouchableOpacity>
        </View>
      </Modal>

      {/* Modal crear */}
      <Modal visible={createModal.visible} transparent animationType="slide">
        <View style={styles.modal}>
          <Text>Crear nueva reserva</Text>
          <TextInput placeholder="Usuario ID" value={createModal.userId} onChangeText={(v) => setCreateModal({ ...createModal, userId: v })} />
          <TextInput placeholder="Espacio ID" value={createModal.spaceId} onChangeText={(v) => setCreateModal({ ...createModal, spaceId: v })} />
          <TextInput placeholder="Fecha (YYYY-MM-DD)" value={createModal.date} onChangeText={(v) => setCreateModal({ ...createModal, date: v })} />
          <TextInput placeholder="Hora inicio" value={createModal.startTime} onChangeText={(v) => setCreateModal({ ...createModal, startTime: v })} />
          <TextInput placeholder="Hora fin" value={createModal.endTime} onChangeText={(v) => setCreateModal({ ...createModal, endTime: v })} />
          <TouchableOpacity onPress={handleCreateReservation}><Text>Guardar</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setCreateModal({ ...createModal, visible: false })}><Text>Cerrar</Text></TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  card: { backgroundColor: '#f5f5f5', padding: 12, marginBottom: 10, borderRadius: 8 },
  cancelButton: { color: 'red', marginTop: 6 },
  createButton: { backgroundColor: '#0059e9', padding: 12, borderRadius: 8, marginTop: 20 },
  createButtonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  modal: { backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', marginBottom: 10, padding: 8, borderRadius: 6 },
});
