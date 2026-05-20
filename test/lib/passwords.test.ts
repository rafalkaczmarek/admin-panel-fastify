import { describe, it } from 'node:test'
import * as assert from 'node:assert'
import { hashPassword, verifyPassword } from '../../src/lib/passwords'

describe('passwords', () => {
  it('hashPassword and verifyPassword round-trip', async () => {
    const hash = await hashPassword('secret-pass')
    assert.notEqual(hash, 'secret-pass')
    assert.ok(await verifyPassword('secret-pass', hash))
    assert.ok(!(await verifyPassword('wrong', hash)))
  })
})
