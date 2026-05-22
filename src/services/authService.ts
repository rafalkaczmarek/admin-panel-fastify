import prisma from '../lib/prisma.js'
import { verifyPassword } from '../lib/passwords.js'
import {
  signAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  refreshExpiry,
} from '../lib/tokens.js'

export class AuthError extends Error {
  status: number
  statusCode: number
  code: string

  constructor (status: number, code: string, message: string) {
    super(message)
    this.status = status
    this.statusCode = status
    this.code = code
  }
}

interface PublicUser {
  email: string
  roles: string[]
}

interface AuthResponse {
  accessToken: string
  expiresAt: string
  user: PublicUser
}

interface UserRecord {
  id: string
  email: string
  passwordHash: string
  roles: string[]
}

function toPublicUser (user: UserRecord): PublicUser {
  return { email: user.email, roles: user.roles }
}

async function issueSession (
  user: UserRecord,
  rememberMe: boolean,
): Promise<{ refreshToken: string, response: AuthResponse }> {
  const { accessToken, expiresAt } = signAccessToken(user)

  const refreshToken = generateRefreshToken()
  await prisma.refreshToken.create({
    data: {
      tokenHash: hashRefreshToken(refreshToken),
      userId: user.id,
      expiresAt: refreshExpiry(rememberMe),
    },
  })

  return {
    refreshToken,
    response: {
      accessToken,
      expiresAt,
      user: toPublicUser(user),
    },
  }
}

async function login ({
  email,
  password,
  rememberMe,
}: {
  email: string
  password: string
  rememberMe?: boolean
}): Promise<{ refreshToken: string, response: AuthResponse }> {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

  const passwordOk = user
    ? await verifyPassword(password, user.passwordHash)
    : false

  if (!user || !passwordOk) {
    throw new AuthError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password.')
  }

  return issueSession(user, Boolean(rememberMe))
}

async function refresh (
  rawRefreshToken: string | undefined,
): Promise<{ refreshToken: string, response: AuthResponse }> {
  if (!rawRefreshToken) {
    throw new AuthError(401, 'INVALID_SESSION', 'Missing refresh token.')
  }

  const tokenHash = hashRefreshToken(rawRefreshToken)
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!stored || stored.expiresAt <= new Date()) {
    if (stored) {
      await prisma.refreshToken.delete({ where: { id: stored.id } }).catch(() => undefined)
    }
    throw new AuthError(401, 'INVALID_SESSION', 'Session expired.')
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } })

  return issueSession(stored.user, false)
}

async function logout (rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) {
    return
  }
  const tokenHash = hashRefreshToken(rawRefreshToken)
  await prisma.refreshToken
    .delete({ where: { tokenHash } })
    .catch(() => undefined)
}

export { login, refresh, logout }
