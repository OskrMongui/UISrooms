package com.example.uisroomsmobile.data

import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.Call

interface ApiService {
    @GET("api/espacios/")
    fun getSpaces(): Call<List<Space>>

    @GET("api/espacios-disponibilidad/")
    fun getAvailabilities(): Call<List<Availability>>

    companion object {
        // Change this URL as needed for your environment
        private const val BASE_URL = "http://10.0.2.2:8000/" // For Android emulator, or use your server IP

        fun create(): ApiService {
            val retrofit = Retrofit.Builder()
                .baseUrl(BASE_URL)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            return retrofit.create(ApiService::class.java)
        }
    }
}
