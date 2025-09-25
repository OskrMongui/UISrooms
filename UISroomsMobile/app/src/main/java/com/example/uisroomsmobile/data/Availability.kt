package com.example.uisroomsmobile.data

data class Availability(
    val id: Int,
    val espacio: Int, // ID of the space
    val dia_semana: Int?, // 1-7 for Monday-Sunday
    val hora_inicio: String,
    val hora_fin: String,
    val fecha_inicio: String?,
    val fecha_fin: String?,
    val recurrente: Boolean,
    val observaciones: String?
)
