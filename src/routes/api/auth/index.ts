import { type FastifyPluginAsync } from 'fastify'
import { registerApiErrorHandler } from '../../../lib/api-error-handler'
import * as authService from '../../../services/authService'

const REFRESH_COOKIE = 'refreshToken'

interface LoginBody {
  email?: string
  password?: string
  rememberMe?: boolean
}

function refreshCookieOptions (expiresAt: string) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth',
    expires: new Date(expiresAt),
  }
}

const auth: FastifyPluginAsync = async (fastify) => {
  registerApiErrorHandler(fastify)

  fastify.post<{ Body: LoginBody }>('/login', async (request, reply) => {
    const { email, password, rememberMe } = request.body || {}

    if (!email || !password) {
      return reply
        .status(400)
        .send({ code: 'BAD_REQUEST', message: 'Email and password are required.' })
    }

    const { refreshToken, response } = await authService.login({
      email,
      password,
      rememberMe,
    })

    reply.setCookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(response.expiresAt))

    return response
  })

  fastify.post('/refresh', async (request, reply) => {
    const rawToken = request.cookies[REFRESH_COOKIE]
    const { refreshToken, response } = await authService.refresh(rawToken)

    reply.setCookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(response.expiresAt))

    return response
  })

  fastify.post('/logout', async (request, reply) => {
    const rawToken = request.cookies[REFRESH_COOKIE]
    await authService.logout(rawToken)
    reply.clearCookie(REFRESH_COOKIE, { path: '/api/auth' })
    return reply.status(204).send()
  })
}

export default auth
