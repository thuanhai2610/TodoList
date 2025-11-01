import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createClient } from 'redis';
import type { RedisClientType } from 'redis';
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
          password: process.env.REDIS_PASSWORD,
        });
      },
    },
    {
      provide: 'REDIS_BULLMQ',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        host: configService.get<string>('HOST_REDIS') || 'localhost',
        port: configService.get<number>('PORT_REDIS') || 6379,
        password: configService.get<string>('REDIS_PASSWORD'),
      }),
    },
    {
      provide: 'REDIS_PUB',
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<RedisClientType> => {
        const redisUrl =
          configService.get<string>('REDIS_URL_CONNECT') ??
          'redis://localhost:6379';
        const client: RedisClientType = createClient({
          url: redisUrl,
        }) as RedisClientType;
        await client.connect();
        console.log('Sub connect');

        return client;
      },
    },
    {
      provide: 'REDIS_SUB',
      inject: [ConfigService],
      useFactory: async (
        configService: ConfigService,
      ): Promise<RedisClientType> => {
        const redisUrl =
          configService.get<string>('REDIS_URL_CONNECT') ??
          'redis://localhost:6379';
        const client: RedisClientType = createClient({
          url: redisUrl,
        }) as RedisClientType;
        await client.connect();
        console.log('Pub connect');

        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT', 'REDIS_BULLMQ', 'REDIS_PUB'],
})
export class RedisModule {}
