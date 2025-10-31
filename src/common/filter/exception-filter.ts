import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HandleException implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response: Response = ctx.getResponse();
    const status = exception.getStatus();

    const exceptionResponse = exception.getResponse();
    let errorDetail: unknown = null;
    if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'error' in (exceptionResponse as Record<string, unknown>)
    ) {
      errorDetail = (exceptionResponse as Record<string, unknown>)['error'];
    }
    response.status(status).json({
      ok: 0,
      t: status,
      d: exceptionResponse,
      e: errorDetail,
    });
  }
}
