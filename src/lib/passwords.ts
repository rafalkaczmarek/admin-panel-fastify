import bcrypt from 'bcrypt'

const BCRYPT_ROUNDS = 10

async function hashPassword (plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

async function verifyPassword (plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export { hashPassword, verifyPassword }
