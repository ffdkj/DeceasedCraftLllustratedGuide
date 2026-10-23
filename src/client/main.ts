// 图片版本串必须最先应用：data 脚本已在 index.html 里同步加载完
import './image-versions';
import './recipes';
import './tiers';
import './seed';
import './music';
import './gunsmith';
import './app';
// app.ts 的 IIFE 跑完才有 window.WZ_APP_UI，管理员界面依赖它
import './admin';
