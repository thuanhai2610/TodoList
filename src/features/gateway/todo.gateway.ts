import {
  BadRequestException,
  Logger,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { PayloadRFToken } from 'src/auth/interface/login.interface';
import { Server, WebSocket } from 'ws';
import { ResponseTodo } from '../todo/interface/todo.interface';
import { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';
import { IpThrottlerGuard } from 'src/guard/ip-throttler.guard';

interface AuthWebSocket extends WebSocket {
  id: string;
  userId?: string;
}
interface SendMessagePayload {
  userId: string;
  event: string;
  dataSend: ResponseTodo;
}
@UseGuards(IpThrottlerGuard)
@WebSocketGateway(3001, { path: '/ws' })
export class TodoGateWay
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(TodoGateWay.name);
  constructor(private readonly jwtService: JwtService) {}

  // Map clientId -> socket
  private clients = new Map<string, AuthWebSocket>();
  // Map userId -> Set<clientId>
  private userClients = new Map<string, Set<string>>();

  afterInit(server: Server) {
    this.server = server;
    this.logger.log('WebSocket Server initialized on ws://localhost:3001');
  }

  handleConnection(client: AuthWebSocket, ...args: any[]) {
    const req = args[0] as IncomingMessage | undefined;

    const generatedId = randomUUID();
    client.id = generatedId;

    try {
      const url = req?.url ?? '';
      const urlParams = new URLSearchParams(url.split('?')[1] || '');
      const token =
        urlParams.get('token') ||
        req?.headers?.authorization?.toString().split(' ')[1];
      if (url.length > 1024) {
        throw new BadRequestException('Query parame are too long');
      }
      if (!token) {
        throw new UnauthorizedException('Token is missing!');
      }
      const payload: PayloadRFToken = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_TOKEN,
      });
      const userId = payload.userId;
      client.userId = userId;
      this.clients.set(client.id, client);
      const set = this.userClients.get(userId) ?? new Set<string>();
      set.add(client.id);
      this.userClients.set(userId, set);
      this.logger.log(
        `Authenticated client ${client.id} for user ${userId}. Connections for user: ${set.size}`,
      );
    } catch (error) {
      const msg = this.getErrorMesssage(error);
      this.logger.warn(`Connection rejected: ${msg}`);
      try {
        client.send(JSON.stringify({ t: 'error', d: { message: msg } }));
      } catch {
        client.send(JSON.stringify({ t: 'error', d: { message: msg } }));
      }
      client.close(1008, 'Unauthorized');
    }
  }

  handleDisconnect(client: AuthWebSocket) {
    if (client && client.id) {
      this.clients.delete(client.id);
    }
    if (client?.userId) {
      const set = this.userClients.get(client.userId);
      if (set) {
        set.delete(client.id);
        if (set.size === 0) this.userClients.delete(client.userId);
        else this.userClients.set(client.userId, set);
      }
      this.logger.log(
        `User ${client.userId} disconnected, clientId=${client.id}`,
      );
    } else {
      this.logger.log(`Unknown client disconnected, clientId=${client?.id}`);
    }
  }
  async broadcast(t: string, d: ResponseTodo, sender?: AuthWebSocket) {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized yet.');
      return;
    }

    const message = JSON.stringify({ t, d });
    const valid = await this.checkByte(message);
    if (!valid) {
      if (sender && sender.readyState === WebSocket.OPEN) {
        sender.send(JSON.stringify({ error: 'Message too large' }));
      }
      return;
    }
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (err) {
          this.logger.warn(`Failed to send to client ${client.id}`, err);
        }
      }
    });
  }

  @SubscribeMessage('MessageToAllClient')
  async broadCastConnect(
    @MessageBody() d: ResponseTodo,
    @ConnectedSocket() client: AuthWebSocket,
  ) {
    await this.broadcast('MessageToAllClient', d, client);

    // Test Ws : JSON =>
    // {
    //     "t": "MessageToAllClient",
    //     "d": {
    //         "d": {
    //             "todoId": "23d10d72-a121-4e22-b4a9-c3747ac4fde6",
    //             "title": "Learn Nestjs",
    //             "content": " Test",
    //             "status": "Pending",
    //             "priority": "High",
    //             "duration": "2025-10-30T10:36:44.651Z",
    //             "createdAt": "2025-10-30T10:21:44.665Z",
    //             "updatedAt": "2025-10-30T10:21:44.665Z",
    //             "user": {
    //                 "email": "thuanhai1@gmail.com",
    //                 "name": "hai"
    //             }
    //         }
    //     }
    // }
  }
  @SubscribeMessage('ping')
  Ping(@MessageBody() d: string) {
    const data = d ? d : 'PONG';
    console.log(data);
    return data;
    //  Test rate limit WS : JSON
    // { "t" : "ping" }
  }
  @SubscribeMessage('sendMessage')
  sendToUser(@MessageBody() payload: SendMessagePayload) {
    console.log(payload.userId, payload);
    const { userId, event, dataSend } = payload;
    console.log(userId, dataSend);
    const clientIds = this.userClients.get(userId);
    console.log(clientIds);
    if (!clientIds || clientIds.size === 0) return;
    const message = JSON.stringify({ event, dataSend });
    clientIds.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client?.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (error) {
          this.logger.warn('Failed', error);
        }
      }
    });
    //  Test WS : JSON   {
    //     "t": "sendMessage",
    //     "d": {
    //         "userId": "2ac870ae-c8d7-4b13-8538-fac8c8a97743",
    //         "event" : "addMessage",
    //         "dataSend": {
    //             "todoId": "a1b98e5d-62f4-4cf0-869c-9a8d81bca2f0",
    //             "title": "Learn Nestjs",
    //             "content": "Test",
    //             "status": "Pending",
    //             "priority": "High",
    //             "duration": "2025-10-30T11:01:57.393Z",
    //             "createdAt": "2025-10-30T10:46:57.397Z",
    //             "updatedAt": "2025-10-30T10:46:57.397Z",
    //             "user": {
    //                 "email": "thuanhai1@gmail.com",
    //                 "name": "hai"
    //             }
    //         }
    //     }
    // }
  }
  private getErrorMesssage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'An unknown error occured';
  }

  private async checkByte(payload: string): Promise<boolean> {
    if (Buffer.byteLength(payload, 'utf8') > 1024) {
      this.logger.warn('Block message');
      return false;
    }
    return true;
  }
}
