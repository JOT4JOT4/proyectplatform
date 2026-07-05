import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { apiPatch } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';

export default function ConfigScreen() {
  const { token } = useAuth();
  const [maxReservationTime, setMaxReservationTime] = React.useState('');
  const [maxCancelTime, setMaxCancelTime] = React.useState('');

  const saveConfig = async () => {
    await apiPatch('/config', {
      maxReservationTime: Number(maxReservationTime),
      maxCancelTime: Number(maxCancelTime),
    }, token);
    Alert.alert('Configuración guardada');
  };

  return (
    <View style={{ padding: 16 }}>
      <Text>Tiempo máximo para reservar (horas)</Text>
      <TextInput value={maxReservationTime} onChangeText={setMaxReservationTime} keyboardType="numeric" />
      <Text>Tiempo máximo para cancelar (horas)</Text>
      <TextInput value={maxCancelTime} onChangeText={setMaxCancelTime} keyboardType="numeric" />
      <TouchableOpacity onPress={saveConfig}><Text>Guardar</Text></TouchableOpacity>
    </View>
  );
}
