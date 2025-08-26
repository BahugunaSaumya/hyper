// auth.js  (module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider,
  signInWithPopup, createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  initializeFirestore, setLogLevel,              // NEW
  addDoc, setDoc, doc, getDoc, collection, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

console.log("[auth] module start");

// ----- Promise any page can await -----
let _resolveReady, _rejectReady;
if (!window.firebaseReady) {
  window.firebaseReady = new Promise((res, rej) => { _resolveReady = res; _rejectReady = rej; });
}

// ----- Check CryptoJS presence -----
const hasCrypto = typeof window.CryptoJS !== "undefined";
console.log("[auth] CryptoJS present?", hasCrypto);

// 🔐 Encrypted config from `encrypted-firebase.txt`
const encryptedConfigHex = `6d1aac583ab36143c115d1e0347279f0c86f6febd35faa62461e79d49c82a85fb232779b55e39d75ed4f0b1b6b595f655bcd2193d2c30f223552c208f07de77d4eb7bda480bf32ee29046ef0467ca4fbd51f25d787eb5d934f3b2d60d08357a88836fa830af15b5e1b7f3367418645c917ddc32f549a72ecbefa2b6f741b503eb84e9af399c936b45555e07137d904734c8abde7b59adf852f36627f870b2dfbb8cadb27779c31a58f951cdab103e51aa11e937f3cefe1c54748d110d8df6d59ff7015d9b56bce2500e70048beff9b360a5d69244ee181825745212fbe06cee828545c16c19b740ef40f9bf360706e0565c7e4958bbfc2c56d48933cb39be12573456ce78c6e2c368a48265ffa15d7ca9468006d57d29e316afbc064b36e496ad73ef6d658731cf785555d0078c2911c`;

// 🔐 AES Key and IV from `encryption-meta.json`
// truncated here for brevity – keep your full hex
const ENCRYPTION_KEY_HEX = "179316d7351ebf96aa3947a4f9f81f1ff593d4bdbd17dc97140213566925bbab";
const IV_HEX             = "f92357b3d63b43e787481eba564c5923";

// ----- Decrypt helper -----
function decryptConfig(encryptedHex, keyHex, ivHex) {
  const key = CryptoJS.enc.Hex.parse(keyHex);
  const iv  = CryptoJS.enc.Hex.parse(ivHex);
  const encrypted = CryptoJS.enc.Hex.parse(encryptedHex);
  const decrypted = CryptoJS.AES.decrypt({ ciphertext: encrypted }, key, { iv, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 });
  const json = decrypted.toString(CryptoJS.enc.Utf8);
  if (!json) throw new Error("Decrypt produced empty string (bad key/iv or bad ciphertext).");
  return JSON.parse(json);
}

let firebaseStuffOK = false;

try {
  if (!hasCrypto) throw new Error("CryptoJS not loaded BEFORE auth.js");

  console.log("[auth] decrypting config…");
  const firebaseConfig = decryptConfig(encryptedConfigHex, ENCRYPTION_KEY_HEX, IV_HEX);
  console.log("[auth] config OK, projectId:", firebaseConfig.projectId);

  const app  = initializeApp(firebaseConfig);
  const auth = getAuth(app);

// Force a network-friendly transport (avoids WebChannel 400s)
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,  // <-- hard switch to long polling
//   experimentalAutoDetectLongPolling: false,
  useFetchStreams: false
});
console.log("[auth] Firestore transport: forceLongPolling");



  // Expose to window for non-modular scripts
  window.firebaseStuff = { app, auth, db };
  window.fs = { addDoc, setDoc, doc, getDoc, collection, serverTimestamp };

  onAuthStateChanged(auth, (user) => {
    window.currentUser = user || null;
    console.log(user ? `✅ [auth] logged in: ${user.email}` : "⛔ [auth] no user");
  });

  firebaseStuffOK = true;
  _resolveReady && _resolveReady(window.firebaseStuff);
  console.log("[auth] Firebase initialized.");
} catch (err) {
  console.error("[auth] init failed:", err);
  window.firebaseInitError = err;
  _rejectReady && _rejectReady(err);
}

// ----- (Optional) auth helpers you already had -----
window.togglePassword = function (inputId = "password") {
  const pw = document.getElementById(inputId);
  if (pw) pw.type = pw.type === "password" ? "text" : "password";
};

window.dummyGoogleSignup = async function () {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(window.firebaseStuff.auth, provider);
    alert(`Welcome ${result.user.displayName}!`);
  } catch (e) {
    alert(`Google Sign-In Error: ${e.message}`);
    console.error(e);
  }
};

window.dummyGoogleLogin = window.dummyGoogleSignup;

window.dummySignup = async function () {
  try {
    const name  = document.getElementById("name")?.value?.trim();
    const email = document.getElementById("email")?.value?.trim();
    const pw    = document.getElementById("password")?.value;
    if (!name || !email || !pw) return alert("Please fill all fields.");
    const { user } = await createUserWithEmailAndPassword(window.firebaseStuff.auth, email, pw);
    await updateProfile(user, { displayName: name });
    alert("Account created!");
  } catch (e) {
    alert(`Signup Error: ${e.message}`);
    console.error(e);
  }
};
  (async () => {
    try {
      // wait for auth.js to finish
      const { db } = await window.firebaseReady;
      const { addDoc, collection, serverTimestamp } = window.fs;

      const ref = await addDoc(collection(db, "debug"), {
        ping: true,
        at: serverTimestamp(),
        page: location.pathname
      });
      console.log("✅ Firestore test write:", ref.id);
    } catch (e) {
      console.error("❌ Firestore test failed:", e);
    }
  })();
