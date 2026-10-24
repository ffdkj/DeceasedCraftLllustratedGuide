/* 亡者世界 · 梯度（枪械梯度 / 子弹梯度）
   数据：data/tiers.js（WZ_TIERS，由 scripts/gen-tiers.ts 从 recipes.js + loot.js 复算）
   - 枪械梯度：配方里的「组装元件」档位，多件取最高；无配方按枪械类型回落，标「· 推断」
   - 子弹梯度：该口径的「金属冲压模具」在战利品表里最低能搜刮到的区域档

   界面两处：
   1. 改枪台枪械卡片副标题（.gs-gun-sub）：缩写，卡片整体是按钮，所以不可点
   2. 工作台头部徽章行（.gs-badges）：缩写，可点 → 元件物品页 / 模具物品页

   屏幕阅读器拿到的 title 是「枪械梯度 T3：步枪组装元件」这种全称，缩写在视觉上只占 14px。 */
(function () {
  "use strict";

  const UI = function () { return window.WZ_APP_UI || {}; };

  function esc(v) {
    const f = UI().esc;
    if (f) return f(v);
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function data() {
    const T = window.WZ_TIERS;
    return T && T.guns ? T : null;
  }
  function gunData(gunId) {
    return (((window.WZ_GUNSMITH || {}).guns) || {})[gunId] || null;
  }

  /* 推断档位没有配方的元件，图标按枪械类型借一枚对应元件（不可点） */
  const TYPE_PART = {
    手枪: "deceasedcraft:pistol_assembly_parts",
    冲锋枪: "deceasedcraft:smg_assembly_parts",
    霰弹枪: "deceasedcraft:shotgun_assembly_parts",
    步枪: "deceasedcraft:rifle_assembly_parts",
    狙击枪: "deceasedcraft:sniper_assembly_parts",
    机枪: "deceasedcraft:hmg_assembly_parts",
    特殊: "deceasedcraft:special_assembly_parts",
    重型武器: "deceasedcraft:special_assembly_parts",
  };

  /* ---------------- 图标 ---------------- */
  function iconHTML(row, size) {
    const box = "width:" + size + "px;height:" + size + "px;";
    if (row.img) {
      return '<span class="tier-ico"><span class="item-ico ammo-ico" style="' + box +
        "background-image:url('" + esc(row.img) + "')" + '" aria-hidden="true"></span></span>';
    }
    if (row.ico) {
      const f = UI().itemIcon;
      if (f) return '<span class="tier-ico">' + f(row.ico, row.name || "", null, size) + "</span>";
    }
    return "";
  }

  /* ---------------- 行的数据模型 ---------------- */
  function gunRow(gunId) {
    const T = data();
    if (!T) return null;
    const g = (T.guns || {})[gunId];
    if (!g) return null;
    const part = g.part ? (T.parts || {})[g.part] : null;
    const gun = gunData(gunId);
    const type = String((gun && gun.type) || "");
    return {
      kind: "gun",
      tier: g.tier || null,
      label: "枪械梯度",
      name: part ? part.label : type || "无配方",
      ico: g.part || TYPE_PART[type] || "",
      href: g.part ? "#/item/" + encodeURIComponent(g.part) : null,
      inferred: !!g.inferred,
      note: null,
    };
  }

  function bulletRow(gunId) {
    const T = data();
    if (!T) return null;
    const gun = gunData(gunId);
    const ammo = String((gun && gun.ammo) || "");
    if (!ammo) {
      return { kind: "bullet", tier: null, label: "子弹梯度", name: "", ico: "", href: null, inferred: false, note: "无弹药" };
    }
    const b = (T.bullets || {})[ammo];
    if (!b || !b.tier) {
      return {
        kind: "bullet", tier: null, label: "子弹梯度",
        name: (b && b.caliber) || ammo, ico: "tacz:ammo", href: null, inferred: false, note: "无模具",
      };
    }
    return {
      kind: "bullet",
      tier: b.tier,
      label: "子弹梯度",
      name: b.caliber || ammo,
      /* 图标用「子弹本体」（弹药槽贴图），不是冲压模具那张图；
         点击落地页仍然是模具页（梯度由模具的最低可搜刮区域决定） */
      ico: "",
      img: UI().ammoTexture ? UI().ammoTexture(ammo) : "",
      href: b.mold ? "#/item/" + encodeURIComponent(b.mold) : null,
      inferred: false,
      note: null,
    };
  }

  function rows(gunId) {
    if (!data()) return [];
    return [gunRow(gunId), bulletRow(gunId)].filter(Boolean);
  }

  /* ---------------- 缩写：图标 + T1枪械 / T1子弹 ---------------- */
  function miniHTML(row, clickable) {
    if (!row || !row.tier) return "";
    const label = row.tier + (row.kind === "gun" ? "枪械" : "子弹");
    const title = row.label + (row.inferred ? "（推断）" : "") + (row.name ? "：" + row.name : "");
    const inner = iconHTML(row, 14) + esc(label);
    if (clickable && row.href) {
      return '<button type="button" class="gs-tier-mini tier-' + row.tier + ' clickable' +
        (row.inferred ? " inferred" : "") + '" title="' + esc(title) + '" data-go="' + esc(row.href) + '">' +
        inner + "</button>";
    }
    return '<span class="gs-tier-mini tier-' + row.tier + (row.inferred ? " inferred" : "") +
      '" title="' + esc(title) + '">' + inner + "</span>";
  }

  function mini(gunId, clickable) {
    return rows(gunId).map(function (r) { return miniHTML(r, clickable); }).join("");
  }

  window.WZ_TIERS_UI = {
    available: function () { return !!data(); },
    rows: rows,
    mini: mini,
  };
})();
