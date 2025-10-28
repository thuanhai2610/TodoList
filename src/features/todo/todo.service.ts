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
      priority: dto.priority || PriorityEnum.Low,
      status: dto.status || StatusTodo.Pending,
      user,
    });
    const saveRepo = await this.todoRepository.save(createTodoRepo);

    this.redis.expire(`${this.key}:${userId}`, TTL);
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
    return safeTodo;
  }

  async findAll(userId: number) {
    const todos = await this.redis.hgetall(`${this.key}:${userId}`);
    if (!todos || Object.keys(todos).length === 0) {
      const dbTodo = await this.todoRepository.find({
        where: { user: { userId } },
      });
      if (dbTodo.length > 0) {
        for (const todo of dbTodo)
          await this.redis.hset(
            `${this.key}:${userId}`,
            todo.todoId,
            JSON.stringify(todo),
          );
        this.redis.expire(`${this.key}:${userId}`, TTL);
      }
      return dbTodo;
    }
    const data = Object.values(todos).map((t) => JSON.parse(t));
    return data;
  }

  async findOne(userId: number, id: string) {
    const todos = await this.redis.hget(`${this.key}:${userId}`, id);
    if (todos) {
      const parseTodo = JSON.parse(todos);
      return parseTodo;
    }
    const todoRepo = await this.todoRepository.findOne({
      where: {
        todoId: Number(id),
        user: { userId },
      },
    });
    await this.redis.hset(
      `${this.key}:user:${userId}`,
      id,
      JSON.stringify(todoRepo),
    );
    this.redis.expire(this.key, TTL);
    return todoRepo;
  }

  async update(id: string, dto: Partial<CreateTodoDTO>, userId: number) {
    const data = await this.redis.hget(`${this.key}:${userId}`, id);
   let findEntity
    if (!data) {
      const updated = await this.todoRepository.update(
        { todoId: Number(id), user: { userId } },
        { ...dto, updatedAt: new Date().toISOString() },
      );
      if (updated.affected === 0) throw new Error('Todo not found!');
      findEntity = await this.todoRepository.findOne({
        where: { todoId: Number(id), user: { userId } },
      });
    } else {
      const todos = JSON.parse(data);

      await this.todoRepository.update(
        { todoId: Number(id), user: { userId } },
        { ...todos, ...dto, updatedAt: new Date().toISOString() },
      );
        findEntity = await this.todoRepository.findOne({
        where: { todoId: Number(id), user: { userId } },
      });
    }

    await this.redis.hset(
      `${this.key}:${userId}`,
      id,
      JSON.stringify(findEntity),
    );
    this.redis.expire(`${this.key}:${userId}`, TTL);
    return findEntity;
  }

  async remove(id: string, userId: number) {
    const data = await this.redis.hget(`${this.key}:${userId}`, id);
    if (data) {
      await this.redis.hdel(`${this.key}:${userId}`, id);
    }
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
