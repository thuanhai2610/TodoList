import { Todo } from 'src/entity/todo.entity';
import { CreateTodoDTO } from 'src/features/todo/dto/create-todo.dto';

export interface QueueTodoInterface extends CreateTodoDTO {
  dto: CreateTodoDTO;
  userId: string;
}

export interface QueueTodoInterfaceDel {
  todos: Todo[];
  userId?: string;
}
