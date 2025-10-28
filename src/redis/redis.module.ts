import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';
@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis({
          host: process.env.HOST_REDIS as string,
          port: Number(process.env.PORT_REDIS),
          password: process.env.REDIS_PASSWORD,
        });
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule {}
