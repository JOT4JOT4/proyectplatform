import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useAuth } from '../contexts/AuthContext';
import { apiPost, ApiError } from '../services/apiClient';
import { GOOGLE_AUTH_URL } from '../config/environment';
import type { AuthExchangeResponse } from '../services/apiTypes';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [isSigningIn, setIsSigningIn] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setError(null);
      setIsSigningIn(true);

      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'reservasucn',
        path: 'auth/callback',
      });

      const result = await WebBrowser.openAuthSessionAsync(GOOGLE_AUTH_URL, redirectUri);

      if (result.type !== 'success' || !result.url) {
        return;
      }

      const callbackUrl = new URL(result.url);
      const code = callbackUrl.searchParams.get('code');

      if (!code) {
        throw new Error('No se recibió el código de autenticación.');
      }

      const payload = await apiPost<AuthExchangeResponse>('/auth/exchange', { code });

      if (!payload?.access_token || !payload?.user) {
        throw new Error(payload?.message ?? 'No se pudo completar el inicio de sesión');
      }

      await signIn(payload.user, payload.access_token);
    } catch (signInError) {
      const message = signInError instanceof ApiError
        ? signInError.message
        : signInError instanceof Error
          ? signInError.message
          : 'No se pudo iniciar sesión';
      setError(message);
      console.warn('Failed to complete Google login', signInError);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.kicker}>Reserva de espacios UCN</Text>
        <Text style={styles.title}>Acceso seguro</Text>
        <Text style={styles.subtitle}>Inicia sesión con tu cuenta institucional para reservar espacios</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleGoogleSignIn} disabled={isSigningIn}>
          {isSigningIn ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continuar con Google</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#003057',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
  },
  kicker: {
    color: '#0059e9',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  title: {
    color: '#081026',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  subtitle: {
    color: '#3D4B63',
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 18,
  },
  error: {
    color: '#b42318',
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#0059e9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});