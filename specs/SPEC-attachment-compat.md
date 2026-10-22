# SPEC: attachment-compat（配件真实兼容性 + 配件字段补丁）

## Objective

改枪台的「配件兼容」之前只按槽位类型（`allow_attachment_types`）推算，导致专属配件出现在几十把枪上（例如「Lss专用枪托」站内 53 把、游戏内只有 1 把）。本模块把兼容性换成**游戏真实规则**，并修正两件使用旧版百分比写法的配件的后坐力数值、补上被漏掉的 `inaccuracy_addend`。

用户故事：作为玩家，我在改枪台点开某个槽位时，看到的候选就是**游戏里真的装得上**的那些；专属配件只在它的枪上出现；没有配白名单的枪会明确告诉我装不了；枪托这类配件的「-35% 后坐力 / -0.5 腰射散布」与游戏内一致。

## 判据（来自 TaCZ 源码，不是猜的）

1. **兼容性**由 `data/<ns>/tacz_tags/attachments/allow_attachments/<枪>.json` 决定：
   - `AbstractGunItem.allowAttachment()` → `AllowAttachmentTagMatcher.match(gunId, attachmentId)`；
   - 文件条目不存在的枪：`match0` 直接返回 `false` → **游戏内一个配件都装不上**；
   - 条目可以是配件 id 或 `#tag`，需要递归展开（`treeSearch`）；
   - `allow_attachment_types` 只决定「这个槽位开不开」，不是兼容白名单。
2. **旧版 `recoil_modifier`** 是百分比写法：`RecoilModifier.readJson` 用 `setPercent(-0.35)`，`AttachmentPropertyManager.eval` 算 `percent = 1 + percent` → 实际后坐力 × 0.65（-35%）。模组自带数据文件 `bayonet_m9_data.json` 的注释写得更直白：「数值为 -0.1 意味着实际后坐力修改为（1 - 0.1）* 原始后坐力，即 90%」。
3. **`inaccuracy_addend`** 是真实字段（`InaccuracyModifier`），作为 addend 作用于**腰射与移动散布**（`AIM/SNEAK/LIE` 之外的类型），站内之前完全没有建模。

## Data contract

`public/data/compat.js`（全局 `<script>`）：

```js
window.WZ_COMPAT = {
  generated: "2026-10-24",
  source: { pack: "DeceasedCraft 5.11.19", sources: [...], tagFiles: 358, tags: 66,
            jars: 0, jarTagFiles: 0, guns: 178, attachments: 197 },
  // 每把枪游戏内可安装的配件（已递归展开 #tag，按 id 排序）。空数组 = 整合包没给白名单
  guns: { "tacz:m4a1": ["tacz:scope_acog_ta31", ...], "tacz:minigun": [] },
  // 站内配件数据的字段补丁：旧版后坐力百分比折算、缺失的 inaccuracy_addend
  fixes: {
    "rebel:stock_spa": { recoilPitchMult: 0.65, recoilYawMult: 0.8, inaccAdd: -0.5,
                         note: "recoil_modifier 旧版百分比写法已折算为乘数；补 inaccuracy_addend" }
  },
  meta: { noWhitelist: [...], unknownAttachments: [...], neverAllowed: [...], warnings: [...] }
};
```

约定：
- `guns[gunId]` 必须对每把枪都存在；空数组表示「无白名单」。
- 补丁只在**与站内数据不一致**时生成（不重复存已正确的字段）。
- `meta.warnings` 会带出处提示：若没有从模组 jar 读到标签（只用了 `--dir`），必须留一条 warning。

## 生成与验证

```bash
# 真实数据（推荐）：把 tacz 模组 jar 放到 DeceasedCraft5.11.19/overrides/mods/ 后自动探测
npm run gen:compat
# 或显式指定
npx tsx scripts/gen-compat.ts --jar ./path/to/tacz-1.20.1-x.jar
npm run verify:compat     # 数据断言（入库）
```

`gen-compat` 输入：整合包 `overrides/tacz/*/data/*/tacz_tags/**`（游戏包）+ 模组 jar 内的 `tacz_tags/**` 与 `data/attachments/*_data.json`。jar 用 `unzip -Z1` / `unzip -p` 读取，不需要额外依赖。

## 客户端行为

- `attFitsGun(a, gun)`：有 `WZ_COMPAT` 时以白名单为准，否则退回旧的类型估算（离线兜底）。
- 配件选择器：只列白名单里的配件，不再出现「类型不匹配」行。
- `attData(id)` 应用 `fixes`：修正后坐力乘数，并把 `mods` 文案里的「垂直后坐力 -135%」重算为「-35%」，`inaccuracy_addend` 以「腰射散布 -0.5」插入到后坐力之后（TaCZ 面板顺序）。
- `calc()`：`inaccStand += inaccAdd`（移动散布同理，站点只展示腰射与瞄准两项）。
- 白名单为空的枪：配件槽位区显示「该枪在整合包内无可用配件」并说明原因，隐藏槽位卡片与推荐方案，保留枪械数值、造价与记录库。

## Boundaries

- **Always**：改兼容性只从 `allow_attachments` 标签推导；补丁只用来修「数据与游戏语义不一致」的字段；生成物入库前跑 `verify:compat`。
- **Ask first**：改 `allow_attachment_types` 语义、给某把枪手工开白名单、把 `--dir` 的默认包快照换成别的版本。
- **Never**：在客户端硬编码某把枪的配件表；用 `allow_attachment_types` 当兼容白名单；手改 `public/data/compat.js`。

## Success Criteria

1. `rebel:stock_spa` 只出现在 `rebel:lss`；`rebel:stock_sp` 只出现在 `hsp`、`lss`。
2. 站内「枪×配件」组合从 16,459 降到与游戏一致的量级（当前 10,385）；22 把无白名单的枪显示「无可用配件」。
3. 两把 rebel 枪托显示「垂直后坐力 -35% / 水平后坐力 -20% / 腰射散布 -0.5」，装到 lss 上腰射散布真的降 0.5、后坐力保持为正。
4. `npm run verify:compat` 与 `npm run verify` 全绿。

## 已知边界

- 当前 `compat.js` 的基础 tag 来自 TaCZ 官方默认包源码快照（`--dir`），**不是**整合包实际使用的 jar；`meta.warnings` 已标注，放入真 jar 后重跑 `gen:compat` 即可。
- 标签里引用了 3 个站内没有的配件（`gucci_attachments:muzzle_fr_maw86`、`tacz:muzzle_silence_mirage`、`tacz:muzzle_duckbill_sg`），属于 `gunsmith.js` 的缺口，暂不展示。
