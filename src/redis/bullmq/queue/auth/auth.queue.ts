import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { BullMQAction } from 'src/redis/bullmq/bullmq.name';
import { ListenAuthQueue } from 'src/common/constant/processor.constant';

@Injectable()
export class AuthQueue {
  constructor(@InjectQueue(BullMQAction.AuthQueue) private authQueue: Queue) {}

  async sendWelcome(email: string) {
    await this.authQueue.add(ListenAuthQueue.SendWelcome, email, {
      removeOnComplete: true,
      removeOnFail: 5000,
    });
  }
}
