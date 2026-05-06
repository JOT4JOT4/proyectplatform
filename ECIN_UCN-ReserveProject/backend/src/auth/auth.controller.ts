import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
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

    return res.redirect(
      `http://localhost:5173/auth/callback?token=${loginData.access_token}`,
    );
  }

  @Get('logout')
  logout() {
    return {
      message:
        'Sesión cerrada. El frontend debe eliminar el token JWT localmente.',
    };
  }
}
