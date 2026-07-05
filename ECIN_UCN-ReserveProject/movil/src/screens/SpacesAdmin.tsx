import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Modal, TextInput, Alert, StyleSheet } from 'react-native';
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';
import type { Space } from '../services/apiTypes';

export default function SpacesAdmin() {
  const { token } = useAuth();
  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [showModal, setShowModal] = React.useState(false);
  const [editingSpace, setEditingSpace] = React.useState<Space | null>(null);
  const [name, setName] = React.useState('');
  const [zone, setZone] = React.useState('');
  const [type, setType] = React.useState<'room' | 'table'>('table');

  const loadSpaces = async () => {
    const data = await apiGet<Space[]>('/spaces/admin?page=1&limit=100', token);
    setSpaces(data);
  };

  React.useEffect(() => { loadSpaces(); }, []);

  const handleSave = async () => {
    try {
      if (editingSpace) {
        await apiPatch(`/spaces/${editingSpace.id}`, { name, zone, type }, token);
      } else {
        await apiPost('/spaces', { name, zone, type }, token);
      }
      setShowModal(false);
      setEditingSpace(null);
      setName('');
      setZone('');
      await loadSpaces();
    } catch (err) {
      Alert.alert('Error', err instanceof ApiError ? err.message : 'No se pudo guardar');
    }
  };

  const handleDelete = async (spaceId: string) => {
    await apiDelete(`/spaces/${spaceId}`, token);
    await loadSpaces();
  };

  const handleHide = async (spaceId: string) => {
    await apiPatch(`/spaces/${spaceId}`, { isActive: false }, token);
    await loadSpaces();
  };

  return (
    <View>
      <TouchableOpacity onPress={() => setShowModal(true)}>
        <Text>Crear espacio</Text>
      </TouchableOpacity>

      <FlatList
        data={spaces}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text>{item.name} ({item.zone})</Text>
            <TouchableOpacity onPress={() => { setEditingSpace(item); setName(item.name); setZone(item.zone); setShowModal(true); }}>
              <Text>Editar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleHide(item.id)}>
              <Text>Ocultar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text>Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <Modal visible={showModal} transparent>
        <View style={styles.modal}>
          <TextInput value={name} onChangeText={setName} placeholder="Nombre del espacio" />
          <TextInput value={zone} onChangeText={setZone} placeholder="Zona" />
          <TouchableOpacity onPress={handleSave}><Text>Guardar</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowModal(false)}><Text>Cancelar</Text></TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 12, backgroundColor: '#eee', marginBottom: 8 },
  modal: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', padding: 20 }
});
