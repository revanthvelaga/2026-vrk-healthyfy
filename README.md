# Healthyfi

A personal HealthifyMe-style health tracker for Android. Kotlin + Jetpack Compose, all data stored on the phone (no account, no server).

## What it does
- **Home** – calories ring (eaten / burned / left), protein-carbs-fat bars, water glasses, daily supplement checklist, weight · sleep · steps log, coach tips (e.g. how much protein is left and quick ways to hit it)
- **Food** – Breakfast / Lunch / Snacks / Dinner logging from ~90 Indian foods (idli, pesarattu, pappu, gongura chicken, biryani…), servings in 0.5 steps, recent foods first, custom foods, "Repeat yesterday"
- **Workout** – strength (sets × reps × kg) and cardio (minutes), calorie burn estimate (MET-based), personal-best tracking
- **Progress** – weight trend vs goal, 7-day calories and protein charts, logging streak, BMI (Asian cut-offs)
- **Me** – profile; targets auto-calculated (Mifflin-St Jeor BMR × activity, ±goal; protein 1.8–2 g/kg)

Back navigation between days with the ‹ › bar at the top.

## Build
Push to GitHub – the workflow in `.github/workflows/build.yml` builds debug + release APKs.
Download from **Actions → latest run → Artifacts → healthyfi-apk**.

Local: open in Android Studio, or `./gradlew assembleDebug`.

Stack: AGP 8.5.2 · Kotlin 2.0.20 · Compose BOM 2024.09 · minSdk 26 · targetSdk 34.

Food values are approximate per typical home serving — edit `FoodDb.kt` or add custom foods in the app.
