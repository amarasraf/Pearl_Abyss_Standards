package com.example.csvreader.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.csvreader.data.KpiRepository
import com.example.csvreader.data.KpiSnapshot
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

sealed interface KpiDashboardState {
    data object Loading : KpiDashboardState

    data class Ready(val snapshot: KpiSnapshot, val refreshing: Boolean = false) :
        KpiDashboardState

    data class Error(val message: String) : KpiDashboardState
}

class KpiDashboardViewModel : ViewModel() {
    private val repository = KpiRepository()
    private val _state = MutableStateFlow<KpiDashboardState>(KpiDashboardState.Loading)
    val state: StateFlow<KpiDashboardState> = _state.asStateFlow()

    init {
        refresh()
        viewModelScope.launch {
            while (true) {
                delay(60 * 60 * 1_000L)
                refresh()
            }
        }
    }

    fun refresh() {
        if (_state.value is KpiDashboardState.Ready) {
            _state.value = (_state.value as KpiDashboardState.Ready).copy(refreshing = true)
        }

        viewModelScope.launch {
            runCatching { repository.fetchStationKpis() }
                .onSuccess { _state.value = KpiDashboardState.Ready(it) }
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
}
