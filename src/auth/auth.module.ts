import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ExceptionsService } from 'src/exceptions.service';
import { PrismaService } from 'src/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, PrismaService, ExceptionsService, JwtService],
})
export class AuthModule {}
