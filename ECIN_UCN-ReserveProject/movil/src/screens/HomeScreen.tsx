import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, SafeAreaView } from 'react-native';

import { API_URL } from '../config/environment';

const highlights = [
  {
    title: 'Base lista para crecer',
    description: 'Estructura inicial con separación por pantallas, configuración y utilidades.',
  },
  {
    title: 'API preparada',
    description: 'La URL del backend queda centralizada para conectar login, reservas o perfiles.',
  },
  {
    title: 'Expo + TypeScript',
    description: 'Arranque rápido para Android, iOS y web con tipado estricto desde el inicio.',
  },
];

export function HomeScreen() {
  return (
    <View style={styles.background}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Mobile starter</Text>
            </View>
            <Text style={styles.title}>ECIN UCN Reserva</Text>
            <Text style={styles.subtitle}>
              Punto de partida móvil para la aplicación de reservas. Aquí puedes conectar el backend,
              definir pantallas y crecer sin rehacer la base.
            </Text>

            <View style={styles.endpointCard}>
              <Text style={styles.endpointLabel}>Backend configurado</Text>
              <Text style={styles.endpointValue}>{API_URL}</Text>
              <Text style={styles.endpointHint}>
                Cambia esta URL en `.env` cuando necesites apuntar a tu API local o de red.
              </Text>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Fundación incluida</Text>
            <Text style={styles.sectionSubtitle}>Tres piezas para arrancar el flujo móvil con orden.</Text>
          </View>

          {highlights.map((item) => (
            <View key={item.title} style={styles.highlightCard}>
              <Text style={styles.highlightTitle}>{item.title}</Text>
              <Text style={styles.highlightDescription}>{item.description}</Text>
            </View>
          ))}

          <View style={styles.footerCard}>
            <Text style={styles.footerTitle}>Siguiente paso natural</Text>
            <Text style={styles.footerText}>
              Crear navegación, estados de autenticación y la primera pantalla funcional de la app.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#0A1120',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  glowTop: {
    position: 'absolute',
    top: -60,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 180,
    backgroundColor: 'rgba(88, 160, 255, 0.18)',
  },
  glowBottom: {
    position: 'absolute',
    bottom: -80,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: 'rgba(110, 231, 183, 0.12)',
  },
  heroCard: {
    backgroundColor: 'rgba(10, 17, 32, 0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    borderRadius: 28,
    padding: 20,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(88, 160, 255, 0.16)',
  },
  badgeText: {
    color: '#CFE4FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#F7FAFF',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: '#B8C3D9',
    fontSize: 15,
    lineHeight: 22,
  },
  endpointCard: {
    marginTop: 6,
    padding: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 6,
  },
  endpointLabel: {
    color: '#7EB6FF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  endpointValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  endpointHint: {
    color: '#A8B4C8',
    fontSize: 13,
    lineHeight: 18,
  },
  sectionHeader: {
    paddingTop: 8,
    gap: 4,
  },
  sectionTitle: {
    color: '#F7FAFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: '#AAB7CE',
    fontSize: 14,
    lineHeight: 20,
  },
  highlightCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 22,
    padding: 16,
    gap: 8,
  },
  highlightTitle: {
    color: '#F7FAFF',
    fontSize: 16,
    fontWeight: '700',
  },
  highlightDescription: {
    color: '#B8C3D9',
    fontSize: 14,
    lineHeight: 20,
  },
  footerCard: {
    marginTop: 4,
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(126, 182, 255, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(126, 182, 255, 0.16)',
    gap: 6,
  },
  footerTitle: {
    color: '#F7FAFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    color: '#D2DCEB',
    fontSize: 14,
    lineHeight: 20,
  },
});