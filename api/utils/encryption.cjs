const CryptoJS = require('crypto-js');

const SECRET = process.env.SECRET;

if (!SECRET) {
  throw new Error('SECRET environment variable is not set! Please set it in your environment.');
}

function encryptText(text) {
  if (typeof text !== 'string' || !text) {
    throw new Error('encryptText: input must be a non-empty string');
  }
  return CryptoJS.AES.encrypt(text, SECRET).toString();
}

function decryptText(cipher) {
  try {
    const bytes = CryptoJS.AES.decrypt(cipher, SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return '[Decryption failed]';
  }
}

// Deterministic encryption using AES-ECB (not secure for general use, but deterministic)
function deterministicEncryptText(text) {
  if (typeof text !== 'string' || !text) {
    throw new Error('deterministicEncryptText: input must be a non-empty string');
  }
  const key = CryptoJS.enc.Utf8.parse(SECRET);
  console.log('key', key)
  
  const encrypted = CryptoJS.AES.encrypt(text, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  });
  return encrypted.toString();
}

// Encrypt user object
function encryptUser(user) {
  if (!user || typeof user !== 'object') {
    throw new Error('encryptUser: input must be a user object');
  }
  return encryptText(JSON.stringify(user));
}

// Decrypt user object
function decryptUser(encryptedUser) {
  try {
    const decrypted = decryptText(encryptedUser);
    return JSON.parse(decrypted);
  } catch {
    return { name: '[Unknown User]', email: '[unknown@example.com]' };
  }
}

module.exports = {
  encryptText,
  decryptText,
  deterministicEncryptText,
  encryptUser,
  decryptUser
}; 