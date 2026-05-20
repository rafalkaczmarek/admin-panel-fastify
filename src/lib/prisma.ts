import { PrismaClient } from '@prisma/client'

const STATE_KEY = Symbol.for('admin-panel-fastify.prisma')

interface PrismaState {
  client: PrismaClient | null
}

function state (): PrismaState {
  const global = globalThis as typeof globalThis & { [key: symbol]: PrismaState | undefined }
  if (!global[STATE_KEY]) {
    global[STATE_KEY] = { client: null }
  }
  return global[STATE_KEY]!
}

function getClient (): PrismaClient {
  const s = state()
  if (!s.client) {
    s.client = new PrismaClient()
  }
  return s.client
}

const prisma = new Proxy(
  {},
  {
    get (_target, prop) {
      if (prop === '__setForTests') {
        return (mock: PrismaClient) => {
          state().client = mock
        }
      }
      if (prop === '__reset') {
        return () => {
          state().client = null
        }
      }
      return Reflect.get(getClient(), prop)
    },
  },
) as PrismaClient & {
  __setForTests: (mock: PrismaClient) => void
  __reset: () => void
}

export default prisma
