# 静栖 · VR 放松整理屋

一个面向 PICO WebSpatial 的无压力可交互 ASMR 原型。没有积分、倒计时、失败或关卡；玩家可以自由整理书架、修复旧物、给植物浇水、擦拭唱片、摆放收藏品与收拾桌面。

## 开发与构建

```bash
npm install
npm run dev
npm run check
```

固定开发端口：`5190`。PICO 模拟器入口：

```text
http://10.0.2.2:5190/?pico-spatial-launch=1
```

桌面环境可使用鼠标；PICO 中使用手柄射线与扳机触发物品。交互会播放短促的程序化声音，并在支持的设备上触发轻微震动。
