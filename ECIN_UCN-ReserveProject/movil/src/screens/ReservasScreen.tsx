import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';

type Item = {
  id: string;
  title: string;
  details: string;
};

const SAMPLE: Item[] = [
  { id: '1', title: 'Sala A - 09:00', details: 'Capacidad 10. Proyector disponible.' },
  { id: '2', title: 'Sala B - 11:00', details: 'Capacidad 6. Videoconferencia.' },
  { id: '3', title: 'Sala C - 14:00', details: 'Capacidad 4. Sin equipamiento.' },
];

export default function ReservasScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (id: string) => setExpanded((s) => (s === id ? null : id));

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Reservas disponibles</Text>
      <FlatList
        data={SAMPLE}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => toggle(item.id)} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            {expanded === item.id && <Text style={styles.cardDetails}>{item.details}</Text>}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#081026',
    padding: 16,
  },
  header: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#EAF2FF',
    fontWeight: '700',
  },
  cardDetails: {
    marginTop: 8,
    color: '#A8B4C8',
  },
});
