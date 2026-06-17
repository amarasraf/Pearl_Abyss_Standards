package com.example.csvreader

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.graphics.Bitmap
import android.os.Build
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.widget.Toast
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.storage.FirebaseStorage
import java.io.ByteArrayOutputStream
import java.util.concurrent.Executors

class SleipnirAccessibilityService : AccessibilityService() {

    private lateinit var firestore: FirebaseFirestore
    private lateinit var storage: FirebaseStorage

    override fun onServiceConnected() {
        super.onServiceConnected()
        try {
            firestore = FirebaseFirestore.getInstance()
            storage = FirebaseStorage.getInstance()
            Log.d("Sleipnir", "Firebase initialized in AccessibilityService")
        } catch (e: Exception) {
            Log.e("Sleipnir", "Failed to initialize Firebase: \${e.message}")
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType == AccessibilityEvent.TYPE_VIEW_CLICKED) {
            val text = event.text.joinToString(" ").lowercase()
            
            // Ninja App target texts:
            if (text.contains("success") || text.contains("confirm") || text.contains("submit") || text.contains("deliver")) {
                Log.d("Sleipnir", "Target button clicked! Triggering screenshot...")
                takeScreenshotAndUpload()
            }
        }
    }

    private fun takeScreenshotAndUpload() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val executor = Executors.newSingleThreadExecutor()
            takeScreenshot(
                android.view.Display.DEFAULT_DISPLAY,
                executor,
                object : AccessibilityService.TakeScreenshotCallback {
                    override fun onSuccess(screenshotResult: ScreenshotResult) {
                        Log.d("Sleipnir", "Screenshot captured successfully!")
                        processAndUploadScreenshot(screenshotResult)
                    }

                    override fun onFailure(errorCode: Int) {
                        Log.e("Sleipnir", "Failed to take screenshot, error code: \$errorCode")
                    }
                }
            )
        } else {
            // Fallback
            performGlobalAction(GLOBAL_ACTION_TAKE_SCREENSHOT)
            Toast.makeText(this, "Screenshot saved to gallery (Android 10 Fallback)", Toast.LENGTH_SHORT).show()
        }
    }

    private fun processAndUploadScreenshot(screenshotResult: AccessibilityService.ScreenshotResult) {
        try {
            val hwBuffer = screenshotResult.hardwareBuffer
            val colorSpace = screenshotResult.colorSpace
            
            val bitmap = Bitmap.wrapHardwareBuffer(hwBuffer, colorSpace)
            if (bitmap == null) {
                Log.e("Sleipnir", "Failed to convert hardware buffer to bitmap")
                return
            }

            val baos = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, 80, baos)
            val data = baos.toByteArray()

            // Get locked tracking ID
            val prefs = getSharedPreferences("SleipnirPrefs", Context.MODE_PRIVATE)
            val trackingId = prefs.getString("locked_tracking", "UNKNOWN") ?: "UNKNOWN"
            
            if (trackingId == "UNKNOWN") {
                Log.e("Sleipnir", "No Target Locked! Cannot upload without tracking ID.")
                return
            }

            Log.d("Sleipnir", "Uploading for tracking ID: \$trackingId")
            
            // Upload to Firebase Storage
            val storageRef = storage.reference.child("deliveries/\$trackingId.jpg")
            val uploadTask = storageRef.putBytes(data)

            uploadTask.addOnSuccessListener {
                storageRef.downloadUrl.addOnSuccessListener { uri ->
                    saveToFirestore(trackingId, uri.toString())
                }
            }.addOnFailureListener {
                Log.e("Sleipnir", "Failed to upload image to Storage", it)
            }
            
            // Important: close the hardware buffer
            hwBuffer.close()
        } catch (e: Exception) {
            Log.e("Sleipnir", "Error processing screenshot: \${e.message}")
        }
    }

    private fun saveToFirestore(trackingId: String, imageUrl: String) {
        // Note: For full automation, we would get Location here via FusedLocationProviderClient.
        // For now, we save the image URL and the timestamp.
        val data = hashMapOf(
            "imageUrl" to imageUrl,
            "timestamp" to System.currentTimeMillis()
        )

        firestore.collection("deliveries").document(trackingId)
            .set(data)
            .addOnSuccessListener {
                Log.d("Sleipnir", "Successfully saved delivery data for \$trackingId")
                Toast.makeText(this, "Saved to Sleipnir Database!", Toast.LENGTH_SHORT).show()
            }
            .addOnFailureListener { e ->
                Log.e("Sleipnir", "Error writing document", e)
            }
    }

    override fun onInterrupt() {
        Log.d("Sleipnir", "Accessibility Service interrupted")
    }
}
