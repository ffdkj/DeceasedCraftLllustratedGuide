# 新版数据分层

## 目录

- public/data/*.js：官方基础数据，保持原样，不直接改
- public/data/custom/monsters.js：怪物等级、评级、分类覆盖
- public/data/custom/armor.js：护甲套装与部件数值
- public/data/custom/melee.js：近战伤害、攻速、双持数据
- public/data/custom/loot.js：战利品覆盖预留
- public/data/custom/index.js：统一合入 window.WZ_GUIDES

## 加载顺序

1. index.html 加载基础数据
2. src/client/main.ts 依次加载 data/custom/*
3. data/custom/index.js 按 id 合并覆盖
4. 再启动 app.ts / admin.ts

## 规则

- 覆盖按 id 合并，新版新增条目不会被删除
- 官方更新基础数据时，不需要修改 custom 文件
- 新增领域数据时按领域建文件，不要全部塞进一个文件
