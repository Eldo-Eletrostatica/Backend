import { Global, Module } from '@nestjs/common';
import { ThrottlerStorageService } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginThrottlerGuard } from './guards/login-throttler.guard';
import { RolesGuard } from './guards/roles.guard';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Employee])],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    LoginThrottlerGuard,
    ThrottlerStorageService,
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
