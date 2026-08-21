package com.example.csvreader.ui.dashboard

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.csvreader.data.KpiHistoryRepository
import com.example.csvreader.data.KpiRepository
import com.example.csvreader.data.KpiSnapshot
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface KpiDashboardState {
    data object Loading : KpiDashboardState

    data class Ready(
        val snapshot: KpiSnapshot,
        val refreshing: Boolean = false,
        val selectedDate: String? = null,
        val availableDates: List<String> = emptyList(),
    ) : KpiDashboardState

    data class Error(val message: String) : KpiDashboardState
}

class KpiDashboardViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = KpiRepository()
    private val historyRepository = KpiHistoryRepository(application)
    private val _state = MutableStateFlow<KpiDashboardState>(KpiDashboardState.Loading)
    val state: StateFlow<KpiDashboardState> = _state.asStateFlow()
    private var latestLiveSnapshot: KpiSnapshot? = null

    init {
        refresh()
        viewModelScope.launch {
            while (true) {
                delay(60 * 60 * 1_000L)
                val current = _state.value as? KpiDashboardState.Ready
                refresh(returnToLive = current?.selectedDate == null)
            }
        }
    }

    fun refresh(returnToLive: Boolean = true) {
        if (returnToLive && _state.value is KpiDashboardState.Ready) {
            _state.value = (_state.value as KpiDashboardState.Ready).copy(refreshing = true)
        }

        viewModelScope.launch {
            runCatching { repository.fetchStationKpis() }
                .onSuccess { snapshot ->
                    latestLiveSnapshot = snapshot
                    historyRepository.saveLatest(snapshot)
                    val dates = historyRepository.availableDates()
                    val current = _state.value as? KpiDashboardState.Ready
                    _state.value =
                        if (returnToLive || current == null) {
                            KpiDashboardState.Ready(snapshot = snapshot, availableDates = dates)
                        } else {
                            current.copy(availableDates = dates)
                        }
                }
                .onFailure { throwable ->
                    val current = _state.value
                    _state.value =
                        if (current is KpiDashboardState.Ready) {
                            current.copy(refreshing = false)
                        } else {
                            KpiDashboardState.Error(
                                throwable.message ?: "Unable to load the KPI sheet",
                            )
                        }
                }
        }
    }

    fun selectDate(recordedDate: String) {
        viewModelScope.launch {
            val historical = historyRepository.snapshotForDate(recordedDate) ?: return@launch
            val current = _state.value as? KpiDashboardState.Ready ?: return@launch
            _state.value =
                current.copy(
                    snapshot = historical.snapshot,
                    refreshing = false,
                    selectedDate = historical.recordedDate,
                )
        }
    }

    fun showLive() {
        val current = _state.value as? KpiDashboardState.Ready ?: return
        val live = latestLiveSnapshot
        if (live == null) {
            refresh()
        } else {
            _state.value = current.copy(snapshot = live, selectedDate = null, refreshing = false)
        }
    }
}
