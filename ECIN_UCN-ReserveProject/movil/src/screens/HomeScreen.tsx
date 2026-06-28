import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ScrollView, SafeAreaView } from 'react-native';

import { API_URL } from '../config/environment';

const highlights = [
  {
    title: 'Reservar',
    description: 'Abajo encontrarás la pantalla para reservar salas, con selección de fecha, hora y espacio.',
  },
  {
    title: 'Historial',
    description: 'Ofrecemos una pantalla de historial para revisar tus reservas pasadas y futuras, con detalles de cada una.',
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
          

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ECIN RESERVAS UCN</Text>
            <Text style={styles.sectionSubtitle}>Aplicación para la reserva de espacios en la escuela de ingeniería </Text>
          </View>

          {highlights.map((item) => (
            <View key={item.title} style={styles.highlightCard}>
              <Text style={styles.highlightTitle}>{item.title}</Text>
              <Text style={styles.highlightDescription}>{item.description}</Text>
            </View>
          ))}
          <View style={styles.footerCard}>
            <Text style={styles.footerTitle}>Preguntas Fecuentes</Text>
            <Text style={styles.footerText}>
              ¿Que hago después de reservar?{'\n'}
              una ves reservada, recibirás un correo de confirmación con el detalle de tu reserva, simplemente dirigete a la sala, esta esperará abierta{'\n'}
              ¿Que hago después de reservar?{'\n'}
              una ves reservada, recibirás un correo de confirmación con el detalle de tu reserva, simplemente dirigete a la sala, esta esperará abierta{'\n'}
            </Text>
          </View>
          <View style={styles.footerCard}>
            <Text style={styles.footerTitle}>Soporte</Text>
            <Text style={styles.footerText}>
              Telefono: +56 9 1234 5678{'\n'}
              Email: soporte@ucn.cl {'\n'}
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
    backgroundColor: '#ffffff',
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
    backgroundColor: '#003057',
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
    backgroundColor: '#003057',
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
    backgroundColor: '#003057',
  },
  badgeText: {
    color: '#CFE4FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: 'MyriadPro-regular',
  },
  title: {
    color: '#ffffff',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.6,
    fontFamily: 'MyriadPro-regular',
  },
  subtitle: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'MyriadPro-regular',
  },
  endpointCard: {
    marginTop: 6,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#003057',
    borderWidth: 1,
    borderColor: '#00182b',
    gap: 6,
  },
  endpointLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    fontFamily: 'MyriadPro-regular',
  },
  endpointValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'MyriadPro-regular',
  },
  endpointHint: {
    color: '#ffffff',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'MyriadPro-regular',
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
    fontFamily: 'MyriadPro-regular',
  },
  sectionSubtitle: {
    color: '#AAB7CE',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'MyriadPro-regular',
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
    fontFamily: 'MyriadPro-regular',
  },
  highlightDescription: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'MyriadPro-regular',
  },
  footerCard: {
    marginTop: 4,
    borderRadius: 22,
    padding: 18,
    backgroundColor: '#003057',
    borderWidth: 1,
    borderColor: 'rgba(126, 182, 255, 0.16)',
    gap: 6,
  },
  footerTitle: {
    color: '#F7FAFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'MyriadPro-regular',
  },
  footerText: {
    color: '#D2DCEB',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'MyriadPro-regular',
  },
});