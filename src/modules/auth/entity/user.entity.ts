import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Todo } from '../../todo/entity/todo.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  userId: string;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column()
  password: string;

  @Column({ default: true })
  isVerify: boolean;

  @Column({ default: false })
  isBlock: boolean;

  @OneToMany(() => Todo, (todo) => todo.user)
  todos: Todo[];
}
