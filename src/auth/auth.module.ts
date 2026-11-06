import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  LOGIN_ATTEMPTS_WINDOW_MS,
  MAX_LOGIN_ATTEMPTS_PER_MINUTE,
  TOO_MANY_LOGIN_ATTEMPTS_MESSAGE,
} from './guards/login-throttler.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Employee]),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: LOGIN_ATTEMPTS_WINDOW_MS,
          limit: MAX_LOGIN_ATTEMPTS_PER_MINUTE,
        },
      ],
      errorMessage: TOO_MANY_LOGIN_ATTEMPTS_MESSAGE,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
