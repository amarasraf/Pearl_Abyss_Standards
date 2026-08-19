package com.example.csvreader.data

import junit.framework.TestCase.assertEquals
import junit.framework.TestCase.assertNull
import org.junit.Test

class KpiCsvParserTest {
    @Test
    fun parse_extractsNilaiMetricsFromMultilineSheetCsv() {
        val csv =
            """
            "Data as Daily Performance Zone","19/08/2026 10:06:56 AM GROUP (LH)","STATION
            NAME (Full)","STATION
            NAME","FIFO","Current %","Left","OVFD","AASH","PRIOR","Current %","Left","OVFD","AASH","COMPLETION","Current %","Left","AASH","OVFD"
            "South 4","C4-NIL-5-85","Station Nilai","Nilai","1064","0.85%","1002","0","1055","0","","0","0","212","1064","0.00%","936","1064","0"
            """.trimIndent()

        val snapshot = KpiCsvParser.parse(csv, "C4-NIL-5-85")

        assertEquals("Nilai", snapshot.stationName)
        assertEquals("South 4", snapshot.zone)
        assertEquals("19/08/2026 10:06:56 AM", snapshot.sourceUpdatedAt)
        assertEquals(3, snapshot.metrics.size)
        assertEquals(0.85, snapshot.metrics[0].currentPercent)
        assertEquals(1002, snapshot.metrics[0].leftToTarget)
        assertNull(snapshot.metrics[1].currentPercent)
        assertEquals(936, snapshot.metrics[2].leftToTarget)
    }

    @Test(expected = IllegalStateException::class)
    fun parse_rejectsMissingStation() {
        KpiCsvParser.parse(
            csv = "\"Header\",\"Code\"\n\"South 4\",\"C4-SBN-5-83\"",
            stationCode = "C4-NIL-5-85",
        )
    }
}
