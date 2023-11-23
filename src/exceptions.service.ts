import { HttpException, Injectable } from '@nestjs/common';

@Injectable()
export class ExceptionsService {
  NotFound = (message: string = 'Not Found') => new HttpException(message, 404);
  BadRequest = (message: string = 'Bad Request') =>
    new HttpException(message, 400);
  Unauthorized = (message: string = 'Unauthorized') =>
    new HttpException(message, 401);
  Conflict = (message: string = 'Conflict') => new HttpException(message, 409);
  InternalError = (message: string = 'Internal Error') =>
    new HttpException(message, 500);
  Success = (message: string = 'Success') => new HttpException(message, 200);
  Forbidden = (message: string = 'Forbidden') =>
    new HttpException(message, 403);
}
