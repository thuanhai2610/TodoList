import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDTO } from './dto/register.dto';
import { LoginDTO } from './dto/login.dto';
import { Response, Request } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDTO) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDTO, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @Post('refreshToken')
  async refreshToken(@Req() req: Request) {
    const refreshToken = req.cookies['refreshToken'] as string;
    console.log(refreshToken);
    if (!refreshToken)
      throw new UnauthorizedException('RefreshToken is missing');
    const result = await this.authService.refreshToken(refreshToken);
    return result;
  }
}
