import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { CreateTodoDTO } from './dto/create-todo.dto';

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
      completed: false,
    };
    await this.redis.hset(`${this.key}:user:${userId}`, id, JSON.stringify(todo));

   
    return todo;
  }

  async findAll(userId: string) {
    const todos = await this.redis.hgetall(`${this.key}:user:${userId}`);
    if (!todos) return [];
    const data = Object.values(todos).map(t => JSON.parse(t));
    return data
  }

  async update(id: string, dto: Partial<CreateTodoDTO>, userId: string) {
    const data = await this.redis.hget(`${this.key}:user:${userId}`, id);
    if (!data) throw new NotFoundException('Todo not found');
    const todos = JSON.parse(data);
    const updated = {...todos, ...dto};
    await this.redis.hset(`${this.key}:user:${userId}`, id, JSON.stringify(updated));
    return updated;
  }

  async remove(id: string, userId: string) {
    const data = await this.redis.hget(`${this.key}:user:${userId}`, id);
    if (!data) throw new NotFoundException('Todo not found');
    await this.redis.hdel(`${this.key}:user:${userId}`, id);
    return {
      message: `Todo ${id} is remove`,
    };
  }
}
