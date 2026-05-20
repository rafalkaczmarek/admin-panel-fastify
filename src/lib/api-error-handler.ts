import { type FastifyError, type FastifyInstance } from 'fastify'
import { AuthError } from '../services/authService'

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
  fastify.setErrorHandler((error: FastifyError, request, reply) => {
    if (isAuthError(error)) {
      return reply.status(error.status).send({ code: error.code, message: error.message })
    }

    const status = error.statusCode ?? 500
    const isServerError = status >= 500

    if (isServerError) {
      fastify.log.error(error)
    }

    return reply.status(status).send({
      code: (error as FastifyError & { code?: string }).code ?? (isServerError ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
      message: isServerError ? 'Internal server error.' : (error.message ?? 'Bad request.'),
    })
  })
}

export { registerApiErrorHandler, isAuthError }
