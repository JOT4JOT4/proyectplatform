import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleMobileGuard extends AuthGuard('google-mobile') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const redirectUri = typeof req?.query?.redirect_uri === 'string' ? req.query.redirect_uri : undefined;

    return {
      state: redirectUri ? encodeURIComponent(redirectUri) : undefined,
    };
  }
}