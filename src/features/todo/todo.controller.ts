import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CreateTodoDTO } from './dto/create-todo.dto';
import { TodoService } from './todo.service';
import { AuthGuard } from 'src/guard/auth.guard';
import { UpdateTodoDTO } from './dto/update-todo.dto';


@UseGuards(AuthGuard)
@Controller('todo')
export class TodoController {
  constructor(private readonly todoService: TodoService) {}
  @Post()
  createTodo(@Body() dto: CreateTodoDTO, @Req() req) {
    const { userId } = req.user;
    return this.todoService.create(dto, userId);
  }

  @Get()
  findAllTodoOfUser(@Req() req) {
    const { userId } = req.user;
    return this.todoService.findAll(userId);
  }

  @Get(':id')
  findOneTodoOfUser(@Req() req, @Param('id') id: string) {
    const { userId } = req.user;
    return this.todoService.findOne(userId, id);
  }
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTodoDTO, @Req() req) {
    const { userId } = req.user;
    return this.todoService.update(id, dto, userId);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Req() req) {
    const { userId } = req.user;
    return this.todoService.remove(id, userId);
  }
}
