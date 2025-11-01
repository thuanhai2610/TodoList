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
import { Todo } from 'src/modules/todo/entity/todo.entity';
import { ILike, Repository } from 'typeorm';
import { User } from 'src/modules/auth/entity/user.entity';
import { ResponseTodo } from './interface/todo.interface';
import { TodoAction } from './WSEvent';
import { getPagination } from 'src/common/untils/paginate.untils';
import { TodoQueue } from 'src/redis/bullmq/queue/todo/todo.queue';
import { TodoGateWay } from 'src/modules/todo/todo.gateway';
import { UpdateTodoDTO } from './dto/update-todo.dto';
import { RedisPubSubTodo } from 'src/common/constant/redis-pubsub.constant';

const TTL = 60;
@Injectable()
export class TodoService {
  private readonly key = 'todos';
  constructor(
    @Inject(TodoGateWay) private readonly todoGateWay: TodoGateWay,
    private readonly todoQueue: TodoQueue,
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @Inject('REDIS_PUB') private readonly redisPub: Redis,
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
    await this.todoGateWay.broadcast(TodoAction.TodoCreated, safeTodo);
    return safeTodo;
  }

  async createFollowQueue(dto: CreateTodoDTO, userId: string) {
    await this.todoQueue.createdTodoQueue(dto, userId);
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
    const { pageNum, limitNum, skip, take } = getPagination(page, limit);
    const whereCondition = q
      ? [
          { user: { userId }, title: ILike(`%${q}%`) },
          { user: { userId }, content: ILike(`%${q}%`) },
        ]
      : { user: { userId } };
    const [todoDb, total] = await this.todoRepository.findAndCount({
      where: whereCondition,
      order: { createdAt: 'ASC' },
      skip,
      take,
    });
    const result = {
      data: todoDb as ResponseTodo[],
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    };
    return result;
  }

  async findOne(userId: string, id: string) {
    const todos = await this.redis.get(`${this.key}:${userId}:${id}`);
    if (todos) return JSON.parse(todos) as ResponseTodo;
    const todoRepo = await this.todoRepository.findOne({
      where: {
        todoId: id,
        user: { userId },
      },
    });
    if (todoRepo) {
      await this.redis.set(
        `${this.key}:${userId}:${id}`,
        JSON.stringify(todoRepo),
        'EX',
        TTL,
      );
      return todoRepo;
    } else {
      return {
        message: 'Not Found to do for user',
      };
    }
  }

  async update(id: string, dto: Partial<UpdateTodoDTO>, userId: string) {
    const key = `${this.key}:${userId}:${id}`;
    const updateDuration = dto.duration
      ? undefined
      : this.getDuration(dto.duration);
    const findEntity = await this.todoRepository.findOne({
      where: { todoId: id, user: { userId } },
    });

    if (!findEntity) throw new NotFoundException('Todo not found!');
    Object.assign(findEntity, dto, {
      duration: updateDuration ?? findEntity.duration,
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
    await this.redis.set(key, JSON.stringify(cacheData), 'EX', TTL);
    await this.todoGateWay.broadcast(TodoAction.TodoUpdated, updated);

    return updated;
  }

  async remove(id: string, userId: string) {
    await this.redis.del(`${this.key}:${userId}:${id}`);
    const removeTodoRepo = await this.todoRepository.findOne({
      where: {
        todoId: id,
        user: { userId: userId },
      },
    });
    if (!removeTodoRepo)
      throw new NotFoundException('Not found todo to remove');
    await this.todoRepository.remove(removeTodoRepo);
    await this.todoGateWay.broadcast(TodoAction.TodoRemoved, {
      todoId: id,
    } as ResponseTodo);
    return {
      message: `Todo ${id} is remove`,
    };
  }

  getDuration(input?: string): string | undefined {
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

  async deleteTods(userId: string) {
    const allTods = await this.todoRepository.find({
      where: { user: { userId } },
    });
    const sizeDelete = 10;
    for (let i = 0; i < allTods.length; i += sizeDelete) {
      const deletodo = allTods.slice(i, i + sizeDelete);
      await this.todoQueue.deleteTodoQueue(deletodo, userId);
    }
  }

  async pubTodo(dto: CreateTodoDTO, userId: string) {
    return await this.redisPub.publish(
      RedisPubSubTodo.CreateTodo,
      JSON.stringify({ dto, userId }),
    );
  }
}
