# 静栖项目交接

- 独立 PICO Spatial SDK Android/Kotlin + 内置 React/Three.js 项目；网页开发端口固定为 `5190`。
- 不得修改或停止任何其他 PICO 项目和开发服务，尤其是“旋转相遇”。
- 主要交互逻辑位于 `src/room.ts`，界面位于 `src/App.tsx`，视觉系统位于 `src/styles.css`。
- 原生工程位于 `android-apk/`，包名 `com.ireneliu.jingqihome.xr`，PICO Spatial SDK 0.13.3，API 35，仅 `arm64-v8a`。
- 启动入口必须保持 `.platform.LaunchActivity`（继承 `SpatialLaunchActivity`）；Application 必须保持 `.platform.SpatialApplication` 并调用 `launch(::mainApp)`。
- 内置网页由 `HomePage.kt` 通过 `https://appassets.androidplatform.net/assets/web/index.html` 和受限资源拦截加载；禁止改回 `file://`、localhost、局域网或 `about:blank`。
- PICO 空间 WebView 会把互动弹窗中的 `100vh` 高度上限计算为 0；弹窗工作台必须保持内容驱动高度，禁止重新加入基于 `vh` 的 `max-height`。调试版 WebView 已启用本机 DevTools，正式非调试构建不会开启。
- 每次修改后运行 `npm run check`；打包时依次运行 `npm run build:apk-web`、`npm run sync:android-web`、`cd android-apk && ./gradlew assembleDebug`。
- 可安装测试包输出在 `android-apk/app/build/outputs/apk/debug/app-debug.apk`；不得再使用旧 offline-wrapper 或 `WebAppActivity` 网页壳。
- 本项目没有积分、失败、倒计时或关卡；请保持自由、无压力的交互方向。
