import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/modules/auth/entity/user.entity';
import { CreateTodoDTO } from 'src/modules/todo/dto/create-todo.dto';
import { Todo } from 'src/modules/todo/entity/todo.entity';
import { PriorityEnum } from 'src/modules/todo/enum/priority.enum';
import { StatusTodo } from 'src/modules/todo/enum/status-todo.enum';
import { Repository } from 'typeorm';

@Injectable()
export class TodoSubService {
  constructor(
    @InjectRepository(Todo) private readonly todoRepository: Repository<Todo>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async createTodo(dto: CreateTodoDTO, userId: string) {
    const user = await this.userRepository.findOneBy({ userId });
    if (!user) throw new NotFoundException('User is not found!');
    const getDuration = this.getDuration(dto.duration);

    const createTodo = this.todoRepository.create({
      title: dto.title,
      content: dto.content,
      duration: getDuration,
      status: dto.status ?? StatusTodo.Pending,
      priority: dto.priority ?? PriorityEnum.Low,
      user,
    });
    const saveRepo = await this.todoRepository.save(createTodo);
    return saveRepo;
  }

  getDuration = (input?: string): string | undefined => {
    const base = new Date();
    if (!input) return base.toISOString();
    const createdAt = new Date();
    const dur = input.toLowerCase();
    const time = new Date(createdAt);

    const day = parseInt(dur.match(/(\d+)d/)?.[1] ?? '0');
    const hour = parseInt(dur.match(/(\d+)h/)?.[1] ?? '0');
    const min = parseInt(dur.match(/(\d+)m/)?.[1] ?? '0');
    if (day + hour + min === 0 && isNaN(Date.parse(dur)))
      throw new BadRequestException('Invalid duration (1h, 1d, 1d15m)');

    time.setDate(time.getDate() + day);
    time.setHours(time.getHours() + hour);
    time.setMinutes(time.getMinutes() + min);
    return time.toISOString();
  };
}
