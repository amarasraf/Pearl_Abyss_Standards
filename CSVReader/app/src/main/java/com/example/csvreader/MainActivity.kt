package com.example.csvreader

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.content.ContextCompat
import com.example.csvreader.theme.CSVReaderTheme
import com.example.csvreader.work.DailyKpiAlertScheduler

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Render the dashboard before starting optional background integrations.
        enableEdgeToEdge()
        setContent {
            CSVReaderTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    MainNavigation()
                }
            }
        }

        window.decorView.post {
            runCatching { DailyKpiAlertScheduler.schedule(this) }
                .onFailure { Log.e("Sleipnir", "Unable to schedule KPI alert", it) }
            runCatching { UpdateManager(this).checkForUpdates() }
                .onFailure { Log.e("Sleipnir", "Unable to start update check", it) }

            if (
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                    ContextCompat.checkSelfPermission(
                        this,
                        Manifest.permission.POST_NOTIFICATIONS,
                    ) != PackageManager.PERMISSION_GRANTED
            ) {
                runCatching {
                        requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1_000)
                    }
                    .onFailure { Log.e("Sleipnir", "Unable to request notifications", it) }
            }
        }
    }
}
