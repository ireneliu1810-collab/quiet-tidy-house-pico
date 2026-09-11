package com.ireneliu.jingqihome.xr.content

import com.pico.spatial.core.ecs.Entity
import com.pico.spatial.core.ecs.ImageBasedLightSource
import com.pico.spatial.core.ecs.ModelComponent
import com.pico.spatial.core.ecs.StageEnvironmentLightingComponent
import com.pico.spatial.core.ecs.TransformComponent
import com.pico.spatial.core.ecs.resource.TextureCreateOption
import com.pico.spatial.core.ecs.resource.TextureEncoding
import com.pico.spatial.core.ecs.resource.TextureResource
import com.pico.spatial.core.ecs.resource.UnlitMaterial
import com.pico.spatial.core.math.EulerAngles

/** Full-space rain-garden panorama surrounding the relaxation panel. */
internal object QuietEnvironment {
    suspend fun load(): Entity {
        val environmentRoot = Entity().apply { setName("QuietRainGarden_Environment") }
        val skySphere = Entity.loadSuspend("asset://environment/Sky Sphere.usdz").apply {
            setName("QuietRainGarden_SkySphere")
        }
        environmentRoot.addChild(skySphere)

        // The official PICO sphere faces inward after this authored orientation adjustment.
        environmentRoot.components[TransformComponent::class.java]?.setEulerAngles(
            EulerAngles(0f, 180f, 0f)
        )

        val panorama = TextureResource(
            "environment/quiet-rain-garden-panorama-v1.png",
            option = TextureCreateOption().apply { textureEncoding = TextureEncoding.LINEAR },
        )
        val skyMaterial = UnlitMaterial.create().apply { setBaseColorTexture(panorama) }
        requireNotNull(findModelEntity(skySphere)) {
            "PICO sky sphere asset contains no ModelComponent"
        }.components[ModelComponent::class.java]?.materials?.set(0, skyMaterial)

        val lighting = TextureResource(
            "environment/quiet-rain-garden-ibl.exr",
            option = TextureCreateOption().apply { textureEncoding = TextureEncoding.LINEAR },
        )
        environmentRoot.components[StageEnvironmentLightingComponent::class.java] =
            StageEnvironmentLightingComponent(ImageBasedLightSource.Single(lighting), 1.4f)
        return environmentRoot
    }

    private fun findModelEntity(entity: Entity): Entity? {
        if (entity.components[ModelComponent::class.java] != null) return entity
        entity.getChildren().forEach { child ->
            findModelEntity(child)?.let { return it }
        }
        return null
    }
}
