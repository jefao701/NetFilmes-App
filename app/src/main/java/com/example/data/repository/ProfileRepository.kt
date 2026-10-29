package com.example.data.repository

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.example.data.api.SourcesRepository
import com.example.data.model.Addon
import com.example.data.model.MediaItem
import com.example.data.model.MediaPlaylistSummary
import com.example.data.model.MediaProgressSummary
import com.example.data.model.PlaylistItem
import com.example.data.model.Profile
import com.example.data.model.ProgressItem
import com.example.data.model.StreamSource
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

private val Context.dataStore by preferencesDataStore(name = "netfilmes_prefs")

object ProfileRepository {
    private val KEY_ACTIVE_PROFILE_ID = stringPreferencesKey("active_profile_id")
    private val KEY_LOCAL_PROFILES = stringPreferencesKey("local_profiles_json")
    private val KEY_LOCAL_PROGRESS = stringPreferencesKey("local_progress_json")
    private val KEY_LOCAL_PLAYLIST = stringPreferencesKey("local_playlist_json")
    private val KEY_LOCAL_ADDONS = stringPreferencesKey("local_addons_json")
    private val KEY_LOCAL_MANUAL_SOURCES = stringPreferencesKey("local_manual_sources_json")

    private val moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private val profileListType = Types.newParameterizedType(List::class.java, Profile::class.java)
    private val profileListAdapter = moshi.adapter<List<Profile>>(profileListType)

    private val progressMapType = Types.newParameterizedType(
        Map::class.java,
        String::class.java,
        Types.newParameterizedType(List::class.java, ProgressItem::class.java)
    )
    private val progressMapAdapter = moshi.adapter<Map<String, List<ProgressItem>>>(progressMapType)

    private val playlistMapType = Types.newParameterizedType(
        Map::class.java,
        String::class.java,
        Types.newParameterizedType(List::class.java, PlaylistItem::class.java)
    )
    private val playlistMapAdapter = moshi.adapter<Map<String, List<PlaylistItem>>>(playlistMapType)

    private val addonsListType = Types.newParameterizedType(List::class.java, Addon::class.java)
    private val addonsAdapter = moshi.adapter<List<Addon>>(addonsListType)

    private val manualSourcesMapType = Types.newParameterizedType(
        Map::class.java,
        String::class.java,
        Types.newParameterizedType(List::class.java, StreamSource::class.java)
    )
    private val manualSourcesAdapter = moshi.adapter<Map<String, List<StreamSource>>>(manualSourcesMapType)

    // In-memory states for reactive UI
    private val _profilesState = MutableStateFlow<List<Profile>>(Profile.defaultProfiles())
    val profilesState = _profilesState.asStateFlow()

    private val _activeProfileIdState = MutableStateFlow<String?>(Profile.defaultProfiles().first().id)
    val activeProfileIdState = _activeProfileIdState.asStateFlow()

    private val _progressState = MutableStateFlow<Map<String, List<ProgressItem>>>(emptyMap())
    val progressState = _progressState.asStateFlow()

    private val _playlistState = MutableStateFlow<Map<String, List<PlaylistItem>>>(emptyMap())
    val playlistState = _playlistState.asStateFlow()

    private val _addonsState = MutableStateFlow<List<Addon>>(SourcesRepository.defaultAddons)
    val addonsState = _addonsState.asStateFlow()

    private val _manualSourcesState = MutableStateFlow<Map<String, List<StreamSource>>>(emptyMap())
    val manualSourcesState = _manualSourcesState.asStateFlow()

    suspend fun initialize(context: Context) {
        try {
            context.dataStore.data.collect { prefs ->
                val activeId = prefs[KEY_ACTIVE_PROFILE_ID]
                val profilesJson = prefs[KEY_LOCAL_PROFILES]
                val progressJson = prefs[KEY_LOCAL_PROGRESS]
                val playlistJson = prefs[KEY_LOCAL_PLAYLIST]
                val addonsJson = prefs[KEY_LOCAL_ADDONS]
                val manualSourcesJson = prefs[KEY_LOCAL_MANUAL_SOURCES]

                if (!profilesJson.isNullOrEmpty()) {
                    val list = profileListAdapter.fromJson(profilesJson)
                    if (!list.isNullOrEmpty()) {
                        _profilesState.value = list
                    }
                }
                if (!activeId.isNullOrEmpty()) {
                    _activeProfileIdState.value = activeId
                } else if (_profilesState.value.isNotEmpty()) {
                    _activeProfileIdState.value = _profilesState.value.first().id
                }

                if (!progressJson.isNullOrEmpty()) {
                    progressMapAdapter.fromJson(progressJson)?.let {
                        _progressState.value = it
                    }
                }

                if (!playlistJson.isNullOrEmpty()) {
                    playlistMapAdapter.fromJson(playlistJson)?.let {
                        _playlistState.value = it
                    }
                }

                if (!addonsJson.isNullOrEmpty()) {
                    addonsAdapter.fromJson(addonsJson)?.let {
                        _addonsState.value = mergeWithDefaultAddons(it)
                    }
                } else {
                    _addonsState.value = SourcesRepository.defaultAddons
                }

                if (!manualSourcesJson.isNullOrEmpty()) {
                    manualSourcesAdapter.fromJson(manualSourcesJson)?.let {
                        _manualSourcesState.value = it
                    }
                }
            }
        } catch (_: Exception) {
            // Keep safe defaults
        }
    }

    private fun mergeWithDefaultAddons(loaded: List<Addon>): List<Addon> {
        val out = mutableListOf<Addon>()
        val seen = mutableSetOf<String>()

        SourcesRepository.defaultAddons.forEach { def ->
            out.add(def)
            seen.add(def.url)
        }
        loaded.forEach { item ->
            val normUrl = item.url.replace("shardcloud.app", "shardweb.app")
            if (!seen.contains(normUrl)) {
                out.add(item.copy(url = normUrl))
                seen.add(normUrl)
            }
        }
        return out
    }

    suspend fun setActiveProfile(context: Context, profileId: String) {
        _activeProfileIdState.value = profileId
        context.dataStore.edit { prefs ->
            prefs[KEY_ACTIVE_PROFILE_ID] = profileId
        }
    }

    suspend fun addOrUpdateProfile(context: Context, profile: Profile) {
        val current = _profilesState.value.toMutableList()
        val index = current.indexOfFirst { it.id == profile.id }
        if (index >= 0) {
            current[index] = profile
        } else {
            current.add(profile)
        }
        _profilesState.value = current
        saveProfiles(context, current)
    }

    suspend fun deleteProfile(context: Context, profileId: String) {
        val current = _profilesState.value.filter { it.id != profileId }
        _profilesState.value = current
        saveProfiles(context, current)
        if (_activeProfileIdState.value == profileId) {
            val fallback = current.firstOrNull()?.id
            _activeProfileIdState.value = fallback
            context.dataStore.edit { prefs ->
                if (fallback != null) prefs[KEY_ACTIVE_PROFILE_ID] = fallback
                else prefs.remove(KEY_ACTIVE_PROFILE_ID)
            }
        }
    }

    private suspend fun saveProfiles(context: Context, list: List<Profile>) {
        val json = profileListAdapter.toJson(list)
        context.dataStore.edit { prefs ->
            prefs[KEY_LOCAL_PROFILES] = json
        }
        triggerBackgroundCloudSync(context)
    }

    suspend fun saveProgress(
        context: Context,
        profileId: String,
        key: String,
        positionSeconds: Double,
        durationSeconds: Double,
        media: MediaProgressSummary
    ) {
        if (durationSeconds <= 0) return
        val fraction = positionSeconds / durationSeconds
        val currentMap = _progressState.value.toMutableMap()
        val profileList = currentMap[profileId]?.toMutableList() ?: mutableListOf()

        // Only clear if watched to the end (credits > 95%) or if closed within the first 8 seconds
        if (fraction > 0.95 || positionSeconds < 8.0) {
            profileList.removeAll { it.key == key }
        } else {
            val item = ProgressItem(
                key = key,
                position = positionSeconds,
                duration = durationSeconds,
                updatedAt = System.currentTimeMillis(),
                media = media
            )
            profileList.removeAll { it.key == key }
            profileList.add(0, item)
        }

        currentMap[profileId] = profileList.take(40)
        _progressState.value = currentMap

        val json = progressMapAdapter.toJson(currentMap)
        context.dataStore.edit { prefs ->
            prefs[KEY_LOCAL_PROGRESS] = json
        }
        triggerBackgroundCloudSync(context)
    }

    suspend fun togglePlaylist(
        context: Context,
        profileId: String,
        item: MediaItem
    ): Boolean {
        val key = "${item.effectiveType}:${item.id}"
        val currentMap = _playlistState.value.toMutableMap()
        val profileList = currentMap[profileId]?.toMutableList() ?: mutableListOf()

        val exists = profileList.any { it.key == key }
        val nowAdded: Boolean
        if (exists) {
            profileList.removeAll { it.key == key }
            nowAdded = false
        } else {
            val summary = MediaPlaylistSummary(
                type = item.effectiveType,
                id = item.id,
                title = item.displayTitle,
                overview = item.overview,
                posterPath = item.posterPath,
                backdropPath = item.backdropPath,
                rating = item.voteAverage,
                year = item.displayYear,
                date = item.displayDate
            )
            profileList.add(0, PlaylistItem(key = key, addedAt = System.currentTimeMillis(), media = summary))
            nowAdded = true
        }

        currentMap[profileId] = profileList
        _playlistState.value = currentMap

        val json = playlistMapAdapter.toJson(currentMap)
        context.dataStore.edit { prefs ->
            prefs[KEY_LOCAL_PLAYLIST] = json
        }
        triggerBackgroundCloudSync(context)
        return nowAdded
    }

    private fun triggerBackgroundCloudSync(context: Context) {
        if (FirebaseCloudRepository.currentUserState.value != null) {
            kotlinx.coroutines.CoroutineScope(kotlinx.coroutines.Dispatchers.IO).launch {
                try {
                    FirebaseCloudRepository.syncNow(context)
                } catch (_: Exception) {}
            }
        }
    }

    fun isItemInPlaylist(profileId: String, type: String, id: Int): Boolean {
        val key = "$type:$id"
        return _playlistState.value[profileId]?.any { it.key == key } == true
    }

    fun getContinueWatching(profileId: String): List<ProgressItem> {
        return _progressState.value[profileId] ?: emptyList()
    }

    // Addon management
    suspend fun addAddon(context: Context, addon: Addon) {
        val current = _addonsState.value.toMutableList()
        current.removeAll { it.url == addon.url }
        current.add(addon)
        _addonsState.value = current
        saveAddons(context, current)
    }

    suspend fun toggleAddon(context: Context, url: String, enabled: Boolean) {
        val current = _addonsState.value.map {
            if (it.url == url) it.copy(enabled = enabled) else it
        }
        _addonsState.value = current
        saveAddons(context, current)
    }

    suspend fun removeAddon(context: Context, url: String) {
        val current = _addonsState.value.filter { it.url != url }
        _addonsState.value = current
        saveAddons(context, current)
    }

    suspend fun restoreDefaultAddons(context: Context) {
        _addonsState.value = SourcesRepository.defaultAddons
        saveAddons(context, SourcesRepository.defaultAddons)
    }

    private suspend fun saveAddons(context: Context, list: List<Addon>) {
        val json = addonsAdapter.toJson(list)
        context.dataStore.edit { prefs ->
            prefs[KEY_LOCAL_ADDONS] = json
        }
    }

    // Manual sources management (mf:src:<chave>)
    fun getManualSources(key: String): List<StreamSource> {
        val direct = _manualSourcesState.value[key] ?: emptyList()
        val prefixed = _manualSourcesState.value["mf:src:$key"] ?: emptyList()
        return (direct + prefixed).distinctBy { it.url }
    }

    suspend fun addManualSource(context: Context, key: String, source: StreamSource) {
        val currentMap = _manualSourcesState.value.toMutableMap()
        val list = (currentMap[key] ?: emptyList()).toMutableList()
        list.removeAll { it.url == source.url }
        list.add(source)
        currentMap[key] = list
        currentMap["mf:src:$key"] = list
        _manualSourcesState.value = currentMap

        val json = manualSourcesAdapter.toJson(currentMap)
        context.dataStore.edit { prefs ->
            prefs[KEY_LOCAL_MANUAL_SOURCES] = json
        }
    }

    // Export complete snapshot for Cloud Sync
    fun getLocalSnapshot(): Map<String, Any?> {
        return mapOf(
            "profiles" to _profilesState.value,
            "activeProfileId" to _activeProfileIdState.value,
            "progressByProfile" to _progressState.value,
            "playlistByProfile" to _playlistState.value,
            "addons" to _addonsState.value,
            "manualSources" to _manualSourcesState.value,
            "updatedAt" to System.currentTimeMillis()
        )
    }

    // Apply merged remote snapshot
    suspend fun applyMergedSnapshot(
        context: Context,
        mergedProfiles: List<Profile>,
        mergedActiveId: String?,
        mergedProgress: Map<String, List<ProgressItem>>,
        mergedPlaylist: Map<String, List<PlaylistItem>>,
        mergedAddons: List<Addon>,
        mergedManualSources: Map<String, List<StreamSource>> = emptyMap()
    ) {
        val finalAddons = mergeWithDefaultAddons(mergedAddons)
        _profilesState.value = mergedProfiles
        if (mergedActiveId != null) _activeProfileIdState.value = mergedActiveId
        _progressState.value = mergedProgress
        _playlistState.value = mergedPlaylist
        _addonsState.value = finalAddons
        _manualSourcesState.value = mergedManualSources

        context.dataStore.edit { prefs ->
            prefs[KEY_LOCAL_PROFILES] = profileListAdapter.toJson(mergedProfiles)
            if (mergedActiveId != null) prefs[KEY_ACTIVE_PROFILE_ID] = mergedActiveId
            prefs[KEY_LOCAL_PROGRESS] = progressMapAdapter.toJson(mergedProgress)
            prefs[KEY_LOCAL_PLAYLIST] = playlistMapAdapter.toJson(mergedPlaylist)
            prefs[KEY_LOCAL_ADDONS] = addonsAdapter.toJson(finalAddons)
            prefs[KEY_LOCAL_MANUAL_SOURCES] = manualSourcesAdapter.toJson(mergedManualSources)
        }
    }
}
