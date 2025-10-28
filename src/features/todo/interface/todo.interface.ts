import { ResponseUser } from 'src/auth/interface/login.interface';
import { StatusTodo } from '../enum/status-todo.enum';
import { PriorityEnum } from '../enum/priority.enum';

export interface RequestUser extends ResponseUser {
  user: ResponseUser;
}

export interface ResponseTodo {
  todoId: string;
  title: string;
  content: string;
  status: StatusTodo;
  priority: PriorityEnum;
  duration: Date;
  createdAt: Date;
  updatedAt: Date;
}
