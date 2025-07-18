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

// Deterministic encryption using AES-ECB (not secure for general use, but deterministic)
export function deterministicEncryptText(text: string): string {
  const key = CryptoJS.enc.Utf8.parse(SECRET)
  const encrypted = CryptoJS.AES.encrypt(text, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  })
  return encrypted.toString()
}

// Encrypt user object
export function encryptUser(user: { name: string; email: string }): string {
  return encryptText(JSON.stringify(user))
}

// Decrypt user object
export function decryptUser(encryptedUser: string): { name: string; email: string } {
  try {
    const decrypted = decryptText(encryptedUser)
    return JSON.parse(decrypted)
  } catch {
    return { name: '[Unknown User]', email: '[unknown@example.com]' }
  }
}
