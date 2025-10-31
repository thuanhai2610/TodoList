import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateTodoDTO } from './dto/create-todo.dto';
import { TodoService } from './todo.service';
import { AuthGuard } from 'src/guard/auth.guard';
import { UpdateTodoDTO } from './dto/update-todo.dto';
import { RequestUser } from './interface/todo.interface';

@UseGuards(AuthGuard)
@Controller('todo')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}
  @Post()
  async createTodo(@Body() dto: CreateTodoDTO, @Req() req: RequestUser) {
    const { userId } = req.user;
    return await this.todoService.create(dto, userId);
  }

  @Post('queue')
  async createTodoQueue(@Body() dto: CreateTodoDTO, @Req() req: RequestUser) {
    const { userId } = req.user;
    return await this.todoService.createFollowQueue(dto, userId);
  }

  @Get()
  findAllTodoOfUser(
    @Req() req: RequestUser,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('q') q: string,
  ) {
    const { userId } = req.user;
    return this.todoService.findAll(userId, +page, +limit, q);
  }

  @Get(':id')
  findOneTodoOfUser(@Req() req: RequestUser, @Param('id') id: string) {
    const { userId } = req.user;
    return this.todoService.findOne(userId, id);
  }
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTodoDTO,
    @Req() req: RequestUser,
  ) {
    const { userId } = req.user;
    return this.todoService.update(id, dto, userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req: RequestUser) {
    const { userId } = req.user;
    return this.todoService.remove(id, userId);
  }
}
