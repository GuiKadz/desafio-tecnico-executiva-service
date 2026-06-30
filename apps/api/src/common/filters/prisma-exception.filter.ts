import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '../../../generated/prisma/client';

@Catch()
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const httpException = this.toHttpException(exception);
    const status = httpException.getStatus();
    const body = httpException.getResponse();

    if (status >= 500) {
      this.logger.error(exception);
    }

    response
      .status(status)
      .json(
        typeof body === 'string'
          ? { statusCode: status, message: body }
          : { statusCode: status, ...(body as Record<string, unknown>) },
      );
  }

  private toHttpException(exception: unknown): HttpException {
    if (exception instanceof HttpException) {
      return exception;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          const target = (exception.meta?.target as string[] | undefined)?.join(
            ', ',
          );
          return new ConflictException(
            `Já existe um registro com o mesmo valor${target ? ` em (${target})` : ''}`,
          );
        }
        case 'P2025':
          return new NotFoundException('Registro não encontrado');
        case 'P2003':
          return new ConflictException(
            'Operação viola uma relação existente no banco (chave estrangeira)',
          );
        default:
          this.logger.warn(`Prisma error não mapeado: ${exception.code}`);
          return new HttpException(
            'Erro ao processar a requisição',
            HttpStatus.BAD_REQUEST,
          );
      }
    }

    this.logger.error(exception);
    return new HttpException(
      'Erro interno do servidor',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
