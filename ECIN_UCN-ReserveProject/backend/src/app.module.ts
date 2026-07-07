import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpacesModule } from './spaces/spaces.module';
import { ReservationsModule } from './reservations/reservations.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    UsersModule, 
    AuthModule,
    ConfigModule.forRoot({isGlobal: true,}),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('DATABASE_URL');
        const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
        const isProd = nodeEnv === 'production';
        const ssl = configService.get<string>('DB_SSL') === 'true' || isProd;
        
        // Secure by default: reject unauthorized certs unless explicitly set to 'false'
        const rejectUnauthorized = configService.get<string>('DB_SSL_REJECT_UNAUTHORIZED') !== 'false';

        if (url) {
          return {
            type: 'postgres',
            url,
            autoLoadEntities: true,
            synchronize: !isProd,
            ssl: ssl ? { rejectUnauthorized } : false,
          };
        }

        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST') || 'localhost',
          port: configService.get<number>('DB_PORT') || 5432,
          username: configService.get<string>('DB_USER') || 'postgres',
          password: configService.get<string>('DB_PASS') || 'postgres',
          database: configService.get<string>('DB_NAME') || 'postgres',
          autoLoadEntities: true,
          synchronize: !isProd,
          ssl: ssl ? { rejectUnauthorized } : false,
        };
      },
    }),
    SpacesModule,
    ReservationsModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
