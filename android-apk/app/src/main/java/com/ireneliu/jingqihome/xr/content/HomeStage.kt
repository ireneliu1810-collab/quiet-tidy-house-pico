package com.ireneliu.jingqihome.xr.content

import android.util.Log
import androidx.compose.runtime.Composable
import com.pico.spatial.core.ecs.Entity
import com.pico.spatial.ui.foundation.content.SpatialView

private const val STAGE_LOG_TAG = "QuietHouseStage"

@Composable
fun HomeStage() {
    SpatialView(
        initial = { content, _ ->
            // The root and its children intentionally live for the complete DefaultStage lifetime.
            val stageRoot = Entity().apply { setName("QuietTidyHouse_StageRoot") }
            content.addEntity(stageRoot)

            try {
                stageRoot.addChild(QuietEnvironment.load())
                Log.i(STAGE_LOG_TAG, "Rain-garden environment attached")
            } catch (error: Throwable) {
                // Progressive Stage retains the real-world safety view if this asset cannot load.
                Log.e(STAGE_LOG_TAG, "Rain-garden environment failed to load", error)
            }
        },
    )
}
