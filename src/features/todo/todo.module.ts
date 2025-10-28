import { Module } from '@nestjs/common';
import { TodoController } from './todo.controller';
import { TodoService } from './todo.service';
import { RedisModule } from 'src/redis/redis.module';
import { AuthGuard } from 'src/guard/auth.guard';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Todo } from 'src/entity/todo.entity';
import { User } from 'src/entity/user.entity';
import { JwtModuleConfig } from 'src/guard/jwt.module';

@Module({
  imports: [
    RedisModule,
    JwtModuleConfig,
    TypeOrmModule.forFeature([Todo, User]),
  ],
  controllers: [TodoController],
  providers: [TodoService, AuthGuard],
})
export class TodoModule {}
