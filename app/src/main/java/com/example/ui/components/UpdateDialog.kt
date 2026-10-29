package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.SystemUpdate
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.DialogProperties
import com.example.data.update.AppUpdateManager
import com.example.data.update.UpdateInfo
import com.example.data.update.UpdateStatus
import com.example.ui.theme.NetflixDarkGray
import com.example.ui.theme.NetflixRed
import com.example.ui.theme.NetflixWhite
import com.example.ui.tv.rememberIsTvMode
import com.example.ui.tv.tvFocusable
import kotlinx.coroutines.launch

@Composable
fun UpdateDialog(
    status: UpdateStatus,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val isTv = rememberIsTvMode()

    when (status) {
        is UpdateStatus.Available -> {
            val info = status.info
            AlertDialog(
                onDismissRequest = {
                    if (!info.forceUpdate) onDismiss()
                },
                properties = DialogProperties(
                    dismissOnBackPress = !info.forceUpdate,
                    dismissOnClickOutside = !info.forceUpdate
                ),
                containerColor = NetflixDarkGray,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.widthIn(max = if (isTv) 560.dp else 420.dp),
                icon = {
                    Box(
                        modifier = Modifier
                            .size(54.dp)
                            .clip(CircleShape)
                            .background(NetflixRed.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.SystemUpdate,
                            contentDescription = null,
                            tint = NetflixRed,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                },
                title = {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = "Nova Atualização Disponível!",
                            color = NetflixWhite,
                            fontWeight = FontWeight.Bold,
                            fontSize = if (isTv) 22.sp else 18.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "Versão ${info.versionName} (Atual: ${info.currentVersionName})",
                            color = Color.LightGray,
                            fontSize = 13.sp
                        )
                    }
                },
                text = {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState())
                    ) {
                        Text(
                            text = "O que há de novo:",
                            color = NetflixWhite,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFF1E1E1E), RoundedCornerShape(8.dp))
                                .padding(12.dp)
                        ) {
                            Text(
                                text = info.changelog,
                                color = Color.LightGray,
                                fontSize = 13.sp,
                                lineHeight = 18.sp
                            )
                        }
                    }
                },
                confirmButton = {
                    Button(
                        onClick = {
                            coroutineScope.launch {
                                AppUpdateManager.downloadUpdate(context, info)
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = NetflixRed),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .tvFocusable()
                            .testTag("start_update_button")
                    ) {
                        Icon(imageVector = Icons.Default.Download, contentDescription = null, modifier = Modifier.size(18.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Atualizar Agora", fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    if (!info.forceUpdate) {
                        TextButton(
                            onClick = {
                                AppUpdateManager.snoozeUpdate(context, info)
                                onDismiss()
                            },
                            modifier = Modifier.tvFocusable()
                        ) {
                            Text("Mais tarde", color = Color.Gray)
                        }
                    }
                }
            )
        }

        is UpdateStatus.Downloading -> {
            AlertDialog(
                onDismissRequest = { /* Não permitir fechar durante download */ },
                properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false),
                containerColor = NetflixDarkGray,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.widthIn(max = if (isTv) 520.dp else 400.dp),
                title = {
                    Text(
                        text = "Baixando Atualização...",
                        color = NetflixWhite,
                        fontWeight = FontWeight.Bold,
                        fontSize = if (isTv) 20.sp else 18.sp
                    )
                },
                text = {
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Spacer(modifier = Modifier.height(8.dp))
                        LinearProgressIndicator(
                            progress = { status.progressPercent / 100f },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(8.dp)
                                .clip(RoundedCornerShape(4.dp)),
                            color = NetflixRed,
                            trackColor = Color(0xFF333333)
                        )
                        Spacer(modifier = Modifier.height(14.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = "${status.progressPercent}% concluído",
                                color = NetflixWhite,
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp
                            )
                            val mbDownloaded = status.bytesDownloaded / (1024f * 1024f)
                            val mbTotal = status.totalBytes / (1024f * 1024f)
                            if (status.totalBytes > 0) {
                                Text(
                                    text = String.format("%.1f MB / %.1f MB", mbDownloaded, mbTotal),
                                    color = Color.Gray,
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }
                },
                confirmButton = {}
            )
        }

        is UpdateStatus.ReadyToInstall -> {
            AlertDialog(
                onDismissRequest = onDismiss,
                containerColor = NetflixDarkGray,
                shape = RoundedCornerShape(16.dp),
                modifier = Modifier.widthIn(max = if (isTv) 520.dp else 400.dp),
                icon = {
                    Box(
                        modifier = Modifier
                            .size(54.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF46D369).copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.CheckCircle,
                            contentDescription = null,
                            tint = Color(0xFF46D369),
                            modifier = Modifier.size(32.dp)
                        )
                    }
                },
                title = {
                    Text(
                        text = "Download Concluído!",
                        color = NetflixWhite,
                        fontWeight = FontWeight.Bold,
                        fontSize = if (isTv) 22.sp else 18.sp
                    )
                },
                text = {
                    Text(
                        text = "O novo arquivo está pronto. Clique no botão abaixo para abrir a tela de instalação e aplicar a atualização imediatamente.",
                        color = Color.LightGray,
                        fontSize = 13.sp
                    )
                },
                confirmButton = {
                    Button(
                        onClick = {
                            AppUpdateManager.installApk(context, status.apkFile)
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = NetflixRed),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier
                            .tvFocusable()
                            .testTag("install_update_button")
                    ) {
                        Text("Instalar Atualização", fontWeight = FontWeight.Bold)
                    }
                },
                dismissButton = {
                    TextButton(
                        onClick = onDismiss,
                        modifier = Modifier.tvFocusable()
                    ) {
                        Text("Fechar", color = Color.Gray)
                    }
                }
            )
        }

        is UpdateStatus.Error -> {
            AlertDialog(
                onDismissRequest = onDismiss,
                containerColor = NetflixDarkGray,
                shape = RoundedCornerShape(16.dp),
                icon = {
                    Icon(
                        imageVector = Icons.Default.ErrorOutline,
                        contentDescription = null,
                        tint = NetflixRed,
                        modifier = Modifier.size(36.dp)
                    )
                },
                title = {
                    Text("Aviso de Atualização", color = NetflixWhite, fontWeight = FontWeight.Bold)
                },
                text = {
                    Text(status.message, color = Color.LightGray, fontSize = 13.sp)
                },
                confirmButton = {
                    Button(
                        onClick = onDismiss,
                        colors = ButtonDefaults.buttonColors(containerColor = NetflixRed),
                        shape = RoundedCornerShape(8.dp),
                        modifier = Modifier.tvFocusable()
                    ) {
                        Text("OK", color = NetflixWhite)
                    }
                }
            )
        }

        else -> {
            // Idle, Checking or UpToDate (sem diálogo)
        }
    }
}
