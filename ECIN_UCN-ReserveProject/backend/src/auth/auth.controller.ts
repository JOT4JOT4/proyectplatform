import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import type { Response } from 'express';
import { GoogleMobileGuard } from './guards/google-mobile.guard';

function resolveMobileCallbackUrl(state: unknown) {
  const fallback = process.env.MOBILE_AUTH_CALLBACK_URL || 'reservasucn://auth/callback';

  if (typeof state !== 'string' || state.trim().length === 0) {
    return fallback;
  }

  const decoded = decodeURIComponent(state);
  const isAllowedCustomScheme = /^(reservasucn|exp|exps):\/\//i.test(decoded);
  const isAllowedLocalHttp = /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?(\/|$)/i.test(decoded);

  return isAllowedCustomScheme || isAllowedLocalHttp ? decoded : fallback;
}

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
    const frontendUrl = process.env.FRONTEND_URL || 'http://reservasucn.vercel.app';

    return res.redirect(
      `${frontendUrl}/auth/callback?code=${code}`,
    );
  }

  @Get('google/mobile')
  @UseGuards(GoogleMobileGuard)
  async googleMobileAuth(@Req() req) {}

  @Get('google/mobile/callback')
  @UseGuards(AuthGuard('google-mobile'))
  async googleMobileAuthRedirect(@Req() req, @Res() res: Response) {
    try {
      const loginData = await this.authService.googleLogin(req);
      const code = this.authService.createLoginCode(loginData);
      const callbackUrl = resolveMobileCallbackUrl(req.query?.state);

      const separator = callbackUrl.includes('?') ? '&' : '?';

      return res.redirect(`${callbackUrl}${separator}code=${code}`);
    } catch (error) {
      const callbackUrl = resolveMobileCallbackUrl(req.query?.state);
      const separator = callbackUrl.includes('?') ? '&' : '?';
      const message = error instanceof Error ? error.message : 'No se pudo completar el inicio de sesión.';

      return res.redirect(`${callbackUrl}${separator}error=${encodeURIComponent(message)}`);
    }
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
