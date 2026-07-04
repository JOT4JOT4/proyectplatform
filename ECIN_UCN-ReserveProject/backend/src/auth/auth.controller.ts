import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { GoogleMobileGuard } from './guards/google-mobile.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // --- Flujo Google Web (sin cambios) ---
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth(@Req() req) {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleAuthRedirect(@Req() req) {
    return this.authService.googleLogin(req);
  }

  @Get('google/web')
  @UseGuards(AuthGuard('google-web'))
  async googleWebAuth(@Req() req) {}

  @Get('google/web/callback')
  @UseGuards(AuthGuard('google-web'))
  async googleWebAuthRedirect(@Req() req, @Res() res: Response) {
    const loginData = await this.authService.googleLogin(req);
    const code = this.authService.createLoginCode(loginData);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    return res.redirect(`${frontendUrl}/auth/callback?code=${code}`);
  }

  // --- Flujo Google Mobile (ajustado) ---
  @Get('google/mobile')
  @UseGuards(GoogleMobileGuard)
  async googleMobileAuth(@Req() req) {}

  @Get('google/mobile/callback')
  @UseGuards(AuthGuard('google-mobile'))
  async googleMobileAuthRedirect(@Req() req, @Res() res: Response) {
    try {
      const loginData = await this.authService.googleLogin(req);
      const code = this.authService.createLoginCode(loginData);

      return res.redirect(`reservasucn://auth/callback?code=${code}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo completar el inicio de sesión.';
      return res.json({ error: message });
    }
  }

  @Post('exchange')
  exchange(@Body('code') code: string) {
    return this.authService.exchangeLoginCode(code);
  }

  @Get('logout')
  logout() {
    return {
      message: 'Sesión cerrada. El frontend debe eliminar el token JWT localmente.',
    };
  }
}
