import { before, mock } from 'node:test'
import prisma from '../../src/lib/prisma.js'

export const prismaMock = {
  user: { findUnique: mock.fn<() => Promise<unknown>>() },
  refreshToken: {
    create: mock.fn<() => Promise<unknown>>(),
    findUnique: mock.fn<() => Promise<unknown>>(),
    delete: mock.fn<() => Promise<unknown>>(),
  },
  product: {
    findMany: mock.fn<() => Promise<unknown[]>>(),
    findUnique: mock.fn<() => Promise<unknown>>(),
    create: mock.fn<() => Promise<unknown>>(),
    update: mock.fn<() => Promise<unknown>>(),
    delete: mock.fn<() => Promise<unknown>>(),
  },
}

export function installPrismaMock (): void {
  before(() => {
    prisma.__setForTests(prismaMock as never)
  })
}
