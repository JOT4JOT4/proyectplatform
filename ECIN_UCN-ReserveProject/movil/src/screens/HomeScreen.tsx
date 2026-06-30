import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { apiGet, ApiError } from '../services/apiClient';
import type { ReservationRecord, Space, SpacesResponse } from '../services/apiTypes';

type MainTabParamList = {
  Home: undefined;
  Reservas: undefined;
  Historial: undefined;
};

function normalizeSpacesResponse(response: SpacesResponse | Space[] | { data?: Space[] }): Space[] {
  if (Array.isArray(response)) {
    return response;
  }

  if ('data' in response && Array.isArray(response.data)) {
    return response.data;
  }

  return [];
}

export function HomeScreen() {
  const { token, user } = useAuth();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !user?.id) {
      setSpaces([]);
      setReservations([]);
      return;
    }

    let active = true;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [spacesResponse, reservationsResponse] = await Promise.all([
          apiGet<SpacesResponse | Space[] | { data?: Space[] }>('/spaces?page=1&limit=8', token),
          apiGet<ReservationRecord[]>(`/reservations/user/${user.id}`, token),
        ]);

        if (!active) {
          return;
        }

        setSpaces(normalizeSpacesResponse(spacesResponse).filter((space) => space.isActive !== false));
        setReservations(Array.isArray(reservationsResponse) ? reservationsResponse : []);
      } catch (requestError) {
        if (active) {
          const message = requestError instanceof ApiError ? requestError.message : 'No se pudo cargar el tablero desde el backend.';
          setError(message);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [token, user?.id]);

  const upcomingReservations = reservations.filter((reservation) => reservation.status !== 'cancelled');
  const activeSpacesCount = spaces.length;
  const activeReservationsCount = upcomingReservations.length;
  const latestReservation = upcomingReservations[0] ?? null;
  const featuredSpaces = spaces.slice(0, 3);

  return (
    <View style={styles.background}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.heroCard}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Dashboard real</Text>
            </View>
            <Text style={styles.title}>Hola{user?.firstName ? `, ${user.firstName}` : ''}</Text>
            <Text style={styles.subtitle}>
              Aquí ves espacios y reservas consultados directamente desde el backend, sin datos de prueba.
            </Text>

            <View style={styles.metricRow}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Espacios</Text>
                <Text style={styles.metricValue}>{activeSpacesCount}</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>Reservas</Text>
                <Text style={styles.metricValue}>{activeReservationsCount}</Text>
              </View>
            </View>

            <Text style={styles.ctaButton} onPress={() => navigation.navigate('Reservas')}>
              Reservar ahora
            </Text>
          </View>

          {isLoading ? <ActivityIndicator color="#003057" /> : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Reserva más reciente</Text>
            {latestReservation ? (
              <>
                <Text style={styles.sectionBody}>{latestReservation.space?.name ?? 'Espacio reservado'}</Text>
                <Text style={styles.sectionMeta}>
                  {latestReservation.date} • {latestReservation.startTime} - {latestReservation.endTime} • {latestReservation.status}
                </Text>
              </>
            ) : (
              <Text style={styles.sectionBody}>Todavía no tienes reservas activas.</Text>
            )}
          </View>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Espacios destacados</Text>
            {featuredSpaces.length > 0 ? featuredSpaces.map((space) => (
              <View key={space.id} style={styles.spaceCard}>
                <Text style={styles.spaceTitle}>{space.name}</Text>
                <Text style={styles.spaceMeta}>{space.zone} • {space.type}</Text>
                {space.description ? <Text style={styles.spaceDescription}>{space.description}</Text> : null}
              </View>
            )) : <Text style={styles.sectionBody}>No hay espacios disponibles para mostrar.</Text>}
          </View>

          <View style={styles.footerCard}>
            <Text style={styles.footerTitle}>Soporte</Text>
            <Text style={styles.footerText}>
              Telefono: +56 9 1234 5678{'\n'}
              Email: soporte@ucn.cl{'\n'}
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
  },
  title: {
    color: '#ffffff',
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 22,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    backgroundColor: '#ffffff',
  },
  metricLabel: {
    color: '#3D4B63',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#081026',
    fontSize: 28,
    fontWeight: '700',
  },
  ctaButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    color: '#003057',
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    overflow: 'hidden',
  },
  errorText: {
    color: '#b42318',
  },
  sectionCard: {
    backgroundColor: '#003057',
    borderRadius: 22,
    padding: 18,
    gap: 8,
  },
  sectionTitle: {
    color: '#F7FAFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionBody: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionMeta: {
    color: '#CFE4FF',
    fontSize: 13,
  },
  spaceCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
  },
  spaceTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  spaceMeta: {
    color: '#CFE4FF',
    marginTop: 4,
    fontSize: 12,
  },
  spaceDescription: {
    color: '#ffffff',
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
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
  },
  footerText: {
    color: '#D2DCEB',
    fontSize: 14,
    lineHeight: 20,
  },
});