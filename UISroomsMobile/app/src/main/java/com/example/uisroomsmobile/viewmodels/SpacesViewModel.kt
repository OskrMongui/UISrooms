package com.example.uisroomsmobile.viewmodels

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.example.uisroomsmobile.data.ApiService
import com.example.uisroomsmobile.data.Space
import retrofit2.Call
import retrofit2.Callback
import retrofit2.Response

class SpacesViewModel : ViewModel() {
    private val _spaces = MutableLiveData<List<Space>>()
    val spaces: LiveData<List<Space>> = _spaces

    private val _isLoading = MutableLiveData<Boolean>()
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val apiService = ApiService.create()

    init {
        fetchSpaces()
    }

    private fun fetchSpaces() {
        _isLoading.value = true
        _error.value = null
        apiService.getSpaces().enqueue(object : Callback<List<Space>> {
            override fun onResponse(call: Call<List<Space>>, response: Response<List<Space>>) {
                _isLoading.value = false
                if (response.isSuccessful) {
                    _spaces.value = response.body() ?: emptyList()
                } else {
                    _error.value = "Error al cargar espacios: ${response.code()}"
                }
            }

            override fun onFailure(call: Call<List<Space>>, t: Throwable) {
                _isLoading.value = false
                _error.value = "Error de red: ${t.message}"
            }
        })
    }
}
