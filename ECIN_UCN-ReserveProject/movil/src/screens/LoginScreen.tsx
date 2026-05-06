import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../contexts/AuthContext';
import { GOOGLE_AUTH_CALLBACK_URL, GOOGLE_AUTH_URL } from '../config/environment';

WebBrowser.maybeCompleteAuthSession();

const ENABLE_MOCK_AUTH = true;
const MOCK_USER = {
  email: 'demo@ucn.cl',
  firstName: 'Usuario',
  lastName: 'Demo',
  picture: undefined,
  role: 'student',
  id: 0,
};

const MOCK_TOKEN = 'demo-token';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [isSigningIn, setIsSigningIn] = React.useState(false);

  React.useEffect(() => {
    if (!ENABLE_MOCK_AUTH) {
      return;
    }

    let active = true;

    (async () => {
      setIsSigningIn(true);
      await signIn(MOCK_USER, MOCK_TOKEN);

      if (active) {
        setIsSigningIn(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [signIn]);

  const handleGoogleSignIn = async () => {
    if (ENABLE_MOCK_AUTH) {
      await signIn(MOCK_USER, MOCK_TOKEN);
      return;
    }

    try {
      setIsSigningIn(true);
      const result = await WebBrowser.openAuthSessionAsync(GOOGLE_AUTH_URL, GOOGLE_AUTH_CALLBACK_URL);

      if (result.type !== 'success' || !result.url) {
        return;
      }

      const response = await fetch(result.url);
      const payload = await response.json();

      if (!response.ok || !payload?.access_token || !payload?.user) {
        throw new Error(payload?.message ?? 'No se pudo completar el inicio de sesión');
      }

      await signIn(payload.user, payload.access_token);
    } catch (error) {
      console.warn('Failed to complete backend Google login', error);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenido a Reservas UCN</Text>
      <Text style={styles.subtitle}>Identifícate con Google para continuar</Text>

      {ENABLE_MOCK_AUTH ? <Text style={styles.hint}>Modo demo activo: acceso automático temporal para probar la navegación.</Text> : null}

      <TouchableOpacity style={styles.button} onPress={handleGoogleSignIn} disabled={isSigningIn}>
        {isSigningIn ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Iniciar sesión con Google</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0A1120',
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#ffffff',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#adc1e6',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#000000',
    fontWeight: '700',
  },
  hint: {
    marginTop: 12,
    color: '#adc1e6',
    fontSize: 12,
  },
});
