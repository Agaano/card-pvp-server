import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { loginData, registerData } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('login')
  async login(@Body() credentials: loginData) {
    return this.authService.loginUser(credentials);
  }

  @Post('register')
  async register(@Body() credentials: registerData) {
    console.log();
    return this.authService.registerUser(credentials);
  }

  @Post('validate')
  async validate(@Body('jwt') jwt: string) {
    return this.authService.validateUser({ jwt });
  }
}
