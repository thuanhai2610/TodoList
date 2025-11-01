import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { OTPService } from '../service/auth/otp.service';
import Redis from 'ioredis';
import { RedisPubSubAuth } from 'src/common/constant/redis-pubsub.constant';

@Injectable()
export class SubAuth implements OnModuleInit {
  constructor(
    @Inject('REDIS_SUB') private redisSub: Redis,
    private readonly otpSerive: OTPService,
  ) {}

  async onModuleInit() {
    await this.redisSub.subscribe(RedisPubSubAuth.SendOTP);
    this.redisSub.on('message', (channel, message) => {
      if (channel === RedisPubSubAuth.SendOTP) {
        const data = JSON.parse(message) as { email: string };
        this.otpSerive.generateOTP(data.email);
      }
    });
  }
}
