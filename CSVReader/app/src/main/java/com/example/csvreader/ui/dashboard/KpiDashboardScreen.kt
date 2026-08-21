package com.example.csvreader.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.csvreader.data.KpiHistoryRepository
import com.example.csvreader.data.KpiMetric
import com.example.csvreader.data.KpiSnapshot
import com.example.csvreader.data.MetricBreakdown
import com.example.csvreader.data.fetchedAtLabel
import java.util.Locale

private val Navy = Color(0xFF080D1D)
private val Indigo = Color(0xFF6E5BFF)
private val Cyan = Color(0xFF2BD9FE)
private val Success = Color(0xFF36E39A)
private val Warning = Color(0xFFFFB84D)

@Composable
fun KpiDashboardScreen(
    onOpenDeliveries: () -> Unit,
    modifier: Modifier = Modifier,
    dashboardViewModel: KpiDashboardViewModel = viewModel(),
) {
    val state by dashboardViewModel.state.collectAsStateWithLifecycle()
    val breakdown by dashboardViewModel.breakdown.collectAsStateWithLifecycle()
    var showHistoryPicker by remember { mutableStateOf(false) }

    Box(
        modifier =
            modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(listOf(Navy, Color(0xFF121B38), Color(0xFF09111F))),
                ),
    ) {
        when (val current = state) {
            KpiDashboardState.Loading ->
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color = Cyan,
                )

            is KpiDashboardState.Error ->
                ErrorPanel(
                    message = current.message,
                    onRetry = { dashboardViewModel.refresh() },
                    modifier = Modifier.align(Alignment.Center).padding(24.dp),
                )

            is KpiDashboardState.Ready ->
                DashboardContent(
                    snapshot = current.snapshot,
                    refreshing = current.refreshing,
                    selectedDate = current.selectedDate,
                    availableDates = current.availableDates,
                    onRefresh = { dashboardViewModel.refresh() },
                    onSelectHistory = { showHistoryPicker = true },
                    onShowLive = dashboardViewModel::showLive,
                    onOpenDeliveries = onOpenDeliveries,
                    onOpenMetric = dashboardViewModel::openBreakdown,
                )
        }
    }

    val ready = state as? KpiDashboardState.Ready
    if (showHistoryPicker && ready != null) {
        HistoryDateDialog(
            dates = ready.availableDates,
            selectedDate = ready.selectedDate,
            onDismiss = { showHistoryPicker = false },
            onSelect = { date ->
                showHistoryPicker = false
                dashboardViewModel.selectDate(date)
            },
        )
    }

    if (breakdown !is BreakdownUiState.Hidden) {
        BreakdownDialog(
            state = breakdown,
            onDismiss = dashboardViewModel::dismissBreakdown,
        )
    }
}

@Composable
private fun DashboardContent(
    snapshot: KpiSnapshot,
    refreshing: Boolean,
    selectedDate: String?,
    availableDates: List<String>,
    onRefresh: () -> Unit,
    onSelectHistory: () -> Unit,
    onShowLive: () -> Unit,
    onOpenDeliveries: () -> Unit,
    onOpenMetric: (String) -> Unit,
) {
    Column(
        modifier =
            Modifier.fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 28.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column {
                Text(
                    text = "NILAI KPI",
                    color = Color.White,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 1.sp,
                )
                Text(
                    text = "${snapshot.zone}  •  ${snapshot.stationCode}",
                    color = Color.White.copy(alpha = 0.62f),
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            Surface(
                shape = RoundedCornerShape(50),
                color = (if (selectedDate == null) Success else Warning).copy(alpha = 0.16f),
            ) {
                Text(
                    text = if (selectedDate == null) "● LIVE" else "◷ HISTORY",
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                    color = if (selectedDate == null) Success else Warning,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                )
            }
        }

        HeroCard(snapshot)

        if (selectedDate != null) {
            Surface(
                modifier = Modifier.fillMaxWidth(),
                color = Warning.copy(alpha = 0.12f),
                shape = RoundedCornerShape(16.dp),
            ) {
                Text(
                    text =
                        "Viewing saved performance for ${
                            KpiHistoryRepository.formatDisplayDate(selectedDate)
                        }",
                    modifier = Modifier.padding(14.dp),
                    color = Warning,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }

        Text(
            text = "DAILY PERFORMANCE",
            color = Color.White.copy(alpha = 0.54f),
            style = MaterialTheme.typography.labelMedium,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.2.sp,
        )

        snapshot.metrics.forEachIndexed { index, metric ->
            MetricCard(
                metric = metric,
                accent = listOf(Cyan, Indigo, Success)[index % 3],
                onClick = { onOpenMetric(metric.name) },
            )
        }

        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Color.White.copy(alpha = 0.06f),
            shape = RoundedCornerShape(18.dp),
        ) {
            Column(Modifier.padding(16.dp)) {
                Text(
                    "Daily history enabled",
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    "The latest refresh is saved by date and retained for two years. The 10 PM alert captures the end-of-day result.",
                    color = Color.White.copy(alpha = 0.58f),
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            OutlinedButton(
                onClick = onSelectHistory,
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
            ) {
                Text("History (${availableDates.size})")
            }
            OutlinedButton(
                onClick = onOpenDeliveries,
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
            ) {
                Text("Deliveries")
            }
        }

        Button(
            onClick = if (selectedDate == null) onRefresh else onShowLive,
            enabled = !refreshing,
            modifier = Modifier.fillMaxWidth(),
            colors = ButtonDefaults.buttonColors(containerColor = Indigo),
        ) {
            Text(
                when {
                    selectedDate != null -> "Back to live"
                    refreshing -> "Refreshing…"
                    else -> "Refresh & record today"
                },
            )
        }

        Text(
            text =
                "Sheet updated ${snapshot.sourceUpdatedAt.ifBlank { "—" }}  •  ${
                    if (selectedDate == null) "Fetched" else "Recorded"
                } ${snapshot.fetchedAtLabel()}",
            color = Color.White.copy(alpha = 0.42f),
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.align(Alignment.CenterHorizontally),
        )
        Spacer(Modifier.height(12.dp))
    }
}

@Composable
private fun HeroCard(snapshot: KpiSnapshot) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color.White.copy(alpha = 0.09f),
        shape = RoundedCornerShape(26.dp),
        shadowElevation = 10.dp,
    ) {
        Column(Modifier.padding(22.dp)) {
            Text(
                text = "STATION ${snapshot.stationName.uppercase(Locale.getDefault())}",
                color = Cyan,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
            )
            Spacer(Modifier.height(10.dp))
            Text(
                text = snapshot.metrics.maxOfOrNull { it.total }.orEmptyNumber(),
                color = Color.White,
                fontSize = 44.sp,
                fontWeight = FontWeight.Black,
            )
            Text(
                text = "daily attempts in the latest sheet",
                color = Color.White.copy(alpha = 0.58f),
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

@Composable
private fun MetricCard(metric: KpiMetric, accent: Color, onClick: () -> Unit) {
    val current = metric.currentPercent ?: 0.0
    val targetReached = current >= metric.targetPercent

    Surface(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        color = Color.White.copy(alpha = 0.08f),
        shape = RoundedCornerShape(22.dp),
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column {
                    Text(metric.name, color = Color.White, fontWeight = FontWeight.Bold)
                    Text(
                        "Target ${metric.targetPercent.asPercent()}  •  tap leftover parcels",
                        color = Color.White.copy(alpha = 0.5f),
                        style = MaterialTheme.typography.labelSmall,
                    )
                }
                Text(
                    text = metric.currentPercent?.asPercent() ?: "No data",
                    color = if (targetReached) Success else accent,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                )
            }
            LinearProgressIndicator(
                progress = { (current / metric.targetPercent).coerceIn(0.0, 1.0).toFloat() },
                modifier = Modifier.fillMaxWidth().height(8.dp),
                color = if (targetReached) Success else accent,
                trackColor = Color.White.copy(alpha = 0.10f),
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                Text(
                    "${metric.total} attempts",
                    color = Color.White.copy(alpha = 0.55f),
                    style = MaterialTheme.typography.bodySmall,
                )
                Text(
                    if (targetReached) "Target reached" else "${metric.leftToTarget} left to target",
                    color = if (targetReached) Success else Warning,
                    style = MaterialTheme.typography.bodySmall,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

@Composable
private fun HistoryDateDialog(
    dates: List<String>,
    selectedDate: String?,
    onDismiss: () -> Unit,
    onSelect: (String) -> Unit,
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("Performance history") },
        text = {
            if (dates.isEmpty()) {
                Text("No saved dates yet. Refresh the dashboard to record today.")
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxWidth().heightIn(max = 420.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    items(dates, key = { it }) { date ->
                        TextButton(
                            onClick = { onSelect(date) },
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                text =
                                    "${KpiHistoryRepository.formatDisplayDate(date)}${
                                        if (date == selectedDate) "  •  Selected" else ""
                                    }",
                                modifier = Modifier.fillMaxWidth(),
                                fontWeight =
                                    if (date == selectedDate) FontWeight.Bold
                                    else FontWeight.Normal,
                            )
                        }
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } },
    )
}

@Composable
private fun BreakdownDialog(state: BreakdownUiState, onDismiss: () -> Unit) {
    val title =
        when (state) {
            is BreakdownUiState.Ready -> state.detail.title
            is BreakdownUiState.Loading -> "${state.metricName} leftover"
            is BreakdownUiState.Failed -> "${state.metricName} leftover"
            BreakdownUiState.Hidden -> "Leftover parcels"
        }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(title) },
        text = {
            when (state) {
                BreakdownUiState.Hidden -> Unit
                is BreakdownUiState.Loading ->
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(vertical = 12.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        CircularProgressIndicator(color = Indigo)
                        Spacer(Modifier.height(12.dp))
                        Text("Loading leftover parcels…")
                    }
                is BreakdownUiState.Failed -> Text(state.message)
                is BreakdownUiState.Ready -> BreakdownDetail(state.detail)
            }
        },
        confirmButton = { TextButton(onClick = onDismiss) { Text("Close") } },
    )
}

@Composable
private fun BreakdownDetail(detail: MetricBreakdown) {
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            text =
                "${detail.totalPending} leftover parcels${
                    if (detail.sourceUpdatedAt.isNotBlank()) "  •  ${detail.sourceUpdatedAt}" else ""
                }",
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.SemiBold,
        )
        if (detail.statuses.isEmpty()) {
            Text("No leftover status rows were published for this metric.")
        } else {
            detail.statuses.forEach { item ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(item.status, modifier = Modifier.weight(1f))
                    Text(item.count.toString(), fontWeight = FontWeight.Bold)
                }
            }
        }
        Text(detail.note, style = MaterialTheme.typography.bodySmall)
    }
}

@Composable
private fun ErrorPanel(message: String, onRetry: () -> Unit, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        color = Color.White.copy(alpha = 0.09f),
        shape = RoundedCornerShape(24.dp),
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text("Dashboard unavailable", color = Color.White, fontWeight = FontWeight.Bold)
            Spacer(Modifier.size(8.dp))
            Text(
                message,
                color = Color.White.copy(alpha = 0.6f),
                style = MaterialTheme.typography.bodySmall,
            )
            Spacer(Modifier.size(16.dp))
            Button(onClick = onRetry, colors = ButtonDefaults.buttonColors(containerColor = Indigo)) {
                Text("Try again")
            }
        }
    }
}

private fun Double.asPercent(): String =
    if (this % 1.0 == 0.0) "${toInt()}%"
    else String.format(Locale.getDefault(), "%.2f%%", this)

private fun Int?.orEmptyNumber(): String = this?.toString() ?: "0"
