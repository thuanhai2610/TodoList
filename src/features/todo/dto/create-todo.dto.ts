import { IsNotEmpty, IsString } from "class-validator";


export class CreateTodoDTO {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsNotEmpty()
    content: string;
}