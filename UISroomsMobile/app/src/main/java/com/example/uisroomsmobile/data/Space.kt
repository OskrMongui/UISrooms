package com.example.uisroomsmobile.data

data class Space(
    val id: Int,
    val codigo: String,
    val nombre: String,
    val descripcion: String?,
    val tipo: String,
    val capacidad: Int,
    val ubicacion: String?,
    val recursos: String?,
    val activo: Boolean,
    val creado_en: String,
    val actualizado_en: String
)
