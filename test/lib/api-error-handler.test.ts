import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import Fastify from 'fastify'
import { registerApiErrorHandler, isAuthError } from '../../src/lib/api-error-handler'
import { AuthError } from '../../src/services/authService'

describe('isAuthError', () => {
  it('returns true for AuthError instances', () => {
    assert.ok(isAuthError(new AuthError(401, 'INVALID_SESSION', 'nope')))
  })

  it('returns true for plain objects with status and code', () => {
    assert.ok(isAuthError({ status: 403, code: 'FORBIDDEN', message: 'Denied' }))
  })

  it('returns false for unrelated errors', () => {
    assert.ok(!isAuthError(new Error('boom')))
    assert.ok(!isAuthError(null))
    assert.ok(!isAuthError({ code: 'ONLY_CODE' }))
  })
})

describe('registerApiErrorHandler', () => {
  it('maps client errors to BAD_REQUEST', async () => {
    const app = Fastify()
    registerApiErrorHandler(app)
    app.get('/bad', async () => {
      const err = new Error('Validation failed') as Error & { statusCode: number }
      err.statusCode = 400
      throw err
    })
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/bad' })
    assert.equal(res.statusCode, 400)
    assert.deepEqual(res.json(), {
      code: 'BAD_REQUEST',
      message: 'Validation failed',
    })
    await app.close()
  })

  it('maps server errors to INTERNAL_ERROR', async () => {
    const app = Fastify({ logger: false })
    registerApiErrorHandler(app)
    app.get('/boom', async () => {
      throw new Error('unexpected')
    })
    await app.ready()

    const res = await app.inject({ method: 'GET', url: '/boom' })
    assert.equal(res.statusCode, 500)
    assert.deepEqual(res.json(), {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error.',
    })
    await app.close()
  })
})
