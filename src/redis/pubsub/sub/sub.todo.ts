import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisPubSubTodo } from 'src/common/constant/redis-pubsub.constant';
import { TodoSubService } from '../service/todo/todo.service';
import { CreateTodoDTO } from 'src/modules/todo/dto/create-todo.dto';

@Injectable()
export class SubTodo implements OnModuleInit {
  constructor(
    @Inject('REDIS_SUB') private redisSub: Redis,
    private readonly todoSubService: TodoSubService,
  ) {}

  async onModuleInit() {
    await this.redisSub.subscribe(RedisPubSubTodo.CreateTodo);
    this.redisSub.on('message', (channel, message) => {
      switch (channel) {
        case RedisPubSubTodo.CreateTodo: {
          const data = JSON.parse(message) as {
            dto: CreateTodoDTO;
            userId: string;
          };
          this.todoSubService.createTodo(data.dto, data.userId);
          break;
        }

        default:
          break;
      }
    });
  }
}
