import crypto from 'node:crypto'
import jwt, { type SignOptions } from 'jsonwebtoken'

const DEFAULT_ACCESS_TTL = '15m'
const REFRESH_BYTES = 48

interface UserForToken {
  id: string
  email: string
  roles: string[]
}

function getAccessSecret (): string {
  const secret = process.env.JWT_ACCESS_SECRET
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not configured.')
  }
  return secret
}

function getAccessTtl (): string {
  return process.env.JWT_ACCESS_TTL || DEFAULT_ACCESS_TTL
}

function signAccessToken (user: UserForToken): { accessToken: string, expiresAt: string } {
  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    },
    getAccessSecret(),
    { expiresIn: getAccessTtl() } as SignOptions,
  )

  const decoded = jwt.decode(token) as jwt.JwtPayload | null
  const expiresAt = new Date((decoded?.exp ?? 0) * 1000).toISOString()

  return { accessToken: token, expiresAt }
}

function verifyAccessToken (token: string): jwt.JwtPayload {
  return jwt.verify(token, getAccessSecret()) as jwt.JwtPayload
}

function generateRefreshToken (): string {
  return crypto.randomBytes(REFRESH_BYTES).toString('base64url')
}

function hashRefreshToken (token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function refreshExpiry (rememberMe: boolean): Date {
  const days = rememberMe
    ? Number(process.env.REFRESH_TTL_REMEMBER_DAYS || 30)
    : Number(process.env.REFRESH_TTL_DAYS || 7)
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
}

export {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiry,
}
