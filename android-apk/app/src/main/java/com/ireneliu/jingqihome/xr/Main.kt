package com.ireneliu.jingqihome.xr

import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.platform.LocalContext
import com.ireneliu.jingqihome.xr.content.HomePage
import com.ireneliu.jingqihome.xr.content.HomeStage
import com.pico.spatial.ui.design.PicoTheme
import com.pico.spatial.ui.foundation.dsl.DefaultStage
import com.pico.spatial.ui.foundation.dsl.SpatialAppScope
import com.pico.spatial.ui.foundation.dsl.WindowContainer
import com.pico.spatial.ui.platform.containers.openWindowContainer

private const val RELAXATION_WINDOW_ID = "quiet-tidy-house-window"

fun mainApp(scope: SpatialAppScope) =
    with(scope) {
        WindowContainer(id = RELAXATION_WINDOW_ID) {
            PicoTheme {
                HomePage()
            }
        }

        DefaultStage {
            val context = LocalContext.current
            LaunchedEffect(context) {
                context.openWindowContainer(RELAXATION_WINDOW_ID)
            }
            PicoTheme {
                HomeStage()
            }
        }
    }
