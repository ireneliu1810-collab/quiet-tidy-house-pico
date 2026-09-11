plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "com.ireneliu.jingqihome.xr"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.ireneliu.jingqihome.xr"
        minSdk = 35
        targetSdk = 35
        versionCode = 3
        versionName = "0.1.2"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        ndk { abiFilters.add("arm64-v8a") }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    kotlinOptions {
        jvmTarget = "11"
    }
    buildFeatures {
        compose = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.0")
    implementation(platform("com.pico.spatial:bom:0.13.3"))
    implementation("com.pico.spatial.core:core")
    implementation("com.pico.spatial.ui:platform")
    implementation("com.pico.spatial.ui:foundation")
    implementation("com.pico.spatial.ui:design")
    implementation("com.pico.spatial.sense:sense")
    implementation("com.pico.spatial.tracking:tracking")
    implementation("androidx.compose.ui:ui-tooling")
    implementation("androidx.annotation:annotation:1.7.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.7.0")
    debugImplementation("androidx.compose.ui:ui-tooling-preview")
}

configurations.all {
    resolutionStrategy {
        exclude("androidx.compose.ui", "ui")
        exclude("androidx.compose.ui", "ui-graphics")
        exclude("androidx.compose.ui", "ui-text")
        exclude("androidx.compose.foundation", "foundation")
    }
}
