# 静栖项目交接

- 独立 PICO WebSpatial / React / Three.js 项目，固定端口 `5190`。
- 不得修改或停止任何其他 PICO 项目和开发服务，尤其是“旋转相遇”。
- 主要交互逻辑位于 `src/room.ts`，界面位于 `src/App.tsx`，视觉系统位于 `src/styles.css`。
- 每次修改后运行 `npm run check`，并在 PICO 模拟器访问 `http://10.0.2.2:5190/?pico-spatial-launch=1` 验证。
- 本项目没有积分、失败、倒计时或关卡；请保持自由、无压力的交互方向。
