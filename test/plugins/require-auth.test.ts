import { afterEach, describe, it } from 'node:test'
import * as assert from 'node:assert'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from 'jsonwebtoken'
import { registerApiErrorHandler } from '../../src/lib/api-error-handler.js'
import { signAccessToken } from '../../src/lib/tokens.js'
import requireAuthPlugin from '../../src/plugins/require-auth.js'

process.env.JWT_ACCESS_SECRET = 'test-secret'
process.env.JWT_ACCESS_TTL = '15m'

async function buildAuthApp (): Promise<FastifyInstance> {
  const app = Fastify()
  registerApiErrorHandler(app)
  await app.register(requireAuthPlugin)
  app.get('/me', { preHandler: app.requireAuth }, async (request) => {
    return { user: request.user }
  })
  await app.ready()
  return app
}

describe('requireAuth', () => {
  let app: FastifyInstance

  afterEach(async () => {
    if (app) {
      await app.close()
    }
  })

  it('returns 401 when Authorization header is missing', async () => {
    app = await buildAuthApp()
    const res = await app.inject({ method: 'GET', url: '/me' })

    assert.equal(res.statusCode, 401)
    assert.deepEqual(res.json(), {
      code: 'INVALID_SESSION',
      message: 'Missing access token.',
    })
  })

  it('returns 401 when token is not Bearer', async () => {
    app = await buildAuthApp()
    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: 'Basic abc' },
    })

    assert.equal(res.statusCode, 401)
    assert.equal(res.json().code, 'INVALID_SESSION')
  })

  it('returns 401 when access token is invalid', async () => {
    app = await buildAuthApp()
    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: 'Bearer not-a-jwt' },
    })

    assert.equal(res.statusCode, 401)
    assert.deepEqual(res.json(), {
      code: 'INVALID_SESSION',
      message: 'Invalid access token.',
    })
  })

  it('attaches user to request when token is valid', async () => {
    const { accessToken } = signAccessToken({
      id: 'user-1',
      email: 'admin@dashstack.com',
      roles: ['admin'],
    })

    app = await buildAuthApp()
    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: `Bearer ${accessToken}` },
    })

    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.json(), {
      user: {
        id: 'user-1',
        email: 'admin@dashstack.com',
        roles: ['admin'],
      },
    })
  })

  it('defaults roles to empty array when missing from token payload', async () => {
    const accessToken = jwt.sign(
      { sub: 'user-2', email: 'guest@x.com' },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '15m' },
    )

    app = await buildAuthApp()
    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: `Bearer ${accessToken}` },
    })

    assert.equal(res.statusCode, 200)
    assert.deepEqual(res.json().user.roles, [])
  })
})
