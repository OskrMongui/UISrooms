package com.example.uisroomsmobile.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.example.uisroomsmobile.data.ApiService
import com.example.uisroomsmobile.data.Availability
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class ScheduleViewModel : ViewModel() {
    private val _availabilities = MutableLiveData<List<Availability>>()
    val availabilities: LiveData<List<Availability>> = _availabilities

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val apiService = ApiService.create()

    fun fetchAvailabilities() {
        _isLoading.value = true
        _error.value = null
        apiService.getAvailabilities().enqueue(object : Callback<List<Availability>> {
            override fun onResponse(call: Call<List<Availability>>, response: Response<List<Availability>>) {
                _isLoading.value = false
                if (response.isSuccessful) {
                    _availabilities.value = response.body()?.filter { it.espacio == spaceId } ?: emptyList()
                } else {
                    _error.value = "Error al cargar horarios: ${response.code()}"
                }
            }

            override fun onFailure(call: Call<List<Availability>>, t: Throwable) {
                _isLoading.value = false
                _error.value = "Error de red: ${t.message}"
            }
        })
    }

    private var spaceId: Int = 0

    fun setSpaceId(id: Int) {
        spaceId = id
        fetchAvailabilities()
    }
}
