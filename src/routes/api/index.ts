import { type FastifyPluginAsync } from 'fastify'
import { registerApiErrorHandler } from '../../lib/api-error-handler'

const api: FastifyPluginAsync = async (fastify) => {
  registerApiErrorHandler(fastify)

  fastify.setNotFoundHandler((_request, reply) => {
    return reply.status(404).send({ code: 'NOT_FOUND', message: 'Resource not found.' })
  })
}

export default api
