// State + persistence. Guest data lives in localStorage; signed-in data syncs through Firestore
// (users/{uid} for profile & settings, users/{uid}/days/{yyyy-mm-dd} for each day's logs).

const FB = "https://www.gstatic.com/firebasejs/12.19.0";

export const DEFAULT_PROFILE = {
  name: "", age: 27, male: true, heightCm: 172, weightKg: 70, goalWeightKg: 68,
  activity: 1.55, goal: "lose", waterTarget: 8, stepsTarget: 8000,
  supplements: ["Marine collagen", "Multivitamin"], onboarded: false,
};

export const emptyDay = () => ({ foods: [], workouts: [], body: {}, water: 0, supps: [] });

export const S = {
  profile: { ...DEFAULT_PROFILE },
  customFoods: [],
  cache: {}, // AI nutrient cache by "name|unit"
  days: {},
  user: null, // {uid, name, email, photo}
  mode: "loading", // loading | signedout | guest | cloud
  geminiKey: "",
};

let listeners = [];
export const onChange = (fn) => listeners.push(fn);
const emit = () => listeners.forEach((f) => f());

export const day = (d) => S.days[d] || emptyDay();
export function ensureDay(d) {
  if (!S.days[d]) S.days[d] = emptyDay();
  return S.days[d];
}

// ---------- local ----------
const lsKey = () => "healthyfi.data." + (S.user ? S.user.uid : "guest");
function lsSave() {
  try {
    localStorage.setItem(lsKey(), JSON.stringify({ profile: S.profile, customFoods: S.customFoods, cache: S.cache, days: S.days }));
  } catch {}
}
function lsLoad(key = lsKey()) {
  try {
    const o = JSON.parse(localStorage.getItem(key) || "null");
    if (!o) return null;
    return { profile: { ...DEFAULT_PROFILE, ...o.profile }, customFoods: o.customFoods || [], cache: o.cache || {}, days: o.days || {} };
  } catch {
    return null;
  }
}
function apply(o) {
  S.profile = o ? o.profile : { ...DEFAULT_PROFILE };
  S.customFoods = o ? o.customFoods : [];
  S.cache = o ? o.cache : {};
  S.days = o ? o.days : {};
}

// ---------- firebase ----------
let fb = null; // {auth, db, fs, au}
const timers = {};
const pending = new Set();
let unsubDays = null, unsubUser = null;

export const firebaseConfigured = () => !!window.HEALTHYFI_CONFIG?.firebase?.apiKey;

async function loadFirebase() {
  if (fb || !firebaseConfigured()) return fb;
  const [{ initializeApp }, au, fs] = await Promise.all([
    import(`${FB}/firebase-app.js`),
    import(`${FB}/firebase-auth.js`),
    import(`${FB}/firebase-firestore.js`),
  ]);
  const app = initializeApp(window.HEALTHYFI_CONFIG.firebase);
  const auth = au.getAuth(app);
  let db;
  try {
    db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
  } catch {
    db = fs.getFirestore(app);
  }
  fb = { auth, db, au, fs };
  return fb;
}

export async function init() {
  if (!firebaseConfigured()) {
    const guest = localStorage.getItem("healthyfi.guest") === "1";
    if (guest) startGuest();
    else {
      S.mode = "signedout";
      emit();
    }
    return;
  }
  try {
    await loadFirebase();
  } catch {
    S.mode = localStorage.getItem("healthyfi.guest") === "1" ? "guest" : "signedout";
    if (S.mode === "guest") apply(lsLoad());
    emit();
    return;
  }
  fb.au.onAuthStateChanged(fb.auth, async (u) => {
    if (unsubDays) unsubDays(), (unsubDays = null);
    if (unsubUser) unsubUser(), (unsubUser = null);
    if (!u) {
      S.user = null;
      if (localStorage.getItem("healthyfi.guest") === "1") startGuest();
      else {
        apply(null);
        S.mode = "signedout";
        emit();
      }
      return;
    }
    S.user = { uid: u.uid, name: u.displayName || "", email: u.email || "", photo: u.photoURL || "" };
    apply(lsLoad()); // instant paint from this device's cache
    S.mode = "cloud";
    emit();
    connectCloud(u.uid);
  });
}

function connectCloud(uid) {
  const { fs, db } = fb;
  const userRef = fs.doc(db, "users", uid);
  let firstUser = true;
  unsubUser = fs.onSnapshot(userRef, async (snap) => {
    if (pending.has("user")) return;
    if (!snap.exists()) {
      if (firstUser) {
        firstUser = false;
        // first sign-in: bring over anything logged as a guest on this device
        const g = lsLoad("healthyfi.data.guest");
        if (g && (g.profile.onboarded || Object.keys(g.days).length)) {
          apply(g);
          if (!S.profile.name && S.user.name) S.profile.name = S.user.name.split(" ")[0];
          saveProfile();
          Object.keys(S.days).forEach(saveDay);
        } else if (!S.profile.name && S.user.name) S.profile.name = S.user.name.split(" ")[0];
        emit();
      }
      return;
    }
    firstUser = false;
    const v = snap.data();
    S.profile = { ...DEFAULT_PROFILE, ...(v.profile || {}) };
    S.customFoods = v.customFoods || [];
    S.cache = v.cache || {};
    if (v.geminiKey && !localKey()) setLocalKey(v.geminiKey);
    S.geminiKey = v.geminiKey || "";
    lsSave();
    emit();
  });
  unsubDays = fs.onSnapshot(fs.collection(db, "users", uid, "days"), (snap) => {
    snap.docChanges().forEach((ch) => {
      const id = ch.doc.id;
      if (pending.has("d" + id)) return;
      if (ch.type === "removed") delete S.days[id];
      else {
        const v = ch.doc.data();
        S.days[id] = { foods: v.foods || [], workouts: v.workouts || [], body: v.body || {}, water: v.water || 0, supps: v.supps || [] };
      }
    });
    lsSave();
    emit();
  });
}

function localKey() {
  try {
    return JSON.parse(localStorage.getItem("healthyfi.ai") || "{}").key || "";
  } catch {
    return "";
  }
}
function setLocalKey(k) {
  try {
    const o = JSON.parse(localStorage.getItem("healthyfi.ai") || "{}");
    o.key = k;
    localStorage.setItem("healthyfi.ai", JSON.stringify(o));
  } catch {}
}

function startGuest() {
  try {
    localStorage.setItem("healthyfi.guest", "1");
  } catch {}
  S.user = null;
  apply(lsLoad());
  S.mode = "guest";
  emit();
}
export const continueAsGuest = startGuest;

export async function signInWithGoogle() {
  await loadFirebase();
  const { au, auth } = fb;
  const provider = new au.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  try {
    localStorage.removeItem("healthyfi.guest");
  } catch {}
  try {
    await au.signInWithPopup(auth, provider);
  } catch (e) {
    if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/cancelled-popup-request"].includes(e.code)) {
      await au.signInWithRedirect(auth, provider);
    } else throw e;
  }
}

export async function signOut() {
  try {
    localStorage.removeItem("healthyfi.guest");
  } catch {}
  if (fb && S.user) await fb.au.signOut(fb.auth);
  else {
    S.user = null;
    apply(null);
    S.mode = "signedout";
    emit();
  }
}

// ---------- writes ----------
function schedule(key, write) {
  lsSave();
  if (S.mode !== "cloud" || !fb || !S.user) return;
  pending.add(key);
  clearTimeout(timers[key]);
  timers[key] = setTimeout(async () => {
    delete timers[key];
    try {
      await write();
    } catch (e) {
      console.warn("sync failed", e);
    }
    if (!timers[key]) pending.delete(key);
  }, 600);
}

export function saveProfile() {
  schedule("user", () => {
    const { fs, db } = fb;
    return fs.setDoc(
      fs.doc(db, "users", S.user.uid),
      JSON.parse(JSON.stringify({ profile: S.profile, customFoods: S.customFoods, cache: trimCache(), updatedAt: Date.now() })),
      { merge: true },
    );
  });
}

export function saveDay(d) {
  schedule("d" + d, () => {
    const { fs, db } = fb;
    return fs.setDoc(fs.doc(db, "users", S.user.uid, "days", d), JSON.parse(JSON.stringify({ date: d, ...day(d) })));
  });
}

export async function saveGeminiKeyToAccount(key) {
  S.geminiKey = key;
  if (S.mode !== "cloud" || !fb || !S.user) return;
  const { fs, db } = fb;
  await fs.setDoc(fs.doc(db, "users", S.user.uid), { geminiKey: key }, { merge: true });
}

function trimCache() {
  const keys = Object.keys(S.cache);
  if (keys.length <= 300) return S.cache;
  const out = {};
  keys.slice(-300).forEach((k) => (out[k] = S.cache[k]));
  S.cache = out;
  return out;
}

export function clearLogs() {
  Object.keys(S.days).forEach((d) => {
    S.days[d] = emptyDay();
    saveDay(d);
  });
}

export function exportJSON() {
  return JSON.stringify({ exportedAt: new Date().toISOString(), profile: S.profile, customFoods: S.customFoods, days: S.days }, null, 2);
}

export { emit as notify };
