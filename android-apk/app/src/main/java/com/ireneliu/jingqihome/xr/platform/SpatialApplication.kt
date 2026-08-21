package com.ireneliu.jingqihome.xr.platform

import android.app.Application
import com.pico.spatial.ui.foundation.dsl.launch
import com.ireneliu.jingqihome.xr.mainApp

class SpatialApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        launch(::mainApp)
    }
}
