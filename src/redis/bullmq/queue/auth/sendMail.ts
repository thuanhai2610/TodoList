import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class SendMail {
  constructor() {}

  async SendWelcome(to: string) {
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
    await transport.sendMail({
      to,
      subject: 'WelCome!',
      html: `Welcome ${to} to Localhost`,
    });
  }
}
