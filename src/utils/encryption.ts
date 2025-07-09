import CryptoJS from 'crypto-js'

const SECRET = 'your-secret-key'

export function encryptText(text: string): string {
  return CryptoJS.AES.encrypt(text, SECRET).toString()
}

export function decryptText(cipher: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, SECRET)
    return bytes.toString(CryptoJS.enc.Utf8)
  } catch {
    return '[Decryption failed]'
  }
}
