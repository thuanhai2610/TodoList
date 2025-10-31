import { Module } from '@nestjs/common';
import { TodoController } from './todo.controller';
import { TodoService } from './todo.service';
import { RedisModule } from 'src/redis/redis.module';
import { AuthGuard } from 'src/guard/auth.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Todo } from 'src/entity/todo.entity';
import { User } from 'src/entity/user.entity';
import { JwtModuleConfig } from 'src/guard/jwt.module';
import { JwtService } from '@nestjs/jwt';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GateWayModule } from '../gateway/gateway.module';
import { BullMQModule } from 'src/redis/bullmq/bullmq.module';

@Module({
  imports: [
    RedisModule,
    JwtModuleConfig,
    TypeOrmModule.forFeature([Todo, User]),
    EventEmitterModule.forRoot(),
    GateWayModule,
    BullMQModule,
  ],
  controllers: [TodoController],
  providers: [TodoService, AuthGuard, JwtService],
  exports: [TodoService],
})
export class TodoModule {}
