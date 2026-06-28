import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service'; 
import { randomUUID } from 'crypto';

type LoginData = {
  message: string;
  access_token: string;
  user: any;
};

type PendingLogin = {
  loginData: LoginData;
  expiresAt: number;
};

@Injectable()
export class AuthService {
  private readonly pendingLogins = new Map<string, PendingLogin>();

  constructor(
    private jwtService: JwtService,
    private usersService: UsersService 
  ) {}

  async googleLogin(req: any): Promise<LoginData> { 
    if (!req.user) {
      throw new UnauthorizedException('No se recibió usuario de Google');
    }

    const dbUser = await this.usersService.findOrCreate({
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      picture: req.user.picture,
    });

    const payload = { 
      email: dbUser.email, 
      sub: dbUser.id,      
      firstName: dbUser.firstName,
      role: dbUser.role   
    };

    return {
      message: 'Inicio de sesión exitoso',
      access_token: this.jwtService.sign(payload),
      user: dbUser, 
    };
  }

  createLoginCode(loginData: LoginData) {
    const code = randomUUID();
    this.pendingLogins.set(code, {
      loginData,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return code;
  }

  exchangeLoginCode(code: string) {
    const pendingLogin = this.pendingLogins.get(code);

    if (!pendingLogin) {
      return { message: 'El código de autenticación no es válido o ya expiró.' };
    }

    this.pendingLogins.delete(code);

    if (pendingLogin.expiresAt < Date.now()) {
      return { message: 'El código de autenticación expiró. Intenta iniciar sesión nuevamente.' };
    }

    return pendingLogin.loginData;
  }
}