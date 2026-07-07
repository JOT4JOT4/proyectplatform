import { InternalServerErrorException } from '@nestjs/common';

/**
 * Allowed configurations:
 * - Allowed custom schemes (e.g., 'reservasucn://')
 * - If non-production, allowed development schemes (e.g., 'exp://', 'exps://')
 * - Whitelisted Web front-ends (single URL string or array of allowed origins)
 */
export function validateRedirectUri(
  redirectUri: string,
  allowedOrigins: string | string[],
  nodeEnv = 'development',
): boolean {
  if (!redirectUri) {
    return false;
  }

  try {
    const isProd = nodeEnv === 'production';
    const parsed = new URL(redirectUri);

    // 1. Validate custom mobile scheme
    if (parsed.protocol === 'reservasucn:') {
      return parsed.pathname === '//auth/callback' || parsed.host === 'auth';
    }

    // 2. Validate Expo development schemes (strictly allowed in non-production environments)
    if (!isProd && (
      parsed.protocol === 'exp:' || 
      parsed.protocol === 'exps:' ||
      (parsed.protocol === 'https:' && parsed.hostname === 'auth.expo.io')
    )) {
      return true;
    }

    // Convert allowedOrigins to an array for validation checks
    const origins = Array.isArray(allowedOrigins) ? allowedOrigins : [allowedOrigins];

    // 3. Validate against whitelisted web client origins
    return origins.some((origin) => {
      if (!origin) return false;
      try {
        const allowedBase = new URL(origin);
        return (
          parsed.protocol === allowedBase.protocol &&
          parsed.hostname === allowedBase.hostname &&
          parsed.port === allowedBase.port
        );
      } catch {
        return false;
      }
    });

  } catch (error) {
    // If the redirect URI cannot be parsed as a URL, it is invalid.
    return false;
  }
}
