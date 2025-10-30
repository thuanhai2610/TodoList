import { Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { PayloadRFToken } from 'src/auth/interface/login.interface';
import { Server, WebSocket } from 'ws';
import { ResponseTodo } from '../todo/interface/todo.interface';
import { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';

interface AuthWebSocket extends WebSocket {
  id: string;
  userId?: string;
}

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
      } catch {}
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

  broadcast(t: string, d: ResponseTodo) {
    if (!this.server) {
      this.logger.warn('WebSocket server not initialized yet.');
      return;
    }

    const message = JSON.stringify({ t, d });
    if (Buffer.byteLength(message, 'utf8') > 1024) {
      this.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(JSON.stringify({ error: 'Message too large' }));
          } catch (error) {
            this.logger.warn(
              `Failed to send error to client ${client.id}`,
              error,
            );
          }
        }
      });
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
  private getErrorMesssage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (typeof error === 'string') return error;
    return 'An unknown error occured';
  }
}
