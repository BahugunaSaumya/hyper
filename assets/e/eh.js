// encrypt-firebase-config.js

const crypto = require('crypto');
const fs = require('fs');

// Replace with your actual Firebase config object
const firebaseConfig = {

};

const ENCRYPTION_KEY = crypto.randomBytes(32); // AES-256
const IV = crypto.randomBytes(16); // Initialization vector

const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
let encrypted = cipher.update(JSON.stringify(firebaseConfig), 'utf8', 'hex');
encrypted += cipher.final('hex');

// Save encrypted config and key
fs.writeFileSync('encrypted-firebase.txt', encrypted);
fs.writeFileSync('encryption-meta.json', JSON.stringify({
    key: ENCRYPTION_KEY.toString('hex'),
    iv: IV.toString('hex')
}));

console.log('✅ Firebase config encrypted and saved.');
