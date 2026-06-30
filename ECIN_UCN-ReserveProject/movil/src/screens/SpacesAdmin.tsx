import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, Alert, StyleSheet } from 'react-native';
import { apiGet, apiPost, apiPatch, ApiError } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import type { Space } from '../services/apiTypes';

export default function SpacesAdmin() {
  const { token } = useAuth();
  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [editModal, setEditModal] = React.useState<{ visible: boolean, space?: Space }>({ visible: false });
  const [form, setForm] = React.useState({ name: '', zone: '', type: '', capacity: '', description: '', imageUrl: '' });

  const loadSpaces = async () => {
    if (!token) return;
    try {
      const response = await apiGet<Space[]>('/spaces', token);
      setSpaces(response.filter(s => s.isActive !== false));
    } catch (err) {
      console.warn('Error cargando espacios', err);
    }
  };

  React.useEffect(() => {
    loadSpaces();
  }, []);

  // Crear espacio
  const handleCreateSpace = async () => {
    if (!token) return;
    try {
      await apiPost('/spaces', {
        name: form.name,
        zone: form.zone,
        type: form.type,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        description: form.description,
        imageUrl: form.imageUrl,
        isActive: true,
      }, token);
      setForm({ name: '', zone: '', type: '', capacity: '', description: '', imageUrl: '' });
      await loadSpaces();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo crear el espacio');
    }
  };

  // Editar espacio
  const handleEditSpace = async () => {
    if (!token || !editModal.space) return;
    try {
      await apiPatch(`/spaces/${editModal.space.id}`, {
        name: form.name,
        zone: form.zone,
        type: form.type,
        capacity: form.capacity ? Number(form.capacity) : undefined,
        description: form.description,
        imageUrl: form.imageUrl,
      }, token);
      setEditModal({ visible: false });
      await loadSpaces();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo editar el espacio');
    }
  };

  // Eliminar espacio
  const handleDeleteSpace = async (id: string) => {
    if (!token) return;
    try {
      await apiPatch(`/spaces/${id}`, { isActive: false }, token);
      await loadSpaces();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo eliminar el espacio');
    }
  };

  // Ocultar espacio
  const handleHideSpace = async (id: string) => {
    if (!token) return;
    try {
      await apiPatch(`/spaces/${id}`, { isActive: false }, token);
      await loadSpaces();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo ocultar el espacio');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Espacios activos</Text>
      {spaces.map(space => (
        <View key={space.id} style={styles.card}>
          <Text style={styles.cardTitle}>{space.name}</Text>
          <Text>{space.zone} • {space.type}</Text>
          <Text>Capacidad: {space.capacity}</Text>
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => {
              setForm({
                name: space.name,
                zone: space.zone,
                type: space.type,
                capacity: String(space.capacity ?? ''),
                description: space.description ?? '',
                imageUrl: space.imageUrl ?? '',
              });
              setEditModal({ visible: true, space });
            }}>
              <Text style={styles.editButton}>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleHideSpace(space.id)}>
              <Text style={styles.hideButton}>Ocultar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDeleteSpace(space.id)}>
              <Text style={styles.deleteButton}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Formulario crear espacio */}
      <Text style={styles.subtitle}>Crear nuevo espacio</Text>
      <TextInput placeholder="Nombre" value={form.name} onChangeText={v => setForm({ ...form, name: v })} style={styles.input} />
      <TextInput placeholder="Zona" value={form.zone} onChangeText={v => setForm({ ...form, zone: v })} style={styles.input} />
      <TextInput placeholder="Tipo" value={form.type} onChangeText={v => setForm({ ...form, type: v })} style={styles.input} />
      <TextInput placeholder="Capacidad" value={form.capacity} onChangeText={v => setForm({ ...form, capacity: v })} style={styles.input} keyboardType="numeric" />
      <TextInput placeholder="Descripción" value={form.description} onChangeText={v => setForm({ ...form, description: v })} style={styles.input} />
      <TextInput placeholder="Imagen URL" value={form.imageUrl} onChangeText={v => setForm({ ...form, imageUrl: v })} style={styles.input} />
      <TouchableOpacity style={styles.createButton} onPress={handleCreateSpace}>
        <Text style={styles.createButtonText}>Crear espacio</Text>
      </TouchableOpacity>

      {/* Modal editar */}
      <Modal visible={editModal.visible} transparent animationType="slide">
        <View style={styles.modal}>
          <Text style={styles.title}>Editar espacio</Text>
          <TextInput placeholder="Nombre" value={form.name} onChangeText={v => setForm({ ...form, name: v })} style={styles.input} />
          <TextInput placeholder="Zona" value={form.zone} onChangeText={v => setForm({ ...form, zone: v })} style={styles.input} />
          <TextInput placeholder="Tipo" value={form.type} onChangeText={v => setForm({ ...form, type: v })} style={styles.input} />
          <TextInput placeholder="Capacidad" value={form.capacity} onChangeText={v => setForm({ ...form, capacity: v })} style={styles.input} keyboardType="numeric" />
          <TextInput placeholder="Descripción" value={form.description} onChangeText={v => setForm({ ...form, description: v })} style={styles.input} />
          <TextInput placeholder="Imagen URL" value={form.imageUrl} onChangeText={v => setForm({ ...form, imageUrl: v })} style={styles.input} />
          <TouchableOpacity onPress={handleEditSpace}><Text>Guardar cambios</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setEditModal({ visible: false })}><Text>Cerrar</Text></TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  subtitle: { fontSize: 16, fontWeight: '600', marginTop: 20 },
  card: { backgroundColor: '#f5f5f5', padding: 12, marginBottom: 10, borderRadius: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  editButton: { color: 'blue' },
  hideButton: { color: 'orange' },
  deleteButton: { color: 'red' },
  input: { borderWidth: 1, borderColor: '#ccc', marginBottom: 10, padding: 8, borderRadius: 6 },
  createButton: { backgroundColor: '#0059e9', padding: 12, borderRadius: 8, marginTop: 10 },
  createButtonText: { color: '#fff', textAlign: 'center', fontWeight: '700' },
  modal: { backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 12 },
});
