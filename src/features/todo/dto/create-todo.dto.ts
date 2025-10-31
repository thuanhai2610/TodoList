import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PriorityEnum } from '../enum/priority.enum';
import { StatusTodo } from '../enum/status-todo.enum';

export class CreateTodoDTO {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300, { message: 'Title too large, max 100 character' })
  title: string;

  @IsString()
  @MaxLength(2000)
  @IsNotEmpty()
  content: string;

  @IsOptional()
  duration: string;

  @IsEnum(PriorityEnum)
  @IsNotEmpty()
  priority: PriorityEnum;

  @IsEnum(StatusTodo)
  @IsOptional()
  status: StatusTodo;
}
