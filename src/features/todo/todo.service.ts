import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Redis from 'ioredis';
import { CreateTodoDTO } from './dto/create-todo.dto';
import { PriorityEnum } from './enum/priority.enum';
import { StatusTodo } from './enum/status-todo.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Todo } from 'src/entity/todo.entity';
import { Repository } from 'typeorm';
import { User } from 'src/entity/user.entity';
import { ResponseTodo } from './interface/todo.interface';
import { TodoGateWay } from './todo.gateway';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TodoAction } from './WSEvent';
const TTL = 60;
@Injectable()
export class TodoService {
  private readonly key = 'todos';
  constructor(
    private readonly todoGateWay: TodoGateWay,
    private eventEmitter: EventEmitter2,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @InjectRepository(Todo) private todoRepository: Repository<Todo>,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async create(dto: CreateTodoDTO, userId: string) {
    const user = await this.userRepository.findOneBy({ userId });
    if (!user) throw new NotFoundException('User not found');
    const getDuration = this.getDuration(dto.duration);
    const createTodoRepo = this.todoRepository.create({
      title: dto.title,
      content: dto.content,
      duration: getDuration,
      priority: dto.priority ?? PriorityEnum.Low,
      status: dto.status ?? StatusTodo.Pending,
      user,
    });
    const saveRepo = await this.todoRepository.save(createTodoRepo);

    const { user: OrginalUser, ...todoData } = saveRepo;
    const safeUser = {
      email: OrginalUser.email,
      name: OrginalUser.name,
    };
    const safeTodo = {
      ...todoData,
      user: safeUser,
    };
    await this.redis.hset(
      `${this.key}:${userId}`,
      saveRepo.todoId,
      JSON.stringify(safeTodo),
    );
    await this.redis.expire(`${this.key}:${userId}`, TTL);
    const userIdString = userId.toString();
    this.eventEmitter.emit(TodoAction.TodoCreated, {
      userId: userIdString,
      todo: safeTodo,
    });
    return safeTodo;
  }

  async findAll(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{
    data: ResponseTodo[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  }> {
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const todos = await this.redis.hgetall(`${this.key}:${userId}`);
    if (Object.keys(todos).length === 0) {
      const [todos, total] = await this.todoRepository.findAndCount({
        where: { user: { userId } },
        order: { createdAt: 'ASC' },
        skip: startIndex,
        take: limit,
      });
      if (!todos || todos.length === 0)
        throw new NotFoundException('No todos found');
      await Promise.all(
        todos.map((todo) =>
          this.redis.hset(
            `${this.key}:${userId}`,
            todo.todoId.toString(),
            JSON.stringify(todo),
          ),
        ),
      );
      await this.redis.expire(`${this.key}:${userId}`, TTL);
      return {
        data: todos as ResponseTodo[],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }

    const parse = Object.values(todos).map(
      (t) => JSON.parse(t) as ResponseTodo,
    );
    const sorted = parse.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const paginated = sorted.slice(startIndex, endIndex);

    return {
      data: paginated,
      pagination: {
        total: parse.length,
        page,
        limit,
        totalPages: Math.ceil(parse.length / limit),
      },
    };
  }

  async findOne(userId: string, id: string) {
    const todos = await this.redis.hget(`${this.key}:${userId}`, id);
    if (todos) return JSON.parse(todos) as ResponseTodo;
    const todoRepo = await this.todoRepository.findOne({
      where: {
        todoId: id,
        user: { userId },
      },
    });
    if (todoRepo) {
      await this.redis.hset(
        `${this.key}:${userId}`,
        id,
        JSON.stringify(todoRepo),
      );
      await this.redis.expire(this.key, TTL);
      return todoRepo;
    } else {
      return {
        message: 'Not Found to do for user',
      };
    }
  }

  async update(id: string, dto: Partial<CreateTodoDTO>, userId: string) {
    const key = `${this.key}:${userId}`;
    const updateDuration = this.getDuration(dto.duration);
    const findEntity = await this.todoRepository.findOne({
      where: { todoId: id, user: { userId } },
    });

    if (!findEntity) throw new NotFoundException('Todo not found!');
    Object.assign(findEntity, dto, {
      duration: updateDuration ?? findEntity,
      updatedAt: new Date().toISOString(),
    });

    const updated = await this.todoRepository.save(findEntity);

    const cacheData = {
      todoId: updated.todoId,
      title: updated.title,
      status: updated.status,
      duration: updated.duration,
      priority: updated.priority,
      content: updated.content,
      updatedAt: updated.updatedAt,
    };
    await this.redis.hset(key, id, JSON.stringify(cacheData));
    await this.redis.expire(key, TTL);

    return updated;
  }

  async remove(id: string, userId: string) {
    await this.redis.hdel(`${this.key}:${userId}`, id);
    const removeTodoRepo = await this.todoRepository.findOne({
      where: {
        todoId: id,
        user: { userId: userId },
      },
    });
    if (!removeTodoRepo)
      throw new NotFoundException('Not found todo to remove');
    await this.todoRepository.remove(removeTodoRepo);
    return {
      message: `Todo ${id} is remove`,
    };
  }

  private getDuration(input?: string): string | undefined {
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
  }
}
