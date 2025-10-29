import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PayloadRFToken } from 'src/auth/interface/login.interface';
import { TodoAction } from './WSEvent';
import { OnEvent } from '@nestjs/event-emitter';
import { ResponseTodo } from './interface/todo.interface';

@WebSocketGateway(3001, { cors: { origin: '*' } })
export class TodoGateWay implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private client = new Map<string, string>();

  constructor(private readonly jwtService: JwtService) {}
  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      const token = client.handshake.query?.token as string;
      if (!token) throw new UnauthorizedException('Token is missing!');
      const payload: PayloadRFToken = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_TOKEN,
      });
      const userId = payload.userId;
      if (!userId) throw new UnauthorizedException('Invalid Token');
      this.client.set(client.id, userId);
      await client.join(String(userId));
    } catch (error) {
      console.error('WS Auth failed', error);
      client.disconnect();
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket) {
    const userId = this.client.get(client.id);
    if (userId) {
      this.client.delete(client.id);
    }
  }
  @OnEvent(TodoAction.TodoCreated)
  emitTodoCreated(payload: { userId: string; todo: ResponseTodo }) {
    console.log(payload.userId, payload.todo);
    this.server.to(payload.userId).emit(TodoAction.TodoCreated, payload.todo);
  }

  @OnEvent(TodoAction.TodoUpdated)
  emitTodoUpdated(payload: { userId: string; todo: ResponseTodo }) {
    this.server.to(payload.userId).emit(TodoAction.TodoUpdated, payload.todo);
  }

  @OnEvent(TodoAction.TodoRemoved)
  emitTodoRemoved(payload: { userId: string; todo: ResponseTodo }) {
    this.server.to(payload.userId).emit(TodoAction.TodoRemoved, payload.todo);
  }
}
