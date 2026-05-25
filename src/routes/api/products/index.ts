import { type FastifyPluginAsync } from 'fastify'
import { registerApiErrorHandler } from '../../../lib/api-error-handler.js'
import { apiError, product, productBody, productList } from '../../../lib/openapi-schemas.js'
import * as productService from '../../../services/productService.js'
import { type ProductInput } from '../../../services/productService.js'

const products: FastifyPluginAsync = async (fastify) => {
  registerApiErrorHandler(fastify)

  fastify.addHook('preHandler', fastify.requireAuth)

  fastify.get('/', {
    schema: {
      tags: ['products'],
      summary: 'List products',
      security: [{ bearerAuth: [] }],
      response: {
        200: productList,
        401: apiError,
      },
    },
  }, async () => {
    return productService.listProducts()
  })

  fastify.get<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['products'],
      summary: 'Get product by id',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
      response: {
        200: product,
        401: apiError,
        404: apiError,
      },
    },
  }, async (request) => {
    return productService.getProductById(request.params.id)
  })

  fastify.post<{ Body: Partial<ProductInput> }>('/', {
    schema: {
      tags: ['products'],
      summary: 'Create product',
      security: [{ bearerAuth: [] }],
      body: productBody,
      response: {
        201: product,
        400: apiError,
        401: apiError,
      },
    },
  }, async (request, reply) => {
    const created = await productService.createProduct(request.body)
    return reply.status(201).send(created)
  })

  fastify.put<{ Params: { id: string }, Body: Partial<ProductInput> }>('/:id', {
    schema: {
      tags: ['products'],
      summary: 'Update product',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
      body: productBody,
      response: {
        200: product,
        400: apiError,
        401: apiError,
        404: apiError,
      },
    },
  }, async (request) => {
    return productService.updateProduct(request.params.id, request.body)
  })

  fastify.delete<{ Params: { id: string } }>('/:id', {
    schema: {
      tags: ['products'],
      summary: 'Delete product',
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: { id: { type: 'string', format: 'uuid' } },
        required: ['id'],
      },
      response: {
        204: { type: 'null', description: 'No content' },
        401: apiError,
        404: apiError,
      },
    },
  }, async (request, reply) => {
    await productService.deleteProduct(request.params.id)
    return reply.status(204).send()
  })
}

export default products
