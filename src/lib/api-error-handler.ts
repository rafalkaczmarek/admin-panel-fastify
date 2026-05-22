import { type FastifyError, type FastifyInstance } from 'fastify'
import { AuthError } from '../services/authService.js'

function isAuthError (error: unknown): error is AuthError {
  return (
    error instanceof AuthError ||
    (typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      'code' in error &&
      typeof (error as AuthError).status === 'number')
  )
}

function registerApiErrorHandler (fastify: FastifyInstance): void {
  fastify.setErrorHandler((error: unknown, request, reply) => {
    if (isAuthError(error)) {
      return reply.status(error.status).send({ code: error.code, message: error.message })
    }

    const fastifyError = error as FastifyError
    const status = fastifyError.statusCode ?? 500
    const isServerError = status >= 500

    if (isServerError) {
      fastify.log.error(fastifyError)
    }

    return reply.status(status).send({
      code: (fastifyError as FastifyError & { code?: string }).code ?? (isServerError ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
      message: isServerError ? 'Internal server error.' : (fastifyError.message ?? 'Bad request.'),
    })
  })
}

export { registerApiErrorHandler, isAuthError }
