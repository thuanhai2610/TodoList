import { CanActivate, ExecutionContext, Injectable, InternalServerErrorException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";

@Injectable()
export class AuthGuard implements CanActivate{
    constructor(private readonly jwtService: JwtService){}
    async canActivate(context: ExecutionContext): Promise<boolean>{
        const req = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(req);
        if(!token) throw new UnauthorizedException('Token is missing!');
        try {
            const payload = await this.jwtService.verify(token, {
                secret: process.env.JWT_SECRET
            })
            req.user = payload;
            console.log(payload);
            
        } catch (error) {
            throw new InternalServerErrorException('Server error', error)
        }
        return true;
    }

    extractTokenFromHeader(req: Request){
        const [type, token] = req.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined
    }
}