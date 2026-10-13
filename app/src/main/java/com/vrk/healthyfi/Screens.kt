@file:OptIn(ExperimentalMaterial3Api::class)

package com.vrk.healthyfi

import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import java.time.LocalDate
import java.time.LocalTime
import kotlin.math.roundToInt

val MEALS = listOf("Breakfast" to "🌅", "Lunch" to "🍛", "Snacks" to "🍌", "Dinner" to "🌙")

// ======================= HOME =======================

@Composable
fun HomeScreen(st: AppState, date: String, repo: Repo) {
    val p = st.profile
    val foods = st.foods.filter { it.date == date }
    val eaten = foods.sumOf { it.totalKcal }
    val burned = st.workouts.filter { it.date == date }.sumOf { it.kcal }
    val target = p.calorieTarget()
    val left = target - eaten.roundToInt() + burned
    val protein = foods.sumOf { it.totalProtein }
    val carbs = foods.sumOf { it.totalCarbs }
    val fat = foods.sumOf { it.totalFat }
    val habits = st.habitsFor(date)
    val cs = MaterialTheme.colorScheme

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            val hour = LocalTime.now().hour
            val hello = when {
                hour < 12 -> "Good morning"
                hour < 17 -> "Good afternoon"
                else -> "Good evening"
            }
            Text(
                if (p.name.isBlank()) "$hello 👋" else "$hello, ${p.name} 👋",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
            )
        }

        item {
            SectionCard("Calories") {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Stat(eaten.roundToInt().toString(), "Eaten", Modifier.weight(1f))
                    Ring(
                        progress = (eaten / (target + burned)).toFloat(),
                        color = if (left < 0) cs.secondary else cs.primary,
                        track = cs.primary.copy(alpha = 0.15f),
                        diameter = 140.dp,
                        stroke = 14.dp,
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                "${kotlin.math.abs(left)}",
                                fontSize = 30.sp,
                                fontWeight = FontWeight.Black,
                                color = if (left < 0) cs.secondary else cs.onSurface,
                            )
                            Text(if (left < 0) "kcal over" else "kcal left", style = MaterialTheme.typography.labelMedium)
                        }
                    }
                    Stat(burned.toString(), "Burned", Modifier.weight(1f))
                }
                Spacer(Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    MacroBar("Protein", protein, p.proteinTarget(), ProteinColor, Modifier.weight(1f))
                    MacroBar("Carbs", carbs, p.carbTarget(), CarbColor, Modifier.weight(1f))
                    MacroBar("Fat", fat, p.fatTarget(), FatColor, Modifier.weight(1f))
                }
            }
        }

        item {
            SectionCard("Water 💧", trailing = {
                Text("${habits.water} / ${p.waterTarget} glasses", style = MaterialTheme.typography.labelLarge)
            }) {
                LinearProgressIndicator(
                    progress = { (habits.water.toFloat() / p.waterTarget).coerceIn(0f, 1f) },
                    modifier = Modifier.fillMaxWidth().height(10.dp),
                    color = cs.tertiary,
                    trackColor = cs.tertiary.copy(alpha = 0.15f),
                    strokeCap = androidx.compose.ui.graphics.StrokeCap.Round,
                )
                Spacer(Modifier.height(10.dp))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "${habits.water * 250} ml",
                        modifier = Modifier.weight(1f),
                        color = cs.onSurfaceVariant,
                    )
                    OutlinedButton(onClick = {
                        repo.update { s -> s.withHabits(date) { it.copy(water = (it.water - 1).coerceAtLeast(0)) } }
                    }) { Text("−") }
                    Spacer(Modifier.width(8.dp))
                    Button(onClick = {
                        repo.update { s -> s.withHabits(date) { it.copy(water = it.water + 1) } }
                    }) { Text("+ Glass") }
                }
            }
        }

        if (p.supplements.isNotEmpty()) {
            item {
                val taken = p.supplements.count { it in habits.supps }
                SectionCard("Supplements 💊", trailing = {
                    Text("$taken / ${p.supplements.size}", style = MaterialTheme.typography.labelLarge)
                }) {
                    p.supplements.forEach { s ->
                        val on = s in habits.supps
                        Row(
                            Modifier
                                .fillMaxWidth()
                                .clickable {
                                    repo.update { st2 ->
                                        st2.withHabits(date) { h -> h.copy(supps = if (on) h.supps - s else h.supps + s) }
                                    }
                                },
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Checkbox(checked = on, onCheckedChange = null)
                            Spacer(Modifier.width(8.dp))
                            Text(s)
                        }
                    }
                }
            }
        }

        item { BodyCard(st, date, repo) }

        item {
            SectionCard("Coach tips 💡") {
                coachTips(st, date).forEach {
                    Text("• $it", style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(vertical = 3.dp))
                }
            }
        }
    }
}

@Composable
fun BodyCard(st: AppState, date: String, repo: Repo) {
    val log = st.body[date]
    var w by remember(date, log) { mutableStateOf(log?.weightKg?.fmt() ?: "") }
    var sleep by remember(date, log) { mutableStateOf(log?.sleepHrs?.fmt() ?: "") }
    var steps by remember(date, log) { mutableStateOf(log?.steps?.toString() ?: "") }
    val dirty = w != (log?.weightKg?.fmt() ?: "") || sleep != (log?.sleepHrs?.fmt() ?: "") ||
        steps != (log?.steps?.toString() ?: "")

    SectionCard("Body ⚖️", trailing = {
        log?.steps?.let {
            Text("${(it * 100 / st.profile.stepsTarget.coerceAtLeast(1))}% steps", style = MaterialTheme.typography.labelLarge)
        }
    }) {
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            NumField("Weight kg", w, { w = it }, Modifier.weight(1f))
            NumField("Sleep hrs", sleep, { sleep = it }, Modifier.weight(1f))
            NumField("Steps", steps, { steps = it.filter { c -> c.isDigit() } }, Modifier.weight(1.1f))
        }
        if (dirty) {
            Spacer(Modifier.height(10.dp))
            Button(
                onClick = {
                    repo.update { s ->
                        val b = BodyLog(date, w.toDoubleOrNull(), sleep.toDoubleOrNull(), steps.toIntOrNull())
                        var n = s.copy(body = s.body + (date to b))
                        val newerWeight = s.body.values.any { it.date > date && it.weightKg != null }
                        if (b.weightKg != null && !newerWeight) n = n.copy(profile = n.profile.copy(weightKg = b.weightKg))
                        n
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Save") }
        }
    }
}

fun coachTips(st: AppState, date: String): List<String> {
    val p = st.profile
    val foods = st.foods.filter { it.date == date }
    val tips = mutableListOf<String>()
    val protein = foods.sumOf { it.totalProtein }
    val proteinLeft = p.proteinTarget() - protein.roundToInt()
    val eaten = foods.sumOf { it.totalKcal }.roundToInt()
    val burned = st.workouts.filter { it.date == date }.sumOf { it.kcal }
    val left = p.calorieTarget() - eaten + burned
    val h = st.habitsFor(date)

    if (foods.isEmpty()) tips += "Nothing logged yet — log as you eat, it's way more accurate than at night."
    if (proteinLeft > 10) {
        tips += "${proteinLeft}g protein to go. Easy wins: whey scoop (24g), 100g chicken breast (31g), " +
            "100g paneer (18g), 50g soya chunks (26g), 3 egg whites (11g)."
    } else if (foods.isNotEmpty()) {
        tips += "Protein target hit 💪"
    }
    if (left < -150) tips += "You're ${-left} kcal over. A 30-min brisk walk burns roughly 150 kcal."
    if (h.water < p.waterTarget) tips += "${p.waterTarget - h.water} more glasses of water today."
    val missed = p.supplements.filter { it !in h.supps }
    if (missed.isNotEmpty()) tips += "Still to take: ${missed.joinToString(", ")}."
    val sleep = st.body[date]?.sleepHrs
    if (sleep != null && sleep < 7) {
        tips += "Only ${sleep.fmt()}h sleep — aim for 7–8h, recovery is where muscle is built."
    }
    if (st.workouts.none { it.date == date } && date == today()) tips += "No workout logged today yet."
    if (tips.isEmpty()) tips += "All on track today. Keep going!"
    return tips
}

// ======================= FOOD =======================

@Composable
fun FoodScreen(st: AppState, date: String, repo: Repo) {
    var addingMeal by remember { mutableStateOf<String?>(null) }
    val p = st.profile
    val foods = st.foods.filter { it.date == date }
    val yesterday = LocalDate.parse(date).minusDays(1).toString()

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            ) {
                Row(Modifier.fillMaxWidth().padding(16.dp)) {
                    Stat("${foods.sumOf { it.totalKcal }.roundToInt()}", "of ${p.calorieTarget()} kcal", Modifier.weight(1.3f))
                    Stat("${foods.sumOf { it.totalProtein }.roundToInt()}g", "Protein", Modifier.weight(1f), ProteinColor)
                    Stat("${foods.sumOf { it.totalCarbs }.roundToInt()}g", "Carbs", Modifier.weight(1f), CarbColor)
                    Stat("${foods.sumOf { it.totalFat }.roundToInt()}g", "Fat", Modifier.weight(1f), FatColor)
                }
            }
        }
        MEALS.forEach { (meal, emoji) ->
            item(key = meal) {
                val items = foods.filter { it.meal == meal }
                val prev = st.foods.filter { it.date == yesterday && it.meal == meal }
                SectionCard("$emoji $meal", trailing = {
                    Text("${items.sumOf { it.totalKcal }.roundToInt()} kcal", style = MaterialTheme.typography.labelLarge)
                }) {
                    items.forEach { e ->
                        Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(e.name, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(
                                    "${e.servings.fmt()} × ${e.unit} · P ${e.totalProtein.roundToInt()}g · C ${e.totalCarbs.roundToInt()}g · F ${e.totalFat.roundToInt()}g",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                            Text("${e.totalKcal.roundToInt()}", fontWeight = FontWeight.Bold)
                            TextButton(onClick = {
                                repo.update { s -> s.copy(foods = s.foods.filterNot { it.id == e.id }) }
                            }) { Text("✕") }
                        }
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedButton(onClick = { addingMeal = meal }) { Text("+ Add food") }
                        if (items.isEmpty() && prev.isNotEmpty()) {
                            TextButton(onClick = {
                                repo.update { s -> s.copy(foods = s.foods + prev.map { it.copy(id = newId() + it.id % 997, date = date) }) }
                            }) { Text("Repeat yesterday") }
                        }
                    }
                }
            }
        }
    }

    addingMeal?.let { meal ->
        AddFoodDialog(
            st = st,
            meal = meal,
            onDismiss = { addingMeal = null },
            onAdd = { item, servings, isCustom ->
                repo.update { s ->
                    val e = FoodEntry(
                        newId(), date, meal, item.name, item.unit, servings,
                        item.kcal, item.protein, item.carbs, item.fat,
                    )
                    s.copy(
                        foods = s.foods + e,
                        customFoods = if (isCustom) s.customFoods.filterNot { it.name == item.name } + item else s.customFoods,
                    )
                }
                addingMeal = null
            },
        )
    }
}

@Composable
fun AddFoodDialog(
    st: AppState,
    meal: String,
    onDismiss: () -> Unit,
    onAdd: (FoodItem, Double, Boolean) -> Unit,
) {
    var query by remember { mutableStateOf("") }
    var selected by remember { mutableStateOf<FoodItem?>(null) }
    var servings by remember { mutableStateOf("1") }
    var custom by remember { mutableStateOf(false) }

    val all = remember(st.customFoods) { st.customFoods + FOOD_DB }
    val recentNames = remember(st.foods) { st.foods.asReversed().map { it.name }.distinct().take(8) }

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            shape = RoundedCornerShape(24.dp),
            color = MaterialTheme.colorScheme.surfaceContainerLow,
            modifier = Modifier.fillMaxWidth().heightIn(max = 620.dp),
        ) {
            Column(Modifier.padding(16.dp)) {
                Text("Add to $meal", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(12.dp))
                val sel = selected
                when {
                    custom -> CustomFoodForm(onCancel = { custom = false }) { item -> onAdd(item, 1.0, true) }

                    sel != null -> {
                        val sv = servings.toDoubleOrNull() ?: 0.0
                        Text(sel.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                        Text(
                            "Per ${sel.unit}: ${sel.kcal.roundToInt()} kcal · P ${sel.protein.fmt()}g · C ${sel.carbs.fmt()}g · F ${sel.fat.fmt()}g",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        Spacer(Modifier.height(16.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            OutlinedButton(onClick = { servings = (sv - 0.5).coerceAtLeast(0.5).fmt() }) { Text("−") }
                            NumField("Servings", servings, { servings = it }, Modifier.weight(1f).padding(horizontal = 8.dp))
                            OutlinedButton(onClick = { servings = (sv + 0.5).fmt() }) { Text("+") }
                        }
                        Spacer(Modifier.height(12.dp))
                        Text(
                            "${(sel.kcal * sv).roundToInt()} kcal · ${(sel.protein * sv).roundToInt()}g protein",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.primary,
                            fontWeight = FontWeight.Bold,
                        )
                        Spacer(Modifier.height(16.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { selected = null }, Modifier.weight(1f)) { Text("Back") }
                            Button(
                                onClick = { onAdd(sel, sv, false) },
                                enabled = sv > 0,
                                modifier = Modifier.weight(1f),
                            ) { Text("Add") }
                        }
                    }

                    else -> {
                        OutlinedTextField(
                            value = query, onValueChange = { query = it },
                            placeholder = { Text("Search idli, chicken, paneer…") },
                            singleLine = true, modifier = Modifier.fillMaxWidth(),
                        )
                        Spacer(Modifier.height(8.dp))
                        val list = if (query.isBlank()) {
                            val recent = recentNames.mapNotNull { n -> all.firstOrNull { it.name == n } }
                            recent + all.filterNot { it in recent }
                        } else {
                            all.filter { it.name.contains(query.trim(), ignoreCase = true) }
                        }
                        LazyColumn(Modifier.weight(1f, fill = false)) {
                            items(list) { f ->
                                Row(
                                    Modifier
                                        .fillMaxWidth()
                                        .clickable { selected = f; servings = "1" }
                                        .padding(vertical = 10.dp, horizontal = 4.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Column(Modifier.weight(1f)) {
                                        Text(f.name, fontWeight = FontWeight.Medium)
                                        Text(
                                            "${f.unit} · P ${f.protein.fmt()}g",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                                        )
                                    }
                                    Text("${f.kcal.roundToInt()} kcal", style = MaterialTheme.typography.labelLarge)
                                }
                                HorizontalDivider()
                            }
                        }
                        Spacer(Modifier.height(8.dp))
                        Row {
                            TextButton(onClick = { custom = true }) { Text("+ Custom food") }
                            Spacer(Modifier.weight(1f))
                            TextButton(onClick = onDismiss) { Text("Close") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun CustomFoodForm(onCancel: () -> Unit, onSave: (FoodItem) -> Unit) {
    var name by remember { mutableStateOf("") }
    var unit by remember { mutableStateOf("1 serving") }
    var kcal by remember { mutableStateOf("") }
    var pr by remember { mutableStateOf("") }
    var cb by remember { mutableStateOf("") }
    var ft by remember { mutableStateOf("") }
    Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        OutlinedTextField(name, { name = it }, label = { Text("Food name") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(unit, { unit = it }, label = { Text("Serving (e.g. 1 bowl)") }, singleLine = true, modifier = Modifier.fillMaxWidth())
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            NumField("kcal", kcal, { kcal = it }, Modifier.weight(1f))
            NumField("Protein g", pr, { pr = it }, Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            NumField("Carbs g", cb, { cb = it }, Modifier.weight(1f))
            NumField("Fat g", ft, { ft = it }, Modifier.weight(1f))
        }
        Text(
            "Saved to your food list for next time.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedButton(onClick = onCancel, modifier = Modifier.weight(1f)) { Text("Back") }
            Button(
                onClick = {
                    onSave(
                        FoodItem(
                            name.trim(), unit.trim().ifEmpty { "1 serving" }, kcal.toDoubleOrNull() ?: 0.0,
                            pr.toDoubleOrNull() ?: 0.0, cb.toDoubleOrNull() ?: 0.0, ft.toDoubleOrNull() ?: 0.0,
                        ),
                    )
                },
                enabled = name.isNotBlank() && kcal.toDoubleOrNull() != null,
                modifier = Modifier.weight(1f),
            ) { Text("Add") }
        }
    }
}

// ======================= WORKOUT =======================

@Composable
fun WorkoutScreen(st: AppState, date: String, repo: Repo) {
    var adding by remember { mutableStateOf(false) }
    val list = st.workouts.filter { it.date == date }
    val volume = list.filter { !it.cardio }.sumOf { it.sets * it.reps * it.weightKg }
    val prs = remember(st.workouts) {
        st.workouts.filter { !it.cardio && it.weightKg > 0 }
            .groupBy { it.exercise.lowercase() }
            .mapValues { (_, v) -> v.maxOf { it.weightKg } }
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondaryContainer),
            ) {
                Row(Modifier.fillMaxWidth().padding(16.dp)) {
                    Stat("${list.sumOf { it.kcal }}", "kcal burned", Modifier.weight(1f))
                    Stat("${volume.roundToInt()}", "kg volume", Modifier.weight(1f))
                    Stat("${list.size}", "exercises", Modifier.weight(1f))
                }
            }
        }
        item {
            Button(
                onClick = { adding = true },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(16.dp),
            ) { Text("+ Log exercise", fontSize = 16.sp) }
        }
        if (list.isEmpty()) {
            item {
                Text(
                    "No exercises logged for this day.",
                    modifier = Modifier.fillMaxWidth().padding(24.dp),
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        items(list, key = { it.id }) { w ->
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
            ) {
                Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(if (w.cardio) "🏃" else "🏋️", fontSize = 26.sp)
                    Spacer(Modifier.width(12.dp))
                    Column(Modifier.weight(1f)) {
                        Text(w.exercise, fontWeight = FontWeight.SemiBold)
                        val detail = if (w.cardio) {
                            "${w.minutes} min"
                        } else {
                            "${w.sets} × ${w.reps}" + if (w.weightKg > 0) " @ ${w.weightKg.fmt()} kg" else ""
                        }
                        Text(
                            "$detail · ${w.kcal} kcal",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        val pr = prs[w.exercise.lowercase()]
                        if (!w.cardio && pr != null && w.weightKg > 0 && w.weightKg >= pr) {
                            Text("🏆 Personal best", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.secondary)
                        } else if (!w.cardio && pr != null) {
                            Text("Best: ${pr.fmt()} kg", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                    TextButton(onClick = { repo.update { s -> s.copy(workouts = s.workouts.filterNot { it.id == w.id }) } }) {
                        Text("✕")
                    }
                }
            }
        }
    }

    if (adding) {
        AddWorkoutDialog(st, onDismiss = { adding = false }) { entry ->
            repo.update { s -> s.copy(workouts = s.workouts + entry.copy(date = date)) }
            adding = false
        }
    }
}

@Composable
fun AddWorkoutDialog(st: AppState, onDismiss: () -> Unit, onAdd: (WorkoutEntry) -> Unit) {
    var cardio by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var sets by remember { mutableStateOf("3") }
    var reps by remember { mutableStateOf("10") }
    var kg by remember { mutableStateOf("") }
    var minutes by remember { mutableStateOf("30") }

    val past = remember(st.workouts) { st.workouts.asReversed().map { it.exercise }.distinct() }
    val suggestions = (past.filter { p ->
        if (cardio) CARDIO_EXERCISES.any { it.equals(p, true) } else CARDIO_EXERCISES.none { it.equals(p, true) }
    } + if (cardio) CARDIO_EXERCISES else STRENGTH_EXERCISES).distinctBy { it.lowercase() }

    val bodyKg = st.profile.weightKg
    val s = sets.toIntOrNull() ?: 0
    val r = reps.toIntOrNull() ?: 0
    val m = if (cardio) (minutes.toIntOrNull() ?: 0) else s * 3
    val kcal = (metFor(name, cardio) * bodyKg * m / 60.0).roundToInt()

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Log exercise") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                ChipRow(listOf(false to "Strength", true to "Cardio"), cardio) { cardio = it; name = "" }
                OutlinedTextField(
                    name, { name = it }, label = { Text("Exercise") }, singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                )
                Row(
                    Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    suggestions.filter { query -> name.isBlank() || query.contains(name, true) }.take(12).forEach { sug ->
                        AssistChip(onClick = { name = sug }, label = { Text(sug) })
                    }
                }
                if (cardio) {
                    NumField("Minutes", minutes, { minutes = it }, Modifier.fillMaxWidth())
                } else {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        NumField("Sets", sets, { sets = it }, Modifier.weight(1f))
                        NumField("Reps", reps, { reps = it }, Modifier.weight(1f))
                        NumField("kg", kg, { kg = it }, Modifier.weight(1f))
                    }
                }
                Text("≈ $kcal kcal burned", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.SemiBold)
            }
        },
        confirmButton = {
            Button(
                enabled = name.isNotBlank() && (if (cardio) m > 0 else s > 0 && r > 0),
                onClick = {
                    onAdd(
                        WorkoutEntry(
                            id = newId(), date = "", exercise = name.trim(), cardio = cardio,
                            sets = if (cardio) 0 else s, reps = if (cardio) 0 else r,
                            weightKg = if (cardio) 0.0 else (kg.toDoubleOrNull() ?: 0.0),
                            minutes = m, kcal = kcal,
                        ),
                    )
                },
            ) { Text("Add") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

// ======================= PROGRESS =======================

@Composable
fun ProgressScreen(st: AppState) {
    val p = st.profile
    val weights = st.body.values.filter { it.weightKg != null }.sortedBy { it.date }.takeLast(30)
    val now = LocalDate.now()
    val days = (6 downTo 0).map { now.minusDays(it.toLong()) }
    val labels = days.map { it.dayOfWeek.name.take(1) }
    val kcalByDay = days.map { d -> st.foods.filter { it.date == d.toString() }.sumOf { it.totalKcal } }
    val proteinByDay = days.map { d -> st.foods.filter { it.date == d.toString() }.sumOf { it.totalProtein } }
    val loggedDates = st.foods.map { it.date }.toSet()
    var streak = 0
    var d = now
    if (d.toString() !in loggedDates) d = d.minusDays(1)
    while (d.toString() in loggedDates) { streak++; d = d.minusDays(1) }
    val workoutsThisWeek = st.workouts.filter { it.date >= days.first().toString() }.map { it.date }.distinct().size
    val bmi = p.bmi()
    val bmiLabel = when {
        bmi < 18.5 -> "Underweight"
        bmi < 23 -> "Healthy"   // Asian cut-offs
        bmi < 25 -> "Overweight"
        else -> "Obese"
    }

    LazyColumn(
        Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item { Text("Progress", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold) }
        item {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
            ) {
                Row(Modifier.fillMaxWidth().padding(16.dp)) {
                    Stat("🔥 $streak", "day streak", Modifier.weight(1f))
                    Stat("$workoutsThisWeek", "workout days (7d)", Modifier.weight(1f))
                    Stat(bmi.fmt(), "BMI · $bmiLabel", Modifier.weight(1f))
                }
            }
        }
        item {
            SectionCard("Weight", trailing = {
                Text("Goal ${p.goalWeightKg.fmt()} kg", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.secondary)
            }) {
                if (weights.size < 2) {
                    Text(
                        "Log your weight on the Home tab on a couple of days to see your trend.",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                } else {
                    val first = weights.first().weightKg!!
                    val last = weights.last().weightKg!!
                    val diff = last - first
                    Text(
                        "${last.fmt()} kg  (" + (if (diff >= 0) "+" else "") + "${diff.fmt()} kg since ${weights.first().date.substring(5)})",
                        fontWeight = FontWeight.SemiBold,
                    )
                    Spacer(Modifier.height(10.dp))
                    LineChart(
                        weights.map { it.weightKg!! },
                        MaterialTheme.colorScheme.primary,
                        Modifier.fillMaxWidth().height(160.dp),
                        goal = p.goalWeightKg,
                    )
                    val toGo = p.goalWeightKg - last
                    Spacer(Modifier.height(8.dp))
                    Text(
                        if (kotlin.math.abs(toGo) < 0.5) "You're at your goal weight 🎉"
                        else "${kotlin.math.abs(toGo).fmt()} kg to ${if (toGo < 0) "lose" else "gain"}",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
        }
        item {
            SectionCard("Calories · last 7 days") {
                BarChart(kcalByDay, labels, p.calorieTarget().toDouble(), MaterialTheme.colorScheme.primary, "kcal")
            }
        }
        item {
            SectionCard("Protein · last 7 days") {
                BarChart(proteinByDay, labels, p.proteinTarget().toDouble(), ProteinColor, "g")
            }
        }
    }
}

// ======================= PROFILE =======================

@Composable
fun ProfileScreen(st: AppState, repo: Repo) {
    val p = st.profile
    var confirmReset by remember { mutableStateOf(false) }
    var saved by remember { mutableStateOf(false) }

    Column(
        Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text("Your plan", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Card(
            shape = RoundedCornerShape(20.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
        ) {
            Column(Modifier.padding(16.dp)) {
                Row(Modifier.fillMaxWidth()) {
                    Stat("${p.calorieTarget()}", "kcal / day", Modifier.weight(1f))
                    Stat("${p.proteinTarget()}g", "protein", Modifier.weight(1f), ProteinColor)
                }
                Spacer(Modifier.height(12.dp))
                Row(Modifier.fillMaxWidth()) {
                    Stat("${p.carbTarget()}g", "carbs", Modifier.weight(1f), CarbColor)
                    Stat("${p.fatTarget()}g", "fat", Modifier.weight(1f), FatColor)
                }
                Spacer(Modifier.height(10.dp))
                Text(
                    "BMR ${p.bmr().roundToInt()} kcal · maintenance ${(p.bmr() * p.activity).roundToInt()} kcal",
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center,
                )
            }
        }

        SectionCard("Profile") {
            ProfileEditor(p, if (saved) "Saved ✓" else "Save") { np ->
                repo.update { it.copy(profile = np) }
                saved = true
            }
        }

        OutlinedButton(onClick = { confirmReset = true }, modifier = Modifier.fillMaxWidth()) {
            Text("Clear all logs", color = MaterialTheme.colorScheme.error)
        }
        Text(
            "Healthyfi v1.0 · all data stays on this phone",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.fillMaxWidth(),
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.height(8.dp))
    }

    if (confirmReset) {
        AlertDialog(
            onDismissRequest = { confirmReset = false },
            title = { Text("Clear all logs?") },
            text = { Text("Food, workouts, water and body logs will be deleted. Your profile and targets stay.") },
            confirmButton = {
                TextButton(onClick = {
                    repo.update { AppState(profile = it.profile) }
                    confirmReset = false
                }) { Text("Clear", color = MaterialTheme.colorScheme.error) }
            },
            dismissButton = { TextButton(onClick = { confirmReset = false }) { Text("Cancel") } },
        )
    }
}
