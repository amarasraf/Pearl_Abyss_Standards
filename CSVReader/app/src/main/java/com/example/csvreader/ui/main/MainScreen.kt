package com.example.csvreader.ui.main

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation3.runtime.NavKey
import java.io.BufferedReader
import java.io.InputStreamReader

data class Customer(val id: String, val tracking: String, val address: String, val phone: String)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainScreen(
    onItemClick: (NavKey) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var customers by remember { mutableStateOf<List<Customer>>(emptyList()) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri: Uri? ->
        if (uri != null) {
            try {
                val inputStream = context.contentResolver.openInputStream(uri)
                val reader = BufferedReader(InputStreamReader(inputStream!!))
                val newCustomers = mutableListOf<Customer>()
                var idCounter = 0
                reader.useLines { lines ->
                    lines.drop(1).forEach { line -> 
                        val parts = line.split(",")
                        if (parts.size >= 2) {
                            // Basic parsing: Try to find tracking ID (NVSG)
                            val tracking = parts.find { it.contains("NV", ignoreCase = true) } ?: "TRK_$idCounter"
                            val address = parts[0]
                            val phone = parts[1]
                            newCustomers.add(Customer(id = idCounter.toString(), tracking = tracking, address = address, phone = phone))
                            idCounter++
                        }
                    }
                }
                customers = newCustomers
                errorMessage = null
            } catch (e: Exception) {
                errorMessage = "Error reading CSV: ${e.message}"
                Log.e("Sleipnir", "Error", e)
            }
        }
    }

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Sleipnir", fontWeight = FontWeight.Bold) },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { launcher.launch("*/*") },
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ) {
                Text("+", style = MaterialTheme.typography.titleLarge)
            }
        }
    ) { paddingValues ->
        Box(
            modifier = modifier
                .fillMaxSize()
                .padding(paddingValues)
                .background(
                    Brush.verticalGradient(
                        colors = listOf(
                            MaterialTheme.colorScheme.background,
                            MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)
                        )
                    )
                )
        ) {
            if (errorMessage != null) {
                Card(
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                    modifier = Modifier.padding(16.dp).fillMaxWidth()
                ) {
                    Text(errorMessage!!, color = MaterialTheme.colorScheme.onErrorContainer, modifier = Modifier.padding(16.dp))
                }
            }

            if (customers.isEmpty() && errorMessage == null) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        "📍",
                        style = MaterialTheme.typography.displayLarge,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )
                    Text(
                        "No deliveries loaded.",
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                    )
                    Text(
                        "Tap the + button to import your route.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                    )
                }
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                itemsIndexed(items = customers, key = { _, customer -> customer.id }) { index, customer ->
                    Card(
                        modifier = Modifier.fillMaxWidth().clickable {
                            // 1. Save Target Lock to SharedPreferences
                            val prefs = context.getSharedPreferences("SleipnirPrefs", Context.MODE_PRIVATE)
                            prefs.edit().putString("locked_tracking", customer.tracking).apply()
                            
                            // 2. Copy Tracking Number to Clipboard
                            val clipboardManager = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                            val clipData = ClipData.newPlainText("Tracking Number", customer.tracking)
                            clipboardManager.setPrimaryClip(clipData)
                            
                            Toast.makeText(context, "Tracking Copied: ${customer.tracking}", Toast.LENGTH_SHORT).show()

                            // 3. Open Ninja App
                            val ninjaIntent = context.packageManager.getLaunchIntentForPackage("co.ninjavan.swiftninja_global")
                            if (ninjaIntent != null) {
                                ninjaIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                                context.startActivity(ninjaIntent)
                            } else {
                                Toast.makeText(context, "Ninja App not found!", Toast.LENGTH_SHORT).show()
                            }
                        },
                        shape = RoundedCornerShape(16.dp),
                        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
                        colors = CardDefaults.cardColors(
                            containerColor = MaterialTheme.colorScheme.surface,
                        )
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(40.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(MaterialTheme.colorScheme.primaryContainer),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "${index + 1}",
                                    style = MaterialTheme.typography.titleMedium,
                                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            
                            Spacer(modifier = Modifier.width(16.dp))
                            
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = customer.address,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = "ID: ${customer.tracking}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.primary
                                )
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Text(
                                        text = "📞 ",
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                    Text(
                                        text = customer.phone,
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }
                            
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                IconButton(
                                    onClick = {
                                        if (index > 0) {
                                            val newList = customers.toMutableList()
                                            val temp = newList[index - 1]
                                            newList[index - 1] = newList[index]
                                            newList[index] = temp
                                            customers = newList
                                        }
                                    },
                                    enabled = index > 0
                                ) {
                                    Text("⬆", style = MaterialTheme.typography.titleLarge)
                                }
                                IconButton(
                                    onClick = {
                                        if (index < customers.size - 1) {
                                            val newList = customers.toMutableList()
                                            val temp = newList[index + 1]
                                            newList[index + 1] = newList[index]
                                            newList[index] = temp
                                            customers = newList
                                        }
                                    },
                                    enabled = index < customers.size - 1
                                ) {
                                    Text("⬇", style = MaterialTheme.typography.titleLarge)
                                }
                            }
                        }
                    }
                }
                
                item {
                    Spacer(modifier = Modifier.height(80.dp))
                }
            }
        }
    }
}
