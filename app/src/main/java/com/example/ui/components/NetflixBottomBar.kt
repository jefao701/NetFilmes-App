package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.ui.theme.NetflixBlack
import com.example.ui.theme.NetflixLightGray
import com.example.ui.theme.NetflixRed
import com.example.ui.theme.NetflixWhite

sealed class NavTab(val id: String, val title: String, val icon: androidx.compose.ui.graphics.vector.ImageVector) {
    object Home : NavTab("home", "Início", Icons.Default.Home)
    object Search : NavTab("search", "Buscar", Icons.Default.Search)
    object Playlist : NavTab("playlist", "Minha Lista", Icons.Default.Bookmark)
    object Account : NavTab("account", "Configurações", Icons.Default.Settings)
}

val ALL_TABS = listOf(
    NavTab.Home,
    NavTab.Search,
    NavTab.Playlist,
    NavTab.Account
)

@Composable
fun NetflixBottomBar(
    currentTab: String,
    onTabSelected: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    NavigationBar(
        modifier = modifier
            .fillMaxWidth()
            .background(NetflixBlack)
            .navigationBarsPadding(),
        containerColor = NetflixBlack,
        tonalElevation = 8.dp
    ) {
        ALL_TABS.forEach { tab ->
            val isSelected = currentTab == tab.id || (tab.id == "home" && (currentTab == "movies" || currentTab == "series"))
            NavigationBarItem(
                selected = isSelected,
                onClick = { onTabSelected(tab.id) },
                icon = {
                    Icon(
                        imageVector = tab.icon,
                        contentDescription = tab.title
                    )
                },
                label = {
                    Text(
                        text = tab.title,
                        fontSize = 11.sp,
                        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                        maxLines = 1
                    )
                },
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = NetflixRed,
                    selectedTextColor = NetflixWhite,
                    indicatorColor = Color.Transparent,
                    unselectedIconColor = NetflixLightGray,
                    unselectedTextColor = NetflixLightGray
                ),
                modifier = Modifier.testTag("nav_tab_${tab.id}")
            )
        }
    }
}
