// 图片版本串必须最先应用：data 脚本已在 index.html 里同步加载完
import './image-versions';
import './recipes';
import './tiers';
import './seed';
import './music';
import './gunsmith';

function loadScript(src) {
  return new Promise(function (resolve, reject) {
    var s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = function () { reject(new Error('load failed: ' + src)); };
    document.head.appendChild(s);
  });
}

async function boot() {
  const files = [
    '/data/custom/monsters.js',
    '/data/custom/armor.js',
    '/data/custom/melee.js',
    '/data/custom/loot.js',
    '/data/custom/index.js'
  ];
  for (const file of files) {
    try { await loadScript(file); } catch (e) { console.warn(e); }
  }
  await import('./app');
  await import('./admin');
}

boot();
