import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import { compare, hash } from 'bcrypt';
import { ExceptionsService } from 'src/exceptions.service';
import { PrismaService } from 'src/prisma.service';
import { loginData, registerData } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private exceptions: ExceptionsService,
    private jwtService: JwtService,
  ) {}

  async getUser(uuid: string) {
    return await this.prisma.user.findUnique({ where: { id: uuid } });
  }

  private async findUser(username: string) {
    return await this.prisma.user.findUnique({ where: { username } });
  }
  private async findUserByEmail(email: string) {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  private async createUser(credentials: registerData) {
    return await this.prisma.user.create({ data: credentials });
  }

  private formatUser(user: User) {
    const { username, email, id } = user;
    return { username, email, id };
  }

  async loginUser({ username, password }: loginData) {
    if (!username || !password) return this.exceptions.BadRequest();
    const user = await this.findUser(username);
    if (!user) return this.exceptions.NotFound('Пользователь не найден');
    const passwordMatches = await compare(password, user.password);
    if (!passwordMatches) return this.exceptions.BadRequest('Неверный пароль');
    return {
      jwt: this.jwtService.sign(user.id, {
        secret: process.env.SECRET_JWT_KEY,
      }),
    };
  }

  async validateUser({ jwt }: { jwt: string }) {
    try {
      const uuid = this.jwtService.verify(jwt, {
        secret: process.env.SECRET_JWT_KEY,
      });
      if (!uuid) return this.exceptions.BadRequest('Token is expired');
      const user = await this.getUser(uuid);
      if (!user) return this.exceptions.NotFound();
      const newjwt = this.jwtService.sign(user.id, {
        secret: process.env.SECRET_JWT_KEY,
      });
      return { ...this.formatUser(user), jwt: newjwt };
    } catch {
      return this.exceptions.BadRequest('Invalid token');
    }
  }

  async registerUser(credentials: registerData) {
    const { email, password, username } = credentials;
    if (!email || !password || !username) return this.exceptions.BadRequest();
    const userWithSameEmail = await this.findUserByEmail(email);
    const userWithSameUsername = await this.findUser(username);
    if (!!userWithSameEmail)
      return this.exceptions.Conflict('There is already user with same email');
    if (!!userWithSameUsername)
      return this.exceptions.Conflict(
        'There is already user with same username',
      );
    const hashedPassword = await hash(password, 10);
    return this.formatUser(
      await this.createUser({
        email,
        password: hashedPassword,
        username,
      }),
    );
  }
}
