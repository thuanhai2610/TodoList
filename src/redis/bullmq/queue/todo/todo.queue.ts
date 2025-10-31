import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { BullMQAction } from '../../bullmq.name';
import { Queue } from 'bullmq';
import { CreateTodoDTO } from 'src/modules/todo/dto/create-todo.dto';
import { ListenTodoQueue } from '../../processor';
import { Todo } from 'src/modules/todo/entity/todo.entity';

@Injectable()
export class TodoQueue {
  constructor(@InjectQueue(BullMQAction.TodoQueue) private todoQueue: Queue) {}

  async createdTodoQueue(dto: CreateTodoDTO, userId: string) {
    const job = await this.todoQueue.add(
      ListenTodoQueue.CreateTodo,
      { dto, userId },
      {
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
    return job;
  }

  async deleteTodoQueue(todos: Todo[], userId: string) {
    await this.todoQueue.add(ListenTodoQueue.DeleteTodo, {
      todos,
      userId,
    });
  }
}
