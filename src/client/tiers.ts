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

  /* ---------------- 渲染 ---------------- */
  function rowHTML(row) {
    const muted = !row.tier;
    const classes = "tier-row" + (row.tier ? " tier-" + row.tier : " muted");
    const inner =
      (row.ico ? '<span class="tier-ico">' + iconHTML(row.ico, row.name, 22) + "</span>" : "") +
      '<span class="tier-label">' + esc(row.label) + "</span>" +
      (muted ? '<span class="tier-badge none">' + esc(row.note || "—") + "</span>" : '<span class="tier-badge">' + esc(row.tier) + "</span>") +
      (row.name ? '<span class="tier-name">' + esc(row.name) + "</span>" : "") +
      (row.inferred ? '<span class="tier-note">· 推断</span>' : "");
    if (row.href) {
      return '<button type="button" class="' + classes + ' clickable" data-go="' + esc(row.href) + '">' + inner + "</button>";
    }
    return '<div class="' + classes + '">' + inner + "</div>";
  }

  function strip(gunId) {
    const list = rows(gunId);
    if (!list.length) return "";
    return '<div class="tier-strip">' + list.map(rowHTML).join("") + "</div>";
  }

  window.WZ_TIERS_UI = {
    available: function () {
      return !!data();
    },
    rows: rows,
    strip: strip,
  };
})();
