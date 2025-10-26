import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import Redis from 'ioredis';
import { CreateTodoDTO } from './dto/create-todo.dto';

@Injectable()
export class TodoService {
  private readonly key = 'todos';
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async create(dto: CreateTodoDTO) {
    const id = Date.now().toString();
    const todo = {
      id,
      title: dto.title,
      content: dto.content,
      completed: false,
    };
    const data = await this.redis.get(this.key);
    const todos = data ? JSON.parse(data) : [];

    todos.push(todo);

    await this.redis.set(this.key, JSON.stringify(todos));
    return todo;
  }

  async findAll() {
    const todos = await this.redis.get(this.key);
    if (!todos) return [];
    return JSON.parse(todos);
  }

  async findOne(id: string) {
    const data = await this.redis.get(this.key);
    if (!data) throw new NotFoundException('Todo not found');
    const todos = JSON.parse(data);
    const todo = todos.find((f) => f.id === id);
    if (!todo) throw new NotFoundException('Todos not found!');
    return todo;
  }

  async update(id: string, dto: Partial<CreateTodoDTO>) {
    const data = await this.redis.get(this.key);
    if (!data) throw new NotFoundException('Todo not found');
    const todos = JSON.parse(data);
    const todo = todos.findIndex((f) => f.id === id);
    if ( todo === -1) throw new NotFoundException('Todos not found!');
    todos[todo] = { ...todos[todo], ...dto };
    await this.redis.set(this.key, JSON.stringify(todos));
    return todos[todo];
  }

  async remove(id: string) {
    const data = await this.redis.get(this.key);
    if (!data) throw new NotFoundException('Todo not found');

    const todos = JSON.parse(data).filter((f) => f.id !== id);
    await this.redis.set(this.key, JSON.stringify(todos));

    return {
      message: `Todo ${id} is remove`,
    };
  }
}
