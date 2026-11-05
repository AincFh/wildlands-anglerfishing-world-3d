# WILDLANDS · 山野钓行

## 在线版本（两个独立入口）

| 版本 | 访问地址 | 说明 |
|---|---|---|
| 原版 WebGL2 | [经典版](https://aincfh.github.io/wildlands-anglerfishing-world-3d/) | 保留已有游戏、存档及搏鱼系统，不受新引擎重建影响 |
| WILDLANDS NEXT | [新 3D 渲染预览](https://aincfh.github.io/wildlands-anglerfishing-world-3d/next/) | Three.js 动态湖面与森林、3D 鱼体、第一人称抛投、移动端控制、钓获与装备、音效 |

新版代码位于 [`next/`](next/)，操作说明、授权和已知限制见 [NEXT 开发文档](next/README.md)。GitHub Actions 对新版执行 Chrome/WebGL 真实画面与钓鱼/手机交互验收。

**两版均属持续开发阶段。** NEXT 改进了真实视觉场景与交互体系，但还不是商业级 3D 钓鱼游戏。


第一人称 3D 钓鱼网页游戏。由 WebGL2 + JavaScript 实现。**目前仍是可玩原型，不是成熟完整游戏。**

## 更新：差异化搏鱼系统

- 不同鱼种具有各自的逃窜间隔、冲刺方式和耐力；3D 鱼漂与钓线会根据距离和转向移动。
- 搏鱼时可用键盘 `[` / `]` 或画面内 `−` / `+` 按钮调节泄力，按住空格或左键收线，松开减压。
- 鱼体力耗尽不再直接算捕获；必须将实际鱼线距离收至近岸。过紧会断线，过松会脱钩，放任远逃也可能用尽鱼线。
- 新增独立模拟逻辑 `fight.js` 与自动测试；原有存档、鱼种、地图和装备保持兼容。
- 该机制是可测试的游戏模拟，并不宣称真实水动力或商业级钓鱼物理。


## 在线体验

GitHub Pages 部署完成后访问：`https://aincfh.github.io/wildlands-anglerfishing-world-3d/`

## 本地运行

```bash
python -m http.server 8080
```

访问 `http://localhost:8080/`。源文件为 `index.html`、`style.css`、`game.js` 和 `assets/`。无需依赖包。

## 操作

WASD 移动，Shift 奔跑，右键拖动观察，左键按住并松开抛竿；咬钩时空格提竿，搏鱼期间空格收线。M 地图、I 装备、J 图鉴、Q 任务、G 商店、B 登船。

## 完成度说明

这是可游玩的独立纵向切片，并非商业级成品。实际硬件帧率、长期平衡性与设备兼容性仍需进一步测试。

代码及素材请遵守仓库所示的版权状态；未发布开放源代码许可证时，不默认授权第三方再分发。
