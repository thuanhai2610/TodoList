import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";


@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy){

    constructor(
    ){
        const  jwtSecret = process.env.JWT_SECRET
        if (!jwtSecret) throw new Error ('JWT Secret env variable is not found!')
            super({
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        ignoreExpiration: false,
        secretOrKey: jwtSecret,
        })

    }
    validate(payload: any) {
        return {userId: payload.userId, email: payload.email}
    }
}