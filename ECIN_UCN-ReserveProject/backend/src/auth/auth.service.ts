import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service'; 

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private usersService: UsersService 
  ) {}

  async googleLogin(req: any) { 
    if (!req.user) {
      return { message: 'No se recibió usuario de Google' };
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
}