import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { BullMQAction } from 'src/redis/bullmq/bullmq.name';
import { ListenAuthQueue } from 'src/redis/bullmq/processor';
import { SendMail } from './sendMail';

@Processor(BullMQAction.AuthQueue)
export class AuthQueueProcessor extends WorkerHost {
  constructor(private readonly sendMail: SendMail) {
    super();
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case ListenAuthQueue.SendOTP:
        return await this.sendOTP(job);
        break;
      default:
        break;
    }
  }

  async sendOTP(job: Job) {
    const email = job.data as string;
    await this.sendMail.sendMail(email);
    return { success: true, email };
  }
}
