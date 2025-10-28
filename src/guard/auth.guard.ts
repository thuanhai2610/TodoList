import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PayloadRFToken } from 'src/auth/interface/login.interface';
import { RequestUser } from 'src/features/todo/interface/todo.interface';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & RequestUser>();
    const token = this.extractTokenFromHeader(req);
    if (!token) throw new UnauthorizedException('Token is missing!');
    try {
      const payload: PayloadRFToken = await this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_TOKEN,
      });
      req.user = payload;
    } catch (error) {
      throw new UnauthorizedException('Token is experiesed', error as string);
    }
    return true;
  }

  extractTokenFromHeader(req: Request) {
    const [type, token] = req.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
