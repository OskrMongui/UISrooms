package com.example.uisroomsmobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.example.uisroomsmobile.ui.theme.UISroomsMobileTheme
import com.example.uisroomsmobile.ui.screens.SpaceScheduleScreen
import com.example.uisroomsmobile.ui.screens.SpacesListScreen

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            UISroomsMobileTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation()
                }
            }
        }
    }
}

@Composable
fun AppNavigation() {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = "spaces_list") {
        composable("spaces_list") {
            SpacesListScreen(navController)
        }
        composable("space_schedule/{spaceId}") { backStackEntry ->
            val spaceId = backStackEntry.arguments?.getString("spaceId")?.toIntOrNull() ?: 0
            SpaceScheduleScreen(spaceId, navController)
        }
    }
}
