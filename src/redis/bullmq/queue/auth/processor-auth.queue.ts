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
      case ListenAuthQueue.SendWelcome:
        return await this.SendWelcome(job);
        break;
      default:
        break;
    }
  }

  async SendWelcome(job: Job) {
    const email = job.data as string;
    await this.sendMail.SendWelcome(email);
    return { success: true, email };
  }
}
