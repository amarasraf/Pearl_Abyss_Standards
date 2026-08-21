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

    @Test
    fun parseRawData_extractsNilaiFifoAndPriorStatusCounts() {
        val csv =
            """
            "Data as FIFO D0 Left to Attempt ","19/08/2026 10:06:56 AM Left to Attempt COUNTA of tracking_id shp_dest_hub_name","granular_status Arrived at Sorting Hub","On Hold","Data Status On Vehicle for Delivery","Grand Total","SUCCESS","Successfully updated 14628 rows in Columns A-L. PRIOR D0 Left to Success ","Left to Success COUNTA of tracking_id shp_dest_hub_name","granular_status Arrived at Sorting Hub","En-route to Sorting Hub","On Hold","On Vehicle for Delivery","Pending Reschedule","Grand Total"
            "","C4-SBN-5-83","1418","","","1418","","","C4-SBN-5-83","1419","","","","","1419"
            "","C4-NIL-5-85","1055","","","1055","","","C4-NIL-5-85","1056","","","","","1056"
            """.trimIndent()

        val fifo = KpiCsvParser.parseRawData(csv, "C4-NIL-5-85", "FIFO D0")
        assertEquals("FIFO D0 left to attempt", fifo.title)
        assertEquals(1055, fifo.totalPending)
        assertEquals("Arrived at Sorting Hub", fifo.statuses.single().status)
        assertEquals(1055, fifo.statuses.single().count)
        assertEquals("19/08/2026 10:06:56 AM", fifo.sourceUpdatedAt)

        val prior = KpiCsvParser.parseRawData(csv, "C4-NIL-5-85", "PRIOR D0")
        assertEquals("PRIOR D0 left to success", prior.title)
        assertEquals(1056, prior.totalPending)
        assertEquals("Arrived at Sorting Hub", prior.statuses.single().status)
        assertEquals(1056, prior.statuses.single().count)
    }

    @Test
    fun parseRawData_readsLiveCancelledColumnLayout() {
        val csv =
            """
            "Data as FIFO D0 Left to Attempt ","21/08/2026 03:07:55 PM Left to Attempt COUNTA of tracking_id shp_dest_hub_name","granular_status Arrived at Sorting Hub","Cancelled","Data Status On Hold","On Vehicle for Delivery","SUCCESS Grand Total","Successfully updated 24723 rows in Columns A-L. PRIOR D0 Left to Success ","Left to Success COUNTA of tracking_id shp_dest_hub_name","granular_status Arrived at Sorting Hub","Cancelled","On Hold","On Vehicle for Delivery","Pending Reschedule","Grand Total"
            "1048","C1-LKN-13-67","408","","11","698","1117","0","C1-LKN-13-67","410","","11","699","10","1130"
            "682","C4-NIL-5-85","189","","","538","727","0","C4-NIL-5-85","189","","","538","3","730"
            """.trimIndent()

        val fifo = KpiCsvParser.parseRawData(csv, "C4-NIL-5-85", "FIFO D0")
        assertEquals(727, fifo.totalPending)
        assertEquals("Arrived at Sorting Hub", fifo.statuses[0].status)
        assertEquals(189, fifo.statuses[0].count)
        assertEquals("On Vehicle for Delivery", fifo.statuses[1].status)
        assertEquals(538, fifo.statuses[1].count)

        val prior = KpiCsvParser.parseRawData(csv, "C4-NIL-5-85", "PRIOR D0")
        assertEquals(730, prior.totalPending)
        assertEquals(189, prior.statuses[0].count)
        assertEquals(538, prior.statuses[1].count)
        assertEquals("Pending Reschedule", prior.statuses[2].status)
        assertEquals(3, prior.statuses[2].count)
    }

    @Test(expected = IllegalStateException::class)
    fun parse_rejectsMissingStation() {
        KpiCsvParser.parse(
            csv = "\"Header\",\"Code\"\n\"South 4\",\"C4-SBN-5-83\"",
            stationCode = "C4-NIL-5-85",
        )
    }
}
