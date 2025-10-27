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
    const todoIdNumber = parseInt(id, 10);
    const todos = await this.redis.hget(`${this.key}:${userId}`, id);
    if (todos) {
      const parseTodo = JSON.parse(todos);
      return parseTodo;
    }
    const todoRepo = await this.todoRepository.findOne({
      where : {
        todoId: todoIdNumber,
        user : {userId}}
      })
      await this.redis.hset(`${this.key}:user:${userId}`, id, JSON.stringify(todoRepo));
      this.redis.expire(this.key, TTL);
      return todoRepo;
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
