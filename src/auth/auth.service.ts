import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { RegisterDTO } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDTO } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';

@Injectable()
export class AuthService {
  private key = 'users';
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDTO) {
    const data = await this.redis.get(this.key);
    const users = data ? JSON.parse(data) : [];

    const userExisted = users.find((u) => u.email === dto.email);
    if (userExisted) throw new ConflictException('Email is already');

    const hassPass = await bcrypt.hash(dto.password, 10);

    const user = {
      userId: 'user' + Date.now().toString(),
      name: dto.name,
      email: dto.email,
      password: hassPass,
      isVerify: true,
    };
    users.push(user);
    await this.redis.set(this.key, JSON.stringify(users));
    const { password, ...safeUser } = user;
    return safeUser;
  }

  async login(dto: LoginDTO, res: Response) {
    const { email, password } = dto;
    const data = await this.redis.get(this.key);
    const users = data ? JSON.parse(data) : [];
    const findEmail = users.find((u) => u.email === email);
    if (!findEmail || !(await bcrypt.compare(password, findEmail.password)))
      throw new NotFoundException('Email or Password not correct');
    const payload = {
      userId: findEmail.userId,
      email: findEmail.email,
      name: findEmail.name,
    };
    const accessToken = await this.generateAccessToken(payload);
    this.generateRefreshToken(payload, res);
    const {password: _, ...safeUser } = findEmail;
    return {
      accessToken: accessToken,
      data: safeUser,
    };
  }

  async generateAccessToken(payload: {
    email: string;
    userId: string;
    name: string;
  }): Promise<string> {
    const accessToken = this.jwtService.sign(
      {
        email: payload.email,
        userId: payload.userId,
        name: payload.name,
      },
      { secret: process.env.JWT_SECRET },
    );
    return accessToken;
  }

  async generateRefreshToken(
    payload: { email: string; userId: string; name?: string },
    res: Response,
  ) {
    const refresToken = this.jwtService.sign(
      { userId: payload.userId, email: payload.email },
      { secret: process.env.JWT_SECRET, expiresIn: '7d' },
    );
    res.cookie('refreshToken', refresToken, {
      httpOnly: true,
      sameSite: 'strict',
      path: 'auth/refresh-token',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    await this.redis.set(
      `refresh_token:${payload.userId}`,
      refresToken,
      'EX',
      60 * 60 * 24 * 7,
    );
  }

  async refreshToken(refreshToken: string) {
    try {
    var payload: any
       payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_SECRET,
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid refreshtoken');
    }
    const userToken = await this.redis.get(`refresh_token:${payload.userId}`);
    if(!userToken) throw new UnauthorizedException('Token is expires. Please login again!');
    const data = await this.redis.get(this.key)
    const user = data ? JSON.parse(data) : [];
    const findUser = user.find(u => u.userId === payload.userId);
    const newPayload = {userId: findUser.userId, email: findUser.email, name: findUser.name};
    const accessToken = await this.generateAccessToken(newPayload);
    const {password, ...safeUser } = findUser;
    return {
        accessToken: accessToken,
        data : safeUser
    }
  }
}
