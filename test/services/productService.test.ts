import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import { createProduct, ProductError } from '../../src/services/productService.js'
import { installPrismaMock, prismaMock } from '../fixtures/prisma-mock.js'

installPrismaMock()

const VALID_INPUT = {
  image: 'https://placehold.co/48x48/4880ff/fff?text=NW',
  name: 'New Product',
  category: 'Digital Product',
  price: 99.5,
  piece: 10,
  availableColors: ['#333333'],
}

function expectProductError (err: unknown, messagePart: string): boolean {
  assert.ok(err instanceof ProductError)
  assert.equal(err.statusCode, 400)
  assert.equal(err.code, 'BAD_REQUEST')
  assert.match(err.message, new RegExp(messagePart, 'i'))
  return true
}

describe('productService validation', () => {
  it('rejects non-string image, name, and category', async () => {
    const cases = [
      { overrides: { image: 123 as never }, message: 'Image is required.' },
      { overrides: { name: false as never }, message: 'Name is required.' },
      { overrides: { category: null as never }, message: 'Category is required.' },
    ]

    for (const { overrides, message } of cases) {
      await assert.rejects(
        () => createProduct({ ...VALID_INPUT, ...overrides }),
        (err) => {
          assert.ok(err instanceof ProductError)
          assert.equal(err.statusCode, 400)
          assert.equal(err.code, 'BAD_REQUEST')
          assert.equal(err.message, message)
          return true
        },
      )
      assert.equal(prismaMock.product.create.mock.callCount(), 0)
      prismaMock.product.create.mock.resetCalls()
    }
  })

  it('rejects non-array availableColors', async () => {
    await assert.rejects(
      () => createProduct({ ...VALID_INPUT, availableColors: null as never }),
      (err) => expectProductError(err, 'array'),
    )
    assert.equal(prismaMock.product.create.mock.callCount(), 0)
  })

  it('rejects non-string entries in availableColors', async () => {
    await assert.rejects(
      () => createProduct({ ...VALID_INPUT, availableColors: ['#333333', 123 as never] }),
      (err) => expectProductError(err, 'non-empty string'),
    )
    assert.equal(prismaMock.product.create.mock.callCount(), 0)
  })
})
