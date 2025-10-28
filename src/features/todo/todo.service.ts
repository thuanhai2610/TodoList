import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { CreateTodoDTO } from './dto/create-todo.dto';
import { PriorityEnum } from './enum/priority.enum';
import { StatusTodo } from './enum/status-todo.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Todo } from 'src/entity/todo.entity';
import { Repository } from 'typeorm';
import { User } from 'src/entity/user.entity';
const TTL = 60;
@Injectable()
export class TodoService {
  private readonly key = 'todos';
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: Redis,
    @InjectRepository(Todo) private todoRepository: Repository<Todo>,
    @InjectRepository(User) private userRepository: Repository<User>,
  ) {}

  async create(dto: CreateTodoDTO, userId: number) {
    const user = await this.userRepository.findOneBy({ userId });
    if (!user) throw new NotFoundException('User not found');

    const createTodoRepo = this.todoRepository.create({
      title: dto.title,
      content: dto.content,
      duration: dto.duration ? new Date(dto.duration).toISOString() : undefined,
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
    this.redis.expire(`${this.key}:${userId}`, TTL);
    return safeTodo;
  }

  async findAll(userId: number) {
    const todos = await this.redis.hgetall(`${this.key}:${userId}`);
    if (Object.keys(todos).length === 0) {
      const dbTodo = await this.todoRepository.find({
        where: { user: { userId } },
      });
      if (dbTodo.length > 0) {
        await Promise.all(
          dbTodo.map((todo) =>
            this.redis.hset(
              `${this.key}:${userId}`,
              todo.todoId.toString(),
              JSON.stringify(todo),
            ),
          ),
        );
        this.redis.expire(`${this.key}:${userId}`, TTL);
      }

      return dbTodo;
    }

    return Object.values(todos).map((t) => JSON.parse(t));
  }

  async findOne(userId: number, id: string) {
    const todos = await this.redis.hget(`${this.key}:${userId}`, id);
    if (todos) return JSON.parse(todos);
    const todoRepo = await this.todoRepository.findOne({
      where: {
        todoId: Number(id),
        user: { userId },
      },
    });
    if (todoRepo) {
      await this.redis.hset(
        `${this.key}:${userId}`,
        id,
        JSON.stringify(todoRepo),
      );
      this.redis.expire(this.key, TTL);
      return todoRepo;
    } else {
      return {
        message: 'Not Found to do for user',
      };
    }
  }

  async update(id: string, dto: Partial<CreateTodoDTO>, userId: number) {
    const key = `${this.key}:${userId}`;
    const findEntity = await this.todoRepository.findOne({
      where: { todoId: Number(id), user: { userId } },
    });

    if (!findEntity) throw new Error('Todo not found!');
    Object.assign(findEntity, dto, { updatedAt: new Date().toISOString() });

    const updated = await this.todoRepository.save(findEntity);

    const cacheData = {
      todoId: updated.todoId,
      title: updated.title,
      status: updated.status,
      priority: updated.priority,
      content: updated.content,
      updatedAt: updated.updatedAt,
    };
    await this.redis.hset(key, id, JSON.stringify(cacheData));
    this.redis.expire(key, TTL);

    return updated;
  }

  async remove(id: string, userId: number) {
    await this.redis.hdel(`${this.key}:${userId}`, id);
    const removeTodoRepo = await this.todoRepository.findOne({
      where: {
        todoId: Number(id),
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
}
