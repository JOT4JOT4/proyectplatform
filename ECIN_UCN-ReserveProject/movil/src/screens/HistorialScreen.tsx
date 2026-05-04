import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

const HISTORY = [
  { id: 'h1', title: 'Sala A - 2026-04-20', status: 'Completada' },
  { id: 'h2', title: 'Sala B - 2026-04-30', status: 'Pendiente' },
];

export default function HistorialScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.header}>Historial de reservas</Text>
      <FlatList
        data={HISTORY}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowStatus}>{item.status}</Text>
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
    backgroundColor: '#081026',
  },
  header: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  row: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 10,
  },
  rowTitle: {
    color: '#EAF2FF',
    fontWeight: '700',
  },
  rowStatus: {
    marginTop: 6,
    color: '#A8B4C8',
    fontSize: 13,
  },
});
