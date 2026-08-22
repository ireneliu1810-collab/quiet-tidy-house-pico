# 静栖 · PICO 放松整理屋

静栖是一款运行在 PICO 空间窗口中的无压力整理体验。雨夜小屋里没有积分、倒计时、失败或关卡，玩家可以按照自己的节奏整理书架、修复旧钟、给植物浇水、擦拭唱片、摆放收藏、收拾桌面，或轻轻抚摸正在休息的小猫。

## 核心体验

- 七种慢动作互动：慢推、持续按住、绕圈和轻扫，而不是单次点击完成。
- 整理书架时整排书脊逐本归位；擦拭唱片时先从收纳架抽出唱片，再沿沟槽清洁。
- 可开启雨夜生成式声景；不同物件提供独立的纸页、水流、齿轮、唱片与呼噜声反馈。
- 支持设备振动反馈时，会在物件响应时触发轻微震动。
- 可随时停下，不以完成度或效率评价玩家。

## PICO 交互方式

应用以 PICO Spatial SDK 原生空间窗口启动。使用手柄射线选择房间中的物件或底部活动卡片，按下扳机后根据界面提示持续按住、慢推、绕圈或来回轻扫。桌面浏览器中可使用鼠标完成同样的交互。

## 技术栈

- PICO Spatial SDK 0.13.3
- Android / Kotlin / Jetpack Compose SpatialUI
- Android WebView 本地安全资源域
- React 19 / TypeScript 6 / Three.js
- WebSpatial SDK 1.7.0
- Vite 8 / Web Audio API
- Android API 35 / arm64-v8a

## 本地运行

需要 Node.js 与 npm：

    npm install
    npm run dev

开发地址固定为 http://127.0.0.1:5190/。提交前运行：

    npm run check

## 构建 PICO APK

Android 工程位于 android-apk/。完整构建脚本会检查前端、生成网页资源、同步到 APK、构建原生 Spatial 容器并验证 APK 签名与旧网页壳残留：

    ./scripts/build-pico-apk.command

最终测试包输出为 artifacts/静栖-PICO真机版-0.1.1.apk。

APK 内的网页通过 https://appassets.androidplatform.net/assets/web/ 加载，不依赖 localhost、局域网、在线服务器、file:// 或 about:blank。

## 项目结构

- src/App.tsx：空间界面与七种慢动作练习。
- src/room.ts：Three.js 雨夜小屋和物件交互。
- src/soundscape.ts：雨声、和声与物件声音反馈。
- android-apk/：PICO Spatial SDK Android/Kotlin 原生容器。
- submission-assets/：提交 Icon、封面和运行截图。
- release/：可安装测试 APK。

## 版本

当前 APK：0.1.1（versionCode 2），包名 com.ireneliu.jingqihome.xr。
