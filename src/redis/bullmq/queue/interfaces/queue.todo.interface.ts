import { Todo } from 'src/modules/todo/entity/todo.entity';
import { CreateTodoDTO } from 'src/modules/todo/dto/create-todo.dto';

export interface QueueTodoInterface extends CreateTodoDTO {
  dto: CreateTodoDTO;
  userId: string;
}

export interface QueueTodoInterfaceDel {
  todos: Todo[];
  userId?: string;
}
