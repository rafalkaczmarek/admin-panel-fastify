import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

const port = Number(process.env.PORT) || 3000
const serverUrl = process.env.API_PUBLIC_URL ?? `http://localhost:${port}`

export default fp(async (fastify) => {
  if (process.env.NODE_ENV === 'test') {
    return
  }

  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Admin Panel API',
        description: 'REST API for admin-panel-web (JWT access token + httpOnly refresh cookie).',
        version: '1.0.0',
      },
      servers: [{ url: serverUrl, description: 'API server' }],
      tags: [
        { name: 'auth', description: 'Authentication' },
        { name: 'products', description: 'Product stock' },
        { name: 'health', description: 'Health check' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Access token from login or refresh',
          },
        },
      },
    },
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
  })
})
