import {
  Body,
  Controller,
  Delete,
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
  refreshToken(@Req() req: Request) {
    const refreshToken = req.cookies['refreshToken'] as string;
    if (!refreshToken)
      throw new UnauthorizedException('RefreshToken is missing');
    return this.authService.refreshToken(refreshToken);
  }

  @Post('logout')
  logout(@Req() req: Request) {
    const authHeader = req.headers['authorization'] as string;
    if (!authHeader || !authHeader.startsWith('Bearer'))
      throw new UnauthorizedException('Access token is missing or invalid');
    const accessToken = authHeader.split(' ')[1];
    console.log(accessToken);
    return this.authService.logout(accessToken);
  }

  @Delete()
  delete(@Req() req: Request) {
    const authHeader = req.headers['authorization'] as string;
    if (!authHeader || !authHeader.startsWith('Bearer'))
      throw new UnauthorizedException('Access token is missing ');
    const accessToken = authHeader.split(' ')[1];
    return this.authService.deleteAccout(accessToken);
  }
}
