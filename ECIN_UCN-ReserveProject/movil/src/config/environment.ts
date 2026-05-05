const DEFAULT_API_URL = 'http://localhost:3000';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(/\/$/, '');
export const GOOGLE_AUTH_URL = `${API_URL}/auth/google`;
export const GOOGLE_AUTH_CALLBACK_URL = `${API_URL}/auth/google/callback`;