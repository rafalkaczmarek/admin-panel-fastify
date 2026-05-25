import { type Product } from '@prisma/client'
import prisma from '../lib/prisma.js'

export type ProductStatus = 'in-stock' | 'out-of-stock'

export interface ProductStock {
  id: string
  image: string
  name: string
  category: string
  price: number
  piece: number
  availableColors: string[]
  status: ProductStatus
}

export interface ProductInput {
  image: string
  name: string
  category: string
  price: number
  piece: number
  availableColors: string[]
}

export class ProductError extends Error {
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

function deriveStatus (piece: number): ProductStatus {
  return piece > 0 ? 'in-stock' : 'out-of-stock'
}

function toProductStock (row: Product): ProductStock {
  return {
    id: row.id,
    image: row.image,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    piece: row.piece,
    availableColors: row.availableColors,
    status: deriveStatus(row.piece),
  }
}

function validateProductInput (input: Partial<ProductInput>): ProductInput {
  const image = typeof input.image === 'string' ? input.image.trim() : ''
  const name = typeof input.name === 'string' ? input.name.trim() : ''
  const category = typeof input.category === 'string' ? input.category.trim() : ''
  const price = input.price
  const piece = input.piece
  const availableColors = input.availableColors

  if (!image) {
    throw new ProductError(400, 'BAD_REQUEST', 'Image is required.')
  }
  if (!name) {
    throw new ProductError(400, 'BAD_REQUEST', 'Name is required.')
  }
  if (!category) {
    throw new ProductError(400, 'BAD_REQUEST', 'Category is required.')
  }
  if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
    throw new ProductError(400, 'BAD_REQUEST', 'Price must be a non-negative number.')
  }
  if (typeof piece !== 'number' || !Number.isInteger(piece) || piece < 0) {
    throw new ProductError(400, 'BAD_REQUEST', 'Piece must be a non-negative integer.')
  }
  if (!Array.isArray(availableColors)) {
    throw new ProductError(400, 'BAD_REQUEST', 'Available colors must be an array.')
  }

  const colors = availableColors.map((c) => (typeof c === 'string' ? c.trim() : ''))
  if (colors.some((c) => !c)) {
    throw new ProductError(400, 'BAD_REQUEST', 'Each available color must be a non-empty string.')
  }

  return { image, name, category, price, piece: piece, availableColors: colors }
}

async function listProducts (): Promise<ProductStock[]> {
  const rows = await prisma.product.findMany({ orderBy: { name: 'asc' } })
  return rows.map(toProductStock)
}

async function getProductById (id: string): Promise<ProductStock> {
  const row = await prisma.product.findUnique({ where: { id } })
  if (!row) {
    throw new ProductError(404, 'NOT_FOUND', 'Product not found.')
  }
  return toProductStock(row)
}

async function createProduct (input: Partial<ProductInput>): Promise<ProductStock> {
  const data = validateProductInput(input)
  const row = await prisma.product.create({ data })
  return toProductStock(row)
}

async function assertProductExists (id: string): Promise<void> {
  const existing = await prisma.product.findUnique({ where: { id }, select: { id: true } })
  if (!existing) {
    throw new ProductError(404, 'NOT_FOUND', 'Product not found.')
  }
}

async function updateProduct (id: string, input: Partial<ProductInput>): Promise<ProductStock> {
  const data = validateProductInput(input)
  await assertProductExists(id)
  const row = await prisma.product.update({ where: { id }, data })
  return toProductStock(row)
}

async function deleteProduct (id: string): Promise<void> {
  await assertProductExists(id)
  await prisma.product.delete({ where: { id } })
}

export {
  listProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
}
