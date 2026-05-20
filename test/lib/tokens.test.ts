import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import * as jwt from 'jsonwebtoken'
import {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiry,
} from '../../src/lib/tokens'

const ORIGINAL_SECRET = process.env.JWT_ACCESS_SECRET

describe('tokens', () => {
  it('signAccessToken and verifyAccessToken round-trip', () => {
    process.env.JWT_ACCESS_SECRET = 'round-trip-secret'
    process.env.JWT_ACCESS_TTL = '1h'

    const { accessToken, expiresAt } = signAccessToken({
      id: 'u1',
      email: 'a@b.com',
      roles: ['user'],
    })

    assert.ok(accessToken)
    assert.ok(expiresAt)

    const payload = verifyAccessToken(accessToken)
    assert.equal(payload.sub, 'u1')
    assert.equal(payload.email, 'a@b.com')
    assert.deepEqual(payload.roles, ['user'])
  })

  it('throws when JWT_ACCESS_SECRET is missing', () => {
    delete process.env.JWT_ACCESS_SECRET
    assert.throws(
      () => signAccessToken({ id: 'u1', email: 'a@b.com', roles: [] }),
      /JWT_ACCESS_SECRET is not configured/,
    )
    process.env.JWT_ACCESS_SECRET = ORIGINAL_SECRET
  })

  it('generateRefreshToken returns unique base64url strings', () => {
    const a = generateRefreshToken()
    const b = generateRefreshToken()
    assert.notEqual(a, b)
    assert.match(a, /^[A-Za-z0-9_-]+$/)
  })

  it('hashRefreshToken is deterministic', () => {
    assert.equal(hashRefreshToken('abc'), hashRefreshToken('abc'))
    assert.notEqual(hashRefreshToken('abc'), hashRefreshToken('xyz'))
  })

  it('refreshExpiry uses remember-me TTL from env', () => {
    process.env.REFRESH_TTL_DAYS = '7'
    process.env.REFRESH_TTL_REMEMBER_DAYS = '30'
    const now = Date.now()
    const short = refreshExpiry(false)
    const long = refreshExpiry(true)

    const sevenDays = 7 * 24 * 60 * 60 * 1000
    const thirtyDays = 30 * 24 * 60 * 60 * 1000
    assert.ok(short.getTime() >= now + sevenDays - 1000)
    assert.ok(long.getTime() >= now + thirtyDays - 1000)
    assert.ok(long.getTime() > short.getTime())
  })

  it('verifyAccessToken rejects tampered tokens', () => {
    process.env.JWT_ACCESS_SECRET = 'verify-secret'
    const { accessToken } = signAccessToken({ id: 'u1', email: 'a@b.com', roles: [] })
    const bad = accessToken.slice(0, -1) + (accessToken.endsWith('a') ? 'b' : 'a')
    assert.throws(() => verifyAccessToken(bad), jwt.JsonWebTokenError)
  })
})
