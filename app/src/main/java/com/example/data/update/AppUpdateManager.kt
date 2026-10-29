package com.example.data.update

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Log
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.TimeUnit

data class UpdateInfo(
    val versionCode: Long,
    val versionName: String,
    val apkUrl: String,
    val changelog: String,
    val forceUpdate: Boolean = false,
    val currentVersionName: String = "",
    val currentVersionCode: Long = 0L
)

sealed class UpdateStatus {
    object Idle : UpdateStatus()
    object Checking : UpdateStatus()
    data class Available(val info: UpdateInfo) : UpdateStatus()
    object UpToDate : UpdateStatus()
    data class Downloading(val progressPercent: Int, val bytesDownloaded: Long, val totalBytes: Long) : UpdateStatus()
    data class ReadyToInstall(val apkFile: File, val info: UpdateInfo) : UpdateStatus()
    data class Error(val message: String) : UpdateStatus()
}

object AppUpdateManager {
    private const val TAG = "AppUpdateManager"
    private const val PREFS_NAME = "netfilmes_updater_prefs"
    private const val KEY_UPDATE_URL = "custom_update_manifest_url"
    private const val KEY_SNOOZED_CODE = "snoozed_update_version_code"
    private const val KEY_SNOOZED_NAME = "snoozed_update_version_name"
    private const val KEY_LAST_INSTALLED_CODE = "last_installed_update_version_code"

    // Default update server URL (points to your Vercel deployment)
    const val DEFAULT_UPDATE_URL = "https://netflimespp.vercel.app/version.json"

    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(180, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .build()

    private val _status = MutableStateFlow<UpdateStatus>(UpdateStatus.Idle)
    val status: StateFlow<UpdateStatus> = _status.asStateFlow()

    private var cachedApkFile: File? = null

    fun getUpdateUrl(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val stored = prefs.getString(KEY_UPDATE_URL, null)
        return if (stored.isNullOrBlank() || stored.contains("app-mobile-tv.vercel.app") || stored.contains("shardweb.app")) {
            DEFAULT_UPDATE_URL
        } else {
            stored
        }
    }

    fun setUpdateUrl(context: Context, url: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_UPDATE_URL, url.trim()).apply()
    }

    fun getCurrentVersion(context: Context): Pair<String, Long> {
        return try {
            val pInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(context.packageName, PackageManager.PackageInfoFlags.of(0))
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(context.packageName, 0)
            }
            val vName = pInfo.versionName ?: "1.0"
            val vCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                pInfo.versionCode.toLong()
            }
            Pair(vName, vCode)
        } catch (e: Exception) {
            Log.e(TAG, "Error getting current version: ${e.message}")
            Pair("1.0", 1L)
        }
    }

    /**
     * Extracts pure numeric components from version strings like "1.6", "v1.6.2", "1.6 (TV)", etc.
     */
    fun extractVersionNumbers(versionStr: String): List<Int> {
        if (versionStr.isBlank()) return emptyList()
        val trimmed = versionStr.trim().removePrefix("v").removePrefix("V")
        val matcher = Regex("""^(\d+(\.\d+)*)""").find(trimmed)
        val numberPart = matcher?.value ?: trimmed
        return numberPart.split(".")
            .filter { it.isNotBlank() }
            .mapNotNull { it.toIntOrNull() }
    }

    /**
     * Compares two semantic version strings safely.
     * Returns true ONLY if remote is strictly greater than current.
     */
    fun isSemanticVersionNewer(remote: String, current: String): Boolean {
        if (remote.isBlank() || current.isBlank()) return false
        val rList = extractVersionNumbers(remote)
        val cList = extractVersionNumbers(current)
        if (rList.isEmpty() || cList.isEmpty()) {
            val cleanR = remote.trim().lowercase().removePrefix("v")
            val cleanC = current.trim().lowercase().removePrefix("v")
            return cleanR.isNotBlank() && cleanR != cleanC && cleanR > cleanC
        }
        val rTrimmed = rList.dropLastWhile { it == 0 }
        val cTrimmed = cList.dropLastWhile { it == 0 }
        val maxLen = maxOf(rTrimmed.size, cTrimmed.size)
        for (i in 0 until maxLen) {
            val r = rTrimmed.getOrElse(i) { 0 }
            val c = cTrimmed.getOrElse(i) { 0 }
            if (r > c) return true
            if (r < c) return false
        }
        return false
    }

    fun isUpdateSnoozed(context: Context, remoteCode: Long, remoteName: String): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val snoozedCode = prefs.getLong(KEY_SNOOZED_CODE, -1L)
        val snoozedName = prefs.getString(KEY_SNOOZED_NAME, null)
        return snoozedCode == remoteCode && snoozedName.equals(remoteName.trim(), ignoreCase = true)
    }

    fun snoozeUpdate(context: Context, info: UpdateInfo) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit()
            .putLong(KEY_SNOOZED_CODE, info.versionCode)
            .putString(KEY_SNOOZED_NAME, info.versionName.trim())
            .apply()
        _status.value = UpdateStatus.Idle
    }

    suspend fun checkForUpdates(context: Context, isManualCheck: Boolean = false): UpdateStatus = withContext(Dispatchers.IO) {
        _status.value = UpdateStatus.Checking
        try {
            val (currentName, currentCode) = getCurrentVersion(context)
            val manifestUrl = getUpdateUrl(context)

            val request = Request.Builder()
                .url(manifestUrl)
                .header("User-Agent", "Netfilmes-Android/${currentName}")
                .build()

            val response = httpClient.newCall(request).execute()
            if (!response.isSuccessful) {
                val errorMsg = "Servidor de atualização respondeu com código ${response.code}"
                val state = if (isManualCheck) UpdateStatus.Error(errorMsg) else UpdateStatus.UpToDate
                _status.value = state
                return@withContext state
            }

            val bodyString = response.body?.string().orEmpty()
            if (bodyString.isBlank()) {
                val state = if (isManualCheck) UpdateStatus.Error("Resposta vazia do servidor") else UpdateStatus.UpToDate
                _status.value = state
                return@withContext state
            }

            val json = JSONObject(bodyString)
            val remoteCode = json.optLong("versionCode", 0L)
            val remoteName = json.optString("versionName", "1.0")
            val apkUrl = json.optString("apkUrl", "")
            val changelog = json.optString("changelog", "Melhorias de desempenho e correções gerais.")
            val force = json.optBoolean("forceUpdate", false)

            // Strict version evaluation to prevent infinite repetition loops:
            // 1. If remoteCode < currentCode: NEVER newer (Android cannot downgrade APK)
            // 2. If remoteCode > currentCode: strictly newer
            // 3. If remoteCode == currentCode: only newer if semantic version name is strictly higher
            val isNewer = when {
                apkUrl.isBlank() -> false
                remoteCode < currentCode -> false
                remoteCode > currentCode -> true
                else -> isSemanticVersionNewer(remoteName, currentName)
            }

            if (isNewer) {
                val info = UpdateInfo(
                    versionCode = remoteCode,
                    versionName = remoteName,
                    apkUrl = apkUrl,
                    changelog = changelog,
                    forceUpdate = force,
                    currentVersionName = currentName,
                    currentVersionCode = currentCode
                )

                // If user snoozed this specific version and this is an automatic background check on startup,
                // do not interrupt the user with repeated dialogs unless forceUpdate is required.
                if (!isManualCheck && !force && isUpdateSnoozed(context, remoteCode, remoteName)) {
                    val state = UpdateStatus.Idle
                    _status.value = state
                    state
                } else {
                    val state = UpdateStatus.Available(info)
                    _status.value = state
                    state
                }
            } else {
                val state = UpdateStatus.UpToDate
                _status.value = state
                state
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error checking for updates: ${e.message}")
            val state = if (isManualCheck) UpdateStatus.Error("Não foi possível conectar ao servidor de atualizações: ${e.message}") else UpdateStatus.UpToDate
            _status.value = state
            state
        }
    }

    suspend fun downloadUpdate(context: Context, info: UpdateInfo): Boolean = withContext(Dispatchers.IO) {
        try {
            _status.value = UpdateStatus.Downloading(0, 0, 0)
            val request = Request.Builder().url(info.apkUrl).build()
            val response = httpClient.newCall(request).execute()

            if (!response.isSuccessful || response.body == null) {
                val code = response.code
                val msg = when (code) {
                    404 -> "Arquivo APK não encontrado (Erro 404). O arquivo '${info.apkUrl}' ainda não foi publicado no servidor."
                    403 -> "Acesso negado ao baixar APK (Erro 403)."
                    else -> "Falha ao baixar o arquivo da atualização (HTTP $code)."
                }
                _status.value = UpdateStatus.Error(msg)
                return@withContext false
            }

            val body = response.body!!
            val totalBytes = body.contentLength()

            val baseDir = context.externalCacheDir ?: context.cacheDir
            val updatesDir = File(baseDir, "updates").apply { mkdirs() }
            val apkFile = File(updatesDir, "netfilmes-update-${info.versionName}.apk")
            if (apkFile.exists()) apkFile.delete()

            body.byteStream().use { input ->
                FileOutputStream(apkFile).use { output ->
                    val buffer = ByteArray(8 * 1024)
                    var bytesRead: Long = 0
                    var read: Int
                    var lastPercent = -1

                    while (input.read(buffer).also { read = it } != -1) {
                        output.write(buffer, 0, read)
                        bytesRead += read
                        val percent = if (totalBytes > 0) ((bytesRead * 100) / totalBytes).toInt() else 0
                        if (percent != lastPercent) {
                            lastPercent = percent
                            _status.value = UpdateStatus.Downloading(percent, bytesRead, totalBytes)
                        }
                    }
                    output.flush()
                }
            }

            apkFile.setReadable(true, false)
            cachedApkFile = apkFile
            _status.value = UpdateStatus.ReadyToInstall(apkFile, info)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Download error: ${e.message}", e)
            _status.value = UpdateStatus.Error("Erro no download: ${e.message}")
            false
        }
    }

    fun installApk(context: Context, apkFile: File): Boolean {
        return try {
            if (!apkFile.exists() || apkFile.length() == 0L) {
                Log.e(TAG, "APK file does not exist or is empty")
                return false
            }

            apkFile.setReadable(true, false)

            // Android 8.0+ check for unknown app sources permission
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!context.packageManager.canRequestPackageInstalls()) {
                    val settingsIntent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                        data = Uri.parse("package:${context.packageName}")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(settingsIntent)
                    return false
                }
            }

            val authority = "${context.packageName}.fileprovider"
            val apkUri = FileProvider.getUriForFile(context, authority, apkFile)

            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
            }

            // Explicitly grant permission to package installers
            val resolvedActivities = context.packageManager.queryIntentActivities(installIntent, PackageManager.MATCH_DEFAULT_ONLY)
            for (activity in resolvedActivities) {
                val pkg = activity.activityInfo.packageName
                context.grantUriPermission(pkg, apkUri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            // Dismiss the dialog in app state so it won't loop
            _status.value = UpdateStatus.Idle

            context.startActivity(installIntent)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error launching package installer: ${e.message}", e)
            _status.value = UpdateStatus.Error("Erro ao iniciar instalador: ${e.message}")
            false
        }
    }

    fun dismiss() {
        _status.value = UpdateStatus.Idle
    }

    // Helper to simulate a test update for demonstration & testing
    fun triggerDemoUpdate(context: Context) {
        val (currentName, currentCode) = getCurrentVersion(context)
        val info = UpdateInfo(
            versionCode = currentCode + 1,
            versionName = "${currentName}.1 (TV & Mobile)",
            apkUrl = "https://github.com/jefao701/App-Mobile-e-TV/releases/download/1.1/netfilmes-tv-novo.apk",
            changelog = "• Nova versão de teste detectada\n• Otimizações de desempenho e reprodução de vídeos\n• Interface TV e Mobile aprimorada",
            forceUpdate = false,
            currentVersionName = currentName,
            currentVersionCode = currentCode
        )
        _status.value = UpdateStatus.Available(info)
    }
}
