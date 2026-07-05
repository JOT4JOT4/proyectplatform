import React from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { apiPost } from '../services/apiClient';
import { useAuth } from '../contexts/AuthContext';

export default function ConfigScreen() {
  const { token } = useAuth();
  const [maxReservationTime, setMaxReservationTime] = React.useState('');
  const [maxCancelTime, setMaxCancelTime] = React.useState('');
  const [weeklyLimit, setWeeklyLimit] = React.useState('');

  const saveConfig = async () => {
    await apiPost('/reservations/settings', { key: 'maxReservationTime', value: maxReservationTime }, token);
    await apiPost('/reservations/settings', { key: 'maxCancelTime', value: maxCancelTime }, token);
    await apiPost('/reservations/settings', { key: 'weeklyLimit', value: weeklyLimit }, token);
    Alert.alert('Configuración guardada');
  };

  return (
    <View style={{ padding: 16 }}>
      <Text>Tiempo máximo para reservar (horas)</Text>
      <TextInput value={maxReservationTime} onChangeText={setMaxReservationTime} keyboardType="numeric" />

      <Text>Tiempo máximo para cancelar (horas)</Text>
      <TextInput value={maxCancelTime} onChangeText={setMaxCancelTime} keyboardType="numeric" />

      <Text>Límite semanal de reservas</Text>
      <TextInput value={weeklyLimit} onChangeText={setWeeklyLimit} keyboardType="numeric" />

      <TouchableOpacity onPress={saveConfig}><Text>Guardar</Text></TouchableOpacity>
    </View>
  );
}
