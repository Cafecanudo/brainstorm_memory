import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError, type ZodType, type z } from 'zod';

export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (resource: string) => new AppError(404, `${resource} não encontrado`);

export function parse<S extends ZodType>(schema: S, input: unknown): z.output<S> {
  return schema.parse(input);
}

const PG_UNIQUE_VIOLATION = '23505';
const PG_FOREIGN_KEY_VIOLATION = '23503';

function pgErrorCode(error: unknown): string | undefined {
  let current: unknown = error;
  for (let depth = 0; current && depth < 3; depth++) {
    const code = (current as { code?: unknown }).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  if (error instanceof ZodError) {
    return reply.code(400).send({ message: 'Dados inválidos', details: error.issues });
  }
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({ message: error.message, details: error.details });
  }
  const pgCode = pgErrorCode(error);
  if (pgCode === PG_UNIQUE_VIOLATION) {
    return reply.code(409).send({ message: 'Registro já existe' });
  }
  if (pgCode === PG_FOREIGN_KEY_VIOLATION) {
    return reply.code(422).send({ message: 'Referência inexistente' });
  }
  if (error.statusCode && error.statusCode < 500) {
    return reply.code(error.statusCode).send({ message: error.message });
  }
  request.log.error({ err: error }, 'unhandled error');
  return reply.code(500).send({ message: 'Erro interno' });
}
