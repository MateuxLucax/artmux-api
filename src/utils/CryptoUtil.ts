import { createCipheriv, createDecipheriv, randomBytes } from "crypto"
import { CRYPTO_SECRET } from "./environmentUtil"

export type ICrypto = {
  iv: string,
  content: string
}

export default class CryptoUtil {

  static algorithm = 'aes256'

  static encrypt = (text: string): ICrypto => {
    const iv = randomBytes(16)
    const cipher = createCipheriv(CryptoUtil.algorithm, CRYPTO_SECRET, iv)
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()])

    return {
      iv: iv.toString('hex'),
      content: encrypted.toString('hex')
    }
  }

  static decrypt = (hash: ICrypto) => {
    const decipher = createDecipheriv(CryptoUtil.algorithm, CRYPTO_SECRET, Buffer.from(hash.iv, 'hex'))
    const decrypted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()])

    return decrypted.toString()
  }
}