import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { SubModule } from './pubsub/sub/sub.module';

@Global()
@Module({
  imports: [ConfigModule, SubModule],
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
      useFactory: async (configService: ConfigService): Promise<Redis> => {
        const client = new Redis({
          host: configService.get<string>('HOST_REDIS') || 'localhost',
          port: configService.get<number>('PORT_REDIS') || 6379,
          password: configService.get<string>('REDIS_PASSWORD'),
        });
        client.on('connect', () => console.log('Pub connect'));
        return client;
      },
    },
    {
      provide: 'REDIS_SUB',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService): Promise<Redis> => {
        const client = new Redis({
          host: configService.get<string>('HOST_REDIS') || 'localhost',
          port: configService.get<number>('PORT_REDIS') || 6379,
          password: configService.get<string>('REDIS_PASSWORD'),
        });
        client.on('connect', () => console.log('Sub connect'));

        return client;
      },
    },
  ],
  exports: ['REDIS_CLIENT', 'REDIS_BULLMQ', 'REDIS_PUB', 'REDIS_SUB'],
})
export class RedisModule {}
