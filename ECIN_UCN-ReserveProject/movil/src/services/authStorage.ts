import * as SecureStore from 'expo-secure-store';

const STORAGE_KEY = 'ecin_auth';

export type StoredAuth = {
  token: string;
  user: {
    email: string;
    firstName?: string;
    lastName?: string;
    picture?: string;
    role?: string;
    id?: number;
  } | null;
};

export async function saveAuth(data: StoredAuth): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('saveAuth failed', e);
  }
}

export async function getAuth(): Promise<StoredAuth | null> {
  try {
    const str = await SecureStore.getItemAsync(STORAGE_KEY);
    if (!str) return null;
    return JSON.parse(str) as StoredAuth;
  } catch (e) {
    console.warn('getAuth failed', e);
    return null;
  }
}

export async function deleteAuth(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
  } catch (e) {
    console.warn('deleteAuth failed', e);
  }
}
