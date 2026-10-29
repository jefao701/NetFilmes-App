package com.example.ui.screens.account

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material.icons.filled.PowerSettingsNew
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material.icons.filled.SystemUpdate
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.VideoLibrary
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.api.SourcesRepository
import com.example.data.model.Addon
import com.example.data.repository.CloudSyncState
import com.example.data.repository.FirebaseCloudRepository
import com.example.data.repository.ProfileRepository
import com.example.data.update.AppUpdateManager
import com.example.data.update.UpdateStatus
import com.example.ui.theme.NetflixBlack
import com.example.ui.theme.NetflixDarkGray
import com.example.ui.theme.NetflixRed
import com.example.ui.theme.NetflixWhite
import com.example.ui.tv.tvFocusable
import kotlinx.coroutines.launch

@Composable
fun AccountScreen(
    onSwitchProfileClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()

    val currentUser by FirebaseCloudRepository.currentUserState.collectAsState()
    val syncState by FirebaseCloudRepository.syncState.collectAsState()
    val activeProfileId by ProfileRepository.activeProfileIdState.collectAsState()
    val profiles by ProfileRepository.profilesState.collectAsState()
    val addons by ProfileRepository.addonsState.collectAsState()
    val manualSources by ProfileRepository.manualSourcesState.collectAsState()

    val activeProfile = profiles.firstOrNull { it.id == activeProfileId }

    // Live Proxy health test state
    var proxyStatus by remember { mutableStateOf<Boolean?>(null) }
    var isTestingProxy by remember { mutableStateOf(false) }

    LaunchedEffect(Unit) {
        isTestingProxy = true
        proxyStatus = SourcesRepository.checkProxyHealth()
        isTestingProxy = false
    }

    // Login / Register state
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isRegisterMode by remember { mutableStateOf(false) }
    var authError by remember { mutableStateOf<String?>(null) }
    var isAuthenticating by remember { mutableStateOf(false) }

    // Add Addon Dialog state
    var showAddonDialog by remember { mutableStateOf(false) }
    var newAddonName by remember { mutableStateOf("") }
    var newAddonUrl by remember { mutableStateOf("") }

    // App Updates state
    val (versionName, versionCode) = remember { AppUpdateManager.getCurrentVersion(context) }
    var isCheckingUpdates by remember { mutableStateOf(false) }
    var updateStatusMessage by remember { mutableStateOf<String?>(null) }
    var showCustomUrlDialog by remember { mutableStateOf(false) }
    var customUrlInput by remember { mutableStateOf(AppUpdateManager.getUpdateUrl(context)) }

    // Quick sync sources state
    var isSyncingSourcesWithoutAuth by remember { mutableStateOf(false) }
    var syncSourcesMessage by remember { mutableStateOf<String?>(null) }

    val isTv = com.example.ui.tv.rememberIsTvMode()
    val safePadding = com.example.ui.tv.getTvSafePadding(isTv)

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(NetflixBlack)
            .statusBarsPadding()
            .padding(safePadding)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .widthIn(max = 860.dp)
                .align(Alignment.TopCenter)
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            Text(
                text = "Conta & Configurações",
                color = NetflixWhite,
                fontWeight = FontWeight.Bold,
                fontSize = if (isTv) 28.sp else 24.sp
            )

        Spacer(modifier = Modifier.height(16.dp))

        // Live connection badge with netfilmes.shardweb.app
        Card(
            colors = CardDefaults.cardColors(containerColor = NetflixDarkGray),
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(10.dp)
                        .clip(CircleShape)
                        .background(if (proxyStatus == true) Color(0xFF46D369) else Color(0xFFFF9800))
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Servidor Netfilmes Nuvem",
                        color = NetflixWhite,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp
                    )
                    Text(
                        text = "https://netfilmes.shardweb.app (login-3ebd2)",
                        color = Color.Gray,
                        fontSize = 11.sp
                    )
                }
                Text(
                    text = if (proxyStatus == true) "ONLINE" else "CONECTANDO",
                    color = if (proxyStatus == true) Color(0xFF46D369) else Color(0xFFFF9800),
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Active Profile Card
        Card(
            colors = CardDefaults.cardColors(containerColor = NetflixDarkGray),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(50.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(
                                try {
                                    Color(android.graphics.Color.parseColor(activeProfile?.color ?: "#E50914"))
                                } catch (_: Exception) {
                                    NetflixRed
                                }
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = activeProfile?.avatar ?: "🎬", fontSize = 24.sp)
                    }

                    Spacer(modifier = Modifier.width(14.dp))

                    Column {
                        Text(
                            text = activeProfile?.name ?: "Perfil Ativo",
                            color = NetflixWhite,
                            fontWeight = FontWeight.Bold,
                            fontSize = 17.sp
                        )
                        Text(
                            text = "Perfil em reprodução",
                            color = Color.Gray,
                            fontSize = 12.sp
                        )
                    }
                }

                OutlinedButton(
                    onClick = onSwitchProfileClick,
                    shape = RoundedCornerShape(6.dp),
                    modifier = Modifier.testTag("switch_profile_button")
                ) {
                    Text("Trocar", color = NetflixWhite, fontSize = 13.sp)
                }
            }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // App Updates Card (Mobile & TV)
        Card(
            colors = CardDefaults.cardColors(containerColor = NetflixDarkGray),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(44.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(NetflixRed.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.SystemUpdate,
                                contentDescription = null,
                                tint = NetflixRed,
                                modifier = Modifier.size(24.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(
                                text = "Atualizações Automáticas",
                                color = NetflixWhite,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                            Text(
                                text = "Versão instalada: v$versionName (Build $versionCode)",
                                color = Color.Gray,
                                fontSize = 12.sp
                            )
                        }
                    }

                    IconButton(
                        onClick = {
                            customUrlInput = AppUpdateManager.getUpdateUrl(context)
                            showCustomUrlDialog = true
                        },
                        modifier = Modifier.tvFocusable()
                    ) {
                        Icon(
                            imageVector = Icons.Default.Tune,
                            contentDescription = "Configurar URL de atualização",
                            tint = Color.LightGray
                        )
                    }
                }

                if (updateStatusMessage != null) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        text = updateStatusMessage ?: "",
                        color = if (updateStatusMessage?.contains("recente") == true) Color(0xFF46D369) else Color(0xFFFF9800),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Button(
                        onClick = {
                            isCheckingUpdates = true
                            updateStatusMessage = null
                            coroutineScope.launch {
                                val result = AppUpdateManager.checkForUpdates(context, isManualCheck = true)
                                isCheckingUpdates = false
                                if (result is UpdateStatus.UpToDate) {
                                    val (curName, curCode) = AppUpdateManager.getCurrentVersion(context)
                                    updateStatusMessage = "O Netfilmes já está na versão mais recente (v$curName - Build $curCode)!"
                                } else if (result is UpdateStatus.Error) {
                                    updateStatusMessage = result.message
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = NetflixRed),
                        shape = RoundedCornerShape(6.dp),
                        enabled = !isCheckingUpdates,
                        modifier = Modifier
                            .weight(1f)
                            .height(44.dp)
                            .tvFocusable()
                            .testTag("check_updates_button")
                    ) {
                        if (isCheckingUpdates) {
                            CircularProgressIndicator(color = NetflixWhite, modifier = Modifier.size(18.dp))
                        } else {
                            Icon(imageVector = Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Verificar Agora", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    OutlinedButton(
                        onClick = {
                            AppUpdateManager.triggerDemoUpdate(context)
                        },
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier
                            .height(44.dp)
                            .tvFocusable()
                            .testTag("test_update_button")
                    ) {
                        Icon(imageVector = Icons.Default.CloudDownload, contentDescription = null, tint = NetflixWhite, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Testar Updater", color = NetflixWhite, fontSize = 13.sp)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(24.dp))

        // Firebase Cloud Sync Section
        Text(
            text = "Sincronização na Nuvem (Firebase)",
            color = NetflixWhite,
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp
        )
        Text(
            text = "Conecte sua conta do site https://netfilmes.shardweb.app para sincronizar histórico, perfis, Minha Lista e fontes.",
            color = Color.LightGray,
            fontSize = 13.sp,
            modifier = Modifier.padding(top = 4.dp, bottom = 12.dp)
        )

        if (currentUser == null) {
            // Quick sources sync card (available without login)
            Card(
                colors = CardDefaults.cardColors(containerColor = NetflixDarkGray),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Sincronizar Fontes Oficiais",
                                color = NetflixWhite,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp
                            )
                            Text(
                                text = "Atualiza fontes oficiais do Netfilmes Nuvem imediatamente",
                                color = Color.Gray,
                                fontSize = 12.sp
                            )
                        }

                        Button(
                            onClick = {
                                isSyncingSourcesWithoutAuth = true
                                syncSourcesMessage = null
                                coroutineScope.launch {
                                    ProfileRepository.restoreDefaultAddons(context)
                                    val health = SourcesRepository.checkProxyHealth()
                                    proxyStatus = health
                                    isSyncingSourcesWithoutAuth = false
                                    syncSourcesMessage = if (health) "Fontes oficiais sincronizadas e ativas!" else "Fontes oficiais restauradas com sucesso!"
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = NetflixRed),
                            shape = RoundedCornerShape(6.dp),
                            enabled = !isSyncingSourcesWithoutAuth,
                            modifier = Modifier.tvFocusable()
                        ) {
                            if (isSyncingSourcesWithoutAuth) {
                                CircularProgressIndicator(color = NetflixWhite, modifier = Modifier.size(16.dp))
                            } else {
                                Icon(imageVector = Icons.Default.Sync, contentDescription = null, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Sincronizar", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    if (syncSourcesMessage != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = syncSourcesMessage ?: "",
                            color = Color(0xFF46D369),
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }
            }

            // Login / Register Form (Full Account Sync)
            Card(
                colors = CardDefaults.cardColors(containerColor = NetflixDarkGray),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text(
                        text = if (isRegisterMode) "Criar conta no Netfilmes" else "Entrar na sua conta",
                        color = NetflixWhite,
                        fontWeight = FontWeight.Bold,
                        fontSize = 16.sp
                    )

                    OutlinedTextField(
                        value = email,
                        onValueChange = {
                            email = it
                            authError = null
                        },
                        label = { Text("E-mail", color = Color.Gray) },
                        leadingIcon = { Icon(imageVector = Icons.Default.Mail, contentDescription = null, tint = Color.Gray) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = NetflixWhite,
                            unfocusedTextColor = NetflixWhite,
                            focusedBorderColor = NetflixRed,
                            unfocusedBorderColor = Color.DarkGray
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("auth_email_input")
                    )

                    OutlinedTextField(
                        value = password,
                        onValueChange = {
                            password = it
                            authError = null
                        },
                        label = { Text("Senha", color = Color.Gray) },
                        leadingIcon = { Icon(imageVector = Icons.Default.Lock, contentDescription = null, tint = Color.Gray) },
                        visualTransformation = PasswordVisualTransformation(),
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = NetflixWhite,
                            unfocusedTextColor = NetflixWhite,
                            focusedBorderColor = NetflixRed,
                            unfocusedBorderColor = Color.DarkGray
                        ),
                        modifier = Modifier
                            .fillMaxWidth()
                            .testTag("auth_password_input")
                    )

                    if (authError != null) {
                        Text(
                            text = authError ?: "",
                            color = NetflixRed,
                            fontSize = 13.sp
                        )
                    }

                    Button(
                        onClick = {
                            if (email.isBlank() || password.isBlank()) {
                                authError = "Preencha e-mail e senha."
                                return@Button
                            }
                            isAuthenticating = true
                            authError = null
                            coroutineScope.launch {
                                val result = if (isRegisterMode) {
                                    FirebaseCloudRepository.register(email, password)
                                } else {
                                    FirebaseCloudRepository.signIn(email, password)
                                }
                                isAuthenticating = false
                                if (result.isSuccess) {
                                    FirebaseCloudRepository.syncNow(context)
                                } else {
                                    authError = result.exceptionOrNull()?.message ?: "Erro na autenticação"
                                }
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = NetflixRed),
                        shape = RoundedCornerShape(6.dp),
                        enabled = !isAuthenticating,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(46.dp)
                            .testTag("auth_submit_button")
                    ) {
                        if (isAuthenticating) {
                            CircularProgressIndicator(color = NetflixWhite, modifier = Modifier.size(20.dp))
                        } else {
                            Text(
                                text = if (isRegisterMode) "Cadastrar" else "Entrar",
                                color = NetflixWhite,
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp
                            )
                        }
                    }

                    TextButton(
                        onClick = { isRegisterMode = !isRegisterMode },
                        modifier = Modifier.align(Alignment.CenterHorizontally)
                    ) {
                        Text(
                            text = if (isRegisterMode) "Já tem conta? Entrar" else "Não tem conta? Cadastre-se",
                            color = Color.LightGray,
                            fontSize = 13.sp
                        )
                    }
                }
            }
        } else {
            // Logged in card
            Card(
                colors = CardDefaults.cardColors(containerColor = NetflixDarkGray),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(text = "Conectado como", color = Color.Gray, fontSize = 12.sp)
                            Text(
                                text = currentUser?.email ?: "Usuário",
                                color = NetflixWhite,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp
                            )
                        }

                        IconButton(
                            onClick = { FirebaseCloudRepository.signOut() },
                            modifier = Modifier.testTag("sign_out_button")
                        ) {
                            Icon(imageVector = Icons.Default.PowerSettingsNew, contentDescription = "Sair", tint = NetflixRed)
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Sync status display
                    when (syncState) {
                        is CloudSyncState.Syncing -> {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                CircularProgressIndicator(color = NetflixRed, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text("Sincronizando dados com a nuvem...", color = Color.LightGray, fontSize = 13.sp)
                            }
                        }
                        is CloudSyncState.Success -> {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(imageVector = Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF46D369), modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text((syncState as CloudSyncState.Success).message, color = Color(0xFF46D369), fontSize = 13.sp)
                            }
                        }
                        is CloudSyncState.Error -> {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(imageVector = Icons.Default.ErrorOutline, contentDescription = null, tint = NetflixRed, modifier = Modifier.size(18.dp))
                                Spacer(modifier = Modifier.width(8.dp))
                                Text((syncState as CloudSyncState.Error).message, color = NetflixRed, fontSize = 13.sp)
                            }
                        }
                        else -> {
                            Text("Seus dados estão sincronizados com a nuvem.", color = Color.Gray, fontSize = 12.sp)
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Button(
                        onClick = {
                            coroutineScope.launch {
                                FirebaseCloudRepository.syncNow(context)
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = NetflixRed),
                        shape = RoundedCornerShape(6.dp),
                        enabled = syncState !is CloudSyncState.Syncing,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(44.dp)
                            .testTag("sync_now_button")
                    ) {
                        Icon(imageVector = Icons.Default.Sync, contentDescription = null, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Sincronizar agora", fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(28.dp))

        // Video Addons / Sources Management Section
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Fontes de Vídeo & Addons",
                    color = NetflixWhite,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
                Text(
                    text = "${addons.count { it.enabled }} ativas de ${addons.size} fontes cadastradas",
                    color = Color.LightGray,
                    fontSize = 12.sp
                )
            }

            IconButton(
                onClick = {
                    coroutineScope.launch {
                        isTestingProxy = true
                        proxyStatus = SourcesRepository.checkProxyHealth()
                        isTestingProxy = false
                    }
                }
            ) {
                if (isTestingProxy) {
                    CircularProgressIndicator(color = NetflixRed, modifier = Modifier.size(18.dp))
                } else {
                    Icon(imageVector = Icons.Default.Refresh, contentDescription = "Testar conexão", tint = NetflixWhite)
                }
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Quick action buttons: Adicionar Fonte e Restaurar Fontes Padrão
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Button(
                onClick = { showAddonDialog = true },
                colors = ButtonDefaults.buttonColors(containerColor = NetflixRed),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier
                    .weight(1f)
                    .height(44.dp)
                    .tvFocusable()
                    .testTag("add_addon_button")
            ) {
                Icon(imageVector = Icons.Default.Add, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Adicionar Fonte", fontWeight = FontWeight.Bold, fontSize = 13.sp)
            }

            OutlinedButton(
                onClick = {
                    coroutineScope.launch {
                        ProfileRepository.restoreDefaultAddons(context)
                        proxyStatus = SourcesRepository.checkProxyHealth()
                    }
                },
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier
                    .height(44.dp)
                    .tvFocusable()
                    .testTag("restore_addons_button")
            ) {
                Icon(imageVector = Icons.Default.Refresh, contentDescription = null, tint = NetflixWhite, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Restaurar Padrão", color = NetflixWhite, fontSize = 13.sp)
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        // Synced manual sources summary card
        if (manualSources.isNotEmpty()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = NetflixDarkGray),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 10.dp)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(imageVector = Icons.Default.VideoLibrary, contentDescription = null, tint = Color(0xFF46D369), modifier = Modifier.size(20.dp))
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "Fontes manuais sincronizadas: ${manualSources.size} títulos com links diretos do site",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
        }

        // List of all Addons (Synced from Firestore + Built-in)
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            addons.forEach { addon ->
                Card(
                    colors = CardDefaults.cardColors(containerColor = NetflixDarkGray),
                    shape = RoundedCornerShape(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = addon.name,
                                    color = NetflixWhite,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                if (addon.builtin) {
                                    Box(
                                        modifier = Modifier
                                            .background(Color(0xFF46D369).copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text(
                                            text = "OFICIAL",
                                            color = Color(0xFF46D369),
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                } else {
                                    Box(
                                        modifier = Modifier
                                            .background(Color(0xFF03A9F4).copy(alpha = 0.2f), RoundedCornerShape(4.dp))
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text(
                                            text = "CUSTOM",
                                            color = Color(0xFF03A9F4),
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                    }
                                }
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = if (addon.enabled) "• Ativa" else "• Desativada",
                                    color = if (addon.enabled) Color(0xFF46D369) else Color.Gray,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = addon.url,
                                color = Color.Gray,
                                fontSize = 11.sp,
                                maxLines = 1
                            )
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (!addon.builtin) {
                                IconButton(
                                    onClick = {
                                        coroutineScope.launch {
                                            ProfileRepository.removeAddon(context, addon.url)
                                        }
                                    }
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Delete,
                                        contentDescription = "Remover fonte",
                                        tint = NetflixRed,
                                        modifier = Modifier.size(20.dp)
                                    )
                                }
                            }

                            Switch(
                                checked = addon.enabled,
                                onCheckedChange = { isChecked ->
                                    coroutineScope.launch {
                                        ProfileRepository.toggleAddon(context, addon.url, isChecked)
                                    }
                                },
                                colors = SwitchDefaults.colors(
                                    checkedThumbColor = NetflixWhite,
                                    checkedTrackColor = NetflixRed
                                )
                            )
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(100.dp))
    }
}

    // Add Custom Addon Dialog
    if (showAddonDialog) {
        AlertDialog(
            onDismissRequest = { showAddonDialog = false },
            containerColor = NetflixDarkGray,
            title = {
                Text(
                    text = "Adicionar Fonte de Vídeo (Addon)",
                    color = NetflixWhite,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        text = "Cole o link do manifesto (formato Netfilmes ou Stremio manifest.json):",
                        color = Color.LightGray,
                        fontSize = 13.sp
                    )

                    OutlinedTextField(
                        value = newAddonName,
                        onValueChange = { newAddonName = it },
                        label = { Text("Nome da fonte", color = Color.Gray) },
                        placeholder = { Text("Ex.: Meu Acervo / Torrentio", color = Color.DarkGray) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = NetflixWhite,
                            unfocusedTextColor = NetflixWhite,
                            focusedBorderColor = NetflixRed,
                            unfocusedBorderColor = Color.Gray
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    OutlinedTextField(
                        value = newAddonUrl,
                        onValueChange = { newAddonUrl = it },
                        label = { Text("URL do Manifesto (.json)", color = Color.Gray) },
                        placeholder = { Text("https://exemplo.com/manifest.json", color = Color.DarkGray) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = NetflixWhite,
                            unfocusedTextColor = NetflixWhite,
                            focusedBorderColor = NetflixRed,
                            unfocusedBorderColor = Color.Gray
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val url = newAddonUrl.trim()
                        if (url.isNotEmpty()) {
                            val name = newAddonName.trim().ifBlank {
                                try {
                                    java.net.URI(url).host ?: "Addon"
                                } catch (_: Exception) {
                                    "Addon"
                                }
                            }
                            coroutineScope.launch {
                                ProfileRepository.addAddon(
                                    context = context,
                                    addon = Addon(url = url, name = name, enabled = true, kind = "auto")
                                )
                                showAddonDialog = false
                                newAddonName = ""
                                newAddonUrl = ""
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = NetflixRed)
                ) {
                    Text("Adicionar", color = NetflixWhite)
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddonDialog = false }) {
                    Text("Cancelar", color = Color.Gray)
                }
            }
        )
    }

    // Custom Update Manifest URL Dialog
    if (showCustomUrlDialog) {
        AlertDialog(
            onDismissRequest = { showCustomUrlDialog = false },
            containerColor = NetflixDarkGray,
            title = {
                Text(
                    text = "Servidor de Atualizações",
                    color = NetflixWhite,
                    fontWeight = FontWeight.Bold,
                    fontSize = 18.sp
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Informe a URL do arquivo version.json que o app deve consultar para detectar novos APKs (ex.: GitHub Releases, Firebase ou seu servidor):",
                        color = Color.LightGray,
                        fontSize = 13.sp
                    )

                    OutlinedTextField(
                        value = customUrlInput,
                        onValueChange = { customUrlInput = it },
                        label = { Text("URL do version.json", color = Color.Gray) },
                        placeholder = { Text(AppUpdateManager.DEFAULT_UPDATE_URL, color = Color.DarkGray) },
                        singleLine = true,
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = NetflixWhite,
                            unfocusedTextColor = NetflixWhite,
                            focusedBorderColor = NetflixRed,
                            unfocusedBorderColor = Color.Gray
                        ),
                        modifier = Modifier.fillMaxWidth()
                    )

                    TextButton(
                        onClick = {
                            customUrlInput = AppUpdateManager.DEFAULT_UPDATE_URL
                        }
                    ) {
                        Text("Restaurar URL padrão", color = NetflixRed, fontSize = 12.sp)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val trimmed = customUrlInput.trim()
                        if (trimmed.isNotEmpty()) {
                            AppUpdateManager.setUpdateUrl(context, trimmed)
                        }
                        showCustomUrlDialog = false
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = NetflixRed)
                ) {
                    Text("Salvar", color = NetflixWhite)
                }
            },
            dismissButton = {
                TextButton(onClick = { showCustomUrlDialog = false }) {
                    Text("Cancelar", color = Color.Gray)
                }
            }
        )
    }
}

