# 量子隧穿平台 Vue 版

这个目录是原 `web` 平台的 Vue + Vite 外壳版本。

## 启动

```powershell
cd D:\Desktop\量子隧穿\web-vue
npm run dev
```

## 构建

```powershell
npm run build
```

构建产物在 `dist` 目录中。原平台文件被放在 `public/legacy`，打包后会复制到 `dist/legacy`。

## 迁移建议

当前版本先用 iframe 承载原平台，保证功能完整可用。后续建议按页面逐步迁移：

1. 一维模型：参数面板、Canvas 图像、结果卡片、多重表征联动。
2. STM、α 衰变、闪存、RTD：复用同一套组件结构。
3. 所有页面迁移完成后，再移除 `public/legacy`。
