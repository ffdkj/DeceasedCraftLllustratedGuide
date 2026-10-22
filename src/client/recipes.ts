// @ts-nocheck
// TODO(types): 与 app.ts / gunsmith.ts 同为渲染层，后续统一后再收敛类型。
/* 配方与造价：读取 window.WZ_RECIPES，渲染「枪械造价」区块（枪械详情页与改枪台共用） */
(function () {
  "use strict";

  const SLOT_LABEL = { scope: "瞄具", muzzle: "枪口", stock: "枪托", grip: "握把", laser: "激光", extended_mag: "弹匣 / 弹药" };

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function data() {
    const R = window.WZ_RECIPES;
    return R && R.recipes ? R : null;
  }
  function textures() {
    return window.WZ_TEXTURES || null;
  }
  function materialMeta(key) {
    const R = data();
    const meta = (R && R.materials && R.materials[key]) || null;
    return {
      key: key,
      label: (meta && meta.label) || key.replace(/^tag:/, ""),
      icon: (meta && meta.icon) || "",
      approx: !!(meta && meta.approx),
      tag: key.indexOf("tag:") === 0,
    };
  }
  function toMaterials(list) {
    if (!Array.isArray(list)) return null;
    return list.map(function (pair) {
      const meta = materialMeta(pair[0]);
      return { key: meta.key, label: meta.label, icon: meta.icon, approx: meta.approx, tag: meta.tag, count: Number(pair[1]) || 1 };
    });
  }
  function gunMaterials(gunId) {
    const R = data();
    if (!R) return null;
    return toMaterials(R.recipes.guns[gunId]);
  }
  function attachmentMaterials(attId) {
    const R = data();
    if (!R) return null;
    return toMaterials(R.recipes.attachments[attId]);
  }
  function isUnreleased(gunId) {
    const R = window.WZ_RECIPES;
    return !!(R && Array.isArray(R.unreleased) && R.unreleased.indexOf(gunId) >= 0);
  }
  function obtainable(gunId) {
    const R = window.WZ_RECIPES;
    const rec = (R && R.obtainable && R.obtainable[gunId]) || null;
    return { chest: !!(rec && rec.chest), npc: !!(rec && rec.npc), store: !!(rec && rec.store) };
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
      return '<div class="item-ico tex" style="width:' + size + "px;height:" + size + "px;" + texStyle(index, size) + '" aria-hidden="true"></div>';
    }
    return '<div class="item-ico" aria-hidden="true">' + esc(initial(label)) + "</div>";
  }

  /* ---------------- 造价渲染 ---------------- */
  function mergeMaterials(groups) {
    const out = [];
    const seen = Object.create(null);
    groups.forEach(function (materials) {
      (materials || []).forEach(function (m) {
        const hit = seen[m.key];
        if (hit) {
          hit.count += m.count;
          return;
        }
        const copy = { key: m.key, label: m.label, icon: m.icon, approx: m.approx, tag: m.tag, count: m.count };
        seen[m.key] = copy;
        out.push(copy);
      });
    });
    return out;
  }
  function gridHTML(materials, size) {
    return (
      '<div class="cost-mats">' +
      materials
        .map(function (m) {
          const title = m.label + (m.tag ? "（任选其一）" : "") + (m.approx ? " · 近似图标" : "") + " ×" + m.count;
          return (
            '<div class="cost-mat" title="' + esc(title) + '">' +
            iconHTML(m.icon, m.label, size) +
            '<span class="cost-count">' + m.count + "</span>" +
            (m.tag ? '<span class="cost-tag">任选</span>' : "") +
            '<span class="cost-label">' + esc(m.label) + "</span>" +
            "</div>"
          );
        })
        .join("") +
      "</div>"
    );
  }

  function wrap(sections, totalNote) {
    const all = mergeMaterials(sections.map(function (s) { return s.materials; }));
    const total = all.length && sections.length > 1
      ? '<div class="cost-total"><div class="cost-total-head">合计材料<span>' + all.length + " 种 · " +
        all.reduce(function (sum, m) { return sum + m.count; }, 0) + " 件</span></div>" + gridHTML(all, 32) + "</div>"
      : "";
    const groups = sections
      .map(function (s) {
        const head =
          '<div class="cost-group-head"><b>' + esc(s.title) + "</b>" +
          (s.sub ? "<span>" + esc(s.sub) + "</span>" : "") + "</div>";
        const body = s.materials && s.materials.length
          ? gridHTML(s.materials, 32)
          : '<div class="cost-note">' + esc(s.note || "无配方数据") + "</div>";
        return '<div class="cost-group">' + head + body + "</div>";
      })
      .join("");
    return (
      '<div class="section cost-block"><div class="section-head"><div class="section-title">枪械造价</div>' +
      "<div class=\"section-note\">" + esc(totalNote || "配方材料按整合包 recipes 生成") + "</div></div>" +
      total +
      '<div class="cost-groups">' + groups + "</div></div>"
    );
  }

  function gunEmptyNote(gunId, inGunsmith) {
    const gunName = gunDisplayName(gunId);
    if (isUnreleased(gunId)) {
      return { title: "枪械本体", sub: gunName, materials: null, note: "未实装：本版本无配方，也无法从战利品箱或交易获得" };
    }
    const ob = obtainable(gunId);
    const where = ob.chest ? "仅可从战利品箱获得" : ob.npc ? "仅可通过 NPC 交易获得" : ob.store ? "仅可在枪店陈列中看到" : "暂未收录配方";
    return { title: "枪械本体", sub: gunName, materials: null, note: "无配方：" + where };
  }

  function gunDisplayName(gunId) {
    const gs = (window.WZ_GUNSMITH && window.WZ_GUNSMITH.guns) || {};
    const guide = (window.WZ_GUIDES && window.WZ_GUIDES.guns) || [];
    const hit = guide.filter(function (g) { return g.id === gunId; })[0];
    return (gs[gunId] && gs[gunId].name) || (hit && hit.name) || gunId;
  }

  /** 枪械详情页：只算枪械本体。 */
  function gunCostSection(gunId) {
    if (!data()) return "";
    const materials = gunMaterials(gunId);
    if (!materials || !materials.length) return wrap([gunEmptyNote(gunId, false)]);
    return wrap([{ title: "枪械本体", sub: gunDisplayName(gunId), materials: materials }]);
  }

  /** 改枪台：枪械本体 + 当前已装配件，分组 + 合计。 */
  function buildCostSection(gunId, attachments) {
    if (!data()) return "";
    const slots = (window.WZ_GUNSMITH && window.WZ_GUNSMITH.slots) || [];
    const order = ["scope", "muzzle", "stock", "grip", "laser", "extended_mag"].filter(function (s) {
      return slots.some(function (x) { return (x.id || x) === s; }) || Object.prototype.hasOwnProperty.call(attachments || {}, s);
    });
    const sections = [];
    const gunMats = gunMaterials(gunId);
    sections.push(gunMats && gunMats.length ? { title: "枪械本体", sub: gunDisplayName(gunId), materials: gunMats } : gunEmptyNote(gunId, true));
    const atts = (window.WZ_GUNSMITH && window.WZ_GUNSMITH.attachments) || {};
    order.forEach(function (slot) {
      const attId = (attachments || {})[slot];
      if (!attId) return;
      const att = atts[attId];
      const materials = attachmentMaterials(attId);
      const sub = (att && att.name) || attId;
      sections.push(
        materials && materials.length
          ? { title: (SLOT_LABEL[slot] || slot) + " · " + sub, sub: "", materials: materials }
          : { title: (SLOT_LABEL[slot] || slot) + " · " + sub, sub: "", materials: null, note: "无配方：仅可从战利品箱获得" },
      );
    });
    return wrap(sections, "枪械本体 + 已装配配件");
  }

  function unreleasedBadge(gunId) {
    return isUnreleased(gunId) ? '<span class="badge unreleased">未实装</span>' : "";
  }

  window.WZ_RECIPES_UI = {
    available: function () { return !!data(); },
    isUnreleased: isUnreleased,
    obtainable: obtainable,
    gunMaterials: gunMaterials,
    attachmentMaterials: attachmentMaterials,
    gunCostSection: gunCostSection,
    buildCostSection: buildCostSection,
    unreleasedBadge: unreleasedBadge,
    gunDisplayName: gunDisplayName,
  };
})();
