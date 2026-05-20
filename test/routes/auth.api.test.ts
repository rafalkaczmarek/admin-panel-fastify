import { before, beforeEach, describe, it, mock } from 'node:test'
import * as assert from 'node:assert'
import bcrypt from 'bcrypt'
import { build, type TestContext } from '../helper'
import prisma from '../../src/lib/prisma'

process.env.JWT_ACCESS_SECRET = 'test-secret'
process.env.JWT_ACCESS_TTL = '15m'
process.env.REFRESH_TTL_DAYS = '7'
process.env.REFRESH_TTL_REMEMBER_DAYS = '30'
process.env.CORS_ORIGIN = 'http://localhost:4200'

const prismaMock = {
  user: { findUnique: mock.fn<() => Promise<unknown>>() },
  refreshToken: {
    create: mock.fn<() => Promise<unknown>>(),
    findUnique: mock.fn<() => Promise<unknown>>(),
    delete: mock.fn<() => Promise<unknown>>(),
  },
}

let DEMO_USER: {
  id: string
  email: string
  passwordHash: string
  roles: string[]
}

function getRefreshCookie (res: { headers: Record<string, string | string[] | undefined> }): string | null {
  const setCookie = res.headers['set-cookie']
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : []
  const cookie = cookies.find((c) => c.startsWith('refreshToken='))
  if (!cookie) {
    return null
  }
  const match = cookie.match(/refreshToken=([^;]+)/)
  return match ? match[1] : null
}

before(async () => {
  prisma.__setForTests(prismaMock as never)

  const passwordHash = await bcrypt.hash('admin123', 4)
  DEMO_USER = {
    id: 'user-1',
    email: 'admin@dashstack.com',
    passwordHash,
    roles: ['admin'],
  }
})

beforeEach(() => {
  prismaMock.user.findUnique.mock.resetCalls()
  prismaMock.refreshToken.create.mock.resetCalls()
  prismaMock.refreshToken.findUnique.mock.resetCalls()
  prismaMock.refreshToken.delete.mock.resetCalls()
})

describe('POST /api/auth/login', () => {
  it('returns 200 with accessToken, sets refresh cookie on valid credentials', async (t: TestContext) => {
    prismaMock.user.findUnique.mock.mockImplementation(() => Promise.resolve(DEMO_USER))
    prismaMock.refreshToken.create.mock.mockImplementation(() => Promise.resolve({ id: 'rt-1' }))

    const app = await build(t)
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@dashstack.com', password: 'admin123' },
    })

    assert.equal(res.statusCode, 200)
    const body = res.json()
    assert.ok(body.accessToken)
    assert.ok(body.expiresAt)
    assert.deepEqual(body.user, { email: 'admin@dashstack.com', roles: ['admin'] })
    assert.ok(getRefreshCookie(res))
    assert.equal(prismaMock.refreshToken.create.mock.callCount(), 1)
  })

  it('normalizes email before lookup', async (t: TestContext) => {
    prismaMock.user.findUnique.mock.mockImplementation(() => Promise.resolve(DEMO_USER))
    prismaMock.refreshToken.create.mock.mockImplementation(() => Promise.resolve({ id: 'rt-1' }))

    const app = await build(t)
    await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: '  ADMIN@DashStack.com  ', password: 'admin123' },
    })

    const findUniqueCall = prismaMock.user.findUnique.mock.calls[0] as { arguments: unknown[] } | undefined
    assert.deepEqual(findUniqueCall?.arguments[0], {
      where: { email: 'admin@dashstack.com' },
    })
  })

  it('returns 401 INVALID_CREDENTIALS for wrong password', async (t: TestContext) => {
    prismaMock.user.findUnique.mock.mockImplementation(() => Promise.resolve(DEMO_USER))

    const app = await build(t)
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@dashstack.com', password: 'wrong' },
    })

    assert.equal(res.statusCode, 401)
    assert.deepEqual(res.json(), {
      code: 'INVALID_CREDENTIALS',
      message: 'Incorrect email or password.',
    })
    assert.equal(prismaMock.refreshToken.create.mock.callCount(), 0)
  })

  it('returns 401 INVALID_CREDENTIALS for unknown user', async (t: TestContext) => {
    prismaMock.user.findUnique.mock.mockImplementation(() => Promise.resolve(null))

    const app = await build(t)
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'nobody@x.com', password: 'whatever' },
    })

    assert.equal(res.statusCode, 401)
    assert.equal(res.json().code, 'INVALID_CREDENTIALS')
  })

  it('returns 400 when email or password is missing', async (t: TestContext) => {
    const app = await build(t)
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {},
    })

    assert.equal(res.statusCode, 400)
    assert.equal(res.json().code, 'BAD_REQUEST')
  })
})

describe('POST /api/auth/refresh', () => {
  it('returns 200 with new token when cookie is valid; rotates refresh token', async (t: TestContext) => {
    const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)
    prismaMock.refreshToken.findUnique.mock.mockImplementation(() => Promise.resolve({
      id: 'rt-old',
      tokenHash: 'hash',
      expiresAt: futureExpiry,
      user: DEMO_USER,
    }))
    prismaMock.refreshToken.delete.mock.mockImplementation(() => Promise.resolve({}))
    prismaMock.refreshToken.create.mock.mockImplementation(() => Promise.resolve({ id: 'rt-new' }))

    const app = await build(t)
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie: 'refreshToken=any-raw-token' },
    })

    assert.equal(res.statusCode, 200)
    assert.ok(res.json().accessToken)
    const deleteCall = prismaMock.refreshToken.delete.mock.calls[0] as { arguments: unknown[] } | undefined
    assert.deepEqual(deleteCall?.arguments[0], { where: { id: 'rt-old' } })
    assert.equal(prismaMock.refreshToken.create.mock.callCount(), 1)
    assert.ok(getRefreshCookie(res))
  })

  it('returns 401 INVALID_SESSION when cookie is missing', async (t: TestContext) => {
    const app = await build(t)
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
    })

    assert.equal(res.statusCode, 401)
    assert.deepEqual(res.json(), {
      code: 'INVALID_SESSION',
      message: 'Missing refresh token.',
    })
  })

  it('returns 401 and deletes the record when token is expired', async (t: TestContext) => {
    const pastExpiry = new Date(Date.now() - 60 * 1000)
    prismaMock.refreshToken.findUnique.mock.mockImplementation(() => Promise.resolve({
      id: 'rt-old',
      tokenHash: 'hash',
      expiresAt: pastExpiry,
      user: DEMO_USER,
    }))
    prismaMock.refreshToken.delete.mock.mockImplementation(() => Promise.resolve({}))

    const app = await build(t)
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie: 'refreshToken=any-raw-token' },
    })

    assert.equal(res.statusCode, 401)
    assert.equal(res.json().code, 'INVALID_SESSION')
    const deleteCall = prismaMock.refreshToken.delete.mock.calls[0] as { arguments: unknown[] } | undefined
    assert.deepEqual(deleteCall?.arguments[0], { where: { id: 'rt-old' } })
  })

  it('returns 401 when the token is not found in DB', async (t: TestContext) => {
    prismaMock.refreshToken.findUnique.mock.mockImplementation(() => Promise.resolve(null))

    const app = await build(t)
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/refresh',
      headers: { cookie: 'refreshToken=unknown' },
    })

    assert.equal(res.statusCode, 401)
    assert.equal(res.json().code, 'INVALID_SESSION')
  })
})

describe('POST /api/auth/logout', () => {
  it('deletes the refresh token and returns 204', async (t: TestContext) => {
    prismaMock.refreshToken.delete.mock.mockImplementation(() => Promise.resolve({}))

    const app = await build(t)
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: 'refreshToken=raw-token' },
    })

    assert.equal(res.statusCode, 204)
    assert.equal(prismaMock.refreshToken.delete.mock.callCount(), 1)
  })

  it('returns 204 even without a cookie (idempotent)', async (t: TestContext) => {
    const app = await build(t)
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
    })

    assert.equal(res.statusCode, 204)
    assert.equal(prismaMock.refreshToken.delete.mock.callCount(), 0)
  })

  it('returns 204 even when DB delete throws (best-effort cleanup)', async (t: TestContext) => {
    prismaMock.refreshToken.delete.mock.mockImplementation(() => Promise.reject(new Error('not found')))

    const app = await build(t)
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { cookie: 'refreshToken=raw-token' },
    })

    assert.equal(res.statusCode, 204)
  })
})

describe('CORS', () => {
  it('responds with credentials header for the configured origin', async (t: TestContext) => {
    const app = await build(t)
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/api/auth/login',
      headers: {
        origin: 'http://localhost:4200',
        'access-control-request-method': 'POST',
      },
    })

    assert.equal(res.headers['access-control-allow-origin'], 'http://localhost:4200')
    assert.equal(res.headers['access-control-allow-credentials'], 'true')
  })
})
