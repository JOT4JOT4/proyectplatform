export const getApiUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }

  // Detectar si estamos en entorno local
  const isLocal =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (isLocal) {
    return 'http://localhost:3000';
  }

  // URL de producción en Railway
  return 'https://proyectplatform-production.up.railway.app';
};
