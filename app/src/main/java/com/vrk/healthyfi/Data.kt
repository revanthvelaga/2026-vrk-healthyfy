package com.vrk.healthyfi

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.time.LocalDate
import java.util.Locale
import kotlin.math.roundToInt

// ---------- Models ----------

data class Profile(
    val name: String = "",
    val age: Int = 27,
    val male: Boolean = true,
    val heightCm: Double = 172.0,
    val weightKg: Double = 70.0,
    val goalWeightKg: Double = 70.0,
    val activity: Double = 1.55,
    val goal: String = "maintain", // lose | maintain | gain
    val waterTarget: Int = 8,
    val stepsTarget: Int = 8000,
    val supplements: List<String> = listOf("Marine collagen", "Multivitamin"),
    val onboarded: Boolean = false,
) {
    fun bmr(): Double = 10 * weightKg + 6.25 * heightCm - 5 * age + if (male) 5 else -161

    fun calorieTarget(): Int {
        val adj = when (goal) {
            "lose" -> -500
            "gain" -> 300
            else -> 0
        }
        return (bmr() * activity + adj).roundToInt().coerceAtLeast(1200)
    }

    fun proteinTarget(): Int = (weightKg * if (goal == "lose") 2.0 else 1.8).roundToInt()
    fun fatTarget(): Int = (calorieTarget() * 0.25 / 9).roundToInt()
    fun carbTarget(): Int =
        ((calorieTarget() - proteinTarget() * 4 - fatTarget() * 9) / 4.0).roundToInt().coerceAtLeast(0)

    fun bmi(): Double = weightKg / ((heightCm / 100) * (heightCm / 100))
}

data class FoodItem(
    val name: String,
    val unit: String,
    val kcal: Double,
    val protein: Double,
    val carbs: Double,
    val fat: Double,
)

data class FoodEntry(
    val id: Long,
    val date: String,
    val meal: String,
    val name: String,
    val unit: String,
    val servings: Double,
    val kcal: Double,
    val protein: Double,
    val carbs: Double,
    val fat: Double,
) {
    val totalKcal get() = kcal * servings
    val totalProtein get() = protein * servings
    val totalCarbs get() = carbs * servings
    val totalFat get() = fat * servings
}

data class WorkoutEntry(
    val id: Long,
    val date: String,
    val exercise: String,
    val cardio: Boolean,
    val sets: Int,
    val reps: Int,
    val weightKg: Double,
    val minutes: Int,
    val kcal: Int,
)

data class BodyLog(
    val date: String,
    val weightKg: Double? = null,
    val sleepHrs: Double? = null,
    val steps: Int? = null,
)

data class DayHabits(
    val date: String,
    val water: Int = 0,
    val supps: Set<String> = emptySet(),
)

data class AppState(
    val profile: Profile = Profile(),
    val foods: List<FoodEntry> = emptyList(),
    val workouts: List<WorkoutEntry> = emptyList(),
    val body: Map<String, BodyLog> = emptyMap(),
    val habits: Map<String, DayHabits> = emptyMap(),
    val customFoods: List<FoodItem> = emptyList(),
) {
    fun habitsFor(date: String): DayHabits = habits[date] ?: DayHabits(date)

    fun withHabits(date: String, f: (DayHabits) -> DayHabits): AppState =
        copy(habits = habits + (date to f(habitsFor(date))))
}

// ---------- Helpers ----------

fun Double.fmt(): String =
    if (this % 1.0 == 0.0) this.toLong().toString() else String.format(Locale.US, "%.1f", this)

fun today(): String = LocalDate.now().toString()

fun newId(): Long = System.currentTimeMillis() * 1000 + (System.nanoTime() % 1000)

// ---------- Storage ----------

class Repo(context: Context) {
    private val file = File(context.filesDir, "healthyfi.json")
    private val _state = MutableStateFlow(load())
    val state: StateFlow<AppState> = _state

    fun update(f: (AppState) -> AppState) {
        val next = f(_state.value)
        _state.value = next
        try {
            file.writeText(Json.write(next).toString())
        } catch (_: Exception) {
        }
    }

    private fun load(): AppState = try {
        if (file.exists()) Json.read(JSONObject(file.readText())) else AppState()
    } catch (_: Exception) {
        AppState()
    }
}

private object Json {
    private fun JSONObject.dbl(k: String): Double? = if (has(k) && !isNull(k)) getDouble(k) else null
    private fun JSONObject.int(k: String): Int? = if (has(k) && !isNull(k)) getInt(k) else null
    private fun JSONArray.objects(): List<JSONObject> = List(length()) { getJSONObject(it) }
    private fun JSONArray.strings(): List<String> = List(length()) { getString(it) }

    fun write(s: AppState): JSONObject = JSONObject().apply {
        val p = s.profile
        put("profile", JSONObject().apply {
            put("name", p.name); put("age", p.age); put("male", p.male)
            put("heightCm", p.heightCm); put("weightKg", p.weightKg); put("goalWeightKg", p.goalWeightKg)
            put("activity", p.activity); put("goal", p.goal)
            put("waterTarget", p.waterTarget); put("stepsTarget", p.stepsTarget)
            put("supplements", JSONArray(p.supplements)); put("onboarded", p.onboarded)
        })
        put("foods", JSONArray().apply {
            s.foods.forEach { e ->
                put(JSONObject().apply {
                    put("id", e.id); put("date", e.date); put("meal", e.meal); put("name", e.name)
                    put("unit", e.unit); put("servings", e.servings); put("kcal", e.kcal)
                    put("protein", e.protein); put("carbs", e.carbs); put("fat", e.fat)
                })
            }
        })
        put("workouts", JSONArray().apply {
            s.workouts.forEach { w ->
                put(JSONObject().apply {
                    put("id", w.id); put("date", w.date); put("exercise", w.exercise); put("cardio", w.cardio)
                    put("sets", w.sets); put("reps", w.reps); put("weightKg", w.weightKg)
                    put("minutes", w.minutes); put("kcal", w.kcal)
                })
            }
        })
        put("body", JSONArray().apply {
            s.body.values.forEach { b ->
                put(JSONObject().apply {
                    put("date", b.date)
                    b.weightKg?.let { put("weightKg", it) }
                    b.sleepHrs?.let { put("sleepHrs", it) }
                    b.steps?.let { put("steps", it) }
                })
            }
        })
        put("habits", JSONArray().apply {
            s.habits.values.forEach { h ->
                put(JSONObject().apply {
                    put("date", h.date); put("water", h.water); put("supps", JSONArray(h.supps.toList()))
                })
            }
        })
        put("customFoods", JSONArray().apply {
            s.customFoods.forEach { f ->
                put(JSONObject().apply {
                    put("name", f.name); put("unit", f.unit); put("kcal", f.kcal)
                    put("protein", f.protein); put("carbs", f.carbs); put("fat", f.fat)
                })
            }
        })
    }

    fun read(o: JSONObject): AppState {
        val d = Profile()
        val p = o.optJSONObject("profile")
        val profile = if (p == null) d else Profile(
            name = p.optString("name", d.name),
            age = p.optInt("age", d.age),
            male = p.optBoolean("male", d.male),
            heightCm = p.optDouble("heightCm", d.heightCm),
            weightKg = p.optDouble("weightKg", d.weightKg),
            goalWeightKg = p.optDouble("goalWeightKg", d.goalWeightKg),
            activity = p.optDouble("activity", d.activity),
            goal = p.optString("goal", d.goal),
            waterTarget = p.optInt("waterTarget", d.waterTarget),
            stepsTarget = p.optInt("stepsTarget", d.stepsTarget),
            supplements = p.optJSONArray("supplements")?.strings() ?: d.supplements,
            onboarded = p.optBoolean("onboarded", false),
        )
        val foods = o.optJSONArray("foods")?.objects()?.map {
            FoodEntry(
                it.getLong("id"), it.getString("date"), it.getString("meal"), it.getString("name"),
                it.optString("unit", "serving"), it.getDouble("servings"), it.getDouble("kcal"),
                it.getDouble("protein"), it.getDouble("carbs"), it.getDouble("fat"),
            )
        } ?: emptyList()
        val workouts = o.optJSONArray("workouts")?.objects()?.map {
            WorkoutEntry(
                it.getLong("id"), it.getString("date"), it.getString("exercise"), it.optBoolean("cardio"),
                it.optInt("sets"), it.optInt("reps"), it.optDouble("weightKg", 0.0),
                it.optInt("minutes"), it.optInt("kcal"),
            )
        } ?: emptyList()
        val body = o.optJSONArray("body")?.objects()?.associate {
            val date = it.getString("date")
            date to BodyLog(date, it.dbl("weightKg"), it.dbl("sleepHrs"), it.int("steps"))
        } ?: emptyMap()
        val habits = o.optJSONArray("habits")?.objects()?.associate {
            val date = it.getString("date")
            date to DayHabits(date, it.optInt("water"), it.optJSONArray("supps")?.strings()?.toSet() ?: emptySet())
        } ?: emptyMap()
        val custom = o.optJSONArray("customFoods")?.objects()?.map {
            FoodItem(
                it.getString("name"), it.optString("unit", "serving"), it.getDouble("kcal"),
                it.getDouble("protein"), it.getDouble("carbs"), it.getDouble("fat"),
            )
        } ?: emptyList()
        return AppState(profile, foods, workouts, body, habits, custom)
    }
}
