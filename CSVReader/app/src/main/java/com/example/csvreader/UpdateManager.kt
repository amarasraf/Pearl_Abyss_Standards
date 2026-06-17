package com.example.csvreader

import android.app.DownloadManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.util.Log
import androidx.core.content.FileProvider
import org.json.JSONObject
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import kotlin.concurrent.thread

class UpdateManager(private val context: Context) {

    // You will replace these with your actual GitHub repository details later
    private val versionUrl = "https://raw.githubusercontent.com/amarasraf/Pearl_Abyss_Standards/main/CSVReader/version.json"
    private val currentVersion = 1.0

    fun checkForUpdates() {
        thread {
            try {
                val url = URL(versionUrl)
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                connection.connectTimeout = 5000

                if (connection.responseCode == HttpURLConnection.HTTP_OK) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    val json = JSONObject(response)
                    val latestVersion = json.getDouble("version")
                    val apkUrl = json.getString("apk_url")

                    if (latestVersion > currentVersion) {
                        Log.d("SleipnirUpdate", "New version found: \$latestVersion. Downloading...")
                        downloadApk(apkUrl)
                    } else {
                        Log.d("SleipnirUpdate", "App is up to date.")
                    }
                }
            } catch (e: Exception) {
                Log.e("SleipnirUpdate", "Failed to check for updates: \${e.message}")
            }
        }
    }

    private fun downloadApk(apkUrl: String) {
        val request = DownloadManager.Request(Uri.parse(apkUrl))
            .setTitle("Sleipnir Update")
            .setDescription("Downloading new version...")
            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, "sleipnir-update.apk")
            .setAllowedOverMetered(true)
            .setAllowedOverRoaming(true)

        val downloadManager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        val downloadId = downloadManager.enqueue(request)

        val onComplete = object : BroadcastReceiver() {
            override fun onReceive(ctxt: Context, intent: Intent) {
                val id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1)
                if (downloadId == id) {
                    installApk()
                    context.unregisterReceiver(this)
                }
            }
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(onComplete, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE), Context.RECEIVER_EXPORTED)
        } else {
            context.registerReceiver(onComplete, IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE))
        }
    }

    private fun installApk() {
        val file = File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "sleipnir-update.apk")
        if (!file.exists()) return

        val uri = FileProvider.getUriForFile(context, "\${context.packageName}.fileprovider", file)
        
        val installIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION
        }

        context.startActivity(installIntent)
    }
}
