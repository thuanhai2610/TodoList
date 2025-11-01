import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { RedisPubSub } from 'src/common/constant/redis-pubsub.constant';
import { OTPService } from '../service/auth/otp.service';

@Injectable()
export class SubAuth implements OnModuleInit {
  constructor(
    @Inject('REDIS_SUB') private redisSub: RedisClientType,
    private readonly otpSerive: OTPService,
  ) {}

  onModuleInit() {
    this.redisSub.subscribe(RedisPubSub.SendOTP, async (email) => {
      console.log(JSON.parse(email));

      await this.otpSerive.generateOTP(JSON.parse(email as string) as string);
    });
  }
}
