import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class GoogleMobileStrategy extends PassportStrategy(Strategy, 'google-mobile') {
  constructor() {
    const backendUrl = process.env.PUBLIC_BACKEND_URL || 'http://localhost:3000';

    super({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_MOBILE_CALLBACK_URL || `${backendUrl}/auth/google/mobile/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, photos } = profile;
    const email = emails?.[0]?.value;

    if (!email) {
      return done(new UnauthorizedException('No se recibió correo de Google'), false);
    }

    const allowedDomain = '@alumnos.ucn.cl';

    if (!email.endsWith(allowedDomain)) {
      return done(new UnauthorizedException('Solo se permiten correos institucionales de la UCN'), false);
    }

    const user = {
      email,
      firstName: name?.givenName ?? '',
      lastName: name?.familyName ?? '',
      picture: photos?.[0]?.value ?? null,
      accessToken,
    };

    done(null, user);
  }
}