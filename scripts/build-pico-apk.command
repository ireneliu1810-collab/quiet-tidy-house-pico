#!/bin/zsh
set -euo pipefail

PROJECT_ROOT="${0:A:h:h}"
ANDROID_PROJECT="$PROJECT_ROOT/android-apk"
ARTIFACT_DIR="$PROJECT_ROOT/artifacts"
LOG_FILE="$ARTIFACT_DIR/build-pico-apk.log"
FINAL_APK="$ARTIFACT_DIR/静栖-PICO真机版-0.1.3.apk"
DESKTOP_APK="/Users/luluanan/Desktop/静栖-PICO真机版-0.1.3.apk"
SYSTEM_JAVA_ROOT="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
BUNDLED_JAVA_ROOT="$PROJECT_ROOT/.local-jdk/Contents/Home"
if [ -x "$SYSTEM_JAVA_ROOT/bin/java" ]; then
  JAVA_ROOT="$SYSTEM_JAVA_ROOT"
else
  JAVA_ROOT="$BUNDLED_JAVA_ROOT"
fi
LOCAL_ANDROID_SDK="$PROJECT_ROOT/.local-android-sdk"
READ_ONLY_DEP_CACHE="/Users/luluanan/.gradle/caches"
GRADLE_BIN="/Users/luluanan/.gradle/wrapper/dists/gradle-8.13-bin/5xuhj0ry160q40clulazy9h7d/gradle-8.13/bin/gradle"
APKSIG_JAR="/Users/luluanan/.gradle/caches/modules-2/files-2.1/com.android.tools.build/apksig/8.13.2/f005788487574c7d6ba23dea63bf8cb3a4f164a6/apksig-8.13.2.jar"

mkdir -p "$ARTIFACT_DIR" "$ANDROID_PROJECT/.android-user"
exec > >(tee "$LOG_FILE") 2>&1

echo "[静栖] 开始构建 PICO Spatial 真机 APK"
echo "项目：$PROJECT_ROOT"

if [ ! -x "$JAVA_ROOT/bin/java" ]; then
  echo "缺少 Java 17：$JAVA_ROOT/bin/java" >&2
  exit 1
fi
if [ ! -f "$LOCAL_ANDROID_SDK/platforms/android-35/android.jar" ]; then
  echo "缺少本地 Android API 35 SDK：$LOCAL_ANDROID_SDK" >&2
  exit 1
fi
if [ ! -x "$GRADLE_BIN" ] || [ ! -f "$APKSIG_JAR" ]; then
  echo "缺少已缓存的 Gradle 或 APK 签名校验库。" >&2
  exit 1
fi

export JAVA_HOME="$JAVA_ROOT"
export ANDROID_HOME="$LOCAL_ANDROID_SDK"
export ANDROID_SDK_ROOT="$LOCAL_ANDROID_SDK"
export ANDROID_USER_HOME="$ANDROID_PROJECT/.android-user"
export GRADLE_USER_HOME="$ANDROID_PROJECT/.android-user"
export GRADLE_RO_DEP_CACHE="$READ_ONLY_DEP_CACHE"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

cd "$PROJECT_ROOT"
npm run check
npm run build:apk-web
npm run sync:android-web

cd "$ANDROID_PROJECT"
"$GRADLE_BIN" assembleDebug --offline --no-daemon

BUILT_APK="$ANDROID_PROJECT/app/build/outputs/apk/debug/app-debug.apk"
if [ ! -f "$BUILT_APK" ]; then
  echo "Gradle 完成但未找到 APK：$BUILT_APK" >&2
  exit 1
fi

cp "$BUILT_APK" "$FINAL_APK"
cp "$BUILT_APK" "$DESKTOP_APK"

AAPT2="$ANDROID_HOME/build-tools/35.0.0/aapt2"

echo "[静栖] APK 清单"
"$AAPT2" dump badging "$FINAL_APK" | grep -E "^(package:|minSdkVersion:|targetSdkVersion:|application-label:|launchable-activity:|native-code:)"
echo "[静栖] 签名"
"$JAVA_HOME/bin/java" --class-path "$APKSIG_JAR" \
  "$PROJECT_ROOT/scripts/VerifyApkSignature.java" "$FINAL_APK"
echo "[静栖] SHA-256"
shasum -a 256 "$FINAL_APK"
echo "[静栖] 旧网页壳检查"
if unzip -p "$FINAL_APK" 'classes*.dex' 2>/dev/null | strings | grep -Eq "com/picoxr/spacewebappp|WebAppActivity|about:blank"; then
  echo "检测到旧网页壳残留，停止交付。" >&2
  exit 1
fi
echo "未检测到旧网页壳。"
echo "[静栖] 内置网页入口"
unzip -l "$FINAL_APK" | grep "assets/web/index.html"

echo "[静栖] 构建完成"
echo "唯一安装文件：$DESKTOP_APK"
echo "日志：$LOG_FILE"
