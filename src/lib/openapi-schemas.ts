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

const productStatus = {
  type: 'string',
  enum: ['in-stock', 'out-of-stock'],
} as const

const product = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    image: { type: 'string' },
    name: { type: 'string' },
    category: { type: 'string' },
    price: { type: 'number' },
    piece: { type: 'integer' },
    availableColors: { type: 'array', items: { type: 'string' } },
    status: productStatus,
  },
  required: ['id', 'image', 'name', 'category', 'price', 'piece', 'availableColors', 'status'],
} as const

const productBody = {
  type: 'object',
  properties: {
    image: { type: 'string' },
    name: { type: 'string' },
    category: { type: 'string' },
    price: { type: 'number' },
    piece: { type: 'integer' },
    availableColors: { type: 'array', items: { type: 'string' } },
  },
  required: ['image', 'name', 'category', 'price', 'piece', 'availableColors'],
} as const

const productList = {
  type: 'array',
  items: product,
} as const

export { apiError, authResponse, loginBody, product, productBody, productList }
