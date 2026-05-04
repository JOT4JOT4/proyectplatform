import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../contexts/AuthContext';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    scopes: ['profile', 'email'],
  });

  React.useEffect(() => {
    const handle = async () => {
      if (response?.type === 'success') {
        const { authentication } = response;
        // Fetch user info from Google
        const token = authentication?.accessToken ?? '';
        try {
          const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
            headers: { Authorization: `Bearer ${token}` },
          });
          const profile = await res.json();
          await signIn({ email: profile.email }, token);
        } catch (e) {
          console.warn('Failed to fetch Google profile', e);
        }
      }
    };
    handle();
  }, [response]);

  const handleGoogleSignIn = async () => {
    await promptAsync();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenido a ECIN UCN Reserva</Text>
      <Text style={styles.subtitle}>Identifícate con Google para continuar</Text>

      <TouchableOpacity style={styles.button} onPress={handleGoogleSignIn}>
        <Text style={styles.buttonText}>Iniciar sesión con Google</Text>
      </TouchableOpacity>

      <Text style={styles.hint}>Esta es una autenticación de prueba local.</Text>
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
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: '#AAB7CE',
    marginBottom: 24,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
  hint: {
    marginTop: 12,
    color: '#AAB7CE',
    fontSize: 12,
  },
});
