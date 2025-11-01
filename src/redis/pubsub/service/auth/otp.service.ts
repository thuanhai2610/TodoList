import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import * as nodemailer from 'nodemailer';

@Injectable()
export class OTPService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async generateOTP(email: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = `otps:${email}:${otp}`;
    const ttlOtp = 60 * 60 * 5;
    if (await this.redis.get(key)) {
      await this.redis.del(key);
    }
    await Promise.all([
      this.redis.set(key, email, 'EX', ttlOtp),
      this.sendOtp(email, otp),
    ]);
  }

  async sendOtp(to: string, otp: string) {
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
    await transport.sendMail({
      to,
      subject: 'Mã OTP mới của bạn',
      text: `Mã OTP mới của bạn là: ${otp}. Mã này có hiệu lực trong 10 phút.`,
    });
  }
}
