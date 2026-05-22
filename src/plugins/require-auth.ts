import fp from 'fastify-plugin'
import { type FastifyRequest } from 'fastify'
import { verifyAccessToken } from '../lib/tokens.js'
import { AuthError } from '../services/authService.js'

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string
      email: string
      roles: string[]
    }
  }
}

async function requireAuth (request: FastifyRequest): Promise<void> {
  const header = request.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    throw new AuthError(401, 'INVALID_SESSION', 'Missing access token.')
  }

  try {
    const payload = verifyAccessToken(token)
    request.user = {
      id: payload.sub as string,
      email: payload.email as string,
      roles: (payload.roles as string[]) || [],
    }
  } catch {
    throw new AuthError(401, 'INVALID_SESSION', 'Invalid access token.')
  }
}

export default fp(async (fastify) => {
  fastify.decorate('requireAuth', requireAuth)
})

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: typeof requireAuth
  }
}
