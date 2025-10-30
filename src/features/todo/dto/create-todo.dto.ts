import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PriorityEnum } from '../enum/priority.enum';
import { StatusTodo } from '../enum/status-todo.enum';

export class CreateTodoDTO {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  duration: string;

  @IsEnum(PriorityEnum)
  @IsNotEmpty()
  priority: PriorityEnum;

  @IsEnum(StatusTodo)
  @IsOptional()
  status: StatusTodo = StatusTodo.Pending;

  @IsOptional()
  createdAt?: string;

  @IsOptional()
  updateAt?: string;
}
