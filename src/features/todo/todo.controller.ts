import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from "@nestjs/common";
import { CreateTodoDTO } from "./dto/create-todo.dto";
import { TodoService } from "./todo.service";
import { AuthGuard } from "src/guard/auth.guard";


@Controller('todo')
export class TodoController{
    constructor(private readonly todoService : TodoService){}
     @UseGuards(AuthGuard)
    @Post()
    createTodo(@Body() dto: CreateTodoDTO, @Req() req ){
        return this.todoService.create(dto);
    }

    @Get()
    findAllTodo(){
        return this.todoService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string){
        return this.todoService.findOne(id)
    }

    @Put(':id')
    update(@Param('id') id: string,@Body() dto: CreateTodoDTO ){
        return this.todoService.update(id, dto);
    }

    @Delete(':id')
    delete(@Param('id') id: string){
        return this.todoService.remove(id)
    }
}