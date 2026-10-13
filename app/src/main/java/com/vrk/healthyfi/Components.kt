@file:OptIn(ExperimentalMaterial3Api::class)

package com.vrk.healthyfi

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import java.time.LocalDate
import java.time.format.DateTimeFormatter

@Composable
fun DateBar(date: String, onChange: (String) -> Unit) {
    val d = LocalDate.parse(date)
    val now = LocalDate.now()
    val label = when (d) {
        now -> "Today"
        now.minusDays(1) -> "Yesterday"
        else -> d.format(DateTimeFormatter.ofPattern("EEE, d MMM"))
    }
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        TextButton(onClick = { onChange(d.minusDays(1).toString()) }) { Text("‹", fontSize = 26.sp) }
        Text(
            label,
            modifier = Modifier.weight(1f),
            textAlign = TextAlign.Center,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
        )
        TextButton(onClick = { onChange(d.plusDays(1).toString()) }, enabled = d.isBefore(now)) {
            Text("›", fontSize = 26.sp)
        }
    }
}

@Composable
fun SectionCard(
    title: String,
    trailing: @Composable () -> Unit = {},
    content: @Composable ColumnScope.() -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainerLow),
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.weight(1f),
                )
                trailing()
            }
            Spacer(Modifier.height(10.dp))
            content()
        }
    }
}

@Composable
fun Ring(
    progress: Float,
    color: Color,
    track: Color,
    diameter: Dp,
    stroke: Dp,
    content: @Composable () -> Unit,
) {
    Box(Modifier.size(diameter), contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            val s = stroke.toPx()
            val tl = Offset(s / 2, s / 2)
            val arc = Size(size.width - s, size.height - s)
            drawArc(track, -90f, 360f, false, topLeft = tl, size = arc, style = Stroke(s, cap = StrokeCap.Round))
            drawArc(
                color, -90f, 360f * progress.coerceIn(0f, 1f), false,
                topLeft = tl, size = arc, style = Stroke(s, cap = StrokeCap.Round),
            )
        }
        content()
    }
}

@Composable
fun MacroBar(label: String, value: Double, target: Int, color: Color, modifier: Modifier = Modifier) {
    Column(modifier) {
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(4.dp))
        LinearProgressIndicator(
            progress = { if (target > 0) (value / target).toFloat().coerceIn(0f, 1f) else 0f },
            modifier = Modifier.fillMaxWidth().height(8.dp),
            color = color,
            trackColor = color.copy(alpha = 0.18f),
            strokeCap = StrokeCap.Round,
        )
        Spacer(Modifier.height(4.dp))
        Text("${value.toInt()} / $target g", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun NumField(label: String, value: String, onChange: (String) -> Unit, modifier: Modifier = Modifier) {
    OutlinedTextField(
        value = value,
        onValueChange = { v -> onChange(v.filter { it.isDigit() || it == '.' }) },
        label = { Text(label) },
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
        modifier = modifier,
    )
}

@Composable
fun <T> ChipRow(options: List<Pair<T, String>>, selected: T, onSelect: (T) -> Unit) {
    Row(
        Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        options.forEach { (value, label) ->
            FilterChip(selected = value == selected, onClick = { onSelect(value) }, label = { Text(label) })
        }
    }
}

@Composable
fun Stat(value: String, label: String, modifier: Modifier = Modifier, color: Color = Color.Unspecified) {
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = color)
        Text(label, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
fun LineChart(values: List<Double>, color: Color, modifier: Modifier = Modifier, goal: Double? = null) {
    val grid = MaterialTheme.colorScheme.outlineVariant
    val goalColor = MaterialTheme.colorScheme.secondary
    Canvas(modifier) {
        if (values.size < 2) return@Canvas
        val all = if (goal != null) values + goal else values
        val min = all.min() - 1
        val max = all.max() + 1
        val range = (max - min).takeIf { it > 0 } ?: 1.0
        fun y(v: Double) = (size.height * (1 - (v - min) / range)).toFloat()
        fun x(i: Int) = size.width * i / (values.size - 1)

        for (k in 0..3) {
            val gy = size.height * k / 3
            drawLine(grid, Offset(0f, gy), Offset(size.width, gy), strokeWidth = 1f)
        }
        if (goal != null) {
            drawLine(
                goalColor, Offset(0f, y(goal)), Offset(size.width, y(goal)), strokeWidth = 3f,
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(12f, 10f)),
            )
        }
        val path = Path()
        values.forEachIndexed { i, v -> if (i == 0) path.moveTo(x(i), y(v)) else path.lineTo(x(i), y(v)) }
        drawPath(path, color, style = Stroke(width = 6f, cap = StrokeCap.Round))
        values.forEachIndexed { i, v -> drawCircle(color, radius = 7f, center = Offset(x(i), y(v))) }
    }
}

@Composable
fun BarChart(values: List<Double>, labels: List<String>, target: Double, color: Color, unit: String) {
    val track = color.copy(alpha = 0.15f)
    val over = MaterialTheme.colorScheme.secondary
    val targetColor = MaterialTheme.colorScheme.onSurfaceVariant
    val maxV = maxOf(values.maxOrNull() ?: 0.0, target) * 1.1
    Column {
        Canvas(Modifier.fillMaxWidth().height(130.dp)) {
            if (maxV <= 0) return@Canvas
            val slot = size.width / values.size
            val barW = slot * 0.55f
            values.forEachIndexed { i, v ->
                val left = i * slot + (slot - barW) / 2
                drawRoundRect(
                    track, topLeft = Offset(left, 0f), size = Size(barW, size.height),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(12f, 12f),
                )
                val h = (size.height * (v / maxV)).toFloat()
                if (h > 0) {
                    drawRoundRect(
                        if (v > target * 1.1) over else color,
                        topLeft = Offset(left, size.height - h), size = Size(barW, h),
                        cornerRadius = androidx.compose.ui.geometry.CornerRadius(12f, 12f),
                    )
                }
            }
            val ty = (size.height * (1 - target / maxV)).toFloat()
            drawLine(
                targetColor, Offset(0f, ty), Offset(size.width, ty), strokeWidth = 2f,
                pathEffect = PathEffect.dashPathEffect(floatArrayOf(10f, 8f)),
            )
        }
        Row(Modifier.fillMaxWidth().padding(top = 4.dp)) {
            labels.forEach {
                Text(
                    it, Modifier.weight(1f), textAlign = TextAlign.Center,
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Text(
            "Dashed line = target (${target.toInt()} $unit)",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}

@Composable
fun ProfileEditor(initial: Profile, buttonText: String, onSave: (Profile) -> Unit) {
    var name by remember(initial) { mutableStateOf(initial.name) }
    var age by remember(initial) { mutableStateOf(initial.age.toString()) }
    var male by remember(initial) { mutableStateOf(initial.male) }
    var height by remember(initial) { mutableStateOf(initial.heightCm.fmt()) }
    var weight by remember(initial) { mutableStateOf(initial.weightKg.fmt()) }
    var goalWeight by remember(initial) { mutableStateOf(initial.goalWeightKg.fmt()) }
    var activity by remember(initial) { mutableDoubleStateOf(initial.activity) }
    var goal by remember(initial) { mutableStateOf(initial.goal) }
    var water by remember(initial) { mutableStateOf(initial.waterTarget.toString()) }
    var steps by remember(initial) { mutableStateOf(initial.stepsTarget.toString()) }
    var supps by remember(initial) { mutableStateOf(initial.supplements.joinToString(", ")) }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        OutlinedTextField(
            value = name, onValueChange = { name = it }, label = { Text("Name") },
            singleLine = true, modifier = Modifier.fillMaxWidth(),
        )
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            NumField("Age", age, { age = it }, Modifier.weight(1f))
            NumField("Height (cm)", height, { height = it }, Modifier.weight(1f))
        }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            NumField("Weight (kg)", weight, { weight = it }, Modifier.weight(1f))
            NumField("Goal weight (kg)", goalWeight, { goalWeight = it }, Modifier.weight(1f))
        }
        Text("Sex", style = MaterialTheme.typography.labelLarge)
        ChipRow(listOf(true to "Male", false to "Female"), male) { male = it }
        Text("Activity level", style = MaterialTheme.typography.labelLarge)
        ChipRow(
            listOf(1.2 to "Desk job", 1.375 to "Light", 1.55 to "Moderate", 1.725 to "Very active"),
            activity,
        ) { activity = it }
        Text("Goal", style = MaterialTheme.typography.labelLarge)
        ChipRow(listOf("lose" to "Lose fat", "maintain" to "Maintain", "gain" to "Build muscle"), goal) { goal = it }
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            NumField("Water (glasses)", water, { water = it }, Modifier.weight(1f))
            NumField("Steps goal", steps, { steps = it }, Modifier.weight(1f))
        }
        OutlinedTextField(
            value = supps, onValueChange = { supps = it },
            label = { Text("Daily supplements (comma separated)") },
            modifier = Modifier.fillMaxWidth(),
        )
        Button(
            onClick = {
                onSave(
                    initial.copy(
                        name = name.trim(),
                        age = age.toIntOrNull() ?: initial.age,
                        male = male,
                        heightCm = height.toDoubleOrNull() ?: initial.heightCm,
                        weightKg = weight.toDoubleOrNull() ?: initial.weightKg,
                        goalWeightKg = goalWeight.toDoubleOrNull() ?: initial.goalWeightKg,
                        activity = activity,
                        goal = goal,
                        waterTarget = water.toIntOrNull()?.coerceIn(1, 20) ?: initial.waterTarget,
                        stepsTarget = steps.toIntOrNull() ?: initial.stepsTarget,
                        supplements = supps.split(",").map { it.trim() }.filter { it.isNotEmpty() },
                    ),
                )
            },
            modifier = Modifier.fillMaxWidth().height(52.dp),
            shape = RoundedCornerShape(16.dp),
        ) { Text(buttonText, fontSize = 16.sp) }
    }
}
