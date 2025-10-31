import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullMQAction } from './bullmq.name';
import { RedisModule } from '../redis.module';
import { AuthQueue } from './queue/auth/auth.queue';
import { AuthQueueProcessor } from './queue/auth/processor-auth.queue';
import { SendMail } from './queue/auth/sendMail';
import { TodoServiceQueue } from './queue/todo/todo-service.queue';
import { TodoQueueProcessor } from './queue/todo/processor-todos.queue';
import { TodoQueue } from './queue/todo/todo.queue';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Todo } from 'src/modules/todo/entity/todo.entity';
import { User } from 'src/modules/auth/entity/user.entity';

interface RedisConfig {
  host: string;
  port: number;
  password: string;
}
@Module({
  imports: [
    TypeOrmModule.forFeature([Todo, User]),

    RedisModule,
    BullModule.forRootAsync({
      inject: ['REDIS_BULLMQ'],
      useFactory: (redisConfig: RedisConfig) => ({
        connection: redisConfig,
      }),
    }),
    BullModule.registerQueue(
      { name: BullMQAction.AuthQueue },
      { name: BullMQAction.TodoQueue },
    ),
  ],
  providers: [
    AuthQueue,
    AuthQueueProcessor,
    SendMail,
    TodoServiceQueue,
    TodoQueueProcessor,
    TodoQueue,
  ],
  exports: [BullModule, AuthQueue, TodoQueue],
})
export class BullMQModule {}
