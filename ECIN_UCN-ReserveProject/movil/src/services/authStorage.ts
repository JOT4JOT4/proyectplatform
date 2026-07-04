import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'ecin_auth';

export type StoredAuth = {
  token: string;
  user: {
    email: string;
    firstName?: string;
    lastName?: string;
    picture?: string | null;
    role?: string;
    id?: string;
  } | null;
};

export async function saveAuth(data: StoredAuth): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(data));
    }
  } catch (e) {
    console.warn('saveAuth failed', e);
  }
}

export async function getAuth(): Promise<StoredAuth | null> {
  try {
    if (Platform.OS === 'web') {
      const str = localStorage.getItem(STORAGE_KEY);
      if (!str) return null;
      return JSON.parse(str) as StoredAuth;
    } else {
      const str = await SecureStore.getItemAsync(STORAGE_KEY);
      if (!str) return null;
      return JSON.parse(str) as StoredAuth;
    }
  } catch (e) {
    console.warn('getAuth failed', e);
    return null;
  }
}

export async function deleteAuth(): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      await SecureStore.deleteItemAsync(STORAGE_KEY);
    }
  } catch (e) {
    console.warn('deleteAuth failed', e);
  }
}
