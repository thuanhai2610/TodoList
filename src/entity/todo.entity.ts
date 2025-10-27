import { PriorityEnum } from "../features/todo/enum/priority.enum";
import { StatusTodo } from "../features/todo/enum/status-todo.enum";
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { User } from "./user.entity";

@Entity()
export class Todo{
    @PrimaryGeneratedColumn()
    todoId: number;
    
    @Column()
    title: string;

    @Column()
    content: string;

    @Column({
        type: 'enum',
        enum: StatusTodo,
        default: StatusTodo.Pending
    })
    status: StatusTodo

    @Column({
        type: 'enum',
        enum: PriorityEnum,
        default: PriorityEnum.Low
    })
    priority: PriorityEnum

    @Column({type: 'datetime', nullable: true})
    duration: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => User, (user) => user.todos, {onDelete: 'CASCADE'})
    user: User
}