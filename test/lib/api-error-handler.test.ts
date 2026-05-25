import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import Fastify from 'fastify'
import { registerApiErrorHandler, isDomainError } from '../../src/lib/api-error-handler.js'
import { AuthError } from '../../src/services/authService.js'
import { ProductError } from '../../src/services/productService.js'

describe('isDomainError', () => {
  it('returns true for AuthError instances', () => {
    assert.ok(isDomainError(new AuthError(401, 'INVALID_SESSION', 'nope')))
  })

  it('returns true for ProductError instances', () => {
    assert.ok(isDomainError(new ProductError(404, 'NOT_FOUND', 'missing')))
  })

  it('returns true for plain objects with status and code', () => {
    assert.ok(isDomainError({ status: 403, code: 'FORBIDDEN', message: 'Denied' }))
  })

  it('returns false for unrelated errors', () => {
    assert.ok(!isDomainError(new Error('boom')))
    assert.ok(!isDomainError(null))
    assert.ok(!isDomainError({ code: 'ONLY_CODE' }))
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
