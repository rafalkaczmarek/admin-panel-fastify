const apiError = {
  type: 'object',
  properties: {
    code: { type: 'string' },
    message: { type: 'string' },
  },
  required: ['code', 'message'],
} as const

const publicUser = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    roles: { type: 'array', items: { type: 'string' } },
  },
  required: ['email', 'roles'],
} as const

const authResponse = {
  type: 'object',
  properties: {
    accessToken: { type: 'string' },
    expiresAt: { type: 'string', format: 'date-time' },
    user: publicUser,
  },
  required: ['accessToken', 'expiresAt', 'user'],
} as const

const loginBody = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string' },
    rememberMe: { type: 'boolean' },
  },
  required: ['email', 'password'],
} as const

export { apiError, authResponse, loginBody }
