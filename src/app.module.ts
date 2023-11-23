import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppGateway } from './app.gateway';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ExceptionsService } from './exceptions.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [AuthModule],
  controllers: [AppController],
  providers: [AppService, PrismaService, ExceptionsService, AppGateway],
})
export class AppModule {}
