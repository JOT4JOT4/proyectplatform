import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import ReservasScreen from '../screens/ReservasScreen';
import HistorialScreen from '../screens/HistorialScreen';
import { useAuth } from '../contexts/AuthContext';

const Tab = createBottomTabNavigator();

export function MainTabNavigator() {
  const { signOut } = useAuth();

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: true,
        headerRight: () => (
          <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Reservas" component={ReservasScreen} />
      <Tab.Screen name="Historial" component={HistorialScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    marginRight: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#DCEBFF',
  },
  logoutText: {
    color: '#003057',
    fontSize: 12,
    fontWeight: '800',
  },
});

export default MainTabNavigator;
