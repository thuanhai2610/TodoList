import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Todo } from 'src/modules/todo/entity/todo.entity';
import { User } from 'src/modules/auth/entity/user.entity';
import { CreateTodoDTO } from 'src/modules/todo/dto/create-todo.dto';
import { PriorityEnum } from 'src/modules/todo/enum/priority.enum';
import { StatusTodo } from 'src/modules/todo/enum/status-todo.enum';
import { getDuration } from 'src/common/untils/paginate.untils';
import { Repository } from 'typeorm';

@Injectable()
export class TodoServiceQueue {
  constructor(
    @InjectRepository(Todo) private todoRepository: Repository<Todo>,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async createTodoService(dto: CreateTodoDTO, userId: string) {
    const userExist = await this.userRepository.findOneBy({ userId });
    if (!userExist) throw new NotFoundException('User not found');
    const { password: _, isVerify: __, isBlock: ___, ...safeUser } = userExist;
    const duration = getDuration(dto.duration);
    const createTodoRepo = this.todoRepository.create({
      title: dto.title,
      content: dto.content,
      duration: duration,
      priority: dto.priority ?? PriorityEnum.Low,
      status: dto.status ?? StatusTodo.Pending,
      user: safeUser,
    });
    console.log(createTodoRepo);
    const data = await this.todoRepository.save(createTodoRepo);
    return data;
  }

  async deleteAllTodoService(todos: Todo[]) {
    const ids = todos.map((t) => t.todoId);
    await this.todoRepository.delete(ids);
  }
}
