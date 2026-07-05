import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import SpacesAdmin from './SpacesAdmin';
import ReservationsAdmin from './ReservationsAdmin';
import ReservasScreen from './ReservasScreen';
import ConfigScreen from './ConfigScreen';

export default function AdminScreen() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = React.useState<'spaces' | 'reservations' | 'reservas' | 'config'>('spaces');

  const renderContent = () => {
    switch (activeTab) {
      case 'spaces':
        return <SpacesAdmin />;
      case 'reservations':
        return <ReservationsAdmin />;
      case 'reservas':
        return <ReservasScreen />;
      case 'config':
        return <ConfigScreen />;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'spaces' && styles.activeTab]}
            onPress={() => setActiveTab('spaces')}
          >
            <Text style={[styles.tabText, activeTab === 'spaces' && styles.activeTabText]}>Espacios</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'reservations' && styles.activeTab]}
            onPress={() => setActiveTab('reservations')}
          >
            <Text style={[styles.tabText, activeTab === 'reservations' && styles.activeTabText]}>Reservas</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'reservas' && styles.activeTab]}
            onPress={() => setActiveTab('reservas')}
          >
            <Text style={[styles.tabText, activeTab === 'reservas' && styles.activeTabText]}>Reservar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'config' && styles.activeTab]}
            onPress={() => setActiveTab('config')}
          >
            <Text style={[styles.tabText, activeTab === 'config' && styles.activeTabText]}>Configuración</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {/* Contenido dinámico */}
      <View style={styles.content}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: { backgroundColor: '#003057' },
  tabRow: { flexDirection: 'row' },
  tabButton: { flex: 1, padding: 14, alignItems: 'center' },
  tabText: { color: '#CFE4FF', fontWeight: '600' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#fff' },
  activeTabText: { color: '#fff', fontWeight: '800' },
  logoutButton: {
    alignSelf: 'flex-end',
    marginRight: 12,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#DCEBFF',
  },
  logoutText: { color: '#003057', fontWeight: '800' },
  content: { flex: 1, padding: 16 },
});
