package com.vrk.healthyfi

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val repo = Repo(applicationContext)
        setContent {
            HealthyfiTheme { App(repo) }
        }
    }
}

// ---------- Theme ----------

private val LightColors = lightColorScheme(
    primary = Color(0xFF16A34A),
    onPrimary = Color.White,
    primaryContainer = Color(0xFFDCFCE7),
    onPrimaryContainer = Color(0xFF14532D),
    secondary = Color(0xFFEA580C),
    secondaryContainer = Color(0xFFFFEDD5),
    onSecondaryContainer = Color(0xFF7C2D12),
    tertiary = Color(0xFF0284C7),
    background = Color(0xFFF3F7F4),
    surface = Color(0xFFF3F7F4),
    surfaceContainerLow = Color.White,
    surfaceContainer = Color(0xFFE8F0EA),
)

private val DarkColors = darkColorScheme(
    primary = Color(0xFF4ADE80),
    onPrimary = Color(0xFF052E16),
    primaryContainer = Color(0xFF14532D),
    onPrimaryContainer = Color(0xFFDCFCE7),
    secondary = Color(0xFFFB923C),
    secondaryContainer = Color(0xFF7C2D12),
    onSecondaryContainer = Color(0xFFFFEDD5),
    tertiary = Color(0xFF38BDF8),
    background = Color(0xFF0E1411),
    surface = Color(0xFF0E1411),
    surfaceContainerLow = Color(0xFF18211C),
    surfaceContainer = Color(0xFF1F2A24),
)

val ProteinColor = Color(0xFF8B5CF6)
val CarbColor = Color(0xFFF59E0B)
val FatColor = Color(0xFF0EA5E9)

@Composable
fun HealthyfiTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (isSystemInDarkTheme()) DarkColors else LightColors, content = content)
}

// ---------- App shell ----------

@Composable
fun App(repo: Repo) {
    val st by repo.state.collectAsState()

    if (!st.profile.onboarded) {
        Onboarding(st.profile) { p -> repo.update { it.copy(profile = p.copy(onboarded = true)) } }
        return
    }

    var tab by rememberSaveable { mutableIntStateOf(0) }
    var date by rememberSaveable { mutableStateOf(today()) }
    val tabs = listOf("🏠" to "Home", "🍛" to "Food", "🏋️" to "Workout", "📈" to "Progress", "👤" to "Me")

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surfaceContainerLow) {
                tabs.forEachIndexed { i, (icon, label) ->
                    NavigationBarItem(
                        selected = tab == i,
                        onClick = { tab = i },
                        icon = { Text(icon, fontSize = 20.sp) },
                        label = { Text(label) },
                    )
                }
            }
        },
    ) { pad ->
        Column(Modifier.fillMaxSize().padding(pad)) {
            if (tab <= 2) DateBar(date) { date = it }
            when (tab) {
                0 -> HomeScreen(st, date, repo)
                1 -> FoodScreen(st, date, repo)
                2 -> WorkoutScreen(st, date, repo)
                3 -> ProgressScreen(st)
                else -> ProfileScreen(st, repo)
            }
        }
    }
}

@Composable
fun Onboarding(profile: Profile, onDone: (Profile) -> Unit) {
    Column(
        Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .systemBarsPadding()
            .imePadding()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        Text(
            "Healthyfi",
            fontSize = 36.sp,
            fontWeight = FontWeight.Black,
            color = MaterialTheme.colorScheme.primary,
        )
        Text(
            "Tell me a bit about you — I'll work out your daily calories and protein.",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(20.dp))
        ProfileEditor(profile, "Let's go", onDone)
    }
}
