import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RedisModule } from 'src/redis/redis.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entity/user.entity';
import { JwtModuleConfig } from 'src/guard/jwt.module';
import { BullMQModule } from 'src/redis/bullmq/bullmq.module';
import { TodoModule } from 'src/features/todo/todo.module';

@Module({
  imports: [
    RedisModule,
    JwtModuleConfig,
    TypeOrmModule.forFeature([User]),
    BullMQModule,
    TodoModule,
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
