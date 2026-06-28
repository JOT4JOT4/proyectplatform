import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import type { Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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

    return res.redirect(
      `http://localhost:5173/auth/callback?code=${code}`,
    );
  }

  @Get('google/mobile')
  @UseGuards(AuthGuard('google-mobile'))
  async googleMobileAuth(@Req() req) {}

  @Get('google/mobile/callback')
  @UseGuards(AuthGuard('google-mobile'))
  async googleMobileAuthRedirect(@Req() req, @Res() res: Response) {
    const loginData = await this.authService.googleLogin(req);
    const code = this.authService.createLoginCode(loginData);
    const callbackUrl = process.env.MOBILE_AUTH_CALLBACK_URL || 'reservasucn://auth/callback';

    return res.redirect(`${callbackUrl}?code=${code}`);
  }

  @Post('exchange')
  exchange(@Body('code') code: string) {
    return this.authService.exchangeLoginCode(code);
  }

  @Get('logout')
  logout() {
    return {
      message:
        'Sesión cerrada. El frontend debe eliminar el token JWT localmente.',
    };
  }
}
