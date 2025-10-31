import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis({
          host: (process.env.HOST_REDIS as string) || 'localhost',
          port: Number(process.env.PORT_REDIS) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
        });
      },
    },
    {
      provide: 'REDIS_BULLMQ',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        host: configService.get<string>('HOST_REDIS') || 'localhost',
        port: configService.get<number>('PORT_REDIS') || 6379,
        password: configService.get<string>('REDIS_PASSWORD') || undefined,
      }),
    },
  ],
  exports: ['REDIS_CLIENT', 'REDIS_BULLMQ'],
})
export class RedisModule {}
