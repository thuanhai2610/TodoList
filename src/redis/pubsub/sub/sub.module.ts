import { Global, Module } from '@nestjs/common';
import { SubAuth } from './sub.auth';
import { OTPService } from '../service/auth/otp.service';
import { SubTodo } from './sub.todo';
import { TodoSubService } from '../service/todo/todo.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Todo } from 'src/modules/todo/entity/todo.entity';
import { User } from 'src/modules/auth/entity/user.entity';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Todo, User])],
  providers: [SubAuth, OTPService, SubTodo, TodoSubService],
  exports: [SubAuth, SubTodo],
})
export class SubModule {}
