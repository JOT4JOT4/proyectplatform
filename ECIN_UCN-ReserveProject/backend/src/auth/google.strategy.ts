import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor() {
    super({
        clientID: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackURL: `${process.env.BACKEND_URL || 'https://proyectplatform-production.up.railway.app'}/auth/google/callback`,
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

    
    const allowedDomains = ['@alumnos.ucn.cl', '@ucn.cl', '@gmail.com'];
    const isAllowed = allowedDomains.some((domain) => email.endsWith(domain));

    if (!isAllowed) {
      return done(new UnauthorizedException('Solo se permiten correos institucionales de la UCN o de prueba (@gmail.com)'), false);
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