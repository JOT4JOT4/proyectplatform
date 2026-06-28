import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './google.strategy';
import { UsersModule } from '../users/users.module';
import { GoogleWebStrategy } from './google-web.strategy';
import { GoogleMobileStrategy } from './google-mobile.strategy';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'UCN-reservas-c9td5ij4n',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GoogleStrategy, GoogleWebStrategy, GoogleMobileStrategy, JwtStrategy],
})
export class AuthModule {}
