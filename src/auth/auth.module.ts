import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from '../employees/entities/employee.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { LoginAttemptsService } from './login-attempts.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Employee])],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, RolesGuard, LoginAttemptsService],
  exports: [AuthService, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
