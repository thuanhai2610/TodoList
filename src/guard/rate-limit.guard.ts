import {
  ExecutionContext,
  Inject,
  Injectable,
  CanActivate,
} from '@nestjs/common';
import Redis from 'ioredis';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { Request } from 'express';
import { Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private rateLimit: RateLimiterRedis;

  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: Redis) {
    this.rateLimit = new RateLimiterRedis({
      storeClient: this.redisClient,
      keyPrefix: 'rate-limit',
      points: 10,
      duration: 10,
      blockDuration: 30,
    });
  }
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const ip =
      req.ip ||
      (req.headers['x-forwarded-for'] as string) ||
      req.socket.remoteAddress ||
      'unknown';

    try {
      await this.rateLimit.consume(ip);
      return true;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.warn(`Rate limit error: ${error.message}`);
      }
      throw new ThrottlerException('Too many requests');
    }
  }
}
