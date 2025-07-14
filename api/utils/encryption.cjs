const CryptoJS = require('crypto-js');

const SECRET = process.env.SECRET;

function encryptText(text) {
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
  const key = CryptoJS.enc.Utf8.parse(SECRET);
  const encrypted = CryptoJS.AES.encrypt(text, key, {
    mode: CryptoJS.mode.ECB,
    padding: CryptoJS.pad.Pkcs7
  });
  return encrypted.toString();
}

// Encrypt user object
function encryptUser(user) {
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