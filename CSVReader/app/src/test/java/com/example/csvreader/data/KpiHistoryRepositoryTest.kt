package com.example.csvreader.data

import java.util.Calendar
import junit.framework.TestCase.assertEquals
import org.junit.Test

class KpiHistoryRepositoryTest {
    @Test
    fun retentionCutoff_keepsExactlyTwoCalendarYears() {
        val now =
            Calendar.getInstance().apply {
                clear()
                set(2026, Calendar.AUGUST, 21, 22, 0, 0)
            }

        assertEquals("2024-08-21", KpiHistoryRepository.retentionCutoff(now.timeInMillis))
    }
}
