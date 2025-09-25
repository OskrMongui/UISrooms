package com.example.uisroomsmobile.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavController
import com.example.uisroomsmobile.data.Availability
import com.example.uisroomsmobile.viewmodels.ScheduleViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

@Composable
fun SpaceScheduleScreen(
    spaceId: Int,
    navController: NavController,
    viewModel: ScheduleViewModel = viewModel()
) {
    LaunchedEffect(spaceId) {
        viewModel.setSpaceId(spaceId)
    }

    val availabilities by viewModel.availabilities.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    val error by viewModel.error.collectAsStateWithLifecycle()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        TopAppBar(
            title = { Text("Horarios del Espacio") },
            navigationIcon = {
                IconButton(onClick = { navController.popBackStack() }) {
                    Icon(
                        imageVector = androidx.compose.material.icons.Icons.Default.ArrowBack,
                        contentDescription = "Volver"
                    )
                }
            }
        )

        when {
            isLoading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            error != null -> {
                Text(
                    text = error ?: "Error desconocido",
                    color = MaterialTheme.colorScheme.error,
                    modifier = Modifier.padding(16.dp)
                )
            }
            else -> {
                if (availabilities.isEmpty()) {
                    Text(
                        text = "No hay horarios disponibles para este espacio.",
                        modifier = Modifier.align(Alignment.CenterHorizontally),
                        style = MaterialTheme.typography.bodyLarge
                    )
                } else {
                    LazyColumn {
                        items(availabilities) { availability ->
                            AvailabilityItem(availability = availability)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AvailabilityItem(availability: Availability) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp)
        ) {
            Text(
                text = "De ${availability.hora_inicio} a ${availability.hora_fin}",
                style = MaterialTheme.typography.titleMedium
            )
            if (availability.dia_semana != null) {
                Text(
                    text = "Día: ${getDayOfWeek(availability.dia_semana)}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (availability.fecha_inicio != null && availability.fecha_fin != null) {
                Text(
                    text = "Fechas: ${availability.fecha_inicio} - ${availability.fecha_fin}",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            if (availability.recurrente) {
                Text(
                    text = "Recurrente",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }
            availability.observaciones?.let { obs ->
                Text(
                    text = "Observaciones: $obs",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

private fun getDayOfWeek(day: Int): String {
    return when (day) {
        1 -> "Lunes"
        2 -> "Martes"
        3 -> "Miércoles"
        4 -> "Jueves"
        5 -> "Viernes"
        6 -> "Sábado"
        7 -> "Domingo"
        else -> "Desconocido"
    }
}
