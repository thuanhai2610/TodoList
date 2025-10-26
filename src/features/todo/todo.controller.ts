import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import { CreateTodoDTO } from "./dto/create-todo.dto";
import { TodoService } from "./todo.service";
import { AuthGuard } from "src/guard/auth.guard";

@UseGuards(AuthGuard)
@Controller('todo')
export class TodoController{
    constructor(private readonly todoService : TodoService){}
    @Post()
    createTodo(@Body() dto: CreateTodoDTO, @Req() req ){
        const {userId} = req.user;
        return this.todoService.create(dto, userId);
    }

    @Get(':id')
    findAllTodoOfUser(@Param('id') userId: string){
        return this.todoService.findAll(userId);
    }

    @Put(':id')
    update(@Param('id') id: string,@Body() dto: CreateTodoDTO , @Req() req){
        const {userId} = req.user;
        return this.todoService.update(id, dto,userId);

    }

    @Delete(':id')
    delete(@Param('id') id: string, @Req() req){
        const {userId} = req.user;
        return this.todoService.remove(id, userId)
    }
}