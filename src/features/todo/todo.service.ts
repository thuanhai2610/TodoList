import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { CreateTodoDTO } from './dto/create-todo.dto';
import { PriorityEnum } from './enum/priority.enum';
import { StatusTodo } from './enum/status-todo.enum';

@Injectable()
export class TodoService {
  private readonly key = 'todos';
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async create(dto: CreateTodoDTO, userId: string) {
    const id = Date.now().toString();
    const todo = {
      id,
      title: dto.title,
      content: dto.content,
      duration: dto.duration || null,
      priority: dto.priority || PriorityEnum.Low,
      status: dto.status || StatusTodo.Pending,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.redis.hset(`${this.key}:${userId}`, id, JSON.stringify(todo));

    return todo;
  }

  async findAll(userId: string) {
    const todos = await this.redis.hgetall(`${this.key}:${userId}`);
    if (!todos) return [];
    const data = Object.values(todos).map((t) => JSON.parse(t));
    return data;
  }

  async findOne(userId: string, id: string) {
    const todos = await this.redis.hget(`${this.key}:${userId}`, id);
    if (!todos) return [];
    return JSON.parse(todos);
  }
  async update(id: string, dto: Partial<CreateTodoDTO>, userId: string) {
    const data = await this.redis.hget(`${this.key}:${userId}`, id);
    if (!data) throw new NotFoundException('Todo not found');
    const todos = JSON.parse(data);
    const updated = { ...todos, ...dto, updatedAt: new Date().toISOString() };
    await this.redis.hset(`${this.key}:${userId}`, id, JSON.stringify(updated));
    return updated;
  }

  async remove(id: string, userId: string) {
    const data = await this.redis.hget(`${this.key}:${userId}`, id);
    if (!data) throw new NotFoundException('Todo not found');
    await this.redis.hdel(`${this.key}:${userId}`, id);
    return {
      message: `Todo ${id} is remove`,
    };
  }
}
