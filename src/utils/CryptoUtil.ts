import { CipherGCMTypes, createCipheriv, createDecipheriv, randomBytes } from "crypto"
import { CRYPTO_SECRET } from "./environmentUtil"

export type ICrypto = {
  iv: string,
  content: string
}

export default class CryptoUtil {

  static algorithm = 'aes-256-ctr'

  static encrypt(text: string, key: Buffer): ICrypto {
    const iv = randomBytes(16)
    const cipher = createCipheriv(CryptoUtil.algorithm, key, iv)
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()])

    return {
      iv: iv.toString('hex'),
      content: encrypted.toString('hex')
    }
  }

  static decrypt(hash: ICrypto, key: Buffer) {
    const decipher = createDecipheriv(CryptoUtil.algorithm, key, Buffer.from(hash.iv, 'hex'))
    const decrypted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()])

    return decrypted.toString()
  }

  static createKey(salt: string) {
    const toHash = Buffer.from(salt + CRYPTO_SECRET, 'base64')
    return Buffer.concat([toHash, toHash]) // 32 bytes long
  }
}