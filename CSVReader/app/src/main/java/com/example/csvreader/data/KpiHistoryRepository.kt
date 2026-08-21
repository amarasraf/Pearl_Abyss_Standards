package com.example.csvreader.data

import android.content.ContentValues
import android.content.Context
import android.database.Cursor
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class DatedKpiSnapshot(
    val recordedDate: String,
    val snapshot: KpiSnapshot,
)

/**
 * Stores one snapshot per local calendar day. Repeated refreshes replace that day's record, so the
 * archive always contains the most recently fetched performance for each date.
 */
class KpiHistoryRepository(context: Context) {
    private val database = KpiHistoryDatabase(context.applicationContext)

    suspend fun saveLatest(snapshot: KpiSnapshot): String = withContext(Dispatchers.IO) {
        val recordedDate = formatStorageDate(snapshot.fetchedAtMillis)
        val values =
            ContentValues().apply {
                put(COL_DATE, recordedDate)
                put(COL_STATION_CODE, snapshot.stationCode)
                put(COL_STATION_NAME, snapshot.stationName)
                put(COL_ZONE, snapshot.zone)
                put(COL_SOURCE_UPDATED_AT, snapshot.sourceUpdatedAt)
                put(COL_FETCHED_AT, snapshot.fetchedAtMillis)
                snapshot.metrics.forEachIndexed { index, metric ->
                    put(metricColumn(index, "name"), metric.name)
                    put(metricColumn(index, "target"), metric.targetPercent)
                    if (metric.currentPercent == null) {
                        putNull(metricColumn(index, "current"))
                    } else {
                        put(metricColumn(index, "current"), metric.currentPercent)
                    }
                    put(metricColumn(index, "gap"), metric.leftToTarget)
                    put(metricColumn(index, "total"), metric.total)
                }
            }

        database.writableDatabase.beginTransaction()
        try {
            database.writableDatabase.insertWithOnConflict(
                TABLE_HISTORY,
                null,
                values,
                SQLiteDatabase.CONFLICT_REPLACE,
            )
            database.writableDatabase.delete(
                TABLE_HISTORY,
                "$COL_DATE < ?",
                arrayOf(retentionCutoff(snapshot.fetchedAtMillis)),
            )
            database.writableDatabase.setTransactionSuccessful()
        } finally {
            database.writableDatabase.endTransaction()
        }
        recordedDate
    }

    suspend fun availableDates(): List<String> = withContext(Dispatchers.IO) {
        database.readableDatabase
            .query(
                TABLE_HISTORY,
                arrayOf(COL_DATE),
                null,
                null,
                null,
                null,
                "$COL_DATE DESC",
            )
            .use { cursor ->
                buildList {
                    while (cursor.moveToNext()) add(cursor.getString(0))
                }
            }
    }

    suspend fun snapshotForDate(recordedDate: String): DatedKpiSnapshot? =
        withContext(Dispatchers.IO) {
            database.readableDatabase
                .query(
                    TABLE_HISTORY,
                    null,
                    "$COL_DATE = ?",
                    arrayOf(recordedDate),
                    null,
                    null,
                    null,
                    "1",
                )
                .use { cursor ->
                    if (!cursor.moveToFirst()) null
                    else DatedKpiSnapshot(recordedDate, cursor.toSnapshot())
                }
        }

    private fun Cursor.toSnapshot(): KpiSnapshot =
        KpiSnapshot(
            stationCode = text(COL_STATION_CODE),
            stationName = text(COL_STATION_NAME),
            zone = text(COL_ZONE),
            sourceUpdatedAt = text(COL_SOURCE_UPDATED_AT),
            fetchedAtMillis = long(COL_FETCHED_AT),
            metrics =
                (0 until METRIC_COUNT).map { index ->
                    val currentColumn = getColumnIndexOrThrow(metricColumn(index, "current"))
                    KpiMetric(
                        name = text(metricColumn(index, "name")),
                        targetPercent = double(metricColumn(index, "target")),
                        currentPercent =
                            if (isNull(currentColumn)) null else getDouble(currentColumn),
                        leftToTarget = integer(metricColumn(index, "gap")),
                        total = integer(metricColumn(index, "total")),
                    )
                },
        )

    private fun Cursor.text(column: String) = getString(getColumnIndexOrThrow(column))

    private fun Cursor.long(column: String) = getLong(getColumnIndexOrThrow(column))

    private fun Cursor.double(column: String) = getDouble(getColumnIndexOrThrow(column))

    private fun Cursor.integer(column: String) = getInt(getColumnIndexOrThrow(column))

    companion object {
        private const val TABLE_HISTORY = "daily_kpi_history"
        private const val COL_DATE = "recorded_date"
        private const val COL_STATION_CODE = "station_code"
        private const val COL_STATION_NAME = "station_name"
        private const val COL_ZONE = "zone"
        private const val COL_SOURCE_UPDATED_AT = "source_updated_at"
        private const val COL_FETCHED_AT = "fetched_at"
        private const val METRIC_COUNT = 3

        private fun metricColumn(index: Int, field: String) = "metric_${index}_$field"

        fun retentionCutoff(nowMillis: Long): String {
            val calendar = Calendar.getInstance().apply {
                timeInMillis = nowMillis
                add(Calendar.YEAR, -2)
            }
            return formatStorageDate(calendar.timeInMillis)
        }

        fun formatDisplayDate(storageDate: String): String =
            runCatching {
                    val parsed =
                        SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).parse(storageDate)
                            ?: return storageDate
                    SimpleDateFormat("dd MMM yyyy", Locale.getDefault()).format(parsed)
                }
                .getOrDefault(storageDate)

        private fun formatStorageDate(timeMillis: Long): String =
            SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).format(Date(timeMillis))

        private fun createTableSql(): String {
            val metricColumns =
                (0 until METRIC_COUNT).joinToString(",") { index ->
                    """
                    ${metricColumn(index, "name")} TEXT NOT NULL,
                    ${metricColumn(index, "target")} REAL NOT NULL,
                    ${metricColumn(index, "current")} REAL,
                    ${metricColumn(index, "gap")} INTEGER NOT NULL,
                    ${metricColumn(index, "total")} INTEGER NOT NULL
                    """.trimIndent()
                }
            return """
                CREATE TABLE $TABLE_HISTORY (
                    $COL_DATE TEXT PRIMARY KEY NOT NULL,
                    $COL_STATION_CODE TEXT NOT NULL,
                    $COL_STATION_NAME TEXT NOT NULL,
                    $COL_ZONE TEXT NOT NULL,
                    $COL_SOURCE_UPDATED_AT TEXT NOT NULL,
                    $COL_FETCHED_AT INTEGER NOT NULL,
                    $metricColumns
                )
                """.trimIndent()
        }
    }

    private class KpiHistoryDatabase(context: Context) :
        SQLiteOpenHelper(context, "nilai-kpi-history.db", null, 1) {
        override fun onCreate(database: SQLiteDatabase) {
            database.execSQL(createTableSql())
        }

        override fun onUpgrade(database: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
            // Schema version 1 has no migrations.
        }
    }
}
