import { Module } from '@nestjs/common';
import { TodoController } from './todo.controller';
import { TodoService } from './todo.service';
import { RedisModule } from 'src/redis/redis.module';
import { AuthGuard } from 'src/guard/auth.guard';
import { JwtModule } from '@nestjs/jwt';

@Module({
    imports: [RedisModule,        JwtModule.register({secret: process.env.JWT_SECRET, signOptions: {expiresIn: '15m'}})
    ],
  controllers: [TodoController],
  providers: [TodoService, AuthGuard],
})
export class TodoModule {}
