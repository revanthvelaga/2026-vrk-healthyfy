# Healthyfi

A HealthifyMe-style health tracker built for Indian food. Two parts:

- **Website** (`web/`) – the main app now: Google sign-in, AI photo scanning, full micronutrients. Hosted on GitHub Pages.
- **Android app** (`app/`) – Kotlin + Jetpack Compose, APK built by GitHub Actions (earlier version, no AI yet).

Live site: https://revanthvelaga.github.io/2026-vrk-healthyfy/

---

## Website features
- **Login** – Continue with Google (Firebase), or use without an account (data stays on the device). Signed-in data syncs across phone and laptop.
- **Onboarding** – 4 steps, then your daily calories, protein, carbs and fat (Mifflin-St Jeor BMR × activity, −500 to lose / +300 to gain).
- **Home** – week strip with daily rings, calories-left hero with ring, protein / carbs / fat "left" cards, 5 meals (breakfast, morning snack, lunch, evening snack, dinner) with recommended calorie ranges, **Nutrients** card that expands to fibre, sugar, saturated fat, cholesterol, 6 minerals and 5 vitamins against ICMR-NIN 2020 daily values, tappable water glasses, steps / weight / sleep, supplements, coach tips.
- **Add food** (full screen) – 260 foods in 17 categories with Telugu/Hindi names (pappu, perugu, avakaya, atukulu…). Tap **+** to drop items into a tray, adjust with − / +, then **Done** logs them all. Picking a dish shows **Goes well with** suggestions (idli → sambar, chutneys, podi, ghee, vada, filter coffee).
- **Food detail** – quantity stepper with real units (piece, mini idli, katori 150 g, bowl 250 g, tbsp, grams), macro split bar, nutrition facts, vitamins & minerals via AI.
- **Ask AI / Describe** – type any dish or a whole meal ("3 idli, sambar and a filter coffee") and get every nutrient.
- **Scan photo** – take or upload a plate photo; Gemini identifies each item and estimates portions. Adjust quantities, then add to the tray.
- **Diary** – tap any logged food to change its quantity or unit, or delete it. "Repeat yesterday" per meal. Exercise log with calorie estimates and personal bests.
- **Progress** – weight trend vs goal, 7-day calories and protein, vitamin & mineral averages, streak, BMI.
- **Me** – edit goals, AI settings, supplements, light/dark theme, export data as JSON, clear logs, sign out.
- Installable: on Android Chrome use **Add to Home screen** and it opens like an app.

## Setup (one time, about 10 minutes)

### 1. Turn on GitHub Pages
Repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch: `gh-pages`, folder `/ (root)` → Save.

### 2. Google sign-in (Firebase, free)
1. Go to https://console.firebase.google.com → **Create a project** (Google Analytics not needed).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable** → Save.
3. **Authentication → Settings → Authorized domains → Add domain** → `revanthvelaga.github.io`
4. **Build → Firestore Database → Create database** → choose a region (e.g. `asia-south1` Mumbai) → *Production mode*.
5. Firestore → **Rules** tab → paste the contents of `web/firestore.rules` → **Publish**.
6. **Project settings (⚙️) → Your apps → Web (</>)** → register app "Healthyfi" → copy the `firebaseConfig` values into `web/config.js`, commit, and update the `gh-pages` branch.

The Firebase web config is safe to keep in a public repo; the Firestore rules are what keep each person's data private.

### 3. Gemini AI key (free)
1. Open https://aistudio.google.com/apikey → **Create API key** → copy.
2. In Healthyfi: **Me → AI settings** → paste → **Test key** → Save.

The key is kept in your browser (and optionally in your own account), never in the repo.

## Run locally
```
cd web
python3 -m http.server 8080
```
Open http://localhost:8080 (add `localhost` to Firebase authorized domains to test sign-in).

## Android app
Push to GitHub – `.github/workflows/build.yml` builds debug + release APKs.
Download from **Actions → latest run → Artifacts → healthyfi-apk**.
Stack: AGP 8.5.2 · Kotlin 2.0.20 · Compose BOM 2024.09 · minSdk 26 · targetSdk 34.

Nutrition values are estimates, not medical advice.

## Food database
`web/js/foods.js` is generated from `tools/build_foods.py` (per-100 g values, serving units, aliases, pairings). Edit the Python file and run `python3 tools/build_foods.py` to add foods.

3D food icons: [Microsoft Fluent Emoji](https://github.com/microsoft/fluentui-emoji), MIT licence (`web/img/3d/LICENSE-fluentui-emoji`).
