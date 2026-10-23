// @ts-nocheck
// TODO(types): 与 app.ts / gunsmith.ts / recipes.ts 同为渲染层，后续统一后再收敛类型。
/* 梯度：读取 window.WZ_TIERS，渲染「枪械梯度 / 子弹梯度」两行（改枪台头部与枪械详情页头部共用） */
(function () {
  "use strict";

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function data() {
    const T = window.WZ_TIERS;
    return T && T.guns ? T : null;
  }
  function textures() {
    return window.WZ_TEXTURES || null;
  }
  function gunData(gunId) {
    const G = (window.WZ_GUNSMITH && window.WZ_GUNSMITH.guns) || {};
    return G[gunId] || null;
  }

  /* ---------------- 图标 ---------------- */
  function initial(name) {
    const s = String(name || "?").trim();
    return s ? s[0].toUpperCase() : "?";
  }
  function texIndex(iconId) {
    const T = textures();
    if (!T || !iconId) return -1;
    if (T.items && T.items[iconId] !== undefined) return T.items[iconId];
    if (T.blocks && T.blocks[iconId] !== undefined) return T.blocks[iconId];
    return -1;
  }
  function texStyle(index, size) {
    const T = textures();
    if (!T || index < 0) return "";
    const scale = size / T.size;
    const x = (index % T.cols) * T.size * scale;
    const y = Math.floor(index / T.cols) * T.size * scale;
    return (
      "background-size:" + T.cols * T.size * scale + "px " + T.rows * T.size * scale + "px;" +
      "background-position:-" + x + "px -" + y + "px;image-rendering:pixelated;"
    );
  }
  function iconHTML(iconId, label, size) {
    const index = texIndex(iconId);
    if (index >= 0) {
      return '<span class="item-ico tex" style="width:' + size + "px;height:" + size + "px;" + texStyle(index, size) + '" aria-hidden="true"></span>';
    }
    return '<span class="item-ico" aria-hidden="true">' + esc(initial(label)) + "</span>";
  }

  /* ---------------- 行的数据模型 ---------------- */
  /* 推断档位没有配方的元件，图标按枪械类型借一枚对应元件（不可点）。 */
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
        kind: "bullet",
        tier: null,
        label: "子弹梯度",
        name: (b && b.caliber) || ammo,
        ico: "tacz:ammo",
        href: null,
        inferred: false,
        note: "无模具",
      };
    }
    return {
      kind: "bullet",
      tier: b.tier,
      label: "子弹梯度",
      name: b.caliber || ammo,
      ico: b.mold || "tacz:ammo",
      href: b.mold ? "#/item/" + encodeURIComponent(b.mold) : null,
      inferred: false,
      note: null,
    };
  }

  function rows(gunId) {
    if (!data()) return [];
    return [gunRow(gunId), bulletRow(gunId)].filter(Boolean);
  }

  /* ---------------- 渲染：与枪械种类同排的 tag ---------------- */
  function badgeHTML(row) {
    const muted = !row.tier;
    const classes =
      "gs-badge tier-tag" +
      (row.tier ? " tier-" + row.tier : " muted") +
      (row.href ? " clickable" : "");
    const title = row.name ? row.label + "：" + row.name : row.label;
    const inner =
      (row.ico ? '<span class="tier-ico">' + iconHTML(row.ico, row.name, 16) + "</span>" : "") +
      '<span class="tier-text">' + esc(row.label) + "</span>" +
      (muted ? '<span class="tier-none">' + esc(row.note || "") + "</span>" : '<b class="tier-hl">' + esc(row.tier) + "</b>") +
      (row.inferred ? '<span class="tier-infer">· 推断</span>' : "");
    if (row.href) {
      return '<button type="button" class="' + classes + '" title="' + esc(title) + '" data-go="' + esc(row.href) + '">' + inner + "</button>";
    }
    return '<span class="' + classes + '" title="' + esc(title) + '">' + inner + "</span>";
  }

  /* 返回可直接塞进 .gs-badges / .meta 的 tag 串（枪械梯度 + 子弹梯度两项）。 */
  function badges(gunId) {
    return rows(gunId).map(badgeHTML).join("");
  }

  /* ---------------- 紧凑版：枪械卡片副标题用 ---------------- */
  /* 「图标 + 枪械T1」「图标 + 子弹T1」。卡片本身是 <button>，所以这里只能用 span，不可点。 */
  function miniHTML(row, clickable) {
    if (!row || !row.tier) return "";
    const label = (row.kind === "gun" ? "枪械" : "子弹") + row.tier;
    const title = row.label + (row.inferred ? "（推断）" : "") + (row.name ? "：" + row.name : "");
    const inner =
      '<span class="tier-ico">' + iconHTML(row.ico, row.name, 14) + "</span>" + esc(label);
    const cls = "gs-tier-mini tier-" + row.tier + (row.inferred ? " inferred" : "");
    // 卡片本身是 <button>，只能用 span；头部 .gs-badges 里可以点，跳组装元件 / 模具页
    if (clickable && row.href) {
      return (
        '<button type="button" class="' + cls + ' clickable" title="' + esc(title) +
        '" data-go="' + esc(row.href) + '">' + inner + "</button>"
      );
    }
    return '<span class="' + cls + '" title="' + esc(title) + '">' + inner + "</span>";
  }
  function mini(gunId, clickable) {
    return rows(gunId).map(function (r) { return miniHTML(r, clickable); }).join("");
  }

  window.WZ_TIERS_UI = {
    available: function () {
      return !!data();
    },
    rows: rows,
    badges: badges,
    mini: mini,
  };
})();
