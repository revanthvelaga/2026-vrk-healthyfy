// Healthyfi configuration.
// 1. Firebase (for Google sign-in + sync across devices):
//    Firebase console → Project settings → Your apps → Web app → copy the config object here.
//    Leave apiKey empty to run without accounts (data stays on this device).
// 2. Gemini key is NOT stored here — each person adds their own key in the app under Me → AI settings,
//    so it never ends up in the public GitHub repo.
window.HEALTHYFI_CONFIG = {
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: "",
  },
};
