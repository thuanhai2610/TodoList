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
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entity/user.entity';
import { Repository } from 'typeorm';

const TTL = 60;
@Injectable()
export class AuthService {
  private key = 'users';
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly jwtService: JwtService,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async register(dto: RegisterDTO) {
    const data = await this.redis.hget(this.key, dto.email);
    const userRepo = await this.userRepository.findOneBy({ email: dto.email });
    if (userRepo) throw new ConflictException('Email is already');
    if (data) throw new ConflictException('Email is already');

    const hassPass = await bcrypt.hash(dto.password, 10);

    const user = {
      name: dto.name,
      email: dto.email,
      password: hassPass,
      isVerify: true,
    };
    const newUser = this.userRepository.create(user);
    const createUser = await this.userRepository.save(newUser);
    await this.redis.hset(
      this.key,
      createUser.email,
      JSON.stringify(createUser),
    );
     this.redis.expire(this.key, TTL);
    const { password, ...safeUser } = createUser;
    return safeUser;
  }

  async login(dto: LoginDTO, res: Response) {
    const { email, password } = dto;
    const data = await this.redis.hget(this.key, email);
    let userData;
    if (data) {
      userData = JSON.parse(data);
    } else {
      userData = await this.userRepository.findOneBy({ email });
      if (!userData) {
        throw new NotFoundException('Email or Password not correct!');
      }
    }
    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) throw new NotFoundException('Email or Password not correct!');
    const payload = {
      userId: userData.userId,
      email: userData.email,
      name: userData.name,
    };

    const accessToken = await this.generateAccessToken(payload);
    this.generateRefreshToken(payload, res);
    const { password: _, ...safeUser } = userData;
    if (!data) {
      await this.redis.hset(this.key, email, JSON.stringify(userData));
    }
    return {
      accessToken,
      data: safeUser,
    };
  }

  async generateAccessToken(payload: {
    email: string;
    userId: number;
    name: string;
  }): Promise<string> {
    const accessToken = this.jwtService.sign(
      {
        email: payload.email,
        userId: payload.userId,
        name: payload.name,
      },
      { secret: process.env.JWT_ACCESS_TOKEN },
    );
    return accessToken;
  }

  async generateRefreshToken(
    payload: { email: string; userId: number; name?: string },
    res: Response,
  ) {
    const refresToken = this.jwtService.sign(
      { userId: payload.userId, email: payload.email },
      { secret: process.env.JWT_REFRESH_TOKEN, expiresIn: '7d' },
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
      var payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_TOKEN,
      });
      console.log(payload);
    } catch (error) {
      throw new UnauthorizedException('Invalid refreshtoken');
    }
    const userToken = await this.redis.get(`refresh_token:${payload.userId}`);
    if (!userToken)
      throw new UnauthorizedException('Token is expires. Please login again!');
    const user = await this.userRepository.findOneBy({
      userId: payload.userId,
    });
    if (!user) {
      throw new NotFoundException('User is not found');
    }
    const newPayload = {
      userId: user.userId,
      email: user.email,
      name: user.name,
    };
    const accessToken = await this.generateAccessToken(newPayload);
    const { password, ...safeUser } = user;
    return {
      accessToken: accessToken,
      data: safeUser,
    };
  }
}
