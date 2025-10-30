import { Module } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtModuleConfig } from 'src/guard/jwt.module';
import { TodoGateWay } from './todo.gateway';

@Module({
  imports: [JwtModuleConfig],
  providers: [JwtService, TodoGateWay],
  exports: [TodoGateWay],
})
export class GateWayModule {}
