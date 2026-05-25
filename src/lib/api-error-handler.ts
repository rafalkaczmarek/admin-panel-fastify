import { type FastifyError, type FastifyInstance } from 'fastify'
import { AuthError } from '../services/authService.js'
import { ProductError } from '../services/productService.js'

interface ApiDomainError {
  status: number
  code: string
  message: string
}

function isDomainError (error: unknown): error is ApiDomainError {
  return (
    error instanceof AuthError ||
    error instanceof ProductError ||
    (typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      'code' in error &&
      typeof (error as ApiDomainError).status === 'number')
  )
}

function registerApiErrorHandler (fastify: FastifyInstance): void {
  fastify.setErrorHandler((error: unknown, request, reply) => {
    if (isDomainError(error)) {
      return reply.status(error.status).send({ code: error.code, message: error.message })
    }

    const fastifyError = error as FastifyError
    const status = fastifyError.statusCode ?? 500
    const isServerError = status >= 500

    if (isServerError) {
      fastify.log.error(fastifyError)
    }

    const errorCode = (fastifyError as FastifyError & { code?: string }).code
    const code =
      errorCode === 'FST_ERR_VALIDATION'
        ? 'BAD_REQUEST'
        : errorCode ?? (isServerError ? 'INTERNAL_ERROR' : 'BAD_REQUEST')

    return reply.status(status).send({
      code,
      message: isServerError ? 'Internal server error.' : (fastifyError.message ?? 'Bad request.'),
    })
  })
}

export { registerApiErrorHandler, isDomainError, isDomainError as isAuthError }
