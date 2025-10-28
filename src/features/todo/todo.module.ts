import { Module } from '@nestjs/common';
import { TodoController } from './todo.controller';
import { TodoService } from './todo.service';
import { RedisModule } from 'src/redis/redis.module';
import { AuthGuard } from 'src/guard/auth.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Todo } from 'src/entity/todo.entity';
import { User } from 'src/entity/user.entity';
import { JwtModuleConfig } from 'src/guard/jwt.module';
import { TodoGateWay } from './todo.gateway';
import { JwtService } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    RedisModule,
    JwtModuleConfig,
    TypeOrmModule.forFeature([Todo, User]),
    EventEmitterModule.forRoot(),
  ],
  controllers: [TodoController],
  providers: [TodoService, AuthGuard, JwtService, TodoGateWay],
  exports: [TodoGateWay],
})
export class TodoModule {}
