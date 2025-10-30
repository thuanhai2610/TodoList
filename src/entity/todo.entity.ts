import { PriorityEnum } from '../features/todo/enum/priority.enum';
import { StatusTodo } from '../features/todo/enum/status-todo.enum';
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { MaxLength } from 'class-validator';

@Entity()
export class Todo {
  @PrimaryGeneratedColumn('uuid')
  todoId: string;

  @Column()
  @MaxLength(155, { message: 'Title must be at most 255 characters long' })
  title: string;

  @Column()
  @MaxLength(255, { message: 'Content must be at most 255 characters long' })
  content: string;

  @Column({
    type: 'enum',
    enum: StatusTodo,
    default: StatusTodo.Pending,
  })
  status: StatusTodo;

  @Column({
    type: 'enum',
    enum: PriorityEnum,
    default: PriorityEnum.Low,
  })
  priority: PriorityEnum;

  @Column({ type: 'datetime', nullable: true })
  duration: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.todos, { onDelete: 'CASCADE' })
  user: User;
}
