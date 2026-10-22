# Todo: 枪械梯度 + 子弹梯度

- [x] T1 梯度生成器（scripts/gen-tiers.ts）
  - Acceptance: `npm run gen:tiers` 产出 `public/data/tiers.js`，178 把枪 / 15 口径全有档位，两次运行字节一致
  - Verify: `tsx scripts/gen-tiers.ts` 打印分布，与 spec 基线表一致
  - Files: `scripts/gen-tiers.ts`、`public/data/tiers.js`、`package.json`

- [x] T2 数据断言（scripts/verify-tiers.ts）
  - Acceptance: 分布基线 + 抽样枪 + 模具最低区域档 + 三态弹药 + 图标可解析全部断言通过
  - Verify: `npm run verify:tiers` 非零退出即失败
  - Files: `scripts/verify-tiers.ts`、`package.json`

- [x] T3 组件（src/client/tiers.ts）
  - Acceptance: `window.WZ_TIERS_UI.strip(gunId)` 输出两行同构 HTML，枪械行/子弹行/推断/无模具/无弹药五态齐全
  - Verify: 临时 jsdom 断言 HTML 含正确 `data-go`、徽章文字、`· 推断` 后缀
  - Files: `src/client/tiers.ts`、`src/client/main.ts`、`src/client/types/data.d.ts`

- [x] T4 挂载到改枪台头部
  - Acceptance: `#view > div.gs-head` 末尾出现 `.tier-strip`，窄屏不挤掉「换枪」
  - Verify: `#/gear/gunsmith/tacz:m4a1`、`tacz:minigun`、`gz:m16a2`、`suffuse:knife`、`tacz:m320` 五个样本目视
  - Files: `src/client/gunsmith.ts`、`public/css/app.css`

- [x] T5 挂载到枪械详情页头部
  - Acceptance: `.detail-hero` 的 `.meta` 之后出现同一条 `.tier-strip`，与改枪台完全同构
  - Verify: `#/gear/gun/tacz:m4a1` 目视 + 点击两行跳转
  - Files: `src/client/app.ts`、`public/css/app.css`

- [x] T6 站内跳转与样式
  - Acceptance: 枪械行 → 元件物品页、子弹行 → 模具物品页，hash 路由无整页刷新，返回可回原枪
  - Verify: 点击四个方向（含推断不可点、无模具不可点）
  - Files: `src/client/tiers.ts`、`public/css/app.css`

- [x] T7 数据接入与预缓存
  - Acceptance: `index.html` 加载 `tiers.js`，SW 清单含 `./data/tiers.js`，构建后离线可用
  - Verify: `npm run verify`（build + tsc + check:assets）
  - Files: `index.html`、`scripts/build-sw.ts`、`src/client/types/data.d.ts`

- [x] T8 文档与提交
  - Acceptance: spec / plan / todo / CONTEXT 术语齐全，一次提交入库
  - Verify: `git status` 仅预期文件；`npm run verify` + `npm run verify:tiers` 全绿
  - Files: `specs/SPEC-gun-tiers.md`、`tasks/plan.md`、`tasks/todo.md`、`CONTEXT.md`

## 第二轮（梯度改 tag + 移除枪械库 + 补描述）

- [x] T9 梯度改成 tag 挂进 `.gs-badges` 与详情页 `.meta`
  - Acceptance: 页面无 `.tier-strip`；两个 tag 与射击模式同排；透明底有色字
  - Verify: DOM 断言 36 条（含 5 个样本枪 + 详情页 + 装备图鉴）
  - Files: `src/client/tiers.ts`、`src/client/gunsmith.ts`、`src/client/app.ts`、`public/css/app.css`
- [x] T10 装备图鉴移除「枪械库」卡片
  - Acceptance: hub 卡片 6 → 5，改枪台仍在，`#/gear/guns` 页面保留
  - Verify: DOM 断言「不再有枪械库卡片」+ 卡片数 5
  - Files: `src/client/app.ts`
- [x] T11 177 把枪的文案搬进改枪台
  - Acceptance: `.gs-desc` 在 `.gs-head` 下方，背景 + 作用两行；33 把无背景描述显示占位；多行描述保留换行
  - Verify: m4a1（有描述）/ gz:aug_9mm（无描述）/ bf1:ef46（多行）三个样本
  - Files: `src/client/gunsmith.ts`、`public/css/app.css`
- [x] T12 文档与门禁
  - Acceptance: spec / todo / CONTEXT 同步，`npm run verify` + `verify:tiers` 全绿
  - Files: `specs/SPEC-gun-tiers.md`、`tasks/todo.md`、`CONTEXT.md`
