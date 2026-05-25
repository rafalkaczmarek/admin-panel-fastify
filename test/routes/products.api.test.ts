import { before, beforeEach, describe, it, mock } from 'node:test'
import * as assert from 'node:assert'
import { build, type TestContext } from '../helper.js'
import prisma from '../../src/lib/prisma.js'
import { signAccessToken } from '../../src/lib/tokens.js'

process.env.JWT_ACCESS_SECRET = 'test-secret'
process.env.JWT_ACCESS_TTL = '15m'
process.env.CORS_ORIGIN = 'http://localhost:4000'

const SAMPLE_PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440001'
const MISSING_PRODUCT_ID = '550e8400-e29b-41d4-a716-446655440099'

const SAMPLE_PRODUCT = {
  id: SAMPLE_PRODUCT_ID,
  image: 'https://placehold.co/48x48/4880ff/fff?text=AW',
  name: 'Apple Watch Series 4',
  category: 'Digital Product',
  price: 690,
  piece: 63,
  availableColors: ['#333333', '#4880ff'],
  createdAt: new Date(),
  updatedAt: new Date(),
}

const VALID_BODY = {
  image: 'https://placehold.co/48x48/4880ff/fff?text=NW',
  name: 'New Product',
  category: 'Digital Product',
  price: 99.5,
  piece: 10,
  availableColors: ['#333333'],
}

const prismaMock = {
  product: {
    findMany: mock.fn<() => Promise<unknown[]>>(),
    findUnique: mock.fn<() => Promise<unknown>>(),
    create: mock.fn<() => Promise<unknown>>(),
    update: mock.fn<() => Promise<unknown>>(),
    delete: mock.fn<() => Promise<unknown>>(),
  },
}

let accessToken: string

function authHeaders (): { authorization: string } {
  return { authorization: `Bearer ${accessToken}` }
}

before(async () => {
  prisma.__setForTests(prismaMock as never)
  const signed = signAccessToken({
    id: 'user-1',
    email: 'admin@dashstack.com',
    roles: ['admin'],
  })
  accessToken = signed.accessToken
})

beforeEach(() => {
  prismaMock.product.findMany.mock.resetCalls()
  prismaMock.product.findUnique.mock.resetCalls()
  prismaMock.product.create.mock.resetCalls()
  prismaMock.product.update.mock.resetCalls()
  prismaMock.product.delete.mock.resetCalls()
})

describe('GET /api/products', () => {
  it('returns 401 without access token', async (t: TestContext) => {
    const app = await build(t)
    const res = await app.inject({ method: 'GET', url: '/api/products' })

    assert.equal(res.statusCode, 401)
    assert.equal(res.json().code, 'INVALID_SESSION')
  })

  it('returns 200 with product list', async (t: TestContext) => {
    prismaMock.product.findMany.mock.mockImplementation(() => Promise.resolve([SAMPLE_PRODUCT]))

    const app = await build(t)
    const res = await app.inject({
      method: 'GET',
      url: '/api/products',
      headers: authHeaders(),
    })

    assert.equal(res.statusCode, 200)
    const body = res.json()
    assert.equal(body.length, 1)
    assert.equal(body[0].id, SAMPLE_PRODUCT.id)
    assert.equal(body[0].price, 690)
    assert.equal(body[0].status, 'in-stock')
  })
})

describe('GET /api/products/:id', () => {
  it('returns 404 when product does not exist', async (t: TestContext) => {
    prismaMock.product.findUnique.mock.mockImplementation(() => Promise.resolve(null))

    const app = await build(t)
    const res = await app.inject({
      method: 'GET',
      url: `/api/products/${MISSING_PRODUCT_ID}`,
      headers: authHeaders(),
    })

    assert.equal(res.statusCode, 404)
    assert.equal(res.json().code, 'NOT_FOUND')
  })

  it('returns 200 with product', async (t: TestContext) => {
    prismaMock.product.findUnique.mock.mockImplementation(() => Promise.resolve(SAMPLE_PRODUCT))

    const app = await build(t)
    const res = await app.inject({
      method: 'GET',
      url: `/api/products/${SAMPLE_PRODUCT.id}`,
      headers: authHeaders(),
    })

    assert.equal(res.statusCode, 200)
    assert.equal(res.json().name, SAMPLE_PRODUCT.name)
    assert.equal(res.json().status, 'in-stock')
  })

  it('returns out-of-stock when piece is 0', async (t: TestContext) => {
    prismaMock.product.findUnique.mock.mockImplementation(() =>
      Promise.resolve({ ...SAMPLE_PRODUCT, piece: 0 }),
    )

    const app = await build(t)
    const res = await app.inject({
      method: 'GET',
      url: `/api/products/${SAMPLE_PRODUCT.id}`,
      headers: authHeaders(),
    })

    assert.equal(res.statusCode, 200)
    assert.equal(res.json().status, 'out-of-stock')
  })
})

describe('POST /api/products', () => {
  it('returns 201 with created product', async (t: TestContext) => {
    prismaMock.product.create.mock.mockImplementation(() =>
      Promise.resolve({
        ...SAMPLE_PRODUCT,
        ...VALID_BODY,
        id: '550e8400-e29b-41d4-a716-446655440002',
        price: VALID_BODY.price,
      }),
    )

    const app = await build(t)
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: authHeaders(),
      payload: VALID_BODY,
    })

    assert.equal(res.statusCode, 201)
    assert.equal(res.json().name, VALID_BODY.name)
    assert.equal(res.json().status, 'in-stock')
  })

  it('returns 400 for invalid price', async (t: TestContext) => {
    const app = await build(t)
    const res = await app.inject({
      method: 'POST',
      url: '/api/products',
      headers: authHeaders(),
      payload: { ...VALID_BODY, price: -1 },
    })

    assert.equal(res.statusCode, 400)
    assert.equal(res.json().code, 'BAD_REQUEST')
  })
})

describe('PUT /api/products/:id', () => {
  it('returns 404 when product does not exist', async (t: TestContext) => {
    prismaMock.product.findUnique.mock.mockImplementation(() => Promise.resolve(null))

    const app = await build(t)
    const res = await app.inject({
      method: 'PUT',
      url: `/api/products/${MISSING_PRODUCT_ID}`,
      headers: authHeaders(),
      payload: VALID_BODY,
    })

    assert.equal(res.statusCode, 404)
    assert.equal(res.json().code, 'NOT_FOUND')
  })

  it('returns 200 with updated product', async (t: TestContext) => {
    prismaMock.product.findUnique.mock.mockImplementation(() => Promise.resolve({ id: SAMPLE_PRODUCT.id }))
    prismaMock.product.update.mock.mockImplementation(() =>
      Promise.resolve({
        ...SAMPLE_PRODUCT,
        ...VALID_BODY,
        price: VALID_BODY.price,
      }),
    )

    const app = await build(t)
    const res = await app.inject({
      method: 'PUT',
      url: `/api/products/${SAMPLE_PRODUCT.id}`,
      headers: authHeaders(),
      payload: VALID_BODY,
    })

    assert.equal(res.statusCode, 200)
    assert.equal(res.json().name, VALID_BODY.name)
  })
})

describe('DELETE /api/products/:id', () => {
  it('returns 404 when product does not exist', async (t: TestContext) => {
    prismaMock.product.findUnique.mock.mockImplementation(() => Promise.resolve(null))

    const app = await build(t)
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/products/${MISSING_PRODUCT_ID}`,
      headers: authHeaders(),
    })

    assert.equal(res.statusCode, 404)
    assert.equal(res.json().code, 'NOT_FOUND')
  })

  it('returns 204 when product is deleted', async (t: TestContext) => {
    prismaMock.product.findUnique.mock.mockImplementation(() => Promise.resolve({ id: SAMPLE_PRODUCT.id }))
    prismaMock.product.delete.mock.mockImplementation(() => Promise.resolve(SAMPLE_PRODUCT))

    const app = await build(t)
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/products/${SAMPLE_PRODUCT.id}`,
      headers: authHeaders(),
    })

    assert.equal(res.statusCode, 204)
    assert.equal(prismaMock.product.delete.mock.callCount(), 1)
  })
})
