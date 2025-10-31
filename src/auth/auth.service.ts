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
import { PayloadRFToken, ResponseUser } from './interface/login.interface';
import { AuthQueue } from 'src/redis/bullmq/queue/auth/auth.queue';
import { TodoService } from 'src/features/todo/todo.service';

@Injectable()
export class AuthService {
  private key = 'users';
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    private readonly jwtService: JwtService,
    private readonly authQueue: AuthQueue,
    private readonly todoService: TodoService,
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
    const { password: _, ...safeUser } = createUser;
    return safeUser;
  }

  async login(dto: LoginDTO, res: Response) {
    const { email, password } = dto;
    const key = `${this.key}:isBlocked:${email}`;
    const blockToken = await this.redis.get(key);
    if (blockToken)
      throw new UnauthorizedException('Token is block. Wait a few minute!');
    const userDB = await this.userRepository.findOneBy({ email });
    if (userDB && userDB.isBlock) {
      throw new UnauthorizedException('User is block by Admin!');
    }
    if (!userDB) throw new NotFoundException('Email is not correct');
    const isMatch = await bcrypt.compare(password, userDB.password);
    if (!isMatch) throw new NotFoundException('Password not correct!');
    const payload = {
      userId: userDB.userId,
      email: userDB.email,
      name: userDB.name,
    };

    const accessToken = this.generateAccessToken(payload);
    await this.generateRefreshToken(payload, res);
    const { password: _, isVerify: __, isBlock: ___, ...safeUser } = userDB;
    await this.authQueue.sendOtp(email);
    return {
      message: 'Register success',
      accessToken,
      data: safeUser as ResponseUser,
    };
  }

  generateAccessToken(payload: {
    email: string;
    userId: string;
    name: string;
  }): string {
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
    payload: { email: string; userId: string; name?: string },
    res: Response,
  ) {
    const refresToken = this.jwtService.sign(
      { userId: payload.userId, email: payload.email },
      { secret: process.env.JWT_REFRESH_TOKEN, expiresIn: '7d' },
    );
    res.cookie('refreshToken', refresToken, {
      httpOnly: true,
      sameSite: 'strict',
      path: 'auth/refreshToken',
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
    let payload: PayloadRFToken;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_TOKEN,
      });
    } catch (_error) {
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
    const accessToken = this.generateAccessToken(newPayload);
    const { password: _, isVerify: __, isBlock: ___, ...safeUser } = user;
    return {
      message: 'Login success',
      accessToken: accessToken,
      data: safeUser,
    };
  }

  async logout(accessToken: string) {
    try {
      const payload: PayloadRFToken = await this.jwtService.verify(
        accessToken,
        {
          secret: process.env.JWT_ACCESS_TOKEN,
        },
      );
      const key = `${this.key}:isBlocked:${payload.email}`;
      if (await this.redis.get(key)) {
        const blockUser = await this.userRepository.update(payload.email, {
          isBlock: true,
        });
        if (blockUser) throw new UnauthorizedException('You is dissing');
      }
      const now = Math.floor(Date.now() / 1000);
      const ttl = Math.max(0, payload.exp - now);
      await this.redis.set(key, accessToken.toString(), 'EX', ttl);
    } catch (error) {
      throw new UnauthorizedException('Invalid token', error);
    }
    return {
      message: `You is logut and blocked login. Wait 15 minutes`,
    };
  }

  async deleteAccout(accessToken: string) {
    try {
      const payload: PayloadRFToken = await this.jwtService.verify(
        accessToken,
        { secret: process.env.JWT_ACCESS_TOKEN },
      );
      const userId = payload.userId;
      const userExist = await this.userRepository.findOneBy({ userId });
      if (!userExist) throw new Error('Accoutn not found!');
      await this.todoService.deleteTods(userId);
      await this.userRepository.remove(userExist);
    } catch (error) {
      throw new UnauthorizedException('Invalid token', error);
    }
    return {
      message: `Delete accout success`,
    };
  }
}
