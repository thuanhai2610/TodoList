import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RedisModule } from "src/redis/redis.module";
import { JwtModule } from "@nestjs/jwt";


@Module({
    imports: [RedisModule, 
        JwtModule.register({secret: process.env.JWT_SECRET, signOptions: {expiresIn: '15m'}})
    ],
    controllers: [AuthController],
    providers: [AuthService],
})
export class AuthModule{}