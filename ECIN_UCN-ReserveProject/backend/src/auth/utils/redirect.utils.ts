import { InternalServerErrorException } from '@nestjs/common';

/**
 * Allowed configurations:
 * - Allowed custom schemes (e.g., 'reservasucn://')
 * - If non-production, allowed development schemes (e.g., 'exp://', 'exps://')
 * - Whitelisted Web front-ends (e.g. FRONTEND_URL environment variable)
 */
export function validateRedirectUri(
  redirectUri: string,
  frontendUrl: string,
  nodeEnv = 'development',
): boolean {
  if (!redirectUri) {
    return false;
  }

  try {
    const isProd = nodeEnv === 'production';
    const parsed = new URL(redirectUri);

    if (parsed.protocol === 'reservasucn:') {
      return parsed.pathname === '//auth/callback' || parsed.host === 'auth';
    }

    if (!isProd && (parsed.protocol === 'exp:' || parsed.protocol === 'exps:')) {
      return true;
    }

    if (frontendUrl) {
      const allowedBase = new URL(frontendUrl);
      if (
        parsed.protocol === allowedBase.protocol &&
        parsed.hostname === allowedBase.hostname &&
        parsed.port === allowedBase.port
      ) {
        return true;
      }
    }

    return false;
  } catch (error) {
    return false;
  }
}
