package com.example.csvreader.work

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.example.csvreader.MainActivity
import com.example.csvreader.R
import com.example.csvreader.data.KpiRepository
import java.time.Duration
import java.time.ZonedDateTime
import java.util.concurrent.TimeUnit

object DailyKpiAlertScheduler {
    private const val UNIQUE_WORK_PREFIX = "nilai-daily-kpi-alert"

    fun schedule(context: Context) {
        val now = ZonedDateTime.now()
        var nextRun = now.withHour(22).withMinute(0).withSecond(0).withNano(0)
        if (!nextRun.isAfter(now)) nextRun = nextRun.plusDays(1)

        val request =
            OneTimeWorkRequestBuilder<DailyKpiAlertWorker>()
                .setInitialDelay(Duration.between(now, nextRun).toMillis(), TimeUnit.MILLISECONDS)
                .build()

        WorkManager.getInstance(context)
            .enqueueUniqueWork(
                "$UNIQUE_WORK_PREFIX-${nextRun.toLocalDate()}",
                ExistingWorkPolicy.KEEP,
                request,
            )
    }
}

class DailyKpiAlertWorker(
    appContext: Context,
    workerParameters: WorkerParameters,
) : CoroutineWorker(appContext, workerParameters) {

    override suspend fun doWork(): Result {
        val result = runCatching { KpiRepository().fetchStationKpis() }
        showNotification(
            title = "Nilai KPI • 10 PM summary",
            message =
                result.fold(
                    onSuccess = { snapshot ->
                        snapshot.metrics.joinToString("  •  ") { metric ->
                            "${metric.name}: ${metric.currentPercent?.let { "%.2f%%".format(it) } ?: "N/A"}"
                        }
                    },
                    onFailure = { "KPI data is temporarily unavailable. Open the dashboard to retry." },
                ),
        )

        // A fresh one-time request keeps the target aligned with 10 PM after timezone changes.
        DailyKpiAlertScheduler.schedule(applicationContext)
        return Result.success()
    }

    private fun showNotification(title: String, message: String) {
        if (
            android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU &&
                ContextCompat.checkSelfPermission(
                    applicationContext,
                    Manifest.permission.POST_NOTIFICATIONS,
                ) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        val manager =
            applicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val channelId = "nilai_kpi_daily"
        manager.createNotificationChannel(
            NotificationChannel(
                channelId,
                "Daily KPI alerts",
                NotificationManager.IMPORTANCE_DEFAULT,
            ).apply { description = "Daily Nilai station KPI summary at 10 PM" },
        )

        val openDashboard =
            PendingIntent.getActivity(
                applicationContext,
                0,
                Intent(applicationContext, MainActivity::class.java),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
            )
        val notification =
            NotificationCompat.Builder(applicationContext, channelId)
                .setSmallIcon(R.drawable.ic_launcher_foreground)
                .setContentTitle(title)
                .setContentText(message)
                .setStyle(NotificationCompat.BigTextStyle().bigText(message))
                .setContentIntent(openDashboard)
                .setAutoCancel(true)
                .build()

        manager.notify(10_00, notification)
    }
}
