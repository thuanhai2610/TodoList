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
    @Inject(TodoGateWay) private readonly todoGateWay: TodoGateWay,
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
    console.log(JSON.stringify(safeTodo));
    this.todoGateWay.broadcast(TodoAction.TodoCreated, safeTodo);

    return safeTodo;
  }

  async findAll(
    userId: string,
    page = 1,
    limit = 10,
    q?: string,
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
    const todosCache = await this.redis.hgetall(`${this.key}:${userId}`);
    let redisCache: ResponseTodo[] = [];
    if (Object.keys(todosCache).length === 0) {
      const [todoDatabase] = await this.todoRepository.findAndCount({
        where: { user: { userId } },
        order: { createdAt: 'ASC' },
      });
      await this.setRedis(todoDatabase, userId);
      redisCache = todoDatabase;
    } else {
      redisCache = Object.values(todosCache).map(
        (todo) => JSON.parse(todo) as ResponseTodo,
      );
    }
    if (q) {
      const queryCache = q.toLowerCase();
      redisCache = redisCache.filter(
        (t) =>
          t.title.toLowerCase().includes(queryCache) ||
          t.content.toLowerCase().includes(queryCache),
      );
      if (!redisCache) throw new NotFoundException('Not found todo');
    }
    const paginateTodoCache = redisCache.slice(startIndex, endIndex);
    return {
      data: paginateTodoCache,
      pagination: {
        total: redisCache.length,
        page,
        limit,
        totalPages: Math.ceil(redisCache.length / limit),
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
      duration: updateDuration ?? new Date().toISOString(),
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
    await this.redis
      .multi()
      .hset(key, id, JSON.stringify(cacheData))
      .expire(key, TTL)
      .exec();
    this.todoGateWay.broadcast(TodoAction.TodoUpdated, updated);

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
    this.todoGateWay.broadcast(TodoAction.TodoRemoved, {
      todoId: id,
    } as ResponseTodo);
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

  private async setRedis(todoDatabase: Todo[], userId: string) {
    for (const todo of todoDatabase) {
      await this.redis.hset(
        `${this.key}:${userId}`,
        todo.todoId.toString(),
        JSON.stringify(todo),
      );
    }
    await this.redis.expire(`${this.key}:${userId}`, TTL);
  }
}
