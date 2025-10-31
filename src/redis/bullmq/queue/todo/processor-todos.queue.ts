import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BullMQAction } from '../../bullmq.name';
import { ListenTodoQueue } from '../../processor';
import { TodoServiceQueue } from './todo-service.queue';
import { Job } from 'bullmq';

import {
  QueueTodoInterface,
  QueueTodoInterfaceDel,
} from '../interfaces/queue.todo.interface';

@Processor(BullMQAction.TodoQueue)
export class TodoQueueProcessor extends WorkerHost {
  constructor(private readonly todoQueueService: TodoServiceQueue) {
    super();
  }

  async process(job: Job): Promise<any> {
    switch (job.name) {
      case ListenTodoQueue.CreateTodo:
        return await this.createTodoProcessor(job);
      case ListenTodoQueue.DeleteTodo:
        return this.deleteTodosProcessor(job);
      default:
        break;
    }
  }
  async createTodoProcessor(job: Job) {
    console.log('Job', job);
    const { dto, userId } = job.data as QueueTodoInterface;
    console.log(dto);
    return await this.todoQueueService.createTodoService(dto, userId);
  }

  deleteTodosProcessor(job: Job) {
    const { todos } = job.data as QueueTodoInterfaceDel;
    return this.todoQueueService.deleteAllTodoService(todos);
  }
}
