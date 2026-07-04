import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import SpacesAdmin from './SpacesAdmin';
import ReservationsAdmin from './ReservationsAdmin';

export default function AdminScreen() {
  const [activeTab, setActiveTab] = React.useState<'spaces' | 'reservations'>('spaces');

  return (
    <View style={styles.container}>
      {/* Barra de pestañas */}
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
      </View>

      {/* Contenido dinámico */}
      <View style={styles.content}>
        {activeTab === 'spaces' ? <SpacesAdmin /> : <ReservationsAdmin />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  tabRow: { flexDirection: 'row', backgroundColor: '#003057' },
  tabButton: { flex: 1, padding: 14, alignItems: 'center' },
  tabText: { color: '#CFE4FF', fontWeight: '600' },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#fff' },
  activeTabText: { color: '#fff', fontWeight: '800' },
  content: { flex: 1, padding: 16 },
});
