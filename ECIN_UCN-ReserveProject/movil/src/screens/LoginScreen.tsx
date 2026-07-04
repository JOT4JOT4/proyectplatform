import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
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
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      setError(null);
      setIsSigningIn(true);

      // Usamos el esquema registrado en app.json
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'reservasucn',
        path: 'auth/callback',
      });

      // URL del backend en Railway (ejemplo)
      const authUrl = `${GOOGLE_AUTH_URL}?redirect_uri=${encodeURIComponent(redirectUri)}`;

      const authSessionPromise = WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      const timeoutPromise = new Promise<{ type: 'timeout' }>((resolve) => {
        timeoutId = setTimeout(() => resolve({ type: 'timeout' }), 90_000);
      });

      const result = await Promise.race([authSessionPromise, timeoutPromise]);

      if (result.type === 'timeout') {
        throw new Error('La autenticación tardó demasiado.');
      }

      if (result.type !== 'success' || !result.url) {
        return;
      }

      // Capturamos el code desde la URL de redirección
      const callbackUrl = new URL(result.url);
      const code = callbackUrl.searchParams.get('code');
      const errorMsg = callbackUrl.searchParams.get('error');

      if (errorMsg) {
        throw new Error(decodeURIComponent(errorMsg));
      }

      if (!code) {
        throw new Error('No se recibió el código de autenticación.');
      }

      // Intercambiamos el code por token en /auth/exchange
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
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setIsSigningIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBrand}>
        <Image
          source={require('../../assets/ucn-isologo-2018.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>Reserva de espacios</Text>
      </View>

      <View style={styles.cardWrap}>
        <View style={styles.card}>
          <Text style={styles.kicker}>Acceso seguro</Text>
          <Text style={styles.subtitle}>Inicia sesión con tu cuenta institucional para reservar espacios</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity style={styles.button} onPress={handleGoogleSignIn} disabled={isSigningIn}>
            {isSigningIn ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.buttonContent}>
                <Image
                  source={require('../../assets/250px-Google__G__logo.svg.webp')}
                  style={styles.googleLogo}
                  resizeMode="contain"
                />
                <Text style={styles.buttonText}>Continuar con Google</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>© 2026 UCN. Todos los derechos reservados.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  topBrand: { alignItems: 'center', paddingTop: 20, paddingBottom: 8, backgroundColor: '#003057' },
  cardWrap: { flex: 1, justifyContent: 'center' },
  card: { backgroundColor: '#003057', borderRadius: 24, padding: 24 },
  logo: { width: 170, height: 70, marginBottom: 10 },
  kicker: {
    color: '#DCEBFF', fontSize: 13, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, textAlign: 'center',
  },
  title: {
    color: '#ffffff', fontSize: 24, fontWeight: '800',
    marginBottom: 10, fontFamily: 'MyriadPro-regular', textAlign: 'center',
  },
  subtitle: {
    color: '#ffffff', fontSize: 15, lineHeight: 21,
    marginBottom: 18, textAlign: 'center',
  },
  error: { color: '#b42318', marginBottom: 14, textAlign: 'center' },
  button: { backgroundColor: '#0059e9', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  googleLogo: { width: 20, height: 20 },
  buttonText: { color: '#fff', fontWeight: '700' },
  footer: { alignItems: 'center', paddingBottom: 8 },
  footerText: { color: '#6B778C', fontSize: 12, textAlign: 'center' },
});
