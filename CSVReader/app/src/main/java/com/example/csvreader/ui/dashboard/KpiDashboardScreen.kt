package com.example.csvreader.ui.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.csvreader.data.KpiMetric
import com.example.csvreader.data.KpiSnapshot
import com.example.csvreader.data.fetchedAtLabel

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
                    onRetry = dashboardViewModel::refresh,
                    modifier = Modifier.align(Alignment.Center).padding(24.dp),
                )

            is KpiDashboardState.Ready ->
                DashboardContent(
                    snapshot = current.snapshot,
                    refreshing = current.refreshing,
                    onRefresh = dashboardViewModel::refresh,
                    onOpenDeliveries = onOpenDeliveries,
                )
        }
    }
}

@Composable
private fun DashboardContent(
    snapshot: KpiSnapshot,
    refreshing: Boolean,
    onRefresh: () -> Unit,
    onOpenDeliveries: () -> Unit,
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
                color = Success.copy(alpha = 0.16f),
            ) {
                Text(
                    text = "● LIVE",
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp),
                    color = Success,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.Bold,
                )
            }
        }

        HeroCard(snapshot)

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
            )
        }

        Surface(
            modifier = Modifier.fillMaxWidth(),
            color = Color.White.copy(alpha = 0.06f),
            shape = RoundedCornerShape(18.dp),
        ) {
            Column(Modifier.padding(16.dp)) {
                Text(
                    "Daily alert scheduled",
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    "A KPI summary is prepared every day at 10:00 PM (device time).",
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
                onClick = onOpenDeliveries,
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White),
            ) {
                Text("Deliveries")
            }
            Button(
                onClick = onRefresh,
                enabled = !refreshing,
                modifier = Modifier.weight(1f),
                colors = ButtonDefaults.buttonColors(containerColor = Indigo),
            ) {
                Text(if (refreshing) "Refreshing…" else "Refresh")
            }
        }

        Text(
            text = "Sheet updated ${snapshot.sourceUpdatedAt.ifBlank { "—" }}  •  Fetched ${snapshot.fetchedAtLabel()}",
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
                text = "STATION ${snapshot.stationName.uppercase()}",
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
private fun MetricCard(metric: KpiMetric, accent: Color) {
    val current = metric.currentPercent ?: 0.0
    val targetReached = current >= metric.targetPercent

    Surface(
        modifier = Modifier.fillMaxWidth(),
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
                        "Target ${metric.targetPercent.asPercent()}",
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
    if (this % 1.0 == 0.0) "${toInt()}%" else String.format("%.2f%%", this)

private fun Int?.orEmptyNumber(): String = this?.toString() ?: "0"
