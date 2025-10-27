import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import { error } from "console";


@Catch(HttpException)
export class HandleException implements ExceptionFilter{
    catch(exception: HttpException, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const status = exception.getStatus();

        const exceptionResponse = exception.getResponse();

        response.status(status).json({
            success: false, 
            statusCode: status,
            message: exceptionResponse,
           error: (exceptionResponse as any).error || null,
        })
    }
}