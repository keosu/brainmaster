# assets/ 素材目录

放置"图片主题"用的素材，例如奥特曼、恐龙、交通工具等。

## 约定

```
assets/
└─ ultraman/
   ├─ tiga.png      单个图案（正方形，建议 ≥256×256，透明背景更好）
   ├─ zero.png
   ├─ taiga.png
   ├─ ...           ≥10 张（翻牌困难档需要 10 张，不足会自动降规格）
   └─ scene.jpg     拼图用大图（建议 ≥900×900，正方形）
```

## 登记主题

在 `src/themes/index.js` 里调用 `registerTheme(...)`：

```js
registerTheme({
  id: 'ultraman',
  name: '奥特曼',
  emoji: '🦸',
  kind: 'image',
  palette: ['#e0243a', '#eef3fb'],
  faces: [
    { id: 'tiga', name: '迪迦', img: './assets/ultraman/tiga.png' },
    // ...
  ],
  art: './assets/ultraman/scene.jpg',
});
```

登记后，首页「主题皮肤」会自动出现该主题，翻牌记忆 / 拼图挑战立刻可用。

> ⚠️ 素材版权请自行确认，仅用于个人学习与家庭场景。
