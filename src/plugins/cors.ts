import fp from 'fastify-plugin'
import cors from '@fastify/cors'

const DEFAULT_ORIGIN = 'http://localhost:4200'

export default fp(async (fastify) => {
  await fastify.register(cors, {
    origin: process.env.CORS_ORIGIN || DEFAULT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
})
