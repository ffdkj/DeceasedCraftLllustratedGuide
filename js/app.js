/* ============ 亡者世界 · 生存图鉴 ============ */
(function () {
  "use strict";

  const DATA = window.WZ_DATA;
  const SEED = window.WZ_SEED || { monsters: [], machines: [] };
  const GUIDE = window.WZ_GUIDES || {
    meta: {}, buildings: {}, story: [], armor: [], guns: [], melee: [],
    trinkets: [], defense: [], vehicles: [], npcs: [], monsters: []
  };
  const TEX = window.WZ_TEXTURES || null;
  const MDIFF = window.WZ_MONSTER_DIFF || { entities: {} };
  const MSPAWN = window.WZ_MONSTER_SPAWN || { entities: {} };
  const HORDE_DATA = window.WZ_HORDE_BUILDINGS || { buildings: [] };
  const MDIFF_INDEX = {}, MSPAWN_INDEX = {}, MDIFF_NAME = {};
  function mdKey(id) {
    let x = String(id || "").toLowerCase();
    if (x.indexOf("ent_") === 0) x = x.slice(4);
    return x;
  }
  function buildDataIndexes() {
    Object.keys(MDIFF.entities || {}).forEach(function (k) {
      const v = MDIFF.entities[k];
      MDIFF_INDEX[k] = v;
      MDIFF_INDEX[k.replace(/[:]/g, "_")] = v;
      if (v && v.name) MDIFF_NAME[String(v.name).replace(/\s/g, "")] = v;
    });
    Object.keys(MSPAWN.entities || {}).forEach(function (k) {
      const v = MSPAWN.entities[k];
      MSPAWN_INDEX[k] = v;
      MSPAWN_INDEX[k.replace(/[:]/g, "_")] = v;
    });
  }
  buildDataIndexes();
  function diffForMonster(m) {
    if (!m) return null;
    return MDIFF_INDEX[mdKey(m.entityId || m.id)] || MDIFF_NAME[String(m.name || "").replace(/\s/g, "")] || null;
  }
  function spawnForMonster(m) {
    if (!m) return null;
    return MSPAWN_INDEX[mdKey(m.entityId || m.id)] || null;
  }
  function hordeForBuilding(bid) {
    const key = String(bid || "");
    return (HORDE_DATA.buildings || []).filter(function (x) { return x.key === key; })[0] || null;
  }
  const STORE_KEY = "wz_guide_v1";
  const THEME_KEY = "wz_theme";

  function getTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "dark" || saved === "light") return saved;
    } catch (e) {}
    return window.innerWidth < 900 ? "light" : "dark";
  }
  function applyTheme(theme) {
    const t = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = t;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "light" ? "#f5f7fb" : "#090c0b");
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    return t;
  }
  function getViewMode() {
    try {
      const saved = localStorage.getItem("wz_viewmode");
      if (saved === "pc" || saved === "mobile") return saved;
    } catch (e) {}
    return window.innerWidth >= 900 ? "pc" : "mobile";
  }
  function viewMode() { return document.body.classList.contains("view-pc") ? "pc" : "mobile"; }
  function applyViewMode(m) {
    document.body.classList.toggle("view-pc", m === "pc");
    try { localStorage.setItem("wz_viewmode", m); } catch (e) {}
  }

  if (!DATA) {
    document.getElementById("view").innerHTML =
      '<div class="empty"><div class="em-title">数据未加载</div><div class="em-sub">请确认 data/loot.js 与 index.html 在同一目录结构中。</div></div>';
    return;
  }

  /* ---------------- 图标 ---------------- */
  const PATHS = {
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/>',
    back: '<path d="M15 18l-6-6 6-6"/>',
    chevron: '<path d="M9 18l6-6-6-6"/>',
  user: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  mobile: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    star: '<path d="M12 2.6l2.95 5.98 6.6.96-4.78 4.66 1.13 6.57L12 17.66l-5.9 3.1 1.13-6.57L2.45 9.54l6.6-.96L12 2.6z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>',
    trash: '<path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>',
    download: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
    upload: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
    skull: '<path d="M12 2a7 7 0 00-7 7v4a3 3 0 003 3h1v4h6v-4h1a3 3 0 003-3V9a7 7 0 00-7-7z"/><circle cx="9" cy="10" r="1.2"/><circle cx="15" cy="10" r="1.2"/><path d="M10 16v3M14 16v3"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.7 1.7 0 00-1.87-.34 1.7 1.7 0 00-1 1.55V21a2 2 0 11-4 0v-.09a1.7 1.7 0 00-1.11-1.55 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-1.55-1H3a2 2 0 110-4h.09A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06A1.7 1.7 0 009 4.6a1.7 1.7 0 001-1.55V3a2 2 0 114 0v.09a1.7 1.7 0 001 1.55 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06A1.7 1.7 0 0019.4 9a1.7 1.7 0 001.55 1H21a2 2 0 110 4h-.09a1.7 1.7 0 00-1.51 1z"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1"/>',
    box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    install: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M4 21h16"/>',
    bolt: '<path d="M13 2L3 14h8l-1 8 11-13h-8l1-7z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
    alert: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    filter: '<path d="M4 5h16M7 12h10M10 19h4"/>',
    sword: '<path d="M14.5 3.5L21 10l-7 7-2-2 5-5-5-5 2.5-2.5z"/><path d="M3 21l6-6M2 22l3-3"/>',
    gun: '<path d="M3 8h13v4h-3l-2 5H8l1-5H3V8z"/><path d="M16 10h5"/>',
    car: '<path d="M3 16v-3l2-5h14l2 5v3"/><path d="M3 16h18v3H3z"/><circle cx="7" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
    book: '<path d="M4 4h11a3 3 0 013 3v13H7a3 3 0 00-3 3V4z"/><path d="M4 20a3 3 0 013-3h11"/>',
    gem: '<path d="M6 3h12l3 6-9 12L3 9l3-6z"/><path d="M3 9h18M9 3l-3 6 6 12 6-12-3-6"/>',
    users: '<circle cx="9" cy="8" r="3"/><path d="M2 21v-1a5 5 0 015-5h4a5 5 0 015 5v1"/><path d="M17 11a3 3 0 100-6"/><path d="M22 21v-1a5 5 0 00-3-4.6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    crosshair: '<circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
    map: '<path d="M9 3l6 2 6-2v16l-6 2-6-2-6 2V5l6-2z"/><path d="M9 3v16M15 5v16"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A8.5 8.5 0 1111.2 3 7 7 0 0021 12.8z"/>',
    recipe: '<path d="M4 5h16v14H4z"/><path d="M8 5v14M16 5v14M4 12h16"/>',
    plane: '<path d="M2 16l20-6-20-6 5 6-5 6z"/><path d="M7 10h7"/>',
    ship: '<path d="M3 15h18l-3 5H6l-3-5z"/><path d="M6 15V9h12v6M12 9V3"/>'
  };
  function icon(name, size) {
    const s = size || 20;
    return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (PATHS[name] || "") + "</svg>";
  }
  const iconStarFill = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" aria-hidden="true">' + PATHS.star + "</svg>";

  /* ---------------- 工具 ---------------- */
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function q(id) { return document.getElementById(id); }
  function fmtPct(v) {
    if (v == null || v === "") return "—";
    const n = Number(v);
    if (!isFinite(n)) return esc(v);
    if (n >= 100) return "100%";
    if (n < 1) return n.toFixed(2) + "%";
    return (Math.round(n * 10) / 10) + "%";
  }
  function fmtNum(v) {
    if (v == null || v === "") return "—";
    return String(v);
  }
  function initial(name) {
    const s = String(name || "?").trim();
    if (!s) return "?";
    return s[0].toUpperCase();
  }

  /* ---------------- 贴图 ---------------- */
  function texIndexOf(id, nbt) {
    if (!TEX) return -1;
    if (nbt && TEX.nbt && TEX.nbt[nbt] !== undefined) return TEX.nbt[nbt];
    if (id && TEX.items && TEX.items[id] !== undefined) return TEX.items[id];
    if (id && TEX.blocks && TEX.blocks[id] !== undefined) return TEX.blocks[id];
    return -1;
  }
  function texStyle(index, size) {
    if (!TEX || index < 0) return "";
    const scale = size / TEX.size;
    const x = (index % TEX.cols) * TEX.size * scale;
    const y = Math.floor(index / TEX.cols) * TEX.size * scale;
    return "background-size:" +
      (TEX.cols * TEX.size * scale) + "px " + (TEX.rows * TEX.size * scale) +
      "px;background-position:-" + x + "px -" + y + "px;image-rendering:pixelated;";
  }
  function texIcon(id, name, nbt, cls, size) {
    const index = texIndexOf(id, nbt);
    if (index >= 0) {
      return '<div class="' + cls + ' tex" style="width:' + size + "px;height:" + size + "px;" +
        texStyle(index, size) + '" role="img" aria-label="' + esc(name) + '"></div>';
    }
    return '<div class="' + cls + '" aria-hidden="true">' + esc(initial(name)) + "</div>";
  }
  function itemIcon(id, name, nbt, size) {
    return texIcon(id, name, nbt, "item-ico", size || 32);
  }
  function machineIcon(m, size) {
    const bid = (m.blockIds || [])[0];
    const index = bid ? texIndexOf(bid, null) : -1;
    if (index >= 0) {
      return '<div class="avatar tex" style="width:' + size + "px;height:" + size + "px;" +
        texStyle(index, size) + '" role="img" aria-label="' + esc(m.name) + '"></div>';
    }
    return '<div class="avatar" style="color:var(--amber)">' + icon("gear", size >= 50 ? 26 : 20) + "</div>";
  }
  function firstNbt(rec) {
    if (!rec || !rec.nbts || !rec.nbts.size) return null;
    return Array.from(rec.nbts)[0];
  }
  function monsterAvatar(m, size) {
    const img = m.thumb || m.image;
    if (img) {
      return '<div class="avatar monster-avatar" style="width:' + size + "px;height:" + size +
        "px;background-image:url('" + esc(img) + "')\" role=\"img\" aria-label=\"" + esc(m.name) + '"></div>';
    }
    return '<div class="avatar" style="color:var(--red)">' + icon("skull", size >= 50 ? 26 : 20) + "</div>";
  }
  function monsterHeroHTML(m) {
    if (!m.image) return "";
    const iconClass = /图鉴生物图标|实体贴图/.test(m.imageNote || "") ? " pixel" : "";
    return '<div class="monster-hero"><img class="' + iconClass + '" src="' + esc(m.image) + '" alt="' + esc(m.name) +
      '" loading="lazy" onerror="this.closest(\'.monster-hero\').style.display=\'none\'">' +
      (m.imageNote ? '<div class="monster-hero-note">' + esc(m.imageNote) + "</div>" : "") +
      "</div>";
  }
  function debounce(fn, ms) {
    let t;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(null, args); }, ms || 140);
    };
  }
  function clampPct(p) {
    const n = Number(p);
    if (!isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }
  function tone(id) {
    return {
      suburb: "#7fc79a", office: "#7ea8c9", hotel: "#b09acb",
      residential: "#66b7a8", retail: "#d98fa6", wasteland: "#e07a5f",
      wild: "#b4d25a", street: "#9aa59c"
    }[id] || "#e0a94a";
  }

  /* ---------------- 状态 ---------------- */
  const DEFAULT_STATE = {
    favorites: { items: [], monsters: [], machines: [] },
    customMonsters: [],
    customMachines: [],
    overrides: { monsters: {}, machines: {} },
    settings: {}
  };
  let state = loadState();
  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULT_STATE));
      const s = JSON.parse(raw);
      return {
        favorites: Object.assign({ items: [], monsters: [], machines: [] }, s.favorites || {}),
        customMonsters: Array.isArray(s.customMonsters) ? s.customMonsters : [],
        customMachines: Array.isArray(s.customMachines) ? s.customMachines : [],
        overrides: {
          monsters: (s.overrides && s.overrides.monsters) || {},
          machines: (s.overrides && s.overrides.machines) || {}
        },
        settings: s.settings || {}
      };
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (e) { toast("本地存储空间不足，保存失败"); }
  }
  function isFav(type, id) { return state.favorites[type].indexOf(id) >= 0; }
  function toggleFav(type, id) {
    const arr = state.favorites[type];
    const i = arr.indexOf(id);
    let on;
    if (i >= 0) { arr.splice(i, 1); on = false; }
    else { arr.push(id); on = true; }
    saveState();
    document.querySelectorAll("[data-fav-id]").forEach(function (btn) {
      if (btn.dataset.favId === id && btn.dataset.favType === type) {
        btn.classList.toggle("on", on);
        if (btn.classList.contains("icon-btn")) btn.classList.toggle("accent", on);
        btn.innerHTML = on ? iconStarFill : icon("star");
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      }
    });
    toast(on ? "已加入收藏" : "已取消收藏");
    if (location.hash.indexOf("#/me/favorites") === 0) renderFavorites();
    return on;
  }

  const ui = {
    lootQuery: "",
    regionQuery: {},
    buildingPart: {},
    monsterQuery: "",
    monsterCat: "全部",
    monsterZone: "全部",
    machineQuery: "",
    machineCat: "全部",
    guideQuery: {},
    guideGroup: {},
    npcTradeOpen: {},
    favTab: "items",
    itemBack: "#/loot",
    showAllSources: false,
    installPrompt: null
  };

  /* ---------------- 数据索引 ---------------- */
  // 荒野与街道是战利品表中的分散/子区域，补齐气候与阶级，便于统一配色
  const REGION_FALLBACK = {
    wild: { tier: "T1-T3", climate: "炎热 / 寒冷", note: "T1-T3 均有 · 荒野分散区域（无辐射）" },
    street: { tier: "T1-T3", climate: "炎热 / 寒冷", note: "T1-T3 均有 · 街道正面区域" }
  };
  DATA.regions.forEach(function (r) {
    const f = REGION_FALLBACK[r.id];
    if (!f) return;
    if (!r.tier) r.tier = f.tier;
    if (!r.climate) r.climate = f.climate;
    if (!r.note) r.note = f.note;
  });
  // 出自 FTB 区域介绍章节中被标记为“尸潮建筑”的条目（horde_buildings 分区）
  const HORDE_BUILDINGS = new Set([
    "multi_flatapartment", "multi_flatmedium", "multi_policeapartment", "multi_hospitaldamaged",
    "multi_verticalschool", "multi_taigaresidence", "multi_oasiscondo",
    "multi_gallery", "multi_casino", "multi_sunkenclub", "multi_thering",
    "multi_courtyardofficetower", "multi_filmworkstower", "multi_timbertower",
    "multi_officethefirst", "multi_workshop", "building_policeoffice1", "multi_airforcebase", "multi_nuclearpowerplant",
    "multi_terraceplaza", "multi_gunstore", "multi_hospital", "multi_convenientstore",
    "multi_polyclinic", "multi_communitycenter", "multi_policestation",
    "multi_laboratory", "multi_militarybase", "multi_militaryradiocamp", "multi_pumpjack",
    "multi_workerquarters", "multi_alienresearch", "multi_nuclearpowerplant"
  ]);
  const gunLootIds = new Set((GUIDE.guns || []).map(function (g) { return g.id; }));
  DATA.regions.forEach(function (r) {
    let entries = 0, containers = 0, floors = 0;
    r.buildings.forEach(function (b) {
      let be = 0, bc = 0, bf = 0;
      let bparts = 0;
      let gunChance = 0;
      b.parts.forEach(function (p) {
        bparts++;
        p.floors.forEach(function (f) {
          bf++;
          f.containers.forEach(function (c) {
            bc++;
            be += c.items.length;
            c.items.forEach(function (it) {
              const id = it[0] || "";
              if (id === "tacz:modern_kinetic_gun" || gunLootIds.has(id)) {
                gunChance = Math.max(gunChance, Number(it[4] || 0));
              }
            });
          });
        });
      });
      b._entries = be; b._containers = bc; b._floors = bf; b._partCount = bparts;
      b._region = r;
      b._horde = HORDE_BUILDINGS.has(b.id) || !!b.horde;
      b._hordeLevel = b.hordeLevel;
      b._gunChance = gunChance;
      b._sizeKind = b.sizeKind || (bparts < 2 ? "small" : (bparts <= 4 ? "medium" : (bparts >= 12 ? "super" : "large")));
      if (b._horde && hordeSkullCount(b) >= 5) b._sizeKind = "super";
      entries += be; containers += bc; floors += bf;
    });
    r._entries = entries; r._containers = containers; r._floors = floors;
  });

  function climateClass(region) {
    if (!region) return "climate-warm";
    if (region.climate === "辐射" || region.id === "wasteland") return "climate-rad";
    if (String(region.climate || "").indexOf("/") >= 0) return "climate-mixed";
    if (region.climate === "炎热") return "climate-hot";
    if (region.climate === "寒冷") return "climate-cold";
    return "climate-warm";
  }
  function climateIcon(region) {
    return climateClass(region) === "climate-rad" ? "☢️" : "";
  }
  function radiationBanner(region) {
    if (!region || climateClass(region) !== "climate-rad") return "";
    return '<div class="rad-banner"><span class="rad-banner-tag">辐射</span> 高辐射区域 · 请穿戴防护服并携带抗辐射药剂</div>';
  }
  function buildingSizeBadges(b) {
    if (b._sizeKind === "super") return '<span class="b-size super" title="超大型建筑（' + b._partCount + ' 区块）">超大型</span>';
    const kinds = { small: ["szdot gray", 1], medium: ["szdot blue", 2], large: ["szdot gold", 3] };
    const kind = kinds[b._sizeKind] || kinds.small;
    let h = '<span class="b-size" title="建筑体型：' + (b._sizeKind === "small" ? "小型" : b._sizeKind === "medium" ? "中型" : "大型") + '（' + b._partCount + " 区块）\">";
    for (let i = 0; i < kind[1]; i++) h += '<i class="' + kind[0] + '"></i>';
    return h + "</span>";
  }
  function hordeSkullCount(b) {
    if (b && b._hordeLevel != null) return Math.max(1, Math.min(5, Number(b._hordeLevel) || 5));
    const parts = Number(b._partCount || 1);
    let n = 2;
    if (parts >= 3) n = 3;
    if (parts >= 6) n = 4;
    if (parts >= 10) n = 5;
    if (b._region && b._region.tier === "T4") n = Math.min(5, n + 1);
    if (b._region && b._region.tier === "T2" && /警|police|派出所/i.test(String(b.name || ""))) n = 3;
    return Math.max(2, Math.min(5, n));
  }
  function buildingHordeBadge(b) {
    if (!b._horde) return "";
    const n = hordeSkullCount(b);
    let h = '<span class="b-horde" title="尸潮建筑：规模 ' + n + '/5，进入后需先清理尸潮才能搜刮">';
    for (let i = 0; i < n; i++) h += itemIcon("minecraft:zombie_head", "僵尸头颅", null, 13);
    return h + "</span>";
  }
  function buildingLootTag(b) {
    if (b._gunChance >= 12) return '<span class="b-loot high">高概率产出枪械</span>';
    if (b._gunChance >= 5) return '<span class="b-loot mid">可能产出枪械</span>';
    if (b._gunChance > 0) return '<span class="b-loot low">少量枪械</span>';
    return "";
  }
  function buildingTitleHTML(b) {
    return '<span class="b-title">' + esc(b.name) + "</span>" + buildingHordeBadge(b) + buildingSizeBadges(b);
  }

  const itemIndex = new Map();
  const buildingList = [];
  const partMap = new Map();
  DATA.regions.forEach(function (r) {
    r.buildings.forEach(function (b) {
      buildingList.push({ region: r, building: b });
      b.parts.forEach(function (p) {
        partMap.set(p.id, { region: r, building: b });
        p.floors.forEach(function (f) {
          f.containers.forEach(function (c) {
            c.items.forEach(function (it) {
              const key = it[0] || "(unknown)";
              let rec = itemIndex.get(key);
              if (!rec) {
                rec = { id: key, name: it[1] || key, names: new Set(), nbts: new Set(), sources: [], bestDrop: 0 };
                itemIndex.set(key, rec);
              }
              if (it[1]) rec.names.add(it[1]);
              if (it[7]) rec.nbts.add(it[7]);
              if (Number(it[4]) > rec.bestDrop) rec.bestDrop = Number(it[4]);
              rec.sources.push({ r: r, b: b, p: p, f: f, c: c, it: it });
            });
          });
        });
      });
    });
  });
  const itemList = Array.from(itemIndex.values());
  itemList.forEach(function (rec) {
    rec.sources.sort(function (a, b) {
      return Number(b.it[4]) - Number(a.it[4]) || (Number(b.it[3]) || 0) - (Number(a.it[3]) || 0);
    });
    rec.search = (rec.name + " " + rec.id + " " + Array.from(rec.nbts).join(" ")).toLowerCase();
  });

  const blockMap = new Map();
  DATA.blocks.forEach(function (b) {
    if (!blockMap.has(b.id)) blockMap.set(b.id, []);
    blockMap.get(b.id).push(b);
  });

  // 机器/怪物合并视图
  function allMonsters() {
    // 只使用整合包实体清单；旧版联网种子中的预览/非刷新怪物不再混入
    const out = [];
    (GUIDE.monsters || []).forEach(function (m) {
      function baseName(v) { return String(v || "").split(" / ")[0].trim(); }
      const idx = out.findIndex(function (x) { return x.id === m.id || baseName(x.name) === baseName(m.name); });
      const ov = state.overrides.monsters[m.id];
      const obj = ov ? Object.assign({}, m, ov, { _override: true }) : Object.assign({}, m, { _guide: true });
      // 图鉴数据优先于内置种子，避免同名旧条目覆盖新贴图与新分级
      if (idx >= 0) out[idx] = obj; else out.push(obj);
    });
    return out;
  }
  function allMachines() {
    const out = SEED.machines.map(function (m) {
      const ov = state.overrides.machines[m.id];
      return ov ? Object.assign({}, m, ov, { _override: true }) : Object.assign({}, m, { _seed: true });
    });
    state.customMachines.forEach(function (m) {
      out.push(Object.assign({}, m, { _custom: true }));
    });
    return out;
  }
  function findMonster(id) {
    return allMonsters().filter(function (m) { return m.id === id; })[0] || null;
  }
  function findMachine(id) {
    return allMachines().filter(function (m) { return m.id === id; })[0] || null;
  }

  /* ---------------- 图鉴数据类型 ---------------- */
  const GUIDE_TYPES = {
    armor: { title: "护甲套装", list: "#/gear/armor", back: "#/gear", data: GUIDE.armor || [], groupKey: "tier", icon: "shield", subtitle: "护甲套装、部件与套装效果", accent: "#e0a94a" },
    guns: { title: "枪械库", list: "#/gear/guns", back: "#/gear", data: GUIDE.guns || [], groupKey: "type", icon: "crosshair", subtitle: "TACZ 枪械数据：伤害、射速、弹容与弹药", accent: "#7ea8c9" },
    ammo: { title: "弹药库", list: "#/gear/ammo", back: "#/gear", data: GUIDE.ammo || [], groupKey: "type", icon: "box", subtitle: "TACZ 全弹药：合成材料、适用枪械与区域来源", accent: "#e0a94a" },
    melee: { title: "近战兵器库", list: "#/gear/melee", back: "#/gear", data: GUIDE.melee || [], groupKey: "weaponType", icon: "sword", subtitle: "按任务书武器类型分类：斧 / 刀 / 砍刀 / 剑 / 武士刀 / 锤 / 盾牌等", accent: "#e07a5f" },
    trinkets: { title: "饰品收藏", list: "#/gear/trinkets", back: "#/gear", data: GUIDE.trinkets || [], groupKey: "group", icon: "gem", subtitle: "饰品、徽章与收藏品", accent: "#b09acb" },
    defense: { title: "防御工事", list: "#/world/defense", back: "#/world", data: (GUIDE.defense || []).filter(function (x) { return x.group !== "机械动力火炮"; }), groupKey: "group", icon: "shield", subtitle: "按 FTB 任务书分类的基地防御", accent: "#7fc79a" },
    vehicles: { title: "载具", list: "#/world/vehicles", back: "#/world", data: GUIDE.vehicles || [], groupKey: "group", icon: "car", subtitle: "民用 / 军用 / 船只 / 飞机", accent: "#7fc79a" },
    story: { title: "剧情故事", list: "#/world/story", back: "#/world", data: GUIDE.story || [], groupKey: "region", icon: "book", subtitle: "5.11.19 全剧情书整理", accent: "#e0a94a" },
    npcs: { title: "NPC", list: "#/creatures/npcs", back: "#/creatures", data: GUIDE.npcs || [], groupKey: "faction", icon: "users", subtitle: "友军、敌对与雇佣兵", accent: "#7fc79a" }
  };

  const GUIDE_DETAIL_PATHS = {
    armor: "armor", guns: "gun", ammo: "ammo", melee: "melee", trinkets: "trinket",
    vehicles: "vehicles", defense: "defense", story: "story", npcs: "npc"
  };
  function guideDetailHref(type, id) {
    const seg = GUIDE_DETAIL_PATHS[type] || type;
    const base = (type === "vehicles" || type === "story" || type === "defense") ? "#/world/" : type === "npcs" ? "#/creatures/" : "#/gear/";
    return base + seg + "/" + encodeURIComponent(id);
  }

  function hubCard(opts) {
    const img = opts.image || "";
    return '<button class="hub-card' + (img ? " has-img" : "") + '" style="--hub-accent:' + opts.accent + '" data-go="' + opts.href + '">' +
      (img ? '<img class="hub-bg" src="' + esc(img) + '" alt="" loading="lazy"><span class="poster-view" data-action="view-poster" data-img="' + esc(img) + '" role="button" tabindex="0" title="查看海报">⤢</span>' : "") +
      '<div class="hub-icon">' + icon(opts.icon, 22) + "</div>" +
      '<div class="hub-title">' + esc(opts.title) + "</div>" +
      '<div class="hub-sub">' + esc(opts.sub) + "</div>" +
      '<div class="hub-count">' + Number(opts.count || 0).toLocaleString() + "<span>" + esc(opts.unit || "条") + "</span></div>" +
      "</button>";
  }

  function renderCreaturesHub() {
    renderTopbar({});
    document.title = "生物图鉴 · 亡者世界";
    const monsterCount = allMonsters().length;
    const npcCount = (GUIDE.npcs || []).length;
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass("creatures") + '"' + heroStyle("creatures") + '><h1>生物图鉴</h1><div class="meta"><span class="badge">怪物</span><span class="badge custom">NPC</span><span class="badge">按区域划分</span></div>' +
        '<div class="hero-desc" style="margin-top:10px">感染者、变异体、Boss，以及幸存者、敌对势力与 PMC 雇佣兵。怪物按威胁等级筛选，NPC 按阵营划分。</div></div>' +
      '<div class="section"><div class="hub-grid">' +
        hubCard({ href: "#/creatures/monsters", image: (GUIDE.meta.banners||{}).monsters, icon: "skull", title: "怪物", sub: "普通 / 特殊 / 小头目 / 头领 / 灾厄 / 真菌", count: monsterCount, unit: "种", accent: "#e07a5f" }) +
        hubCard({ href: "#/creatures/npcs", image: (GUIDE.meta.banners||{}).npcs, icon: "users", title: "NPC", sub: "友军 / 敌对 / 雇佣兵", count: npcCount, unit: "个", accent: "#7fc79a" }) +
      "</div></div>" +
      '<div class="section"><div class="guide-note">' + icon("info", 18) + "<div>怪物按自然刷新、尸潮/结构刷新收录；血量、伤害、护甲取自 KubeJS 属性脚本，缺失时保留实测值或「待补充」。</div></div></div>";
  }

  function renderGearHub() {
    renderTopbar({});
    document.title = "装备图鉴 · 亡者世界";
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass("gear") + '"' + heroStyle("gear") + '><h1>装备图鉴</h1><div class="meta"><span class="badge">套装</span><span class="badge">枪械</span><span class="badge">近战</span><span class="badge">饰品</span></div>' +
        '<div class="hero-desc" style="margin-top:10px">从护甲套装到 TACZ 枪械，再到近战武器与饰品。数据来自任务书、模组配置与本地整合包。</div></div>' +
      '<div class="section"><div class="hub-grid">' +
        hubCard({ href: "#/gear/armor", image: (GUIDE.meta.banners||{}).armor, icon: "shield", title: "护甲套装", sub: "护甲部件与套装效果", count: GUIDE_TYPES.armor.data.length, unit: "套", accent: "#e0a94a" }) +
        hubCard({ href: "#/gear/guns", image: (GUIDE.meta.banners||{}).guns, icon: "crosshair", title: "枪械库", sub: "伤害 / 射速 / 弹容 / 弹药", count: GUIDE_TYPES.guns.data.length, unit: "把", accent: "#7ea8c9" }) +
        hubCard({ href: "#/gear/ammo", image: (GUIDE.meta.banners||{}).gear, icon: "box", title: "弹药库", sub: "合成材料 / 适用枪械 / 区域来源", count: (GUIDE.ammo || []).length, unit: "种", accent: "#e0a94a" }) +
        hubCard({ href: "#/gear/gunsmith", image: (GUIDE.meta.banners||{}).guns, icon: "gear", title: "改枪台", sub: "配件兼容 / 数值对比 / 推荐方案", count: ((window.WZ_GUNSMITH || {}).counts || {}).attachments || 0, unit: "件配件", accent: "#7fc79a" }) +
        hubCard({ href: "#/gear/melee", image: (GUIDE.meta.banners||{}).melee, icon: "sword", title: "近战兵器库", sub: "棒球棒 / 斧 / 刀 / 特殊武器", count: GUIDE_TYPES.melee.data.length, unit: "件", accent: "#e07a5f" }) +
        hubCard({ href: "#/gear/trinkets", image: (GUIDE.meta.banners||{}).trinkets, icon: "gem", title: "饰品收藏", sub: "饰品、徽章与收藏", count: GUIDE_TYPES.trinkets.data.length, unit: "件", accent: "#b09acb" }) +
      "</div></div>" +
      '<div class="section"><div class="guide-note">' + icon("info", 18) + "<div>套装效果解析自 <span class=\"mono\">config/armorsets</span>；枪械数据解析自 TACZ 的 index / data 文件；近战与饰品来自任务书条目。</div></div></div>";
  }

  function renderChangelog() {
    const logs = window.WZ_CHANGELOG || [];
    renderTopbar({ back: "#/world", title: "更新日志", sub: logs.length + " 个版本" });
    document.title = "更新日志 · 亡者世界";
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass("world") + '"' + heroStyle("world") + '><h1>更新日志</h1><div class="meta"><span class="badge">5.11.0 → 5.11.19</span><span class="badge custom">整理自官方日志</span></div><div class="hero-desc" style="margin-top:10px">按版本查看新增内容、平衡调整与修复。最新版本排在最前。</div></div>' +
      '<div class="section log-list">' + logs.map(function (log, i) {
        const cleanTitle = log.title.replace(/^v?[\d.]+\s*(更新日志|更新列表|Patch Notes[^:：]*)?[:：]?/i, "").trim();
        return '<details class="log-item"' + (i === 0 ? " open" : "") + '><summary><span class="log-version">v' + esc(log.version) + '</span><span class="log-title">' + esc(cleanTitle || "版本改动") + '</span><span class="log-count">' + log.items.length + ' 条</span></summary><ul>' + log.items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul></details>';
      }).join("") + '</div>' +
      '<div class="section"><div class="guide-note">' + icon("info", 18) + '<div>更新日志来自《更新日志.xlsx》，按原文整理；部分版本条目含作者署名与原文说明。</div></div></div>';
  }
  function renderWorldHub() {
    renderTopbar({});
    document.title = "世界图鉴 · 亡者世界";
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass("world") + '"' + heroStyle("world") + '><h1>世界图鉴</h1><div class="meta"><span class="badge">载具</span><span class="badge">剧情</span><span class="badge">防御</span></div>' +
        '<div class="hero-desc" style="margin-top:10px">载具组装、全剧情书与基地防御。建筑外观与战利品已合并到「区域战利品」板块，避免重复。</div></div>' +
      '<div class="section"><div class="hub-grid">' +
        hubCard({ href: "#/world/vehicles", image: (GUIDE.meta.banners||{}).vehicles, icon: "car", title: "载具", sub: "民用 / 军用 / 船只 / 飞机", count: GUIDE_TYPES.vehicles.data.length, unit: "种", accent: "#7ea8c9" }) +
        hubCard({ href: "#/world/story", image: (GUIDE.meta.banners||{}).story, icon: "book", title: "剧情故事", sub: "新闻 / 各区域笔记与录音", count: GUIDE_TYPES.story.data.length, unit: "篇", accent: "#e0a94a" }) +
        hubCard({ href: "#/world/difficulty", image: (GUIDE.meta.banners||{}).world, icon: "skull", title: "世界难度", sub: "和平 / 简单 / 普通 / 困难 / 末日", count: 5, unit: "级", accent: "#e07a5f" }) +
        hubCard({ href: "#/world/tech", image: "./images/guides/bg_tech.webp", icon: "gear", title: "科技板块", sub: "机械动力生产线 / 火炮系统", count: allMachines().length, unit: "条", accent: "#e8c15a" }) +
        hubCard({ href: "#/world/defense", image: (GUIDE.meta.banners||{}).defense, icon: "shield", title: "防御工事", sub: "爆炸物 / 防御墙 / 电击 / 炮塔", count: GUIDE_TYPES.defense.data.length, unit: "条", accent: "#7fc79a" }) +
        hubCard({ href: "#/world/changelog", image: (GUIDE.meta.banners||{}).home, icon: "book", title: "更新日志", sub: "5.11.0 → 5.11.19 版本改动", count: (window.WZ_CHANGELOG || []).length, unit: "版", accent: "#b09acb" }) +
      "</div></div>" +
      '<div class="section"><div class="guide-note">' + icon("info", 18) + "<div>载具配方来自 MTS / Immersive Aircraft 定义；剧情书整理截止 5.11.19；改枪台方案可用 WZG1- 分享码传递。</div></div></div>";
  }

  /* ---------------- 通用图鉴列表 / 详情 ---------------- */
  function guideGroups(type) {
    if (type === "vehicles") {
      const order = ["民用车辆", "军用车辆", "船只", "民用飞机", "军用飞机", "火车", "其他载具"];
      const present = new Set((GUIDE_TYPES.vehicles.data || []).map(function (x) { return x.group; }));
      return ["全部"].concat(order.filter(function (g) { return present.has(g); }));
    }
    if (type === "defense") {
      const order = ["爆炸物", "防御墙", "工事加固", "电击陷阱", "自动炮塔", "机械动力火炮", "其他防御"];
      const present = new Set((GUIDE_TYPES.defense.data || []).map(function (x) { return x.group; }));
      return ["全部"].concat(order.filter(function (g) { return present.has(g); }));
    }
    if (type === "melee") {
      const order = ["斧", "刀", "砍刀", "剑", "武士刀", "锤", "棒球棒", "铁锹", "锄", "棍棒", "撬棍", "拳套", "电棍", "盾牌", "镰刀", "其他"];
      const present = new Set((GUIDE_TYPES.melee.data || []).map(function (x) { return x.weaponType; }));
      return ["全部"].concat(order.filter(function (g) { return present.has(g); }));
    }
    const cfg = GUIDE_TYPES[type];
    const set = new Set();
    (cfg.data || []).forEach(function (x) {
      let v = x[cfg.groupKey];
      if (type === "armor" && !v) v = "未分类";
      if (v) set.add(String(v));
    });
    return ["全部"].concat(Array.from(set));
  }
  function guideGroupOf(type, item) {
    let v = item[GUIDE_TYPES[type].groupKey];
    if (type === "armor" && !v) v = "未分类";
    return v ? String(v) : "其他";
  }
  function starsHTML(n,label) {
    const v=Math.max(1,Math.min(5,Number(n)||1));
    return '<span class="star-rating" title="' + esc(label||"") + ' ' + v + '/5">' + "★★★★★".slice(0,v) + "☆☆☆☆☆".slice(0,5-v) + "</span>";
  }
  function renderDefenseTree(type,list) {
    const box=q("guide-list-"+type); if(!box) return;
    const cols={};
    list.forEach(function(d){ const x=Number(d.x||0); (cols[x]=cols[x]||[]).push(d); });
    const xs=Object.keys(cols).map(Number).sort(function(a,b){return a-b;});
    box.innerHTML='<div class="defense-columns">'+xs.map(function(x){
      return '<div class="defense-col"><div class="defense-col-head">阶段 '+ (xs.indexOf(x)+1) +'</div>'+
        cols[x].sort(function(a,b){return Number(a.y||0)-Number(b.y||0);}).map(function(d){
          return '<button class="defense-node" data-go="'+guideDetailHref("defense",d.id)+'">'+guideThumb(d,40,"defense")+
            '<span class="defense-node-main"><b>'+esc(d.name)+'</b><small>'+esc(d.group||"")+'</small></span></button>';
        }).join("")+'</div>';
    }).join("")+'</div>';
  }
  function renderGunTable() {
    renderTopbar({back:"#/gear/guns", title:"枪械数据表", sub:"按基础伤害排序"});
    document.title="枪械数据表 · 亡者世界";
    const rows=(GUIDE.guns||[]).map(function(g){
      const gs=((window.WZ_GUNSMITH||{}).guns||{})[g.id]||{};
      return {id:g.id,name:g.name,type:g.type,damage:gs.damage!=null?gs.damage:g.damage,rpm:gs.rpm!=null?gs.rpm:g.rpm,mag:gs.mag!=null?gs.mag:g.mag,ammo:gs.ammoName||gs.ammo||g.ammo||"",armor:gs.armorIgnore!=null?gs.armorIgnore:g.armorIgnore,head:gs.headshot||g.headshot,range:gs.range||0,weight:gs.weight||0};
    }).sort(function(a,b){return (b.damage||0)-(a.damage||0)||(b.rpm||0)-(a.rpm||0);});
    q("view").innerHTML=
      '<div class="detail-hero' + heroClass("guns") + '"' + heroStyle("guns") + '><h1>枪械数据表</h1><div class="meta"><span class="badge">'+rows.length+' 把</span><span class="badge custom">TACZ data 同步</span></div><div class="hero-desc" style="margin-top:10px">按基础伤害从高到低排列；数值来自 TACZ index/data，换弹优先取 script_param。点击行进入枪械详情。</div></div>'+
      '<div class="section"><div class="table-wrap"><table class="data-table"><thead><tr><th>枪械</th><th>类型</th><th>伤害</th><th>RPM</th><th>弹容</th><th>弹药</th><th>穿甲</th><th>爆头</th><th>射程</th><th>重量</th></tr></thead><tbody>'+
      rows.map(function(r){return '<tr data-go="'+guideDetailHref("guns",r.id)+'"><td>'+esc(r.name||r.id)+'</td><td>'+esc(r.type||"")+'</td><td><b>'+fmtNum(r.damage)+'</b></td><td>'+fmtNum(r.rpm)+'</td><td>'+fmtNum(r.mag)+'</td><td>'+esc(r.ammo)+'</td><td>'+Math.round((r.armor||0)*100)+'%</td><td>'+fmtNum(r.head)+'×</td><td>'+fmtNum(r.range)+'</td><td>'+fmtNum(r.weight)+'</td></tr>';}).join("")+
      '</tbody></table></div></div>'+
      '<div class="section"><div class="guide-note">'+icon("info",18)+'<div>枪械表同时导出为「枪械数据表.csv / .html」，可在压缩包根目录查看。</div></div></div>';
  }
  function renderVehicleAudit() {
    renderTopbar({back:"#/world/vehicles", title:"载具补全清单", sub:"按整合包 jsondefs/vehicles 核对"});
    document.title="载具补全清单 · 亡者世界";
    const a=GUIDE.vehicleAudit||{items:[]};
    q("view").innerHTML=
      '<div class="detail-hero' + heroClass("world") + '"' + heroStyle("world") + '><h1>载具补全清单</h1><div class="meta"><span class="badge">'+a.totalDefinitions+' 个定义</span><span class="badge custom">补入 '+a.modelsAdded+' 个模型</span></div><div class="hero-desc" style="margin-top:10px">按 MTS / QMP / Belroft / OAmP 的 jsondefs/vehicles 与当前图鉴对照；变体并入对应基础车型，不再重复计数。</div></div>'+
      '<div class="section"><div class="stat-grid"><div class="stat-box"><b>'+a.missingFound+'</b><span>未收录条目</span></div><div class="stat-box"><b>'+a.modelsAdded+'</b><span>本轮补入</span></div><div class="stat-box"><b>'+a.variantsMerged+'</b><span>并入变体</span></div><div class="stat-box"><b>'+GUIDE.vehicles.length+'</b><span>当前载具</span></div></div></div>'+
      '<div class="section"><div class="table-wrap"><table class="data-table"><thead><tr><th>载具 ID</th><th>名称</th><th>处理</th><th>并入基础车型</th></tr></thead><tbody>'+
      (a.items||[]).map(function(x){return '<tr><td class="mono">'+esc(x.id)+'</td><td>'+esc(x.name||"")+'</td><td>'+esc(x.status)+'</td><td class="mono">'+esc(x.base||"—")+'</td></tr>';}).join("")+
      '</tbody></table></div></div>'+
      '<div class="section"><div class="guide-note">'+icon("info",18)+'<div>完整清单同时导出为「载具补全清单.csv」，可在压缩包根目录查看。</div></div></div>';
  }
  function renderWorldDifficulty() {
    renderTopbar({back:"#/world", title:"世界难度", sub:(GUIDE.worldDifficulty||{}).basis||""});
    document.title="世界难度 · 亡者世界";
    const wd=GUIDE.worldDifficulty||{levels:[]};
    q("view").innerHTML=
      '<div class="detail-hero' + heroClass("world") + '"' + heroStyle("world") + '><h1>世界难度</h1><div class="meta"><span class="badge">生存压力</span><span class="badge custom">尸潮 / 感染 / 辐射</span></div><div class="hero-desc" style="margin-top:10px">'+esc(wd.basis||"")+'。下表按原版四级难度、整合包机制与需指令开启的末日难度整理，具体数值以游戏内为准。</div></div>'+
      '<div class="section"><div class="difficulty-grid">'+ (wd.levels||[]).map(function(l){
        return '<div class="difficulty-card '+esc(l.color||"")+'"><div class="difficulty-name">'+esc(l.name)+(l.requiresCommand?' <span class="badge custom">需指令</span>':'')+'</div><div class="difficulty-sum">'+esc(l.summary)+'</div>'+
          (l.requiresCommand?'<div class="difficulty-command">开启指令：'+esc(l.command||"待补全")+'</div>':'')+
          '<div class="difficulty-block"><b>惩罚 / 限制</b><ul>'+l.penalties.map(function(x){return '<li>'+esc(x)+'</li>';}).join("")+'</ul></div>'+
          '<div class="difficulty-block"><b>奖励 / 收益</b><ul>'+l.rewards.map(function(x){return '<li>'+esc(x)+'</li>';}).join("")+'</ul></div>'+
          (l.warning?'<div class="difficulty-warning">'+esc(l.warning)+'</div>':'')+'</div>';
      }).join("")+'</div></div>';
  }
  function gearShowState(type) {
    if (!ui.gearShow) ui.gearShow = {};
    if (!ui.gearShow[type]) ui.gearShow[type] = { group: "全部", id: "", query: "" };
    return ui.gearShow[type];
  }
  function gearShowGroups(type, list) {
    const set = ["全部"];
    list.forEach(function (g) {
      const v = type === "armor" ? g.tier : g.type;
      if (v && set.indexOf(v) < 0) set.push(v);
    });
    if (type === "guns") {
      const order = ["手枪", "冲锋枪", "步枪", "霰弹枪", "狙击枪", "机枪", "重型武器"];
      return ["全部"].concat(order.filter(function (x) { return set.indexOf(x) >= 0; })).concat(set.filter(function (x) { return x !== "全部" && order.indexOf(x) < 0; }).sort());
    }
    return set.sort();
  }
  function gearShowFiltered(type, st) {
    const list = (type === "armor" ? GUIDE.armor : GUIDE.guns) || [];
    return list.filter(function (g) {
      const group = type === "armor" ? g.tier : g.type;
      if (st.group !== "全部" && group !== st.group) return false;
      if (!st.query) return true;
      return [g.name, g.tier, g.type, g.description, g.source].join(" ").toLowerCase().indexOf(st.query) >= 0;
    });
  }
  function gearVisual(type, g, size) {
    if (type === "guns" && g.image) return '<div class="showcase-img" role="img" aria-label="' + esc(g.name) + '" style="width:100%;height:100%;background-image:url(\'' + esc(g.image) + '\');background-size:contain;background-position:center;background-repeat:no-repeat;image-rendering:pixelated"></div>';
    if (g.iconItem) return '<div class="showcase-icon">' + itemIcon(g.iconItem, g.name, null, size || 96) + "</div>";
    return '<div class="showcase-icon">' + icon(type === "armor" ? "shield" : "crosshair", size || 96) + "</div>";
  }
  function gearShowcaseItem(type, g) {
    const sub = type === "armor" ? (g.tier || "护甲") : (g.type || "枪械");
    const thumb = type === "guns" && g.image ? '<img src="' + esc(g.image) + '" alt="" loading="lazy">' : itemIcon(g.iconItem || "", g.name, null, 30);
    return '<button class="showcase-item" data-action="gear-select" data-type="' + type + '" data-id="' + esc(g.id) + '"><span class="showcase-item-thumb">' + thumb + '</span><span class="showcase-item-main"><b>' + esc(g.name) + '</b><small>' + esc(sub) + '</small></span></button>';
  }
  function renderGearShowcase(type) {
    const st = gearShowState(type);
    const oldList = q("showcase-list");
    const keepList = oldList ? oldList.scrollTop : (st.listScroll || 0);
    const keepY = oldList ? window.scrollY : 0;
    const all = (type === "armor" ? GUIDE.armor : GUIDE.guns) || [];
    const filtered = gearShowFiltered(type, st);
    let idx = filtered.map(function (g) { return g.id; }).indexOf(st.id);
    if (idx < 0) { idx = 0; st.id = filtered[0] ? filtered[0].id : ""; }
    const g = filtered[idx];
    const groups = gearShowGroups(type, all);
    const cfg = GUIDE_TYPES[type];
    renderTopbar({ back: "#/gear", title: cfg.title, sub: all.length + " 条资料" });
    document.title = cfg.title + " · 亡者世界图鉴";
    let main = '<div class="empty">' + icon("search", 28) + '<div class="em-title">没有匹配的条目</div><div class="em-sub">换个分类或关键词</div></div>';
    if (g) {
      let stats = "";
      let detail = "";
      if (type === "guns") {
        stats = '<div class="showcase-stats five">' +
          '<div><b>' + fmtNum(g.damage) + '</b><span>伤害</span></div>' +
          '<div><b>' + fmtNum(g.rpm) + '</b><span>RPM</span></div>' +
          '<div><b>' + fmtNum(g.mag) + '</b><span>弹容</span></div>' +
          '<div><b>' + Math.round((g.armorIgnore || 0) * 100) + '%</b><span>穿甲</span></div>' +
          '<div><b>' + fmtNum(g.headshot) + '×</b><span>爆头倍率</span></div></div>' +
          '<div class="showcase-kv"><span>弹药</span><b>' + esc(g.ammo || "—") + '</b><span>爆头</span><b>' + fmtNum(g.headshot) + '×</b><span>来源</span><b>' + esc(g.source || "—") + '</b></div>' +
          (g.effect ? '<div class="showcase-desc">' + esc(g.effect) + '</div>' : "");
        detail = '<div class="showcase-title-row"><div><div class="showcase-kicker">' + esc(g.type || "枪械") + '</div><h2>' + esc(g.name) + '</h2><div class="showcase-sub">' + esc(g.description || "") + '</div></div><button class="btn ghost" data-go="' + guideDetailHref(type, g.id) + '">完整资料</button></div>' + stats;
      } else {
        const pieces = (g.pieces || []).map(function (x) { return '<li><span>' + esc(x.slot || "") + '</span><b>' + esc(x.name || x.id) + '</b></li>'; }).join("");
        const bonuses = (g.bonuses || []).map(function (b) { return '<li><span>' + esc(b.type || "效果") + '</span><b>' + esc(b.description || b.name || "") + '</b></li>'; }).join("");
        stats = '<div class="showcase-stats">' +
          '<div><b>' + esc(g.tier || "—") + '</b><span>阶级</span></div>' +
          '<div><b>' + (g.pieces || []).length + '</b><span>部件</span></div>' +
          '<div><b>' + ((g.stars && g.stars.armor) || "—") + '</b><span>护甲评级</span></div>' +
          '<div><b>' + ((g.stars && g.stars.recommend) || "—") + '</b><span>推荐度</span></div></div>';
        detail = '<div class="showcase-title-row"><div><div class="showcase-kicker">' + esc(g.tier || "护甲") + '</div><h2>' + esc(g.name) + '</h2><div class="showcase-sub">' + esc(g.description || "") + '</div></div><button class="btn ghost" data-go="' + guideDetailHref(type, g.id) + '">完整资料</button></div>' + stats +
          '<div class="showcase-columns"><div><div class="showcase-label">套装部件</div><ul class="showcase-list-kv">' + (pieces || "<li><b>待补充</b></li>") + '</ul></div><div><div class="showcase-label">套装效果</div><ul class="showcase-list-kv">' + (bonuses || "<li><b>待补充</b></li>") + '</ul></div></div>';
      }
      main = '<div class="showcase-visual">' + gearVisual(type, g, 108) + '</div>' + detail +
        '<div class="showcase-pager"><button class="btn ghost" data-action="gear-page" data-type="' + type + '" data-delta="-1"' + (idx <= 0 ? " disabled" : "") + '>上一页</button><span>' + (idx + 1) + " / " + filtered.length + '</span><button class="btn ghost" data-action="gear-page" data-type="' + type + '" data-delta="1"' + (idx >= filtered.length - 1 ? " disabled" : "") + '>下一页</button></div>';
    }
    q("view").innerHTML =
      '<div class="showcase">' +
        '<aside class="showcase-side">' +
          '<div class="showcase-side-head"><h1>' + esc(cfg.title) + '</h1><span>' + all.length + ' 条</span></div>' +
          '<div class="searchbar">' + icon("search") + '<input id="gear-show-search" type="search" placeholder="搜索名称" value="' + esc(st.query) + '"></div>' +
          '<div class="chip-row showcase-groups">' + groups.map(function (x) {
            const n = x === "全部" ? all.length : all.filter(function (y) { return (type === "armor" ? y.tier : y.type) === x; }).length;
            return '<button class="chip ' + (st.group === x ? "active" : "") + '" data-action="gear-group" data-type="' + type + '" data-group="' + esc(x) + '">' + esc(x) + ' <span class="n">' + n + '</span></button>';
          }).join("") + '</div>' +
          '<div class="showcase-list" id="showcase-list">' + (filtered.length ? filtered.map(function (x) { return gearShowcaseItem(type, x); }).join("") : '<div class="empty">没有结果</div>') + '</div>' +
        '</aside>' +
        '<main class="showcase-main">' + main + '</main>' +
      '</div>';
    const newList = q("showcase-list");
    if (newList) { newList.scrollTop = keepList; st.listScroll = keepList; }
    if (keepY) requestAnimationFrame(function () { window.scrollTo(0, keepY); });
    const inp = q("gear-show-search");
    if (inp) inp.addEventListener("input", debounce(function (e) {
      st.query = e.target.value;
      st.id = "";
      renderGearShowcase(type);
    }, 120));
  }
  function vehicleGroups() {
    const order = ["民用车辆", "军用车辆", "船只", "民用飞机", "军用飞机", "其他载具"];
    const present = new Set((GUIDE.vehicles || []).map(function (v) { return v.group; }));
    return order.filter(function (g) { return present.has(g); });
  }
  const VEHICLE_CAT_IMAGES = {
    "民用车辆": "./images/vehicles/categories/civil_cars.webp",
    "民用飞机": "./images/vehicles/categories/civil_aircraft.webp",
    "船只": "./images/vehicles/categories/boats.webp"
  };
  function vehicleImage(v) { return (v && v.image) || ""; }
  function renderVehiclesHub() {
    const data = GUIDE.vehicles || [];
    const groups = vehicleGroups();
    renderTopbar({ back: "#/world", title: "载具", sub: data.length + " 种" });
    document.title = "载具 · 亡者世界";
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass("world") + '"' + heroStyle("world") + '><h1>载具</h1><div class="meta"><span class="badge">' + data.length + ' 种</span><span class="badge custom">MTS / Immersive Aircraft</span></div><div class="hero-desc" style="margin-top:10px">按载具类型分区浏览，点击类型查看全部载具。</div></div>' +
      '<div class="section"><div class="vehicle-cat-grid">' + groups.map(function (g) {
        const list = data.filter(function (v) { return v.group === g; });
        const img = VEHICLE_CAT_IMAGES[g] || list.map(vehicleImage).filter(Boolean)[0] || (GUIDE.meta.banners || {}).vehicles || "";
        return '<button class="vehicle-cat" data-go="#/world/vehicles/group/' + encodeURIComponent(g) + '">' +
          (img ? '<img class="vehicle-cat-bg" src="' + esc(img) + '" alt="" loading="lazy">' : "") +
          '<div class="vehicle-cat-body"><div class="vehicle-cat-name">' + esc(g) + '</div><div class="vehicle-cat-count">' + list.length + ' 种</div></div></button>';
      }).join("") + '</div></div>' +
      '<div class="section"><button class="btn ghost block" data-go="#/world">返回世界</button></div>';
  }
  function renderVehicleGroup(group) {
    const all = (GUIDE.vehicles || []).filter(function (v) { return v.group === group; });
    if (!ui.vehiclePage) ui.vehiclePage = {};
    const per = 12;
    const pages = Math.max(1, Math.ceil(all.length / per));
    let page = ui.vehiclePage[group] || 1;
    if (page > pages) page = pages;
    ui.vehiclePage[group] = page;
    const list = all.slice((page - 1) * per, page * per);
    renderTopbar({ back: "#/world/vehicles", title: group, sub: all.length + " 种载具" });
    document.title = group + " · 载具";
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass("world") + '"' + heroStyle("world") + '><h1>' + esc(group) + '</h1><div class="meta"><span class="badge">' + all.length + ' 种</span></div></div>' +
      '<div class="section"><div class="page-bar"><button class="page-btn" data-action="vehicle-page" data-group="' + esc(group) + '" data-delta="-1"' + (page <= 1 ? " disabled" : "") + '>上一页</button><span>' + page + " / " + pages + '</span><button class="page-btn" data-action="vehicle-page" data-group="' + esc(group) + '" data-delta="1"' + (page >= pages ? " disabled" : "") + '>下一页</button></div>' +
      '<div class="vehicle-grid">' + list.map(function (v) {
        return '<button class="vehicle-card" data-go="#/world/vehicles/' + encodeURIComponent(v.id) + '">' +
          '<div class="vehicle-img">' + (vehicleImage(v) ? '<img src="' + esc(vehicleImage(v)) + '" alt="' + esc(v.name) + '" loading="lazy">' : icon("car", 40)) + '</div>' +
          '<div class="vehicle-info"><div class="vehicle-name">' + esc(v.name) + '</div><div class="vehicle-sub">' + esc(v.group || "") + (v.variants > 1 ? " · " + v.variants + " 个涂装" : "") + '</div></div></button>';
      }).join("") + '</div></div>';
  }
  const MELEE_CATS = [
    { key: "FISTS", label: "拳套", types: ["拳套"] },
    { key: "MACE", label: "钉锤", types: ["棍棒"] },
    { key: "HAMMER", label: "锤", types: ["锤"] },
    { key: "SCYTHE", label: "镰刀 / 锄", types: ["镰刀", "锄"] },
    { key: "BAT", label: "棒球棒", types: ["棒球棒"] },
    { key: "SWORD", label: "剑", types: ["剑"] },
    { key: "MACHETE", label: "砍刀", types: ["砍刀"] },
    { key: "SHOVEL", label: "铁锹", types: ["铁锹"] },
    { key: "AXE", label: "斧", types: ["斧"] },
    { key: "KNIFE", label: "刀 / 匕首", types: ["刀", "武士刀"] },
    { key: "OTHER", label: "其他", types: ["其他", "撬棍", "电棍"] },
    { key: "SHIELDS", label: "盾牌", types: ["盾牌"] }
  ];
  function meleeCatOf(item) {
    const wt = item.weaponType || "";
    for (let i = 0; i < MELEE_CATS.length; i++) if (MELEE_CATS[i].types.indexOf(wt) >= 0) return MELEE_CATS[i];
    return MELEE_CATS[MELEE_CATS.length - 1];
  }
  function renderMeleePage() {
    const data = GUIDE.melee || [];
    renderTopbar({ back: "#/gear", title: "近战兵器库", sub: data.length + " 件 · 按类型与等级" });
    document.title = "近战兵器库 · 亡者世界";
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass("melee") + '"' + heroStyle("melee") + '><h1>近战兵器库</h1><div class="meta"><span class="badge">' + data.length + ' 件</span><span class="badge custom">按图鉴等级排列</span></div><div class="hero-desc" style="margin-top:10px">按武器类型分区，每类自上而下为 T1–T4 等级。</div></div>' +
      '<div class="section"><div class="searchbar">' + icon("search") + '<input id="melee-search" type="search" placeholder="搜索近战武器" value="' + esc(ui.guideQuery.melee || "") + '" autocomplete="off"></div></div>' +
      '<div class="section"><button class="btn ghost block monster-handbook-btn weapon-compare-btn" data-go="#/gear/melee/compare">单手 / 双手对比 · 双持推荐</button></div>' +
      '<div class="section"><div class="section-head"><div class="section-title">快速跳转</div><div class="section-note">按武器类型</div></div><div class="melee-jump">' +
        MELEE_CATS.map(function (cat) {
          const n = (GUIDE.melee || []).filter(function (x) { return meleeCatOf(x).key === cat.key; }).length;
          return '<button class="melee-jump-card" data-go="#/gear/melee/cat/' + cat.key + '"><b>' + esc(cat.label) + '</b><span>' + n + ' 件</span></button>';
        }).join("") + '</div></div>' +
      '<div id="melee-sections"></div>';
    const input = q("melee-search");
    if (input) input.addEventListener("input", debounce(function (e) { ui.guideQuery.melee = e.target.value; renderMeleeSections(); }, 100));
    renderMeleeSections();
  }
  function meleeRowsHTML(items) {
    return ["T1", "T2", "T3", "T4"].map(function (t) {
      const list = items.filter(function (x) { return x.tier === t; });
      if (!list.length) return "";
      return '<div class="melee-tier-row"><div class="melee-tier-label ' + t.toLowerCase() + '">' + t + '</div><div class="melee-grid">' +
        list.map(function (x) {
          return '<button class="melee-item" data-go="' + guideDetailHref("melee", x.id) + '">' + guideThumb(x, 54, "melee") +
            '<span class="melee-name">' + esc(x.name) + '</span></button>';
        }).join("") + '</div></div>';
    }).join("");
  }
  function renderMeleeCategory(key) {
    const cat = MELEE_CATS.filter(function (c) { return c.key === key; })[0];
    if (!cat) { go("#/gear/melee"); return; }
    const items = (GUIDE.melee || []).filter(function (x) { return meleeCatOf(x).key === cat.key; });
    renderTopbar({ back: "#/gear/melee", title: cat.label, sub: items.length + " 件 · T1–T4" });
    document.title = cat.label + " · 近战兵器库";
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass("melee") + '"' + heroStyle("melee") + '><h1>' + esc(cat.label) + '</h1><div class="meta"><span class="badge">' + items.length + ' 件</span></div><div class="hero-desc" style="margin-top:10px">按 T1–T4 等级排列，点击武器查看详情。</div></div>' +
      '<div class="section melee-cat">' + meleeRowsHTML(items) + '</div>' +
      '<div class="section"><button class="btn ghost block" data-go="#/gear/melee">返回近战兵器库</button></div>';
  }
  function meleeDps(x) { return (Number(x.damageValue) || 0) * (Number(x.speedValue) || 0); }
  const DUAL_WIELD = { attackSpeed: 1.2, mainDamage: 1.0, offDamage: 1.0 };
  function dualWieldDps(a, b) {
    const mainDamage = (Number(a.damageValue) || 0) * DUAL_WIELD.mainDamage;
    const offDamage = (Number(b.damageValue) || 0) * DUAL_WIELD.offDamage;
    const avgSpeed = ((Number(a.speedValue) || 0) + (Number(b.speedValue) || 0)) / 2;
    return ((mainDamage + offDamage) / 2) * avgSpeed * DUAL_WIELD.attackSpeed;
  }
  function meleeCompareData() {
    const items = GUIDE.melee || [];
    const out = [];
    ["T1", "T2", "T3", "T4"].forEach(function (tier) {
      const W = items.filter(function (x) { return x.tier === tier; });
      if (!W.length) return;
      const one = W.filter(function (x) { return x.handed === "单手"; });
      const two = W.filter(function (x) { return x.handed === "双手"; });
      const pairs = [];
      for (let i = 0; i < one.length; i++) {
        for (let j = 0; j < one.length; j++) {
          if (i === j || one[i].id === one[j].id) continue;
          const a = one[i], b = one[j];
          const dualDps = dualWieldDps(a, b);
          const singleDps = Math.max(meleeDps(a), meleeDps(b));
          const delta = singleDps > 0 ? (dualDps / singleDps - 1) * 100 : 0;
          pairs.push({ main: a, off: b, score: dualDps, dualDps: dualDps, singleDps: singleDps, delta: delta });
        }
      }
      pairs.sort(function (a, b) { return b.score - a.score; });
      const total = pairs.reduce(function (a, p) { return a + p.score; }, 0) || 1;
      pairs.forEach(function (p) { p.share = p.score / total * 100; });
      out.push({ tier: tier, one: one, two: two, pairs: pairs.slice(0, 5) });
    });
    return out;
  }
  function meleeCompareRow(x) {
    return '<button class="compare-row weapon-like-row" data-go="' + guideDetailHref("melee", x.id) + '">' +
      '<b>' + esc(x.name) + '</b>' +
      '<span class="stat-chips weapon-stat-chips">' +
        '<span class="stat-chip" title="伤害"><img class="stat-ico" src="./images/ui/stat-attack.webp" alt="">' + fmtNum(x.damageValue) + '</span>' +
        '<span class="stat-chip" title="攻速"><img class="stat-ico" src="./images/ui/stat-heart-half.webp" alt="">' + Number(x.speedValue).toFixed(2) + '</span>' +
        '<span class="stat-chip" title="DPS"><img class="stat-ico" src="./images/ui/stat-armor-half.webp" alt="">' + meleeDps(x).toFixed(1) + '</span>' +
      '</span>' +
      '<em>' + (x.stars ? x.stars.recommend : "-") + '★</em></button>';
  }
  function renderMeleeCompare() {
    const data = meleeCompareData();
    renderTopbar({ back: "#/gear/melee", title: "单手 / 双手对比", sub: "双持推荐" });
    document.title = "单手 / 双手对比 · 亡者世界";
    const all = GUIDE.melee || [];
    const one = all.filter(function (x) { return x.handed === "单手"; });
    const two = all.filter(function (x) { return x.handed === "双手"; });
    const avg = function (arr) { return arr.length ? arr.reduce(function (a, x) { return a + meleeDps(x); }, 0) / arr.length : 0; };
    const rows = data.map(function (d) {
      return '<div class="section"><div class="section-head"><div class="section-title">' + d.tier + ' 对比</div><div class="section-note">单手 ' + d.one.length + ' · 双手 ' + d.two.length + '</div></div>' +
        '<div class="compare-cols"><div><div class="compare-head">单手武器（可双持）</div><div class="compare-list">' + (d.one.slice().sort(function (a, b) { return meleeDps(b) - meleeDps(a); }).slice(0, 5).map(meleeCompareRow).join("") || '<div class="guide-note">无</div>') + '</div></div>' +
        '<div><div class="compare-head">双手武器（不可双持）</div><div class="compare-list">' + (d.two.slice().sort(function (a, b) { return meleeDps(b) - meleeDps(a); }).slice(0, 5).map(meleeCompareRow).join("") || '<div class="guide-note">无</div>') + '</div></div></div></div>' +
        '<div class="section"><div class="section-head"><div class="section-title">' + d.tier + ' 双持推荐</div><div class="section-note">按 Better Combat 参数 · 攻速 ×1.2 · 主副手伤害 ×1.0</div></div><div class="pair-list">' +
        (d.pairs.map(function (p) {
          return '<div class="pair-row"><span class="pair-main">主 ' + esc(p.main.name) + '</span><span class="pair-plus">+</span><span class="pair-off">副 ' + esc(p.off.name) + '</span><span class="pair-share">' + p.dualDps.toFixed(1) + ' DPS · ' + (p.delta >= 0 ? "+" : "") + p.delta.toFixed(0) + '%</span></div>';
        }).join("") || '<div class="guide-note">该阶级没有可双持的单手武器</div>') + '</div></div>';
    }).join("");
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass("melee") + '"' + heroStyle("melee") + '><h1>单手 / 双手对比</h1><div class="meta"><span class="badge">单手 ' + one.length + '</span><span class="badge custom">双手 ' + two.length + '</span></div><div class="hero-desc" style="margin-top:10px">双手武器不参与双持；双持按 Better Combat 配置计算：攻速 ×1.2，主手与副手伤害 ×1.0。</div></div>' +
      '<div class="section"><div class="stat-grid"><div class="stat-box"><b>' + one.length + '</b><span>单手武器</span></div><div class="stat-box"><b>' + two.length + '</b><span>双手武器</span></div><div class="stat-box"><b>' + avg(one).toFixed(1) + '</b><span>单手平均 DPS</span></div><div class="stat-box"><b>' + avg(two).toFixed(1) + '</b><span>双手平均 DPS</span></div></div></div>' +
      rows;
  }
  function renderMeleeSections() {
    const box = q("melee-sections");
    if (!box) return;
    const qq = String(ui.guideQuery.melee || "").trim().toLowerCase();
    const html = MELEE_CATS.map(function (cat) {
      let items = (GUIDE.melee || []).filter(function (x) { return meleeCatOf(x).key === cat.key; });
      if (qq) items = items.filter(function (x) {
        return [x.name, x.weaponType, x.tier, x.damageBand, x.effect, x.description].join(" ").toLowerCase().indexOf(qq) >= 0;
      });
      if (!items.length) return "";
      const rows = meleeRowsHTML(items);
      return '<section class="section melee-cat"><div class="section-head"><div class="section-title">' + esc(cat.label) + '</div><div class="section-note">' + items.length + ' 件</div></div>' + rows + '</section>';
    }).join("");
    box.innerHTML = html || '<div class="empty">' + icon("search", 28) + '<div class="em-title">没有匹配的武器</div></div>';
  }
  function renderGuideList(type) {
    if (type === "armor" || type === "guns") { renderGearShowcase(type); return; }
    if (type === "melee") { renderMeleePage(); return; }
    const cfg = GUIDE_TYPES[type];
    renderTopbar({ back: cfg.back, title: cfg.title, sub: cfg.data.length + " 条资料" });
    document.title = cfg.title + " · 亡者世界图鉴";
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass(type) + '"' + heroStyle(type) + '><h1>' + esc(cfg.title) + "</h1><div class=\"meta\"><span class=\"badge\">" + cfg.data.length + " 条</span><span class=\"badge custom\">离线可用</span></div>" +
        '<div class="hero-desc" style="margin-top:10px">' + esc(cfg.subtitle) + "</div></div>" +
      '<div class="section"><div class="searchbar">' + icon("search") + '<input id="guide-search-' + type + '" type="search" placeholder="搜索' + esc(cfg.title) + '名称或关键词" value="' + esc(ui.guideQuery[type] || "") + '" autocomplete="off"></div></div>' +
      (type === "guns" ? '<div class="section"><button class="btn ghost block" data-go="#/gear/guntable">查看枪械数据表（伤害 / RPM / 弹容 / 弹药）</button></div>' : "") +
      (type === "vehicles" ? '<div class="section"><button class="btn ghost block" data-go="#/world/vehicle-audit">查看载具补全清单（51 条核对记录）</button></div>' : "") +
      '<div class="section"><div class="chip-row" id="guide-groups-' + type + '"></div></div>' +
      '<div class="section"><div class="list" id="guide-list-' + type + '"></div></div>';
    const input = q("guide-search-" + type);
    if (input) input.addEventListener("input", debounce(function (e) {
      ui.guideQuery[type] = e.target.value;
      renderGuideRows(type);
    }, 100));
    renderGuideGroups(type);
    renderGuideRows(type);
  }
  function renderGuideGroups(type) {
    const box = q("guide-groups-" + type);
    if (!box) return;
    const groups = guideGroups(type);
    box.innerHTML = groups.map(function (g) {
      const active = (ui.guideGroup[type] || "全部") === g;
      return '<button class="chip ' + (active ? "active" : "") + '" data-action="guide-group" data-type="' + type + '" data-group="' + esc(g) + '">' + esc(g) + "</button>";
    }).join("");
  }
  function guideRowSub(type, item) {
    if (type === "armor") return (item.tier || "未分类") + " · " + (item.pieces || []).length + " 件 · " + (item.description || "").slice(0, 28) + (item.stars ? " · 推荐 " + starsHTML(item.stars.recommend,"推荐") : "");
    if (type === "guns") {
      const gs = ((window.WZ_GUNSMITH || {}).guns || {})[item.id];
      let modes = gs && gs.fireModeLabels && gs.fireModeLabels.length ? gs.fireModeLabels.join("/") : "";
      if (gs && gs.bolt === "manual_action") modes += (modes ? "/" : "") + "手动上膛";
      return (item.type || "枪械") + (modes ? " · " + modes : "") + " · 伤害 " + fmtNum(gs ? gs.damage : item.damage) + " · RPM " + fmtNum(gs ? gs.rpm : item.rpm) + " · 弹容 " + fmtNum(gs ? gs.mag : item.mag) + " · 穿甲 " + Math.round((gs ? gs.armorIgnore : item.armorIgnore) * 100) + "%";
    }
    if (type === "ammo") return (item.type || "弹药") + " · 堆叠 " + fmtNum(item.stack) + " · " + ((item.guns || []).length) + " 把枪使用 · " + ((item.sources || []).length) + " 处来源";
    if (type === "melee") {
      const dmg = item.damageValue != null ? fmtNum(item.damageValue) : (item.damageBand || "—");
      const spd = item.speedValue != null ? Number(item.speedValue).toFixed(2) + "/秒" : (item.speedBand || "—");
      return (item.tier || "—") + " · " + (item.weaponType || "近战") + " · 伤害 " + dmg + " · 攻速 " + spd + " · " + (item.handed || "—");
    }
    if (type === "trinkets") return (item.group || "") + " · " + (item.effect || item.description || "").slice(0, 42);
    if (type === "vehicles") return (item.group || "载具") + " · " + (item.description || "").slice(0, 32) + (item.variants > 1 ? " · " + item.variants + " 个变体" : "");
    if (type === "story") return (item.region || "") + " · " + (item.location || "").replace(/\n/g, " / ").slice(0, 40);
    if (type === "npcs") return (item.faction || "") + " · HP " + fmtNum(item.hp) + " · 伤害 " + fmtNum(item.damage);
    return (item.description || "").slice(0, 40);
  }
  function guideRowTag(type, item) {
    if (type === "armor") return item.tier || "套装";
    if (type === "guns") return item.type || "枪械";
    if (type === "ammo") return item.type || "弹药";
    if (type === "melee") return (item.tier ? item.tier + " · " : "") + (item.weaponType || item.group || "近战");
    if (type === "vehicles") return item.group || "载具";
    if (type === "story") return item.region || "剧情";
    if (type === "npcs") return item.faction || "NPC";
    return item.group || "条目";
  }
  function guideThumb(item, size, type) {
    if (item.iconImage) {
      return "<div class=\"guide-thumb\" style=\"width:" + size + "px;height:" + size + "px;background-image:url('" + esc(item.iconImage) + "')\"></div>";
    }
    if ((type === "armor" || type === "melee" || type === "trinkets") && item.iconItem) {
      return itemIcon(item.iconItem, item.name, null, size);
    }
    if (item.image) {
      return "<div class=\"guide-thumb\" style=\"width:" + size + "px;height:" + size + "px;background-image:url('" + esc(item.image) + "')\"></div>";
    }
    if (item.iconItem) return itemIcon(item.iconItem, item.name, null, size);
    const cfg = GUIDE_TYPES[type] || { icon: "info" };
    let ico = cfg.icon;
    if (type === "vehicles") {
      ico = (item.group || "").indexOf("飞机") >= 0 ? "plane" : item.group === "船只" ? "ship" : "car";
    }
    return "<div class=\"guide-thumb\" style=\"width:" + size + "px;height:" + size + "px;display:grid;place-items:center;color:var(--dim)\">" + icon(ico, Math.round(size * 0.45)) + "</div>";
  }
  function renderGuideRows(type) {
    const box = q("guide-list-" + type);
    if (!box) return;
    const cfg = GUIDE_TYPES[type];
    const query = (ui.guideQuery[type] || "").trim().toLowerCase();
    const group = ui.guideGroup[type] || "全部";
    const list = (cfg.data || []).filter(function (item) {
      if (group !== "全部" && guideGroupOf(type, item) !== group) return false;
      if (!query) return true;
      return [item.name, item.effect, item.description, item.text, item.location, item.group, item.type, item.faction, item.region, item.source, item.weaponType, item.damageBand, item.speedBand].join(" ").toLowerCase().indexOf(query) >= 0;
    });
    if (type === "defense") { renderDefenseTree(type, list); return; }
    box.innerHTML = list.length ? list.map(function (item) {
      return '<button class="row-card" data-go="' + guideDetailHref(type, item.id) + '">' +
        guideThumb(item, 52, type) +
        '<div class="row-main"><div class="row-title">' + esc(item.name || "未命名") + "</div>" +
          '<div class="row-sub">' + esc(guideRowSub(type, item)) + "</div></div>" +
        '<div class="row-right"><span class="badge">' + esc(guideRowTag(type, item)) + "</span></div>" +
        "</button>";
    }).join("") : '<div class="empty">' + icon("search", 28) + '<div class="em-title">没有匹配的条目</div><div class="em-sub">换个关键词或分类试试</div></div>';
  }
  function lootSourcesFor(ids) {
    const map = new Map();
    (ids || []).forEach(function (id) {
      const rec = itemIndex.get(id);
      if (!rec) return;
      rec.sources.forEach(function (s) {
        const key = s.r.id + "/" + s.b.id;
        let row = map.get(key);
        if (!row) {
          row = { region: s.r, building: s.b, best: 0, count: 0 };
          map.set(key, row);
        }
        row.best = Math.max(row.best, Number(s.it[4]) || 0);
        row.count += 1;
      });
    });
    return Array.from(map.values()).sort(function (a, b) { return b.best - a.best; });
  }
  function lootSourcesSection(ids, limit) {
    const list = lootSourcesFor(ids);
    if (!list.length) {
      return '<div class="section"><div class="section-head"><div class="section-title">可搜刮建筑</div></div>' +
        '<div class="guide-note">' + icon("info", 18) + "<div>战利品表中没有找到这件装备的直接掉落记录，可能通过合成、交易或任务获取。</div></div></div>";
    }
    const max = limit || 8;
    const rows = list.slice(0, max).map(function (x) {
      return '<button class="row-card" data-go="#/loot/building/' + encodeURIComponent(x.region.id) + "/" + encodeURIComponent(x.building.id) + '">' +
        buildingThumb(x.building, 46) +
        '<div class="row-main"><div class="row-title">' + esc(x.building.name) + '</div><div class="row-sub">' + esc(x.region.name) + " · " + x.count + " 处掉落记录</div></div>" +
        '<div class="row-right"><div class="big">' + fmtPct(x.best) + '</div><div class="cap">最高掉率</div></div></button>';
    }).join("");
    return '<div class="section"><div class="section-head"><div class="section-title">可搜刮建筑</div><div class="section-note">按最高掉率排序</div></div>' +
      '<div class="list">' + rows + "</div>" +
      (list.length > max ? '<div class="tiny dim" style="margin-top:8px">还有 ' + (list.length - max) + " 座建筑可搜到，进入对应建筑页查看完整掉落。</div>" : "") +
      '<div class="tiny dim" style="margin-top:8px">配方可能随整合包版本变化而不准确，这里优先列出实际战利品来源。</div></div>';
  }
  function recipeMaterialsHTML(rec) {
    if (!rec || !(rec.materials || []).length) return "";
    return '<div class="recipe-mats">' + rec.materials.map(function (m) {
      const ico = m.iconImage
        ? '<img class="mat-ico" src="' + esc(m.iconImage) + '" alt="" loading="lazy">'
        : itemIcon(m.iconItem || "", m.name, null, 32);
      return '<div class="mat-row">' + ico +
        '<div class="mat-main"><div class="mat-name">' + esc(m.name || "材料") + "</div>" +
          '<div class="mat-id mono">' + esc(m.tag ? "#" + m.tag : (m.id || "")) + "</div></div>" +
        '<div class="mat-count">×' + esc(m.count || 1) + "</div></div>";
    }).join("") + "</div>";
  }
  function recipeHTML(rec, title) {
    if (!rec || !(rec.materials || []).length) return "";
    return '<div class="recipe-card">' +
      '<div class="recipe-head"><div class="recipe-title">' + esc(title || "合成配方") + "</div>" +
        '<span class="badge recipe-station">' + esc(rec.station || "工作台") + "</span></div>" +
      recipeMaterialsHTML(rec) +
      (rec.note ? '<div class="recipe-note">' + esc(rec.note) + "</div>" : "") +
      "</div>";
  }
  function recipeSection(rec, title) {
    const h = recipeHTML(rec, title);
    return h ? '<div class="section"><div class="section-head"><div class="section-title">合成材料</div></div>' + h + "</div>" : "";
  }
  function noRecipeNote(label) {
    return '<div class="section"><div class="guide-note">' + icon("info", 18) + "<div>没有找到" + esc(label) + "的合成配方数据，可能通过战利品、交易、任务或创造模式获取。</div></div></div>";
  }
  function effectSection(text, title, note) {
    if (!text) return "";
    return '<div class="section"><div class="section-head"><div class="section-title">' + esc(title || "作用") + "</div></div>" +
      '<div class="text-block">' + esc(text) + "</div>" +
      (note ? '<div class="tiny dim" style="margin-top:8px">' + esc(note) + "</div>" : "") +
      "</div>";
  }
  function tradeIconHTML(it, size) {
    if (it && it.iconImage) {
      return '<div class="quote-ico-wrap"><img class="quote-ico-img" src="' + esc(it.iconImage) + '" alt="' + esc(it.name || "") + '" loading="lazy"></div>';
    }
    return '<div class="quote-ico-wrap">' + itemIcon((it && it.id) || "", (it && it.name) || "?", null, size || 40) + "</div>";
  }
  function npcTradeRow(t, it) {
    const isMoney = (it.currencyKind || t.currencyKind) === "money";
    const payName = it.currencyName || t.currencyName || "货币";
    const payItem = { id: it.currencyItem || t.currencyItem, name: payName };
    return '<div class="quote-row ' + (isMoney ? "money" : "barter") + '">' +
      '<div class="quote-side pay">' +
        '<div class="quote-ico-box' + (isMoney ? " money" : "") + '">' + tradeIconHTML(payItem, 40) + (isMoney ? '<span class="coin-spark" aria-hidden="true">✦</span>' : "") + "</div>" +
        '<div class="quote-label">' + esc(payName) + "</div>" +
        '<div class="quote-price">×' + esc(fmtNum(it.price)) + "</div>" +
      "</div>" +
      '<div class="quote-arrow ' + (isMoney ? "money" : "barter") + '" aria-hidden="true">' + (isMoney ? "➜" : "⇄") + "</div>" +
      '<div class="quote-side get">' +
        '<div class="quote-ico-box">' + tradeIconHTML(it, 40) + "</div>" +
        '<div class="quote-label">' + esc(it.name) + "</div>" +
        '<div class="quote-qty">×' + esc(fmtNum(it.count)) + "</div>" +
      "</div>" +
    "</div>";
  }
  function npcTradeCard(n) {
    const t = n.trade;
    const timing = n.timing || [];
    const climate = n.climate || "";
    const regionLabel = n.region || n.location || "未知区域";
    const avatar = n.image
      ? '<img class="quote-avatar-img" src="' + esc(n.image) + '" alt="' + esc(n.name) + '" loading="lazy">'
      : '<span class="quote-avatar-fallback">' + esc(initial(n.name)) + "</span>";
    let head = '<div class="npc-quote-head">' +
      '<div class="quote-avatar">' + avatar + "</div>" +
      '<div class="npc-quote-id">' +
        '<div class="npc-quote-name">' + esc(n.name) +
          (climate ? '<span class="quote-region ' + climateClass({ climate: climate, id: "" }) + '">' + esc(regionLabel) + "</span>" : '<span class="quote-region">' + esc(regionLabel) + "</span>") +
        "</div>" +
        (timing[0] ? '<div class="npc-timing">⏱ ' + esc(timing[0]) + "</div>" : "") +
        (timing[1] ? '<div class="npc-timing-sub">' + esc(timing[1]) + "</div>" : "") +
      "</div></div>";
    if (!t) {
      return head + '<div class="npc-quote-empty">' + icon("info", 17) + "<span>该 NPC 没有固定商店数据；雇佣兵单位通常需要佣金与弹药。</span></div>";
    }
    const items = t.items || [];
    const isMoney = t.currencyKind === "money";
    const limit = 6;
    const open = !!ui.npcTradeOpen[n.id];
    const rows = items.map(function (it, idx) {
      const extra = idx >= limit;
      return '<div class="quote-row-wrap"' + (extra ? ' data-npc-extra="' + esc(n.id) + '"' + (open ? "" : " hidden") : "") + ">" + npcTradeRow(t, it) + "</div>";
    }).join("");
    return head +
      '<div class="npc-quote-bar">' +
        '<div class="npc-shop-title">' + icon(isMoney ? "gem" : "box", 15) + "<span>" + esc(t.title || "交易") + "</span></div>" +
        '<div class="npc-currency-chip ' + (isMoney ? "money" : "barter") + '">' + (isMoney ? "💰" : "⇄") + " " + esc(t.currencyName || "以物易物") + "</div>" +
        (items.length > limit ? '<button class="quote-toggle" data-action="npc-trade-toggle" data-id="' + esc(n.id) + '" data-total="' + items.length + '">' + (open ? "收起" : "展开全部 " + items.length + " 条") + "</button>" : "") +
      "</div>" +
      '<div class="quote-list">' + rows + "</div>" +
      '<div class="quote-foot">' + (isMoney ? "➜ 使用货币购买；右侧为获得数量。" : "⇄ 以物易物；左侧为支付数量，右侧为获得数量。") + "</div>";
  }
  function guideDetailExtra(type, item) {
    if (type === "armor") {
      let h = '<div class="stat-grid">' +
        '<div class="stat-box"><b>' + esc(item.tier || "未分类") + '</b><span>阶级</span></div>' +
        '<div class="stat-box"><b>' + (item.pieces || []).length + '</b><span>部件</span></div></div>' +
        (item.armorStats ? '<div class="section"><div class="stat-chips armor-stat-chips">' +
          '<span class="stat-chip" title="护甲值"><img class="stat-ico" src="./images/ui/stat-armor-half.webp" alt="">' + fmtNum(item.armorStats.armor) + '</span>' +
          '<span class="stat-chip" title="韧性"><img class="stat-ico" src="./images/ui/stat-heart-half.webp" alt="">' + fmtNum(item.armorStats.toughness) + '</span>' +
          '<span class="stat-chip" title="击退抗性"><img class="stat-ico" src="./images/ui/stat-armor-empty.webp" alt="">' + (Number(item.armorStats.knockback || 0) * 100).toFixed(0) + '%</span>' +
          '<span class="stat-chip" title="附魔能力"><img class="stat-ico" src="./images/ui/stat-enchant.webp" alt="">' + fmtNum(item.armorStats.enchantability) + '</span>' +
          (item.armorStats.coldResist ? '<span class="stat-chip" title="御寒"><img class="stat-ico" src="./images/ui/stat-heart-full.webp" alt="">+' + fmtNum(item.armorStats.coldResist) + '</span>' : "") +
          (item.armorStats.durability ? '<span class="stat-chip" title="总耐久"><img class="stat-ico" src="./images/ui/stat-durability.webp" alt="">' + fmtNum(item.armorStats.durability) + '</span>' : "") +
          "</div></div>" : "") +
        (item.stars ? '<div class="section"><div class="star-line">同阶护甲 ' + starsHTML(item.stars.armor,"同阶护甲") + ' · 同阶推荐 ' + starsHTML(item.stars.recommend,"同阶推荐") + ' <span class="star-note">仅同 T 阶级内比较</span></div></div>' : "") +
        (item.tierNote ? '<div class="tier-note">' + icon("info", 17) + "<span>" + esc(item.tierNote) + "</span></div>" : "") +
        (item.weaponRequirement ? '<div class="guide-note" style="margin-top:10px">' + icon("gun", 18) + "<div>套装要求：" + esc(item.weaponRequirement) + "</div></div>" : "");
      h += '<div class="section"><div class="section-head"><div class="section-title">套装部件</div></div><div class="list">' +
        (item.pieces || []).map(function (p) {
          return '<div class="piece-row">' + itemIcon(p.id, p.name, null, 34) +
            '<div class="piece-main"><div class="piece-name">' + esc(p.name || p.id) + '</div><div class="piece-id mono">' + esc(p.id) + '</div>' +
              (p.armor != null ? '<div class="piece-stats armor-piece-chips">' +
              '<span class="stat-chip"><img class="stat-ico" src="./images/ui/stat-armor-half.webp" alt="">+' + fmtNum(p.armor) + '</span>' +
              '<span class="stat-chip"><img class="stat-ico" src="./images/ui/stat-heart-half.webp" alt="">+' + fmtNum(p.toughness || 0) + '</span>' +
              (p.durability ? '<span class="stat-chip"><img class="stat-ico" src="./images/ui/stat-durability.webp" alt="">' + fmtNum(p.durability) + '</span>' : "") +
              (p.coldResist ? '<span class="stat-chip"><img class="stat-ico" src="./images/ui/stat-heart-full.webp" alt="">+' + fmtNum(p.coldResist) + '</span>' : "") +
            '</div>' : '') + '</div>' +
            '<span class="badge">' + esc(p.slot) + "</span></div>";
        }).join("") + "</div></div>";
      if ((item.bonuses || []).length) {
        h += '<div class="section"><div class="section-head"><div class="section-title">套装效果</div></div>' +
          item.bonuses.map(function (b) {
            return '<div class="bonus-row"><span class="bonus-tag">' + esc(b.type) + "</span>" + esc(b.description || b.name || "") + "</div>";
          }).join("") + "</div>";
      }
      if (item.collectionNote) h += '<div class="section"><div class="guide-note">' + icon("info", 18) + "<div>" + esc(item.collectionNote) + "</div></div></div>";
      h += lootSourcesSection((item.pieces || []).map(function (p) { return p.id; }), 8);
      return h;
    }
    if (type === "ammo") {
      let h = '<div class="section"><div class="stat-grid">' +
        '<div class="stat-box"><b>' + esc(item.type || "弹药") + '</b><span>类型</span></div>' +
        '<div class="stat-box"><b>' + fmtNum(item.stack) + '</b><span>堆叠</span></div>' +
        '<div class="stat-box"><b>' + ((item.guns || []).length) + '</b><span>适用枪械</span></div>' +
        '<div class="stat-box"><b>' + ((item.sources || []).length) + '</b><span>区域来源</span></div></div></div>';
      h += recipeSection(item.recipe, "合成 / 装填材料") || noRecipeNote("该弹药");
      if ((item.guns || []).length) {
        const gm = {};
        (GUIDE.guns || []).forEach(function (x) { gm[x.id] = x.name; });
        h += '<div class="section"><div class="section-head"><div class="section-title">适用枪械</div><div class="section-note">' + item.guns.length + ' 把</div></div><div class="chip-row">' +
          item.guns.map(function (id) { return '<button class="chip" data-go="' + guideDetailHref("guns", id) + '">' + esc(gm[id] || id) + "</button>"; }).join("") + "</div></div>";
      }
      if ((item.sources || []).length) {
        h += '<div class="section"><div class="section-head"><div class="section-title">区域建筑来源</div><div class="section-note">按掉率</div></div><div class="list">' +
          item.sources.slice().sort(function(a,b){return (b.chance||0)-(a.chance||0);}).slice(0,40).map(function (x) {
            return '<button class="row-card" data-go="#/loot/building/' + encodeURIComponent(x.regionId) + "/" + encodeURIComponent(x.buildingId) + '">' +
              '<div class="row-main"><div class="row-title">' + esc(x.building) + '</div><div class="row-sub">' + esc(x.region) + " · " + esc(x.floor) + " · " + esc(x.container) + "</div></div>" +
              '<div class="row-right"><span class="badge">' + (Number(x.chance || 0)).toFixed(1) + "%</span></div></button>";
          }).join("") + "</div></div>";
      } else {
        h += '<div class="section"><div class="guide-note">' + icon("info", 18) + "<div>战利品表中未发现该弹药的区域建筑来源，可能通过合成、交易或任务获取。</div></div></div>";
      }
      return h;
    }
    if (type === "guns") {
      const gs = ((window.WZ_GUNSMITH || {}).guns || {})[item.id];
      const modes = gs && gs.fireModeLabels && gs.fireModeLabels.length
        ? '<div class="gs-gun-modes">' + gs.fireModeLabels.map(function (x) { return '<span class="gs-badge fire">' + esc(x) + "</span>"; }).join("") +
          (gs.boltLabel ? '<span class="gs-badge bolt">' + esc(gs.boltLabel) + "</span>" : "") + "</div>"
        : "";
      return '<div class="section"><div class="stat-grid">' +
        '<div class="stat-box"><b>' + fmtNum(item.damage) + '</b><span>基础伤害</span></div>' +
        '<div class="stat-box"><b>' + fmtNum(item.rpm) + '</b><span>RPM 射速</span></div>' +
        '<div class="stat-box"><b>' + esc(item.magLabel || fmtNum(item.mag)) + '</b><span>弹容</span></div>' +
        '<div class="stat-box"><b>' + esc(item.ammo || "—") + '</b><span>弹药</span></div>' +
        '<div class="stat-box"><b>' + (item.armorIgnore != null ? Math.round(item.armorIgnore * 100) + "%" : "—") + '</b><span>护甲穿透</span></div>' +
        '<div class="stat-box"><b>' + (item.headshot != null ? "×" + item.headshot : "—") + '</b><span>爆头倍率</span></div>' +
        "</div>" + modes +
        '<button class="gs-open-btn" data-go="#/gear/gunsmith/' + encodeURIComponent(item.id) + '">' + icon("gear", 17) + '<span>在改枪台查看配件与完整数值</span>' + icon("chevron", 16) + "</button></div>" +
        effectSection(item.effect, "定位 / 作用", item.description ? "背景：" + item.description : "") +
        lootSourcesSection([item.id], 6);
    }
    if (type === "npcs") {
      let h = '<div class="section"><div class="stat-grid">' +
        '<div class="stat-box"><b>' + fmtNum(item.hp) + '</b><span>生命</span></div>' +
        '<div class="stat-box"><b>' + fmtNum(item.damage) + '</b><span>伤害</span></div>' +
        '<div class="stat-box"><b>' + esc(item.weapon || "—") + '</b><span>武器</span></div>' +
        '<div class="stat-box"><b>' + esc((item.armor || []).length || "—") + '</b><span>护甲件数</span></div>' +
        "</div>" + (item.location ? '<div class="section-head" style="margin-top:14px"><div class="section-title">位置</div></div><div class="text-block">' + esc(item.location) + "</div>" : "") + "</div>";
      h += '<div class="section npc-trade-section"><div class="section-head"><div class="section-title">交易清单</div><div class="section-note">' +
        (item.trade ? (item.trade.items ? item.trade.items.length + " 条 · " : "") + (item.trade.source || "商店配置") : "无商店") + "</div></div>" +
        npcTradeCard(item) + "</div>";
      if (item.tradeBrief) h += '<div class="section"><div class="guide-note">' + icon("info", 18) + '<div>' + esc(item.tradeBrief) + "</div></div></div>";
      return h;
    }
    if (type === "vehicles") {
      return '<div class="section"><div class="stat-grid">' +
        '<div class="stat-box"><b>' + esc(item.group || "载具") + '</b><span>分类</span></div>' +
        '<div class="stat-box"><b>' + fmtNum(item.variants || 1) + '</b><span>包含变体</span></div></div>' +
        ((item.aliases || []).length ? '<div class="section"><div class="section-head"><div class="section-title">其他颜色 / 变体</div></div><div class="chip-row">' + item.aliases.map(function (a) { return '<span class="chip" style="cursor:default">' + esc(a) + "</span>"; }).join("") + "</div></div>" : "") + "</div>" +
        (recipeSection(item.recipe, "载具组装材料") || noRecipeNote("这辆载具"));
    }
    if (type === "melee") {
      const dmg = item.damageValue != null ? fmtNum(item.damageValue) : (item.damageBand || "—");
      const spd = item.speedValue != null ? Number(item.speedValue).toFixed(2) + " 次/秒" : (item.speedBand || "—");
      const stat = '<div class="section"><div class="stat-grid">' +
        '<div class="stat-box"><b>' + esc(item.weaponType || "近战") + '</b><span>武器类型</span></div>' +
        '<div class="stat-box"><b>' + esc(item.tier || "—") + '</b><span>阶级</span></div>' +
        '<div class="stat-box"><b>' + esc(dmg) + '</b><span>攻击伤害</span></div>' +
        '<div class="stat-box"><b>' + esc(spd) + '</b><span>攻击速度</span></div>' +
        '<div class="stat-box"><b>' + esc(item.handed || "—") + '</b><span>持握方式</span></div>' +
        "</div></div>";
      const st = item.stars || {};
      const starLine = '<div class="section"><div class="star-line">同阶伤害 ' + starsHTML(st.damage,"同阶伤害") + ' · 同阶攻速 ' + starsHTML(st.speed,"同阶攻速") + ' · 同阶推荐 ' + starsHTML(st.recommend,"同阶推荐") + ' <span class="star-note">仅同 T 阶级内比较</span></div>' +
        (item.handed === "单手" ? '<div class="star-line star-share">双持参考：攻速 ×1.2 · 主手伤害 ×1.0 · 副手伤害 ×1.0 <span class="star-note">Better Combat 配置</span></div>' : '<div class="star-line star-share">双手武器：不参与双持 <span class="star-note">Better Combat 配置</span></div>') + '</div>';
      const note = item.statNote ? "数值来源：" + item.statNote + "；攻击伤害按玩家基础攻击力 1 计算。" : item.bandNote;
      return stat + starLine + effectSection(item.effect || "暂无可靠的公开效果说明，具体以游戏内为准。", "作用", note) +
        lootSourcesSection([item.iconItem], 6);
    }
    if (type === "trinkets") {
      return effectSection(item.effect || "暂无可靠的公开效果说明，具体以游戏内为准。", "作用") + lootSourcesSection([item.iconItem], 6);
    }
    if (type === "defense") {
      return lootSourcesSection([item.iconItem], 6);
    }
    if (type === "story") {
      return '<div class="section"><div class="section-head"><div class="section-title">正文</div></div><div class="story-text">' + esc(item.text || "") + "</div></div>";
    }
    return "";
  }
  function renderGuideDetail(type, id) {
    const cfg = GUIDE_TYPES[type];
    const item = (cfg.data || []).filter(function (x) { return x.id === id; })[0];
    if (!item) { go(cfg.list); return; }
    renderTopbar({ back: cfg.list, title: item.name, sub: guideRowTag(type, item) });
    document.title = item.name + " · " + cfg.title;
    const usePhoto = (type === "story" || type === "npcs") && item.image;
    const hero = usePhoto
      ? '<div class="guide-hero"><img src="' + esc(item.image) + '" alt="' + esc(item.name) + '" loading="lazy"><div class="guide-hero-note">' + esc(type === "npcs" ? "NPC · " + (item.faction || "") : "剧情书 · 5.11.19") + "</div></div>"
      : '<div class="guide-icon-hero">' + guideThumb(item, 96, type) + "</div>";
    const meta = [
      '<span class="badge">' + esc(guideRowTag(type, item)) + "</span>",
      type === "vehicles" && item.source ? '<span class="badge">' + esc(item.source) + "</span>" : ""
    ].join("");
    q("view").innerHTML =
      hero +
      '<div class="detail-hero"><h1>' + esc(item.name || "未命名") + "</h1><div class=\"meta\">" + meta + "</div>" +
        (item.description ? '<div class="text-block" style="margin-top:12px">' + esc(item.description) + "</div>" : "") +
      "</div>" +
      guideDetailExtra(type, item) +
      (item.source ? '<div class="section"><div class="section-head"><div class="section-title">资料来源</div></div><div class="tiny dim">' + esc(item.source) + "</div></div>" : "") +
      '<div class="section"><button class="btn ghost block" data-go="' + cfg.list + '">' + icon("back", 17) + "返回" + esc(cfg.title) + "</button></div>";
  }

  /* ---------------- 建筑列表 ---------------- */
  function buildingGuide(id) { return GUIDE.buildings[id] || null; }
  function buildingThumb(b, size) {
    const g = buildingGuide(b.id);
    if (g && g.image) {
      return "<div class=\"guide-thumb\" style=\"width:" + size + "px;height:" + size + "px;background-image:url('" + esc(g.image) + "')\"></div>";
    }
    return '<div class="avatar">' + esc(initial(b.name)) + "</div>";
  }
  function renderBuildingsList() {
    renderTopbar({ back: "#/world", title: "建筑图鉴", sub: DATA.meta.buildings + " 座建筑" });
    document.title = "建筑图鉴 · 亡者世界";
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass("buildings") + '"' + heroStyle("buildings") + '><h1>建筑图鉴</h1><div class="meta"><span class="badge">任务书拍立得</span><span class="badge custom">区域战利品</span></div>' +
        '<div class="hero-desc" style="margin-top:10px">按区域浏览建筑外观图，点进建筑可查看楼层、容器与完整掉落表。</div></div>' +
      '<div class="section"><div class="searchbar">' + icon("search") + '<input id="building-search" type="search" placeholder="搜索建筑名称或 ID" autocomplete="off"></div></div>' +
      '<div class="section"><div class="chip-row" id="building-regions"></div></div>' +
      '<div class="section"><div class="list" id="building-list"></div></div>';
    ui.buildingRegion = ui.buildingRegion || "全部";
    ui.buildingQuery = ui.buildingQuery || "";
    const input = q("building-search");
    input.addEventListener("input", debounce(function (e) { ui.buildingQuery = e.target.value; renderBuildingRows(); }, 100));
    renderBuildingRegions();
    renderBuildingRows();
  }
  function renderBuildingRegions() {
    const box = q("building-regions");
    if (!box) return;
    const regions = ["全部"].concat(DATA.regions.map(function (r) { return r.name; }));
    box.innerHTML = regions.map(function (r) {
      return '<button class="chip ' + (ui.buildingRegion === r ? "active" : "") + '" data-action="building-region" data-region="' + esc(r) + '">' + esc(r) + "</button>";
    }).join("");
  }
  function renderBuildingRows() {
    const box = q("building-list");
    if (!box) return;
    const query = (ui.buildingQuery || "").trim().toLowerCase();
    const region = ui.buildingRegion || "全部";
    const rows = buildingList.filter(function (x) {
      if (region !== "全部" && x.region.name !== region) return false;
      if (!query) return true;
      return (x.building.name + " " + x.building.id).toLowerCase().indexOf(query) >= 0;
    });
    box.innerHTML = rows.length ? rows.map(function (x) {
      const b = x.building, g = buildingGuide(b.id);
      return '<button class="row-card building-row ' + climateClass(x.region) + '" data-go="#/loot/building/' + encodeURIComponent(x.region.id) + "/" + encodeURIComponent(b.id) + '">' +
        buildingThumb(b, 56) +
        '<div class="row-main"><div class="row-title b-title-wrap">' + buildingTitleHTML(b) + "</div>" +
          '<div class="row-sub">' + esc(x.region.name) + " · " + b._floors + " 层 · " + b._entries.toLocaleString() + " 条掉落</div></div>" +
        '<div class="row-right"><span class="badge">' + esc(x.region.tier || "—") + "</span>" + (g && g.image ? '<div class="cap" style="margin-top:4px">有图</div>' : "") + "</div>" +
        "</button>";
    }).join("") : '<div class="empty">' + icon("search", 28) + '<div class="em-title">没有匹配的建筑</div><div class="em-sub">换个区域或关键词试试</div></div>';
  }

  /* ---------------- 怪物等级（普通 / 特殊 / 小头目 / 头领 / 灾厄 / 真菌） ---------------- */
  const MONSTER_LEVELS = ["全部", "普通", "特殊", "小头目", "头领", "灾厄", "真菌"];
  function monsterLevelKey(m) {
    const lv = m && m.level;
    if (lv === "普通" || lv === "特殊" || lv === "小头目" || lv === "头领" || lv === "灾厄" || lv === "真菌" || lv === "友好") return lv;
    if (typeof lv === "string") {
      if (/^灾厄/.test(lv)) return "灾厄";
      if (/^头目/.test(lv)) return "头领";
      if (/^真菌/.test(lv)) return "真菌";
      if (/^普通/.test(lv)) return "普通";
      if (/^特殊/.test(lv)) return "特殊";
    }
    // 兼容旧数据 / 自制条目
    if (m && m.calamityLevel) return "灾厄";
    if (m && (m.bossTier === 3 || m.bossTier === 4)) return "头领";
    if (m && (m.category === "Boss" || MONSTER_LEADERS.has(m.name))) return "小头目";
    if (m && m.category === "普通感染体") return "普通";
    if (m && m.category === "友好生物") return "友好";
    if (m && String(m.source || "").indexOf("Spore") >= 0) return "真菌";
    return "特殊";
  }
  function monsterVitalsHTML(m) {
    const hp = m.hp, atk = m.attack, armor = m.armor;
    const hearts = Number(hp) / 2;
    const heartTitle = hp != null && hp !== "" ? ' title="生命 ' + hp + (isFinite(hearts) ? '（' + (Number.isInteger(hearts) ? hearts : hearts.toFixed(1)) + ' 颗心）' : '') + '"' : "";
    return '<div class="monster-vitals">' +
      '<div class="monster-vital"><div class="mv-top"><span class="mv-icon"' + heartTitle + '><img class="stat-ico" src="./images/ui/stat-heart-half.webp" alt=""></span><b>' + esc(fmtNum(hp)) + '</b></div><span class="mv-label">基础生命</span></div>' +
      '<div class="monster-vital"><div class="mv-top"><span class="mv-icon"><img class="stat-ico" src="./images/ui/stat-armor-half.webp" alt=""></span><b>' + esc(fmtNum(armor)) + '</b></div><span class="mv-label">基础护甲</span></div>' +
      '<div class="monster-vital"><div class="mv-top"><span class="mv-icon"><img class="stat-ico" src="./images/ui/stat-attack.webp" alt=""></span><b>' + esc(fmtNum(atk)) + '</b></div><span class="mv-label">基础攻击</span></div>' +
    '</div>';
  }
  function monsterHpHTML(hp) {
    const n = Number(hp);
    if (hp == null || hp === "" || !isFinite(n) || n <= 0) return esc(hp == null ? "—" : hp);
    const hearts = n / 2;
    const full = Math.floor(hearts);
    const half = hearts - full >= 0.5;
    if (full + (half ? 1 : 0) <= 10) {
      let h = '<span class="mc-hearts" title="生命 ' + n + '（' + hearts + ' 颗心）">';
      for (let i = 0; i < full; i++) h += '<span class="mc-heart full">♥</span>';
      if (half) h += '<span class="mc-heart half">♥</span>';
      return h + '</span>';
    }
    return '<span class="mc-hearts many" title="生命 ' + n + '（' + hearts + ' 颗心）"><span class="mc-heart full">♥</span><small>× ' + (Number.isInteger(hearts) ? hearts : hearts.toFixed(1)) + '</small></span>';
  }
  function monsterZoneLabel(m) {
    const lv = monsterLevelKey(m);
    if (lv === "小头目") {
      const t = Math.max(1, Math.min(3, Number(m.minorTier || 1)));
      return "小头目 " + ["I", "II", "III"][t - 1];
    }
    return lv;
  }
  function monsterZoneMatch(m, level) {
    if (level === "全部") return true;
    return monsterLevelKey(m) === level;
  }

  /* ---------------- 路由 ---------------- */
  function parseHash() {
    const raw = (location.hash || "").replace(/^#\/?/, "");
    const qIndex = raw.indexOf("?");
    const path = qIndex >= 0 ? raw.slice(0, qIndex) : raw;
    const query = new URLSearchParams(qIndex >= 0 ? raw.slice(qIndex + 1) : "");
    return {
      parts: path.split("/").filter(Boolean).map(function (x) {
        try { return decodeURIComponent(x); } catch (e) { return x; }
      }),
      query: query
    };
  }
  function go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  }
  function currentHash() { return location.hash || "#/loot"; }

  // 返回列表/上一页时恢复滚动位置，而不是每次重置到顶部
  const SCROLL_KEY = "wz_scroll_positions";
  let activeRoute = null;
  let scrollPositions = {};
  try {
    scrollPositions = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || "{}") || {};
  } catch (e) { scrollPositions = {}; }
  try {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  } catch (e) {}
  function rememberScroll() {
    if (!activeRoute) return;
    scrollPositions[activeRoute] = window.scrollY || 0;
    try { sessionStorage.setItem(SCROLL_KEY, JSON.stringify(scrollPositions)); } catch (e) {}
  }
  function restoreScroll(hash) {
    const y = scrollPositions[hash] || 0;
    if (!y) return;
    requestAnimationFrame(function () {
      window.scrollTo({ top: y, left: 0, behavior: "instant" });
      setTimeout(function () {
        if (Math.abs(window.scrollY - y) > 2 && document.documentElement.scrollHeight - window.innerHeight >= y) {
          window.scrollTo({ top: y, left: 0, behavior: "instant" });
        }
      }, 80);
    });
  }

  let wheelLock = false;
  function isLootHome() {
    const h = (location.hash || "").replace(/^#/, "");
    return h === "" || h === "/" || h === "/loot" || h === "/loot/";
  }
  function setupWheelPaging() {
    window.addEventListener("wheel", function (e) {
      if (!isLootHome() || e.ctrlKey || Math.abs(e.deltaY) < 8) return;
      if (e.target && e.target.closest && e.target.closest("input, textarea, select, [contenteditable=true]")) return;
      if (e.target && e.target.closest && e.target.closest(".overlay, .sheet")) return;
      e.preventDefault();
      if (wheelLock) return;
      wheelLock = true;
      const step = Math.max(360, Math.round(window.innerHeight * 0.88));
      window.scrollBy({ top: e.deltaY > 0 ? step : -step, behavior: "smooth" });
      setTimeout(function () { wheelLock = false; }, 720);
    }, { passive: false });
  }
  function route() {
    const nextHash = currentHash();
    rememberScroll();
    closeSheet(true);
    closeMeDrawer();
    if (q("view")) q("view").className = "view";
    const parsed = parseHash();
    const p = parsed.parts;
    const root = p[0] || "loot";
    let tab = "loot";
    if (root === "creatures" || root === "monsters" || root === "monster" || root === "npc") tab = "creatures";
    else if (root === "gear" || root === "armor" || root === "gun" || root === "melee" || root === "trinket") tab = "gear";
    else if (root === "world" || root === "machines" || root === "machine") tab = "world";
    else if (root === "community") tab = "community";
    else if (root === "me" || root === "settings") tab = "community";
    document.body.className = document.body.className.replace(/\bpage-[a-z-]+\b/g, "").replace(/\s+/g, " ").trim();
    if (root) document.body.classList.add("page-" + root);
    document.body.classList.toggle("page-monsters", root === "creatures" && p[1] === "monsters");
    renderTabbar(tab);

    if (root === "loot") {
      if (p[1] === "tier" && p[2]) renderLootTier(p[2]);
      else if (p[1] === "region" && p[2]) renderRegion(p[2]);
      else if (p[1] === "building" && p[2] && p[3]) renderBuilding(p[2], p[3]);
      else if (p[1] === "search") renderLootHome(parsed.query.get("q") || "");
      else renderLootHome("");
    } else if (root === "item" && p[1]) {
      renderItem(p[1]);
    } else if (root === "creatures") {
      if (p[1] === "monsters" && p[2] === "stats") renderMonsterStats();
      else if (p[1] === "monsters") renderMonsters();
      else if (p[1] === "npcs") renderGuideList("npcs");
      else if (p[1] === "npc" && p[2]) renderGuideDetail("npcs", p[2]);
      else renderCreaturesHub();
    } else if (root === "gear") {
      if (p[1] === "gunsmith") {
        if (window.WZ_GUNSMITH_UI) {
          if (p[2]) window.WZ_GUNSMITH_UI.renderWorkspace(p[2]);
          else window.WZ_GUNSMITH_UI.renderHub();
        }
      } else {
        if (p[1] === "guntable") { renderGunTable(); return; }
    const gearAlias = { armor: "armor", gun: "guns", ammo: "ammo", melee: "melee", trinket: "trinkets" };
        const gearType = gearAlias[p[1]] || p[1];
        if (p[1] === "melee" && p[2] === "compare") { renderMeleeCompare(); return; }
        if (p[1] === "melee" && p[2] === "cat" && p[3]) { renderMeleeCategory(p[3]); return; }
        if (p[1] && GUIDE_TYPES[gearType]) {
          if (p[2]) renderGuideDetail(gearType, p[2]);
          else renderGuideList(gearType);
        } else renderGearHub();
      }
    } else if (root === "world") {
      if (p[1] === "changelog") renderChangelog();
      else if (p[1] === "vehicle-audit") renderVehicleAudit();
      else if (p[1] === "difficulty") renderWorldDifficulty();
      else if (p[1] === "buildings") renderBuildingsList();
      else if (p[1] === "vehicles" || p[1] === "vehicle") {
        if (p[2] === "group" && p[3]) renderVehicleGroup(decodeURIComponent(p[3]));
        else if (p[2]) renderGuideDetail("vehicles", p[2]);
        else renderVehiclesHub();
      } else if (p[1] === "story") {
        if (p[2]) renderGuideDetail("story", p[2]);
        else renderGuideList("story");
      } else if (p[1] === "tech") {
        renderTechPage();
      } else if (p[1] === "defense") {
        if (p[2]) renderGuideDetail("defense", p[2]);
        else renderGuideList("defense");
      } else renderWorldHub();
    } else if (root === "machine" && p[1]) {
      renderMachine(p[1]);
    } else if (root === "machines") {
      renderMachines();
    } else if (root === "community") {
      renderCommunity();
    } else if (root === "settings") {
      renderSettings();
    } else if (root === "monsters") {
      renderMonsters();
    } else if (root === "monster" && p[1]) {
      renderMonster(p[1]);
    } else if (root === "me") {
      if (p[1] === "favorites") renderFavorites();
      else renderCommunity();
    } else {
      renderLootHome("");
    }
    activeRoute = nextHash;
    restoreScroll(nextHash);
  }

  /* ---------------- 框架 ---------------- */
  function renderTopbar(opts) {
    opts = opts || {};
    document.body.classList.toggle("has-back", !!opts.back);
    document.body.classList.remove("community-page");
    const brand = '<div class="brand"><div class="brand-mark"><img src="./images/brand/deceasedcraft_icon.png" alt="DeceasedCraft"></div><div class="brand-text"><div class="brand-title">亡者图鉴</div><div class="brand-sub">DECEASEDCRAFT ' + esc((GUIDE.meta || {}).version || DATA.meta.version) + '</div><div class="brand-note">非官方攻略 · 仅供参考</div></div></div>';
    let left;
    if (opts.logo) {
      left = brand;
    } else if (opts.back) {
      left = '<button class="back-btn" data-go="' + esc(opts.back) + '">' + icon("back", 18) + "<span>返回</span></button>";
    } else {
      left = '<button class="me-btn" data-action="open-me" aria-label="我的">' + icon("user", 21) + '<span class="me-btn-label">我的</span></button>';
    }
    let center = "";
    if (opts.title) {
      center = '<div style="flex:1;min-width:0;text-align:center"><div class="page-title" style="font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(opts.title) + "</div>" + (opts.sub ? '<div class="page-sub">' + esc(opts.sub) + "</div>" : "") + "</div>";
    } else {
      center = '<div class="brand-center">' + brand + "</div>";
    }
    const theme = document.documentElement.dataset.theme || getTheme();
    const themeBtn = '<button class="icon-btn theme-btn" data-action="toggle-theme" aria-label="切换' +
      (theme === "light" ? "深色" : "浅色") + '背景">' + icon(theme === "light" ? "moon" : "sun") + "</button>";
    const viewBtn = '<button class="icon-btn" data-action="toggle-view" aria-label="切换电脑/手机版">' + icon(viewMode() === "pc" ? "mobile" : "monitor") + "</button>";
    const actions = (opts.actions || []).join("") + viewBtn + themeBtn;
    q("topbar").innerHTML = '<div class="topbar-inner">' + left + '<div class="topbar-center">' + center + '</div>' + '<div class="top-actions">' + actions + "</div></div>";
  }

  function renderTabbar(active) {
    const tabs = [
      { id: "loot", label: "区域战利品", icon: "box", href: "#/loot" },
      { id: "creatures", label: "生物", icon: "skull", href: "#/creatures" },
      { id: "gear", label: "装备", icon: "shield", href: "#/gear" },
      { id: "world", label: "世界", icon: "globe", href: "#/world" },
      { id: "community", label: "社区", icon: "user", href: "#/community" }
    ];
    q("tabbar").innerHTML = '<div class="tabbar-inner">' + tabs.map(function (t) {
      return '<button class="tab ' + (t.id === active ? "active" : "") + '" data-go="' + t.href + '" aria-label="' + t.label + '"' + (t.id === active ? ' aria-current="page"' : "") + ">" + icon(t.icon, 21) + "<span>" + t.label + "</span></button>";
    }).join("") + "</div>";
  }

  function pageHead(back, title, sub) {
    return '<div class="page-head"><button class="back-btn" data-go="' + esc(back) + '">' + icon("back", 18) + "<span>返回</span></button><div style=\"flex:1;min-width:0\"><div class=\"page-title\">" + esc(title) + "</div>" + (sub ? '<div class="page-sub">' + esc(sub) + "</div>" : "") + "</div></div>";
  }

  function bannerFor(key) {
    return (((GUIDE.meta || {}).banners || {})[key]) || "";
  }
  function heroClass(key) {
    return bannerFor(key) ? " has-bg" : "";
  }
  function heroStyle(key) {
    let b = bannerFor(key);
    if (!b) return "";
    // CSS 自定义属性中的相对 URL 会按样式表（app/css/）解析，这里补一级
    if (b.indexOf("data:") !== 0) b = b.replace(/^\.\//, "../");
    return ' style="--banner:url(\'' + esc(b) + '\')"';
  }

  function badgeTier(tier) {
    if (!tier) return "";
    const txt = String(tier);
    const activeSet = {};
    txt.replace(/T([1-4])\s*[-–~]\s*T([1-4])/g, function (_, a, b) { const x = Number(a), y = Number(b); for (let i = Math.min(x, y); i <= Math.max(x, y); i++) activeSet["T" + i] = true; return _; });
    (txt.match(/T[1-4]/g) || []).forEach(function (t) { activeSet[t] = true; });
    const active = Object.keys(activeSet);
    return '<span class="tier-dots tier-dots-lg" role="img" aria-label="' + esc(txt) + '">' + ["T1", "T2", "T3", "T4"].map(function (t) { return '<i class="tier-dot' + (active.indexOf(t) >= 0 ? " on" : "") + '" data-tier="' + t + '">' + t + '</i>'; }).join("") + '</span>';
  }
  function badgeClimate(c) {
    if (!c) return "";
    const txt = String(c);
    if (txt.indexOf("/") >= 0) return txt.split("/").map(function (x) { return badgeClimate(x.trim()); }).join("");
    const cls = txt === "炎热" ? "hot" : txt === "寒冷" ? "cold" : txt === "辐射" ? "rad" : txt === "极热" ? "scorch" : "warm";
    return '<span class="badge ' + cls + '">' + esc(txt) + "</span>";
  }
  function threatDots(n) {
    let h = '<span class="threat" title="威胁等级 ' + Number(n || 0) + '/5">';
    for (let i = 1; i <= 5; i++) h += "<i class=\"" + (i <= Number(n || 0) ? "on" : "") + "\"></i>";
    return h + "</span>";
  }
  const MONSTER_LEADERS = new Set([
    "零号病人", "被感染的重装兵", "链锯", "黑色行动刺客",
    "恐魔", "不死人", "死灵", "狂疫者", "惩戒者", "嗜欲者",
    "已感染的唤魔者", "已感染的幻术师"
  ]);
  function ratingLevel(text) {
    const t = String(text || "");
    const map = { "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10 };
    const m = /([一二三四五六七八九十])\s*级/.exec(t);
    if (m) return map[m[1]] || 0;
    if (/头目|boss/i.test(t)) return 5;
    return 0;
  }
  function monsterThreatInfo(m) {
    const src = String(m.source || "") + " " + String(m.mod || "");
    const isSpore = src.indexOf("Spore") >= 0;
    if (m._custom && m.threat) {
      return { key: "custom", label: "自定义威胁", dots: Number(m.threat) || 0 };
    }
    const rating = String(m.rating || "");
    if (/小头目/.test(rating) || /[一二三四五六七八九十]\s*级/.test(rating)) {
      const total = /小头目/.test(rating) ? 3 : 4;
      const rl = ratingLevel(rating);
      const rawLv = String(m.level || "");
      const key = /小头目/.test(rating) ? "minor" : (rawLv.indexOf("灾厄") === 0 ? "calamity" : (rawLv === "头目" ? "boss" : "special"));
      return { key: key, label: rating, dots: Math.max(0, Math.min(total, rl)), dotsTotal: total };
    }
    const raw = String(m.level || "").trim();
    if (raw === "灾厄 I" || raw === "灾厄 II") return { key: "calamity", label: m.rating || raw, icon: "☢☢", fungus: isSpore };
    if (raw === "头目") return { key: "boss", label: m.rating || "头目", icon: "☢" };
    if (raw === "真菌") return { key: "fungus", label: m.rating || "真菌", icon: "🍄" };
    if (raw === "普通") return { key: "normal", label: m.rating || "普通", dots: 0, dotsTotal: 4 };
    if (raw === "特殊") {
      const rl = ratingLevel(m.rating);
      const total = /小头目/.test(String(m.rating || "")) ? 3 : 4;
      return { key: "special", label: m.rating || "特殊", dots: 0, dotsTotal: total };
    }
    const lv = monsterLevelKey(m);
    if (lv === "灾厄") return { key: "calamity", label: isSpore ? "真菌灾厄" : "灾厄", icon: "☢☢", fungus: isSpore };
    if (lv === "头领") return { key: "leader", label: "头领", icon: "☢" };
    if (lv === "小头目") {
      const t = Math.max(1, Math.min(3, Number(m.minorTier || 1)));
      return { key: "minor", label: "小头目 " + ["I", "II", "III"][t - 1], dots: t, minorTier: t };
    }
    if (lv === "真菌") return { key: "fungus", label: "真菌感染体", icon: "🍄" };
    if (lv === "普通") return { key: "normal", label: "普通感染体", dots: 1 };
    if (lv === "友好") return { key: "friendly", label: "友好生物", dots: 0 };
    let label = m.category || "特殊感染体";
    if (label === "变异体") label = "特殊感染体";
    if (label === "尸潮") label = "尸潮单位";
    return { key: "special", label: label, dots: 4 };
  }
  function threatDotsHTML(n, total) {
    if (total == null) total = 5;
    let h = '<span class="threat-dots">';
    for (let i = 1; i <= total; i++) h += '<i class="' + (i <= n ? "on" : "") + '"></i>';
    return h + "</span>";
  }
  function monsterThreatBadge(m) {
    if (!String(m && m.rating || "").trim()) return "";
    const info = monsterThreatInfo(m);
    let symbol = "";
    if (info.dots != null) symbol = threatDotsHTML(info.dots, info.dotsTotal || 5);
    else symbol = '<span class="threat-rad">' + info.icon + "</span>";
    let cls = "threat-tag " + info.key;
    if (info.level) cls += " level" + info.level;
    let badge = '<span class="' + cls + '">' + symbol + "<em>" + esc(info.label) + "</em>" +
      (info.fungus ? '<span class="fungus-mini">🍄</span>' : "") + "</span>";
    return badge;
  }
  function monsterThreatDesc(m) {
    const info = monsterThreatInfo(m);
    if (info.key === "calamity") {
      const base = "灾厄：当前最高威胁等级。建议组队、准备重火力与逃生路线，不要在没有掩体的情况下正面硬抗。";
      return info.fungus ? base + " 属于真菌灾厄生物，分布在 T5 区域（推测）。" : base;
    }
    if (info.key === "leader") return "头领：由原一级灾厄与高阶 Boss 下沉后的阶级，拥有独特机制或阶段变化。先清理召唤物，再集中火力处理本体。";
    if (info.key === "minor") return "小头目 " + ["I", "II", "III"][Math.max(0, Math.min(2, Number(info.minorTier || 1) - 1))] + "：T2 起地标建筑尸潮才会刷新的高血量单位，血量高于普通僵尸。红色圆点 1–3 表示级别。优先清理周围小怪，再集中火力处理。";
    if (info.key === "fungus") return "真菌感染体，分布在 T5 区域（推测）。攻击常附带孢子、感染或范围效果。保持距离，避免被孢子云包围。";
    if (info.key === "normal") return "普通感染体，单体威胁较低，但成群时仍可能拖垮弹药与体力。";
    if (info.key === "friendly") return "友好生物，不会主动攻击。可交易或提供任务。";
    if (info.key === "custom") return "本地录入的自定义威胁等级。";
    return "特殊感染体 / 高危单位，拥有突进、爆炸、远程或控制能力。优先攻击弱点，避免被围。";
  }

  /* ---------------- 战利品首页 ---------------- */
  const LOOT_TIERS = [
    { tier: "T1", code: "T1/T2/T3", title: "低层郊区", desc: "住宅、街道与荒野", ids: ["suburb", "wild", "street"], sections: [{ title: "寒冷 / 温和", ids: ["suburb"] }, { title: "炎热", ids: ["wild", "street"] }] },
    { tier: "T2", code: "T2", title: "摩天城区", desc: "办公区与住宅区", ids: ["office", "residential"], sections: [{ title: "寒冷", ids: ["residential"] }, { title: "炎热", ids: ["office"] }] },
    { tier: "T3", code: "T3", title: "商业酒店", desc: "酒店与零售商业", ids: ["hotel", "retail"], sections: [{ title: "寒冷", ids: ["retail"] }, { title: "炎热", ids: ["hotel"] }] },
    { tier: "T4", code: "T4", title: "荒地", desc: "高辐射区域", ids: ["wasteland"], sections: [{ title: "炎热 / 辐射 / 极热", ids: ["wasteland"] }] }
  ];
  function lootRegionById(id) { return (DATA.regions || []).filter(function (r) { return r.id === id; })[0]; }
  function lootRegionImage(r) {
    if (r.cover) return r.cover;
    const all = GUIDE.buildings || {};
    for (const k in all) { const g = all[k]; if (g && g.region === r.name && g.image) return g.image; }
    return "";
  }
  function lootTierImage(t) {
    for (let i = 0; i < t.ids.length; i++) { const r = lootRegionById(t.ids[i]); if (r && r.cover) return r.cover; }
    for (let i = 0; i < t.ids.length; i++) { const r = lootRegionById(t.ids[i]); const img = r && lootRegionImage(r); if (img) return img; }
    return "";
  }
  function lootRegionCard(r, displayName) {
    if (!r) return "";
    const img = lootRegionImage(r), cc = climateClass(r);
    return '<button class="region-card ' + cc + (img ? " has-img" : "") + '" style="--accent:' + tone(r.id) + '" data-go="#/loot/region/' + encodeURIComponent(r.id) + '">' +
      (img ? '<img class="rc-bg" src="' + esc(img) + '" alt="" loading="lazy"><span class="poster-view" data-action="view-poster" data-img="' + esc(img) + '" role="button" tabindex="0" title="查看海报">⤢</span>' : "") +
      '<div class="rc-top"><div><div class="rc-name">' + esc(displayName || r.name) + (cc === "climate-rad" ? '<span class="rc-rad-tag">辐射</span>' : "") + '</div><div class="rc-meta">' + badgeTier(r.tier) + badgeClimate(r.climate) + "</div></div>" + icon("chevron", 18) + "</div>" +
      '<div class="rc-nums"><div class="rc-num"><b>' + r.buildings.length + '</b><span>建筑</span></div><div class="rc-num"><b>' + r._entries.toLocaleString() + '</b><span>掉落条目</span></div></div>' +
      (cc === "climate-rad" ? '<div class="rc-rad-warn">高辐射 · 需防护服</div>' : "") + "</button>";
  }
  function renderLootTier(tierId) {
    const t = LOOT_TIERS.filter(function (x) { return x.tier === tierId; })[0];
    if (!t) { go("#/loot"); return; }
    const regions = t.ids.map(lootRegionById).filter(Boolean);
    const buildingCount = regions.reduce(function (a, r) { return a + r.buildings.length; }, 0);
    renderTopbar({ back: "#/loot", title: t.tier + " 区域", sub: buildingCount + " 座建筑" });
    document.title = t.tier + " 区域 · 亡者世界";
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass("home") + '"' + heroStyle("home") + '><div class="hero-kicker">TIER ' + t.tier.slice(1) + '</div><h1>' + esc(t.title) + '</h1><div class="meta"><span class="badge">' + regions.length + ' 个区域</span><span class="badge">' + buildingCount + ' 座建筑</span></div><div class="hero-desc" style="margin-top:10px">' + esc(t.desc) + ' · 按气候分区浏览</div></div>' +
      '<div class="tier-climate-grid' + (t.sections.length === 1 ? " single" : "") + '">' +
      t.sections.map(function (sec) {
        const items = sec.ids.map(function (id) {
          const r = lootRegionById(id);
          const label = id === "wild" ? "郊区 · 荒野" : id === "street" ? "郊区 · 街道" : (r && r.name);
          return lootRegionCard(r, label);
        }).filter(Boolean).join("");
        return '<section class="section"><div class="section-head"><div class="section-title">' + esc(sec.title) + '</div><div class="section-note">' + sec.ids.length + ' 个区域</div></div><div class="region-grid">' + (items || '<div class="guide-note">暂无该气候区域</div>') + "</div></section>";
      }).join("") + '</div>' +
      '<section class="section"><button class="btn ghost block" data-go="#/loot">返回 T1–T4 总览</button></section>';
  }
  const SITE_CHANGELOG = {
    "version": "0.1.0-beta",
    "date": "2026-10-23",
    "title": "网站 0.1.0-beta 更新日志",
    "items": [
        "全站沿用像素字体与深色界面，优化字号、对比度和清晰度。",
        "保留加载渐显浮动动画、每页返回顶部按钮和桌面音乐播放器。",
        "顶部导航恢复为「区域战利品 / 生物 / 装备 / 世界 / 我的」。",
        "无社区版：移除登录、聊天、照片墙、图片上传和社区服务端入口。",
        "完整接入静态图鉴内容：105 种怪物、104 座建筑、13,330 条战利品、2,116 件物品。",
        "补齐怪物实拍图、属性图标、物品图标、品牌 Logo 和背景图。",
        "修复 /guide/ 子目录部署时的图片、字体、纹理相对路径。",
        "修复更新日志弹窗无法使用鼠标滚轮滚动的问题。",
      "按 Better Combat 双持参数校准单持/双持对比：攻速 ×1.2，主副手伤害 ×1.0。",
      "盔甲套装补齐护甲、韧性、耐久数值，并改用图标数值条显示。",
      "夜猎者、幽灵体、僵尸熊调整为一阶小头目；怪物板块背景更换为无 watermark 实拍图。",
        "版本更新为 0.1.0-beta。"
    ]
};
  function openSiteChangelog() {
    const c = SITE_CHANGELOG;
    openSheet({
      title: "网站更新日志",
      body: '<div class="text-block"><b>' + esc(c.title) + '</b>\n版本：' + esc(c.version) + ' · ' + esc(c.date) + '\n\n' +
        '<ul class="site-log-list">' + c.items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join("") + '</ul>' +
        '<div class="dim" style="margin-top:10px">本版本为 0.1.0-beta，后续内容会继续补充与校正。</div></div>',
      foot: '<button class="btn primary block" data-action="close-sheet">知道了</button>'
    });
  }
  function renderLootHome(initialQuery) {
    if (window.WZMusic && window.WZMusic.stopRegion) window.WZMusic.stopRegion();
    renderTopbar({
      actions: [
        '<button class="icon-btn" data-action="install" aria-label="安装到手机">' + icon("install") + "</button>"
      ]
    });
    document.title = "区域战利品 · 亡者世界";
    const m = DATA.meta;
    function regionImage(name) {
      const all = GUIDE.buildings || {};
      for (const k in all) {
        const g = all[k];
        if (g && g.region === name && g.image) return g.image;
      }
      return null;
    }
    const tierCards = LOOT_TIERS.map(function (t) {
      const regions = t.ids.map(lootRegionById).filter(Boolean);
      const count = regions.reduce(function (a, r) { return a + r.buildings.length; }, 0);
      const img = lootTierImage(t);
      return '<button class="tier-card' + (img ? " has-img" : "") + '" data-go="#/loot/tier/' + encodeURIComponent(t.tier) + '">' +
        (img ? '<img class="tier-bg" src="' + esc(img) + '" alt="" loading="lazy"><span class="poster-view" data-action="view-poster" data-img="' + esc(img) + '" role="button" tabindex="0" title="查看海报">⤢</span>' : "") +
        '<div class="tier-top"><span class="tier-dots tier-dots-lg">' + ["T1", "T2", "T3", "T4"].map(function (x) { return '<span class="tier-dot' + (x === t.tier ? " on" : "") + '" data-tier="' + x + '">' + x + '</span>'; }).join("") + '</span>' + icon("chevron", 20) + '</div>' +
        '<div class="tier-body"><h2>' + esc(t.title) + '</h2><p>' + esc(t.desc) + '</p><div class="tier-meta">' + regions.length + ' 区域 · ' + count + ' 建筑</div></div></button>';
    }).join("");

    const hot = ["铁锭", "钢锭", "金苹果", "弹药", "绷带", "罐头", "汽油", "钻石"];
    const hotChips = hot.map(function (x) {
      return '<button class="hot-chip" data-hot="' + esc(x) + '">' + esc(x) + "</button>";
    }).join("");

    q("view").innerHTML =
      '<section class="hero' + heroClass("home") + '"' + heroStyle("home") + '>' +
        '<div class="hero-kicker">SURVIVAL FIELD GUIDE</div>' +
        '<h1 class="hero-title">搜刮之前，先查清楚。</h1>' +
        '<div class="hero-desc">亡者世界 ' + esc((GUIDE.meta || {}).version || m.version) + " 生存图鉴：区域战利品（表 " + esc(m.version) + "）· 怪物与 NPC · 装备 · 载具 · 剧情。所有数据离线可用。</div>" +
        '<div class="mc-hero-actions"><button class="mc-cta" id="mc-start">开始探索 <span>›</span></button></div>' +
        '<div class="hero-stats">' +
          '<div class="hero-stat"><div class="v">' + m.regions + '</div><div class="k">区域</div></div>' +
          '<div class="hero-stat"><div class="v">' + m.buildings + '</div><div class="k">建筑</div></div>' +
          '<div class="hero-stat"><div class="v">' + m.entries.toLocaleString() + '</div><div class="k">掉落条目</div></div>' +
          '<div class="hero-stat"><div class="v">' + m.items.toLocaleString() + '</div><div class="k">物品</div></div>' +
        "</div>" +
      '<div class="loot-update-entry in-hero"><button class="loot-update-btn" data-action="open-site-changelog"><span class="loot-update-dot"></span><span class="loot-update-label">网站更新日志</span><span class="loot-update-ver">0.1.0-beta</span><span class="loot-update-arrow">查看 ›</span></button></div>' +
      "</section>" +
      '<div class="loot-update-entry outside"><button class="loot-update-btn" data-action="open-site-changelog"><span class="loot-update-dot"></span><span class="loot-update-label">网站更新日志</span><span class="loot-update-ver">0.1.0-beta</span><span class="loot-update-arrow">查看 ›</span></button></div>' +
      '<div class="quick-search"><div class="searchbar">' + icon("search") +
        '<input id="loot-search" type="search" placeholder="搜物品名或 ID，例如：铁锭 / minecraft:iron_ingot" value="' + esc(initialQuery || ui.lootQuery) + '" autocomplete="off" autocapitalize="off" spellcheck="false">' +
        '<button class="search-clear" data-action="clear-loot-search" aria-label="清空" hidden>' + icon("close", 15) + "</button>" +
      "</div></div>" +
      '<div id="loot-results" hidden></div>' +
      '<div id="loot-home">' +
        '<section class="section" id="loot-tiers"><div class="section-head"><div class="section-title">按 T 级浏览</div><div class="section-note">点击进入气候分区</div></div><div class="tier-grid">' + tierCards + "</div></section>" +
        '<section class="section"><div class="section-head"><div class="section-title">快速查找</div></div><div class="hot-chips">' + hotChips + "</div></section>" +
        '<section class="section"><div class="guide-note">' + icon("info", 18) + "<div>战利品数据来自 <b>" + esc(m.version) + " 建筑物战利品表</b>，共 " + m.entries.toLocaleString() + " 条。物品行显示的是表内「实际掉落概率」，数量为该次生成的数量范围。多体建筑按区块拆分，可切换区块查看。</div></div></section>" +
      "</div>";

    const input = q("loot-search");
    const clearBtn = document.querySelector('[data-action="clear-loot-search"]');
    function syncClear() { if (clearBtn) clearBtn.hidden = !input.value; }
    syncClear();
    input.addEventListener("input", debounce(function () {
      ui.lootQuery = input.value;
      syncClear();
      applyLootSearch(input.value);
    }, 120));
    input.addEventListener("search", function () {
      ui.lootQuery = input.value;
      syncClear();
      applyLootSearch(input.value);
    });
    document.querySelectorAll("[data-hot]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        input.value = btn.dataset.hot;
        ui.lootQuery = btn.dataset.hot;
        syncClear();
        applyLootSearch(btn.dataset.hot);
        input.focus();
      });
    });
    applyLootSearch(initialQuery || ui.lootQuery);
    const startBtn = q("mc-start");
    if (startBtn) startBtn.addEventListener("click", function () {
      const box = q("loot-tiers");
      if (box) box.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function applyLootSearch(query) {
    const results = q("loot-results");
    const home = q("loot-home");
    if (!results || !home) return;
    const text = String(query || "").trim();
    if (!text) {
      results.hidden = true;
      results.innerHTML = "";
      home.hidden = false;
      return;
    }
    home.hidden = true;
    results.hidden = false;
    results.innerHTML = searchResultsHTML(text);
  }

  function searchResultsHTML(query) {
    const ql = query.toLowerCase();
    const items = [];
    for (let i = 0; i < itemList.length; i++) {
      const rec = itemList[i];
      let score = 0;
      const nameLower = rec.name.toLowerCase();
      if (nameLower === ql) score = 100;
      else if (rec.id.toLowerCase() === ql) score = 98;
      else if (nameLower.indexOf(ql) === 0) score = 85;
      else if (nameLower.indexOf(ql) >= 0) score = 70;
      else if (rec.id.toLowerCase().indexOf(ql) >= 0) score = 55;
      else if (rec.search.indexOf(ql) >= 0) score = 35;
      if (score) items.push({ rec: rec, score: score });
    }
    items.sort(function (a, b) {
      return b.score - a.score || b.rec.bestDrop - a.rec.bestDrop || b.rec.sources.length - a.rec.sources.length;
    });
    const bMatches = buildingList.filter(function (x) {
      return x.building.name.toLowerCase().indexOf(ql) >= 0 || x.building.id.toLowerCase().indexOf(ql) >= 0;
    }).slice(0, 8);
    const top = items.slice(0, 50);

    let html = '<section class="section" style="margin-top:18px"><div class="section-head"><div class="section-title">搜索结果</div><div class="section-note">' + (items.length ? "找到 " + items.length + " 种物品" : "没有匹配物品") + "</div></div>";
    if (top.length) {
      html += '<div class="list">' + top.map(function (x) {
        const rec = x.rec;
        return '<button class="row-card" data-item-id="' + esc(rec.id) + '">' +
          itemIcon(rec.id, rec.name, firstNbt(rec), 32) +
          '<div class="row-main"><div class="row-title">' + esc(rec.name) + '</div><div class="row-sub mono">' + esc(rec.id) + (rec.nbts.size ? " · " + rec.nbts.size + " 个变体" : "") + "</div></div>" +
          '<div class="row-right"><div class="big">' + fmtPct(rec.bestDrop) + '</div><div class="cap">最高掉率 · ' + rec.sources.length + " 处</div></div>" +
          "</button>";
      }).join("") + "</div>";
    } else {
      html += '<div class="empty">' + icon("search", 28) + '<div class="em-title">没有找到「' + esc(query) + '」</div><div class="em-sub">试试物品中文名、英文 ID，或更短的关键词</div></div>';
    }
    html += "</section>";
    if (bMatches.length) {
      html += '<section class="section"><div class="section-head"><div class="section-title">相关建筑</div></div><div class="list">' + bMatches.map(function (x) {
        return '<button class="row-card building-row ' + climateClass(x.region) + '" data-go="#/loot/building/' + encodeURIComponent(x.region.id) + "/" + encodeURIComponent(x.building.id) + '">' +
          '<div class="avatar">' + esc(initial(x.building.name)) + "</div>" +
          '<div class="row-main"><div class="row-title b-title-wrap">' + buildingTitleHTML(x.building) + '</div><div class="row-sub">' + esc(x.region.name) + " · " + x.building._entries.toLocaleString() + " 条掉落</div></div>" +
          '<div class="row-right">' + badgeTier(x.region.tier) + "</div></button>";
      }).join("") + "</div></section>";
    }
    html += '<div class="section tiny dim">提示：搜索会同时匹配物品名、物品 ID 与 NBT 变体（弹药口径、附魔、药水效果等）。</div>';
    return html;
  }

  /* ---------------- 区域 ---------------- */
  function tierColor(t) {
    return { "T1": "#5aa9d6", "T2": "#3f7fbf", "T3": "#7a5aa8", "T4": "#b23a48" }[t] || "#8a93a6";
  }
  function climateColor(region) {
    const cc = climateClass(region);
    return { "climate-rad": "#e0a94a", "climate-hot": "#e07a5f", "climate-cold": "#7ea8c9", "climate-warm": "#7fc79a", "climate-mixed": "#8aa0b8" }[cc] || "#8aa0b8";
  }
  function climateLabel(region) { return region.climate || "温暖"; }
  function guideBuildingImage(id) { return (GUIDE.buildings && GUIDE.buildings[id] && GUIDE.buildings[id].image) || ""; }
  function buildingDropProfile(b) {
    const cats = { "枪械/弹药": 0, "医疗用品": 0, "食物/饮水": 0, "材料/工具": 0, "贵重物品": 0, "日用品": 0 };
    (b.parts || []).forEach(function (part) {
      (part.floors || []).forEach(function (floor) {
        (floor.containers || []).forEach(function (c) {
          (c.items || []).forEach(function (it) {
            const name = String(it[1] || it[0] || "");
            if (/枪|子弹|弹药|弹匣|霰弹|步枪|手枪|狙击|机枪|手雷|炸药|军械/i.test(name)) cats["枪械/弹药"]++;
            else if (/药|绷带|注射|医疗|抗生素|止痛|急救|血清/i.test(name)) cats["医疗用品"]++;
            else if (/罐|食物|肉|面包|水|饮料|酒|巧克力|饼干|水果|口粮/i.test(name)) cats["食物/饮水"]++;
            else if (/铁|铜|钢|锌|铝|木|布|绳|零件|齿轮|工具|锤|扳手|钉子/i.test(name)) cats["材料/工具"]++;
            else if (/金|钻石|银|宝石|钱|现金|手表|首饰|古董/i.test(name)) cats["贵重物品"]++;
            else cats["日用品"]++;
          });
        });
      });
    });
    const order = ["枪械/弹药", "医疗用品", "食物/饮水", "贵重物品", "材料/工具", "日用品"];
    return order.filter(function (k) { return cats[k] > 0; }).sort(function (a, b) { return cats[b] - cats[a]; }).slice(0, 3);
  }
  function posterDescription(b, region) {
    const custom = (window.WZ_BUILDING_CONTENT || {})[b.id];
    if (custom && String(custom).trim()) return String(custom).trim();
    const name = String(b.name || "");
    const horde = hordeSkullCount(b);
    const t2Police = region.tier === "T2" && /警|police|派出所/i.test(name);
    const damaged = /残破|破损|损坏|废弃|破败|荒废|毁坏|倒塌|废墟|旧/i.test(name);
    const drops = buildingDropProfile(b);
    const hash = name.split("").reduce(function (a, c) { return (a * 31 + c.charCodeAt(0)) >>> 0; }, 7);
    const openers = [
      name + "不是那种一眼就能搜完的地方。",
      name + "的入口还在，但里面已经被尸群翻过一遍。",
      name + "在" + region.name + "算得上显眼目标。",
      name + "的门窗和货架都还在，适合按房间逐段清理。",
      name + "的结构比普通民房复杂，进之前最好先找好退路。",
      name + "的物资分布很散，值得多绕两圈。"
    ];
    const parts = [openers[hash % openers.length]];
    if (damaged) parts.push("建筑已经明显破损，部分通道、楼板或外墙塌了，搜刮时要小心断头和塌方。");
    else parts.push("整体结构相对完整，楼梯和主要通道还能正常走通。");
    if (t2Police) parts.push("这栋 T2 警局按 3/5 尸潮规模处理，军械柜和证物室是重点，但别在开阔大厅里被围。");
    else if (!b._horde) parts.push("不是尸潮建筑，普通搜刮即可，但仍要留意角落里的感染体。");
    else if (horde === 5) parts.push("它是 5/5 超大型建筑结构，区块、楼层和容器数量都远超普通建筑，建议分几次搜，别一次把背包塞满。");
    else if (horde === 4) parts.push("属于 4/5 尸潮建筑，体量偏大，清理完尸群再开容器更稳。");
    else if (horde === 3) parts.push("有 3/5 的尸潮规模，进门后先清一层再往下走。");
    else parts.push("尸潮规模约 2/5，压力不算特别大，但低层仍然容易堆怪。");
    parts.push("共 " + b._floors + " 层、" + b._containers + " 个容器，记录约 " + b._entries.toLocaleString() + " 条掉落。");
    if (drops.length) parts.push("从容器记录看，主要可能出现：" + drops.join("、") + "。");
    else parts.push("容器记录较少，以零散日用品为主。");
    if (b._gunChance >= 12) parts.push("枪械概率偏高，军械柜、保险箱和警用容器优先。");
    if (b.boss) parts.push("这里驻守着" + b.boss + "，属于头目级威胁，建议清理尸潮后再进入核心区域。");
    return parts.join(" ");
  }
  function regionPosterHTML(region) {
    const items = region.buildings.map(function (b) { return { b: b, img: guideBuildingImage(b.id) }; }).filter(function (x) { return x.img; });
    if (!items.length) return "";
    const slides = items.map(function (x, i) {
      const horde = x.b._horde ? ('<span class="poster-horde">尸潮 ×' + hordeSkullCount(x.b) + "</span>") : "";
      return '<div class="poster-slide' + (i === 0 ? " active" : "") + '" style="--tier:' + tierColor(region.tier) + ';--climate:' + climateColor(region) + '">' +
        '<img class="poster-img" src="' + esc(x.img) + '" alt="' + esc(x.b.name) + '" loading="lazy">' +
        '<div class="poster-shade"></div>' +
        '<div class="poster-info"><div class="poster-name">' + esc(x.b.name) + "</div>" +
          '<div class="poster-badges">badgeTier(region.tier)<span class="poster-climate">' + esc(climateLabel(region)) + "</span>" +
          (region.id === "wasteland" ? '<span class="poster-rad">辐射</span>' : "") + horde + "</div>" +
        "</div></div>";
    }).join("");
    return '<section class="section poster-section"><div class="section-head"><div class="section-title">建筑海报</div><div class="section-note">点击圆点 / 箭头手动切换 · 约 12 秒自动轮播</div></div>' +
      '<div class="poster-layout"><div class="poster-main"><div class="poster-carousel" id="region-poster">' + slides + '</div><div class="poster-dots" id="region-poster-dots"></div></div>' +
      '<aside class="poster-side"><div class="poster-side-kicker">建筑档案</div><div class="poster-side-name" id="poster-side-name"></div><div class="poster-side-desc" id="poster-side-desc"></div><div class="poster-side-stats" id="poster-side-stats"></div>' +
      '<div class="poster-thumb-box" id="poster-thumb-box"><img class="poster-thumb-img" id="poster-thumb-img" alt="小地图缩略图"><button type="button" class="poster-thumb-open" id="poster-thumb-open">查看小地图</button></div>' +
      '<div class="poster-nav"><button type="button" class="poster-nav-btn" id="poster-prev">‹</button><span id="poster-index"></span><button type="button" class="poster-nav-btn" id="poster-next">›</button></div></aside></div>' +
      '<div class="thumb-modal" id="thumb-modal" hidden><div class="thumb-modal-inner"><button type="button" class="thumb-modal-close" id="thumb-modal-close">关闭</button><img id="thumb-modal-img" alt="建筑小地图放大"></div></div></section>';
  }
  function initRegionPoster(region) {
    const box = q("region-poster");
    if (!box) return;
    if (ui._posterTimer) { clearInterval(ui._posterTimer); ui._posterTimer = null; }
    const slides = Array.prototype.slice.call(box.querySelectorAll(".poster-slide"));
    const buildings = region.buildings.filter(function (b) { return guideBuildingImage(b.id); });
    const dotsBox = q("region-poster-dots");
    if (dotsBox) dotsBox.innerHTML = slides.map(function (_, i) { return '<i class="poster-dot' + (i === 0 ? " active" : "") + '" data-i="' + i + '"></i>'; }).join("");
    let cur = 0;
    function show(i) {
      if (!slides.length) return;
      i = (i + slides.length) % slides.length;
      slides.forEach(function (sl, k) { sl.classList.toggle("active", k === i); });
      if (dotsBox) Array.prototype.slice.call(dotsBox.children).forEach(function (d, k) { d.classList.toggle("active", k === i); });
      const b = buildings[i];
      if (b) {
        const nameEl = q("poster-side-name"), descEl = q("poster-side-desc"), statsEl = q("poster-side-stats");
        if (nameEl) nameEl.textContent = b.name;
        if (descEl) descEl.textContent = posterDescription(b, region);
        if (statsEl) statsEl.innerHTML = '<span>' + b._floors + ' 层</span><span>' + b._containers + ' 容器</span><span>' + b._entries.toLocaleString() + ' 掉落</span>';
      }
      const idx = q("poster-index");
      if (idx) idx.textContent = (i + 1) + " / " + slides.length;
      const thumb = (window.WZ_BUILDING_THUMBS || {})[b && b.id];
      const thumbBox = q("poster-thumb-box"), thumbImg = q("poster-thumb-img"), thumbOpen = q("poster-thumb-open");
      if (thumbBox) thumbBox.hidden = !thumb;
      if (thumbImg) thumbImg.src = thumb || "";
      if (thumbOpen) thumbOpen.disabled = !thumb;
      cur = i;
    }
    function restart() {
      if (ui._posterTimer) clearInterval(ui._posterTimer);
      if (slides.length > 1) ui._posterTimer = setInterval(function () { show(cur + 1); }, 12000);
    }
    if (dotsBox) Array.prototype.slice.call(dotsBox.children).forEach(function (d) {
      d.addEventListener("click", function () { show(Number(d.getAttribute("data-i"))); restart(); });
    });
    const prev = q("poster-prev"), next = q("poster-next");
    if (prev) prev.addEventListener("click", function () { show(cur - 1); restart(); });
    if (next) next.addEventListener("click", function () { show(cur + 1); restart(); });
    function openThumb() {
      const b = buildings[cur];
      const src = b && (window.WZ_BUILDING_THUMBS || {})[b.id];
      if (!src) return;
      const modal = q("thumb-modal"), img = q("thumb-modal-img");
      if (img) img.src = src;
      if (modal) modal.hidden = false;
    }
    const thumbOpen = q("poster-thumb-open"), thumbImg = q("poster-thumb-img"), thumbClose = q("thumb-modal-close"), thumbModal = q("thumb-modal");
    if (thumbOpen) thumbOpen.addEventListener("click", openThumb);
    if (thumbImg) thumbImg.addEventListener("click", openThumb);
    if (thumbClose) thumbClose.addEventListener("click", function () { if (thumbModal) thumbModal.hidden = true; });
    if (thumbModal) thumbModal.addEventListener("click", function (e) { if (e.target === thumbModal) thumbModal.hidden = true; });
    show(0);
    restart();
  }

  function renderRegion(rid) {
    const region = DATA.regions.filter(function (r) { return r.id === rid; })[0];
    if (!region) { renderLootHome(""); return; }
    const cc = climateClass(region);
    q("view").classList.add("climate-page", cc);
    renderTopbar({ back: "#/loot", title: region.name, sub: region.tier + (region.climate ? " · " + region.climate + "区域" : "") });
    document.title = region.name + " · 亡者世界图鉴";
    q("view").innerHTML =
      radiationBanner(region) +
      '<div class="detail-hero climate-hero ' + cc + '">' +
        '<div style="display:flex;align-items:flex-start;gap:10px"><div style="flex:1"><h1>' + esc(region.name) + "</h1><div class=\"meta\">" + badgeTier(region.tier) + badgeClimate(region.climate) + ((region.id === "wild" || region.id === "street" || region.id === "wasteland") && region.note ? '<span class="badge">' + esc(region.note) + "</span>" : "") + "</div></div></div>" +
        '<div class="detail-stats"><div><b>' + region.buildings.length + '</b><span>建筑</span></div><div><b>' + region._entries.toLocaleString() + '</b><span>掉落条目</span></div><div><b>' + region._containers + '</b><span>容器类型</span></div></div>' +
      "</div>" +
      regionPosterHTML(region) +
      '<div class="section"><div class="searchbar">' + icon("search") + '<input id="region-search" type="search" placeholder="在本区域中搜建筑" value="' + esc(ui.regionQuery[rid] || "") + '" autocomplete="off"></div></div>' +
      '<div class="section"><div class="section-head"><div class="section-title">建筑列表</div><div class="section-note" id="region-count"></div></div><div class="region-building-grid" id="region-list"></div></div>';

    const input = q("region-search");
    if (input) input.addEventListener("input", debounce(function () {
      ui.regionQuery[rid] = input.value;
      renderRegionList(region);
    }, 100));
    renderRegionList(region);
    initRegionPoster(region);
    /* music manual */
  }

  function renderRegionList(region) {
    const query = (ui.regionQuery[region.id] || "").trim().toLowerCase();
    const list = region.buildings.filter(function (b) {
      return !query || b.name.toLowerCase().indexOf(query) >= 0 || b.id.toLowerCase().indexOf(query) >= 0;
    });
    const countEl = q("region-count");
    if (countEl) countEl.textContent = list.length + " / " + region.buildings.length + " 座";
    if (!ui.regionPage) ui.regionPage = {};
    const per = 6;
    const pages = Math.max(1, Math.ceil(list.length / per));
    let page = ui.regionPage[region.id] || 1;
    if (page > pages) page = pages;
    if (page < 1) page = 1;
    ui.regionPage[region.id] = page;
    const shown = list.slice((page - 1) * per, page * per);
    q("region-list").innerHTML = shown.length ? shown.map(function (b) {
      const img = guideBuildingImage(b.id);
      return '<button class="region-building-card ' + climateClass(region) + '" data-go="#/loot/building/' + encodeURIComponent(region.id) + "/" + encodeURIComponent(b.id) + '">' +
        (img ? '<img class="rb-bg" src="' + esc(img) + '" alt="" loading="lazy">' : '') +
        '<div class="rb-shade"></div>' +
        '<div class="rb-body"><div class="rb-name">' + buildingTitleHTML(b) + '</div>' +
        '<div class="rb-sub">' + b._floors + " 层 · " + b._containers + " 个容器</div>" +
        '<div class="rb-meta"><span>' + b._entries.toLocaleString() + ' 条掉落</span><span class="rb-bar"><i style="width:' + Math.min(100, Math.max(6, b._entries / Math.max(1, region._entries) * 100 * 4)) + '%"></i></span></div></div>' +
        "</button>";
    }).join("") : '<div class="empty">' + icon("search", 28) + '<div class="em-title">没有匹配的建筑</div><div class="em-sub">换个关键词试试</div></div>';
    const old = q("region-list").parentElement.querySelector(".page-bar");
    if (old) old.remove();
    if (list.length > per) {
      q("region-list").insertAdjacentHTML("afterend", '<div class="page-bar"><button class="page-btn" data-action="region-page" data-region="' + esc(region.id) + '" data-delta="-1">上一页</button><span>' + page + " / " + pages + '</span><button class="page-btn" data-action="region-page" data-region="' + esc(region.id) + '" data-delta="1">下一页</button></div>');
    }
  }

  /* ---------------- 建筑 ---------------- */
  function renderBuilding(rid, bid) {
    const region = DATA.regions.filter(function (r) { return r.id === rid; })[0];
    const building = region && region.buildings.filter(function (b) { return b.id === bid; })[0];
    if (!building) { renderRegion(rid); return; }
    const key = rid + "/" + bid;
    let partFilter = ui.buildingPart[key];
    if (partFilter === undefined) partFilter = building._partCount > 1 ? 0 : 0;
    const parts = building.parts.map(function (p, i) { return { p: p, i: i }; });
    const shown = building._partCount > 1 ? parts.filter(function (x) { return x.i === Number(partFilter); }) : parts;
    const entriesShown = shown.reduce(function (sum, x) {
      return sum + x.p.floors.reduce(function (s, f) {
        return s + f.containers.reduce(function (a, c) { return a + c.items.length; }, 0);
      }, 0);
    }, 0);

    const cc = climateClass(region);
    q("view").classList.add("climate-page", cc);
    renderTopbar({ back: "#/loot/region/" + encodeURIComponent(rid), title: building.name, sub: region.name });
    document.title = building.name + " · 亡者世界图鉴";

    let partChips = "";
    if (building._partCount > 1) {
      partChips = '<div class="chip-row" style="margin:14px 0 4px">' + parts.map(function (x) {
        return '<button class="chip ' + (Number(partFilter) === x.i ? "active" : "") + '" data-action="building-part" data-key="' + esc(key) + '" data-part="' + x.i + '">区块 ' + (x.p.part == null ? x.i : x.p.part) + "</button>";
      }).join("") + "</div>";
    }

    const floorsHTML = shown.map(function (x) {
      const floor = x.p.floors;
      return floor.map(function (f, floorIndex) {
        const itemCount = f.containers.reduce(function (a, c) { return a + c.items.length; }, 0);
        const containers = f.containers.map(function (c, ci) {
          return '<div class="container-block" data-fi="' + floorIndex + '" data-ci="' + ci + '" data-part="' + x.i + '">' +
            '<button class="container-head" data-action="toggle-container">' +
              '<span class="container-name">' + esc(c.name) + '</span><span class="container-count">' + c.items.length + " 项</span>" + icon("chevron", 16) +
            "</button>" +
            '<div class="container-items" data-loaded="0"></div>' +
          "</div>";
        }).join("");
        return '<div class="accordion ' + (floorIndex === 0 ? "open" : "") + '">' +
          '<button class="acc-head" data-action="toggle-acc">' +
            '<div class="acc-title">' + esc(f.name) + '<div class="acc-sub">' + f.containers.length + " 个容器 · " + itemCount + " 条掉落</div></div>" + icon("chevron", 18) +
          "</button>" +
          '<div class="acc-body">' + containers + "</div>" +
        "</div>";
      }).join("");
    }).join("");

    const bg = buildingGuide(building.id);
    const buildingHero = bg && bg.image
      ? '<div class="guide-hero"><img src="' + esc(bg.image) + '" alt="' + esc(building.name) + '" loading="lazy"><div class="guide-hero-note">任务书建筑图 · ' + esc(region.name) + "</div></div>"
      : "";
    q("view").innerHTML =
      radiationBanner(region) +
      '<div class="detail-hero climate-hero ' + cc + '">' +
        '<div class="b-title-row"><h1>' + esc(building.name) + "</h1>" + buildingHordeBadge(building) + buildingSizeBadges(building) + "</div>" +
        '<div class="meta">' + badgeTier(region.tier) + badgeClimate(region.climate) + '<span class="badge">' + esc(region.name) + "</span>" + (building.multi ? '<span class="badge custom">多体建筑 · ' + building._partCount + " 区块</span>" : "") + "</div>" +
        '<div class="detail-stats"><div><b>' + building._floors + '</b><span>楼层</span></div><div><b>' + building._containers + '</b><span>容器</span></div><div><b>' + building._entries.toLocaleString() + '</b><span>掉落条目</span></div></div>' +
      "</div>" +
      buildingHero +
      (building.boss ? '<div class="section"><div class="callout red"><div class="callout-title">驻守头目 · ' + esc(building.boss) + '</div><div class="text-block">该建筑固定出现头目「' + esc(building.boss) + '」，建议先清尸潮、准备高伤枪械与医疗。</div>' + (building.bossId ? '<button class="btn ghost" data-go="#/monster/' + encodeURIComponent(building.bossId) + '">查看头目资料</button>' : "") + '</div></div>' : "") +
      buildingHordeSection(building) +
      partChips +
      '<div class="section" style="margin-top:14px"><div class="section-head"><div class="section-title">按楼层查看</div><div class="section-note">当前 ' + entriesShown.toLocaleString() + " 条</div></div>" + floorsHTML + "</div>" +
      '<div class="section tiny dim">点击容器展开物品；点击物品查看全图所有掉落来源。</div>';

    // 保存当前建筑供容器懒加载
    ui.currentBuilding = building;
    ui.currentPartIndex = shown.length === 1 ? shown[0].i : null;
  }

  function itemRowHTML(it, showStar) {
    const id = it[0], name = it[1] || id, qty = it[2], drop = it[4], nbt = it[7], dmg = it[8];
    const p = clampPct(drop);
    return '<div class="item-row" data-item-id="' + esc(id) + '" role="button" tabindex="0">' +
      itemIcon(id, name, nbt, 32) +
      '<div class="item-main"><div class="item-name">' + esc(name) + "</div>" +
        (nbt ? '<div class="item-nbt">' + esc(nbt.replace(/\n/g, " ")) + "</div>" : (dmg ? '<div class="item-nbt">损坏 ' + esc(dmg) + "</div>" : "")) +
      "</div>" +
      '<div class="item-qty">×' + esc(fmtNum(qty)) + "</div>" +
      '<div class="item-prob"><b>' + fmtPct(drop) + '</b><span>掉率</span><div class="prob-bar ' + (p >= 50 ? "high" : "") + '"><i style="width:' + Math.max(3, p) + '%"></i></div></div>' +
      (showStar ? '<button class="star ' + (isFav("items", id) ? "on" : "") + '" data-action="fav-item" data-id="' + esc(id) + '" data-fav-type="items" data-fav-id="' + esc(id) + '" aria-label="收藏" aria-pressed="' + (isFav("items", id) ? "true" : "false") + '">' + (isFav("items", id) ? iconStarFill : icon("star", 18)) + "</button>" : "") +
    "</div>";
  }

  function fillContainer(block) {
    if (!block || block.querySelector(".container-items").dataset.loaded === "1") return;
    const fi = Number(block.dataset.fi);
    const ci = Number(block.dataset.ci);
    const partIndex = Number(block.dataset.part);
    const building = ui.currentBuilding;
    if (!building) return;
    const part = building.parts[partIndex];
    if (!part) return;
    const floorList = part.floors.filter(function (f) { return true; });
    // fi 是 shown 数组中的楼层索引；多区块时 shown 只有一个 part
    const f = floorList[fi];
    if (!f) return;
    const c = f.containers[ci];
    if (!c) return;
    const body = block.querySelector(".container-items");
    body.innerHTML = c.items.map(function (it) { return itemRowHTML(it, false); }).join("");
    body.dataset.loaded = "1";
  }

  /* ---------------- 物品详情 ---------------- */
  function renderItem(id) {
    const rec = itemIndex.get(id);
    if (!rec) {
      renderTopbar({ back: ui.itemBack, title: "物品" });
      q("view").innerHTML = '<div class="empty">' + icon("alert", 30) + '<div class="em-title">没有这个物品</div><div class="em-sub">' + esc(id) + "</div></div>";
      return;
    }
    const back = ui.itemBack || "#/loot";
    renderTopbar({
      back: back,
      title: rec.name,
      sub: rec.sources.length + " 处掉落来源",
      actions: ['<button class="icon-btn ' + (isFav("items", rec.id) ? "accent" : "") + '" data-action="fav-item" data-id="' + esc(rec.id) + '" data-fav-type="items" data-fav-id="' + esc(rec.id) + '" aria-label="收藏" aria-pressed="' + (isFav("items", rec.id) ? "true" : "false") + '">' + (isFav("items", rec.id) ? iconStarFill : icon("star")) + "</button>"]
    });
    document.title = rec.name + " · 亡者世界图鉴";

    const sources = rec.sources;
    const best = sources.slice(0, 5);
    const showAll = ui.showAllSources;
    const rest = showAll ? sources.slice(5) : sources.slice(5, 35);

    function sourceCard(s) {
      const p = clampPct(s.it[4]);
      const region = s.r, b = s.b, f = s.f, c = s.c, it = s.it;
      const partLabel = s.p && s.p.part != null ? " · 区块 " + s.p.part : "";
      return '<button class="source-card" style="width:100%;text-align:left" data-go="#/loot/building/' + encodeURIComponent(region.id) + "/" + encodeURIComponent(b.id) + '">' +
        '<div class="source-top"><div class="source-name">' + esc(b.name) + '<div class="tiny dim" style="font-weight:400;margin-top:2px">' + esc(region.name) + partLabel + "</div></div>" +
          '<div class="source-prob"><b>' + fmtPct(it[4]) + '</b><span>实际掉率</span><div class="prob-bar ' + (p >= 50 ? "high" : "") + '" style="width:64px;margin-left:auto"><i style="width:' + Math.max(3, p) + '%"></i></div></div>' +
        "</div>" +
        '<div class="source-meta">' +
          '<span class="badge">' + esc(f.name) + "</span>" +
          '<span class="badge">' + esc(c.name) + "</span>" +
          '<span class="badge">数量 ' + esc(fmtNum(it[2])) + "</span>" +
          (it[5] != null ? '<span class="badge">权重 ' + esc(fmtPct(it[5])) + "</span>" : "") +
          (it[6] != null && Number(it[6]) < 100 ? '<span class="badge">条件 ' + esc(fmtPct(it[6])) + "</span>" : "") +
          (it[7] ? '<span class="badge warm">' + esc(it[7].split("\n")[0]) + "</span>" : "") +
          (it[8] ? '<span class="badge">损坏 ' + esc(it[8]) + "</span>" : "") +
        "</div>" +
      "</button>";
    }

    q("view").innerHTML =
      '<div class="card item-hero">' + itemIcon(rec.id, rec.name, firstNbt(rec), 52) + '<div style="flex:1;min-width:0"><h1>' + esc(rec.name) + "</h1><div class=\"id mono\">" + esc(rec.id) + "</div>" +
        (rec.names.size > 1 ? '<div class="tiny dim" style="margin-top:4px">另有名称：' + esc(Array.from(rec.names).slice(1).join(" / ")) + "</div>" : "") +
      "</div></div>" +
      (rec.nbts.size ? (function () {
        const all = Array.from(rec.nbts);
        const shown = all.slice(0, 24);
        return '<div class="section"><div class="section-head"><div class="section-title">变体 / NBT</div><div class="section-note">' + rec.nbts.size + " 种</div></div><div class=\"chip-row\">" +
          shown.map(function (n) { return '<span class="chip" style="cursor:default">' + texIcon(rec.id, n, n, "chip-ico", 20) + esc(n.replace(/\n/g, " ")) + "</span>"; }).join("") +
          (all.length > shown.length ? '<span class="chip" style="cursor:default">还有 ' + (all.length - shown.length) + " 种</span>" : "") +
          "</div></div>";
      })() : "") +
      '<div class="section"><div class="section-head"><div class="section-title">最佳来源</div><div class="section-note">按实际掉率排序</div></div><div class="list">' + best.map(sourceCard).join("") + "</div></div>" +
      (sources.length > 5 ? '<div class="section"><div class="section-head"><div class="section-title">全部掉落点</div><div class="section-note">' + sources.length + " 处</div></div><div class=\"list\">" + rest.map(sourceCard).join("") + "</div>" +
        (!showAll && sources.length > 35 ? '<button class="btn ghost block" style="margin-top:10px" data-action="show-all-sources">显示全部 ' + sources.length + " 处</button>" : "") +
      "</div>" : "") +
      '<div class="section callout"><div class="callout-title">怎么看这些数字</div>「实际掉落概率」是表内计算后的结果；「权重」与「条件」是原始生成参数。数量为单次生成的范围。多体建筑的同一座建筑不同区块，掉落可能不同。</div>';

    ui.showAllSources = false;
  }

  /* ---------------- 怪物 ---------------- */
  function renderMonsters() {
    renderTopbar({
      back: "#/creatures",
      title: "怪物图鉴",
      sub: allMonsters().length + " 种 · 按威胁等级分类",
      actions: ['<button class="icon-btn accent" data-action="add-monster" aria-label="录入怪物">' + icon("plus") + "</button>"]
    });
    document.title = "怪物图鉴 · 亡者世界";
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass("monsters") + '"' + heroStyle("monsters") + '><h1>怪物图鉴</h1><div class="meta"><span class="badge">整合包资料核对</span><span class="badge custom">蓝 / 紫 / 橙 / 红 / 绿</span></div>' +
        '<div class="hero-desc" style="margin-top:10px">严格按 Excel 威胁等级分类：普通蓝色、特殊紫色、头目橙色、灾厄红色、真菌绿色。每页 8 个。</div></div>' +
      '<div class="section"><div class="searchbar">' + icon("search") + '<input id="monster-search" type="search" placeholder="搜怪物名称、类别或特性" value="' + esc(ui.monsterQuery) + '" autocomplete="off"></div></div>' +
      '<div class="section"><div class="section-head"><div class="section-title">威胁等级</div><div class="section-note">严格按 Excel 威胁等级</div></div><div class="chip-row" id="monster-levels"></div></div>' +
      '<div class="section"><button class="btn ghost block monster-handbook-btn" data-go="#/creatures/monsters/stats">查看怪物数值手册 · 132 实体</button></div>' +
      '<div class="section"><div class="page-bar" id="monster-pager"></div><div class="list monster-grid" id="monster-list"></div><div class="page-bar" id="monster-pager-bottom"></div></div>' +
      '<button class="fab" data-action="add-monster" aria-label="录入怪物">' + icon("plus", 20) + "</button>";

    q("monster-search").addEventListener("input", debounce(function (e) {
      ui.monsterQuery = e.target.value;
      ui.monsterPage = 1;
      renderMonsterList();
    }, 100));
    renderMonsterLevels();
    renderMonsterList();
  }
  function renderMonsterStats() {
    const rows = (GUIDE.monsterStats || []).slice();
    const hb = GUIDE.monsterHandbook || {};
    const maxHp = rows.reduce(function (a, x) { return (x.hp || 0) > (a ? a.hp : 0) ? x : a; }, null);
    const maxArmor = rows.reduce(function (a, x) { return (x.armor || 0) > (a ? a.armor : 0) ? x : a; }, null);
    const maxAtk = rows.reduce(function (a, x) { return (x.attack || 0) > (a ? a.attack : 0) ? x : a; }, null);
    renderTopbar({ back: "#/creatures/monsters", title: "怪物数值手册", sub: (hb.entities || rows.length) + " 实体 · 5 项基础属性" });
    document.title = "怪物数值手册 · 亡者世界";
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass("monsters") + '"' + heroStyle("monsters") + '><h1>怪物数值手册</h1><div class="meta"><span class="badge">' + (hb.version || "5.11.19") + '</span><span class="badge custom">attribute.js / InControl</span></div><div class="hero-desc" style="margin-top:10px">属性 → 结算 → 刷怪 → 尸潮 → 深渊/末日。解析自《亡者世界 5.11.19 · 怪物手册》。</div></div>' +
      '<div class="section"><div class="stat-grid">' +
        '<div class="stat-box"><b>' + (hb.entities || rows.length) + '</b><span>实体</span></div>' +
        '<div class="stat-box"><b>' + (maxHp ? fmtNum(maxHp.hp) : "—") + '</b><span>最高生命</span></div>' +
        '<div class="stat-box"><b>' + (maxArmor ? fmtNum(maxArmor.armor) : "—") + '</b><span>最高护甲</span></div>' +
        '<div class="stat-box"><b>' + (maxAtk ? fmtNum(maxAtk.attack) : "—") + '</b><span>最高攻击</span></div>' +
      '</div></div>' +
      '<div class="section"><div class="section-head"><div class="section-title">核心规则</div><div class="section-note">速查</div></div><div class="handbook-rules">' +
        (hb.quick || []).map(function (x) { return '<div class="handbook-rule">' + esc(x) + '</div>'; }).join("") +
      '</div></div>' +
      '<div class="section"><div class="section-head"><div class="section-title">倍率层</div><div class="section-note">连乘，不是加算</div></div><div class="table-wrap"><table class="data-table handbook-table"><thead><tr><th>层</th><th>倍率</th><th>说明</th></tr></thead><tbody>' +
        (hb.layers || []).map(function (x) { return '<tr><td>' + esc(x.name) + '</td><td>' + esc(x.value) + '</td><td>' + esc(x.note) + '</td></tr>'; }).join("") +
      '</tbody></table></div></div>' +
      '<div class="section"><div class="section-head"><div class="section-title">实体基础数值</div><div class="section-note">132 实体 · 点击表头可搜索</div></div>' +
        '<div class="searchbar">' + icon("search") + '<input id="stat-search" type="search" placeholder="搜实体 ID、名称或来源" autocomplete="off"></div>' +
        '<div class="chip-row"><button class="chip active" data-action="stat-filter" data-filter="全部">全部</button><button class="chip" data-action="stat-filter" data-filter="正常">正常刷怪</button><button class="chip" data-action="stat-filter" data-filter="未实装">未实装</button></div>' +
        '<div class="table-wrap"><table class="data-table" id="stat-table"><thead><tr><th>名称</th><th>实体 ID</th><th>生命</th><th>攻击</th><th>简单</th><th>困难</th><th>护甲</th><th>移速</th><th>跟随</th><th>刷怪</th><th>来源</th></tr></thead><tbody></tbody></table></div></div>';
    const input = q("stat-search");
    if (input) input.addEventListener("input", debounce(function () { renderStatRows(); }, 100));
    renderStatRows();
  }
  function renderStatRows() {
    const box = q("stat-table");
    if (!box) return;
    const tbody = box.querySelector("tbody");
    const qq = (q("stat-search") ? q("stat-search").value : "").trim().toLowerCase();
    const f = ui.statFilter || "全部";
    const rows = (GUIDE.monsterStats || []).filter(function (x) {
      if (f !== "全部" && x.spawnStatus !== f) return false;
      if (!qq) return true;
      return [x.id, x.name, x.source].join(" ").toLowerCase().indexOf(qq) >= 0;
    });
    tbody.innerHTML = rows.map(function (x) {
      const n = function (v) { return v == null ? "—" : fmtNum(v); };
      return '<tr><td><b>' + esc(x.name) + '</b></td><td class="mono">' + esc(x.id) + '</td><td>' + n(x.hp) + '</td><td>' + n(x.attack) + '</td><td>' + n(x.easy) + '</td><td>' + n(x.hard) + '</td><td>' + n(x.armor) + '</td><td>' + n(x.moveSpeed) + '</td><td>' + n(x.followRange) + '</td><td>' + esc(x.spawnStatus) + '</td><td>' + esc(x.source) + '</td></tr>';
    }).join("");
  }
  function renderMonsterZones() {
    const box = q("monster-zones");
    if (!box) return;
    box.innerHTML = MONSTER_LEVELS.map(function (z) {
      return '<button class="chip ' + (ui.monsterZone === z ? "active" : "") + '" data-action="monster-zone" data-zone="' + esc(z) + '">' + esc(z) + "</button>";
    }).join("");
  }

  const MONSTER_GROUPS = ["全部", "普通感染体", "特殊感染体", "真菌感染体", "头目"];
  function monsterGroup(m) {
    if (m && m.group) return m.group;
    const cat = String(m.category || "");
    const info = monsterThreatInfo(m);
    if (cat === "Boss" || cat === "头目" || cat === "头领" || info.key === "leader" || info.key === "minor" || info.key === "calamity") return "头目";
    if (cat === "真菌" || info.key === "fungus" || info.fungus || /真菌|Spore|Fungus/i.test(String(m.source || ""))) return "真菌感染体";
    if (cat === "普通感染体" || cat === "感染动物" || info.key === "normal") return "普通感染体";
    return "特殊感染体";
  }
  const MONSTER_ZONE_ORDER = ["真菌", "郊区", "办公区", "酒店区", "住宅区", "商业区", "荒地", "其他"];
  function monsterZones(m) {
    if (!m) return ["其他"];
    if (String(m.level || "") === "真菌" || /真菌|Spore|Fungus/i.test(String(m.source || ""))) return ["真菌"];
    const txt = String(m.spawn || "") + " " + (Array.isArray(m.regions) ? m.regions.join(" ") : String(m.regions || ""));
    const set = new Set();
    if (/全区域|T1[–-]T3|T1.?T3/.test(txt)) {
      set.add("郊区"); set.add("办公区"); set.add("酒店区"); set.add("住宅区"); set.add("商业区");
    }
    if (/T1|郊区/.test(txt)) set.add("郊区");
    if (/T2.*炎热|办公/.test(txt)) set.add("办公区");
    if (/T3.*炎热|酒店/.test(txt)) set.add("酒店区");
    if (/T2.*寒冷|住宅/.test(txt)) set.add("住宅区");
    if (/T3.*寒冷|商业|零售/.test(txt)) set.add("商业区");
    if (/T4|荒地|尸潮/.test(txt)) set.add("荒地");
    return set.size ? Array.from(set) : ["其他"];
  }
  function monsterZoneCats() {
    const set = new Set();
    allMonsters().forEach(function (m) { monsterZones(m).forEach(function (z) { set.add(z); }); });
    return ["全部"].concat(MONSTER_ZONE_ORDER.filter(function (z) { return set.has(z); }));
  }
  function monsterCats() { return MONSTER_GROUPS.slice(); }
  const MONSTER_LEVEL_RANK = { "普通": 1, "特殊": 2, "真菌": 3, "头目": 4, "灾厄 I": 5, "灾厄 II": 6 };
  function monsterExactLevels() {
    const set = new Set();
    allMonsters().forEach(function (m) { if (m.level) set.add(String(m.level)); });
    return Array.from(set).sort(function (a, b) { return (MONSTER_LEVEL_RANK[a] || 99) - (MONSTER_LEVEL_RANK[b] || 99); });
  }
  function renderMonsterCategoriesExact() {
    const box = q("monster-cat-exact");
    if (!box) return;
    const cats = monsterZoneCats();
    const level = ui.monsterLevel || "全部";
    const base = allMonsters().filter(function (m) { return level === "全部" || m.level === level; });
    box.innerHTML = cats.map(function (c) {
      const n = c === "全部" ? base.length : base.filter(function (m) { return monsterZones(m).indexOf(c) >= 0; }).length;
      return '<button class="chip ' + ((ui.monsterCatExact || "全部") === c ? "active" : "") + '" data-action="monster-cat-exact" data-cat="' + esc(c) + '">' + esc(c) + ' <span class="n">' + n + "</span></button>";
    }).join("");
  }
  function monsterLevelColor(lv) {
    if (lv === "真菌") return "green";
    if (lv === "普通") return "blue";
    if (lv === "特殊") return "purple";
    if (lv === "头目") return "orange";
    if (lv === "灾厄 I" || lv === "灾厄 II" || lv === "灾厄") return "red";
    return "";
  }
  function renderMonsterLevels() {
    const box = q("monster-levels");
    if (!box) return;
    const levels = monsterExactLevels();
    const region = ui.monsterRegion || "全部";
    const base = allMonsters().filter(function (m) { return region === "全部" || monsterZones(m).indexOf(region) >= 0; });
    box.innerHTML = ["全部"].concat(levels).map(function (lv) {
      const n = lv === "全部" ? base.length : base.filter(function (m) { return m.level === lv; }).length;
      const color = monsterLevelColor(lv);
      return '<button class="chip monster-level ' + color + ' ' + ((ui.monsterLevel || "全部") === lv ? "active" : "") + '" data-action="monster-level" data-lv="' + esc(lv) + '">' + esc(lv) + ' <span class="n">' + n + "</span></button>";
    }).join("");
  }
  function renderMonsterRegions() {
    const box = q("monster-regions");
    if (!box) return;
    const set = new Set();
    allMonsters().forEach(function (m) { monsterZones(m).forEach(function (z) { set.add(z); }); });
    const zones = MONSTER_ZONE_ORDER.filter(function (z) { return set.has(z); });
    const level = ui.monsterLevel || "全部";
    const base = allMonsters().filter(function (m) { return level === "全部" || m.level === level; });
    box.innerHTML = ["全部"].concat(zones).map(function (z) {
      const n = z === "全部" ? base.length : base.filter(function (m) { return monsterZones(m).indexOf(z) >= 0; }).length;
      return '<button class="chip ' + ((ui.monsterRegion || "全部") === z ? "active" : "") + '" data-action="monster-region" data-region="' + esc(z) + '">' + esc(z) + ' <span class="n">' + n + "</span></button>";
    }).join("");
  }
  function renderMonsterCats() {
    const cats = monsterCats();
    q("monster-cats").innerHTML = cats.map(function (c) {
      const n = c === "全部" ? allMonsters().length : allMonsters().filter(function (m) { return monsterGroup(m) === c; }).length;
      return '<button class="chip ' + (ui.monsterCat === c ? "active" : "") + '" data-action="monster-cat" data-cat="' + esc(c) + '">' + esc(c) + ' <span class="n">' + n + "</span></button>";
    }).join("");
  }
  function monsterSpawnTiers(m) {
    const set = new Set();
    const sp = spawnForMonster(m);
    if (sp && sp.city) Object.keys(sp.city).forEach(function (t) { if (sp.city[t]) set.add(t); });
    if (sp && sp.anywhere) set.add("全图");
    if (sp && sp.buildings && sp.buildings.length) set.add("建筑");
    if (sp && sp.horde && ((sp.horde.hard || []).length || (sp.horde.normal || []).length)) set.add("尸潮");
    const txt = String(m.spawn || "") + " " + (Array.isArray(m.regions) ? m.regions.join(" ") : "");
    ["T1", "T2", "T3", "T4"].forEach(function (t) { if (txt.indexOf(t) >= 0) set.add(t); });
    return set;
  }
  function monsterCardStats(m) {
    const tiers = monsterSpawnTiers(m);
    const tierHTML = ["T1", "T2", "T3", "T4"].map(function (t) {
      return '<i class="tier-dot ' + (tiers.has(t) ? "on" : "") + '" data-tier="' + t + '">' + t + '</i>';
    }).join("");
    const extras = [];
    if (tiers.has("全图")) extras.push("全图");
    if (tiers.has("建筑")) extras.push("建筑");
    if (tiers.has("尸潮")) extras.push("尸潮");
    return '<div class="monster-card-stats"><span class="stat-chips">' +
      '<span class="stat-chip" title="生命"><img class="stat-ico" src="./images/ui/stat-heart-half.webp" alt="">' + esc(fmtNum(m.hp)) + '</span>' +
      '<span class="stat-chip" title="护甲"><img class="stat-ico" src="./images/ui/stat-armor-half.webp" alt="">' + esc(fmtNum(m.armor)) + '</span>' +
      '<span class="stat-chip" title="攻击"><img class="stat-ico" src="./images/ui/stat-attack.webp" alt="">' + esc(fmtNum(m.attack)) + '</span>' +
      '</span><span class="tier-dots" role="img" aria-label="刷新区域">' + tierHTML + '</span>' +
      (extras.length ? '<i class="tier-any">' + extras.join("·") + '</i>' : "") +
    '</div>';
  }

  function renderMonsterList() {
    const query = ui.monsterQuery.trim().toLowerCase();
    const all = allMonsters().filter(function (m) {
      if (ui.monsterLevel && ui.monsterLevel !== "全部" && m.level !== ui.monsterLevel) return false;

      if (!query) return true;
      return [m.name, m.en, m.aka, m.category, m.desc, m.behavior, m.spawn, m.strategy, m.drops].join(" ").toLowerCase().indexOf(query) >= 0;
    });
    const per = 8;
    const pages = Math.max(1, Math.ceil(all.length / per));
    let page = ui.monsterPage || 1;
    if (page > pages) page = pages;
    if (page < 1) page = 1;
    ui.monsterPage = page;
    const list = all.slice((page - 1) * per, page * per);
    q("monster-list").innerHTML = list.length ? list.map(function (m) {
      return '<button class="row-card monster-row" data-go="#/monster/' + encodeURIComponent(m.id) + '">' +
        monsterAvatar(m, 64) +
        '<div class="row-main"><div class="row-title">' + esc(m.name) + (m._custom ? ' <span class="badge custom">自制</span>' : m._override ? ' <span class="badge override">已补充</span>' : "") + "</div>" +
          '<div class="row-sub">' + esc(m.en || "") + (m.rating ? " · " + esc(m.rating) : "") + " · " + esc(m.category || "") + "</div>" + monsterCardStats(m) + "</div>" +
        '<div class="row-right">' + monsterThreatBadge(m) + "</div>" +
        "</button>";
    }).join("") : '<div class="empty">' + icon("search", 28) + '<div class="em-title">没有匹配的怪物</div><div class="em-sub">换个关键词或等级</div></div>';
    const pagerHTML = '<button class="page-btn" data-action="monster-page" data-delta="-1"' + (page <= 1 ? " disabled" : "") + '>上一页</button><span>' + page + " / " + pages + " · 共 " + all.length + ' 个</span><button class="page-btn" data-action="monster-page" data-delta="1"' + (page >= pages ? " disabled" : "") + '>下一页</button>';
    const pager = q("monster-pager");
    if (pager) pager.innerHTML = pagerHTML;
    const pagerBottom = q("monster-pager-bottom");
    if (pagerBottom) pagerBottom.innerHTML = pagerHTML;
  }

  function sceneTable(de) {
    if (!de) return "";
    const rows = [];
    function add(label, x) {
      if (!x) return;
      rows.push('<tr><td>' + esc(label) + '</td><td>' + fmtNum(x.hp) + '</td><td>' + fmtNum(x.dmg) + '</td><td>' + fmtNum(x.armor) + '</td><td>' + fmtNum(x.toPlayer) + '</td></tr>');
    }
    add("基础 / 野外普通", de.base ? { hp: de.base.hp, dmg: de.base.dmg, armor: de.base.armor, toPlayer: de.base.dmg } : null);
    ["easy", "normal", "hard"].forEach(function (d) { add("野外 · " + ({ easy: "简单", normal: "普通", hard: "困难" }[d]), de.wild && de.wild[d]); });
    ["T1", "T2", "T3", "T4"].forEach(function (t) {
      ["normal", "hard"].forEach(function (d) {
        add("城区 " + t + " · " + (d === "normal" ? "普通" : "困难"), de.city && de.city[t] && de.city[t][d]);
      });
    });
    if (de.horde) {
      add("尸潮 · 普通", de.horde.normal);
      add("尸潮 · 困难", de.horde.hard);
    }
    return '<div class="section"><div class="section-head"><div class="section-title">场景数值</div><div class="section-note">基础 × 倍率</div></div><div class="table-wrap"><table class="data-table"><thead><tr><th>场景</th><th>生命</th><th>攻击</th><th>护甲</th><th>打向玩家</th></tr></thead><tbody>' + rows.join("") + '</tbody></table></div></div>';
  }
  function spawnNotes(m, sp) {
    if (!sp) return "";
    let h = '<div class="section"><div class="section-head"><div class="section-title">刷怪与尸潮</div><div class="section-note">' + (sp.status === "unimplemented" ? "未实装" : "正常刷怪") + '</div></div><div class="guide-note">' + icon("info", 18) + "<div>";
    h += sp.natural ? "模组自然刷新已启用。<br>" : "无模组自然刷新。<br>";
    if (sp.anywhere) h += "任意群系刷新：概率 " + sp.anywhere.rate + "；" + (sp.anywhere.conditions || []).join("、") + "<br>";
    const city = sp.city || {};
    Object.keys(city).forEach(function (t) {
      const x = city[t];
      if (!x) return;
      h += t + " 城区：概率 " + x.rate + (x.districts && x.districts.length ? "；" + x.districts.join("/") : "") + (x.conditions && x.conditions.length ? "；" + x.conditions.join("、") : "") + "<br>";
    });
    const hordeDays = (sp.horde && (sp.horde.hard || [])) || [];
    if (hordeDays.length) h += "尸潮出现天数：" + hordeDays.slice(0, 12).join("、") + (hordeDays.length > 12 ? "…" : "") + "<br>";
    if (sp.buildings && sp.buildings.length) h += "关联建筑：" + sp.buildings.map(function (b) { return b.name; }).join("、") + "<br>";
    h += "</div></div></div>";
    return h;
  }
  function monsterSceneSection(m) {
    const de = diffForMonster(m);
    const sp = spawnForMonster(m);
    if (!de && !sp) return "";
    return sceneTable(de) + spawnNotes(m, sp);
  }
  function buildingHordeSection(building) {
    const hb = hordeForBuilding(building.id);
    if (!hb) return "";
    const mobs = (hb.mobs || []).map(function (x) {
      return '<tr><td>' + esc(x.name || x.id) + '</td><td>' + fmtNum(x.share) + '%</td><td>' + fmtNum(x.expect) + '</td><td>' + fmtNum(x.hpNormal) + ' / ' + fmtNum(x.hpHard) + '</td><td>' + fmtNum(x.armorNormal) + ' / ' + fmtNum(x.armorHard) + '</td><td>' + fmtNum(x.toPlayerNormal) + ' / ' + fmtNum(x.toPlayerHard) + '</td></tr>';
    }).join("");
    return '<div class="section"><div class="section-head"><div class="section-title">尸潮生成</div><div class="section-note">' + esc(hb.tier || "") + ' · 期望 ' + fmtNum(hb.amount && hb.amount.avg) + ' 只</div></div>' +
      '<div class="guide-note">' + icon("info", 18) + '<div>数量 ' + fmtNum(hb.amount && hb.amount.min) + '–' + fmtNum(hb.amount && hb.amount.max) + ' 只；生命加成 ×' + fmtNum(hb.healthBonus && hb.healthBonus.min) + (hb.healthBonus && hb.healthBonus.max !== hb.healthBonus.min ? '–' + fmtNum(hb.healthBonus.max) : '') + '；攻击随机 ×0.5–1.0。</div></div>' +
      '<div class="table-wrap"><table class="data-table"><thead><tr><th>怪物</th><th>占比</th><th>期望只数</th><th>生命 普通/困难</th><th>护甲 普通/困难</th><th>打向玩家 普通/困难</th></tr></thead><tbody>' + mobs + '</tbody></table></div></div>';
  }
  function renderMonster(id) {
    const m = findMonster(id);
    if (!m) { go("#/creatures/monsters"); return; }
    renderTopbar({
      back: "#/creatures/monsters",
      title: m.name,
      sub: m.en || m.category || "",
      actions: [
        '<button class="icon-btn ' + (isFav("monsters", m.id) ? "accent" : "") + '" data-action="fav-monster" data-id="' + esc(m.id) + '" data-fav-type="monsters" data-fav-id="' + esc(m.id) + '" aria-label="收藏">' + (isFav("monsters", m.id) ? iconStarFill : icon("star")) + "</button>",
        '<button class="icon-btn" data-action="edit-monster" data-id="' + esc(m.id) + '" aria-label="编辑">' + icon("edit") + "</button>"
      ]
    });
    document.title = m.name + " · 怪物图鉴";
    const incomplete = ["hp", "attack", "armor", "attackType", "spawn", "behavior", "strategy", "drops"].some(function (k) {
      return !m[k] || m[k] === "待补充";
    });
    const ti = monsterThreatInfo(m);
    const descParts = [];
    if (m.desc) descParts.push(String(m.desc).trim());
    if (m.behavior && String(m.behavior).trim() !== String(m.desc || "").trim()) descParts.push(String(m.behavior).trim());
    const monsterDesc = descParts.filter(Boolean).join("\n\n") || "待补充";
    q("view").innerHTML =
      '<div class="detail-hero"><div style="display:flex;align-items:center;gap:12px">' + monsterAvatar(m, 54) + '<div style="flex:1;min-width:0"><h1>' + esc(m.name) + "</h1><div class=\"meta\">" + (m.en ? '<span class="badge">' + esc(m.en) + "</span>" : "") + '<span class="badge">' + esc(m.category || "未分类") + '</span><span class="badge threat-meta ' + ti.key + '">' + esc(ti.label) + '</span><span class="badge custom">等级 · ' + esc(monsterZoneLabel(m)) + "</span>" + (m.variants > 1 ? '<span class="badge">' + m.variants + " 个变体</span>" : "") + (m.version ? '<span class="badge override">' + esc(m.version) + "</span>" : "") + (m._custom ? '<span class="badge custom">自制</span>' : m._override ? '<span class="badge override">已补充</span>' : "") + "</div></div></div>" +
        monsterVitalsHTML(m) +
      "</div>" +
      monsterHeroHTML(m) +
      '<div class="section threat-section ' + ti.key + '"><div class="section-head"><div class="section-title">威胁评级</div><div class="section-note">仅显示 Excel 评级</div></div>' +
        '<div class="threat-block">' + monsterThreatBadge(m) + '<div class="threat-desc">' + (m.rating ? "Excel 评级：" + esc(m.rating) : "Excel 未标注评级") + "</div></div></div>" +
      '<div class="section"><div class="section-head"><div class="section-title">基础属性</div></div><dl class="kv">' +
        '<dt>攻击方式</dt><dd>' + esc(m.attackType || "待补充") + "</dd>" +
        '<dt>刷新方式</dt><dd>' + esc((m.spawnTypes || []).join("、") || "待补充") + "</dd>" +
        '<dt>刷新说明</dt><dd>' + esc(m.spawn || "待补充") + "</dd>" +
      "</dl></div>" + monsterSceneSection(m) +
      '<div class="section"><div class="section-head"><div class="section-title">资料描述</div></div><div class="text-block">' + esc(monsterDesc) + "</div></div>" +
      '<div class="section"><div class="section-head"><div class="section-title">打法建议</div></div><div class="callout red"><div class="callout-title">生存提示</div><div class="text-block">' + esc(m.strategy || "待补充") + "</div></div></div>" +
      '<div class="section"><div class="section-head"><div class="section-title">掉落</div></div><div class="text-block">' + esc(m.drops || "待补充") + "</div></div>" +
      (incomplete ? '<div class="section callout"><div class="callout-title">资料待补充</div>这条资料的属性或打法还不完整。点右上角编辑按钮，把你知道的数据补进去，会保存在本机。</div>' : "") +
      '<div class="section"><div class="section-head"><div class="section-title">资料来源</div></div><div class="tiny dim">' + esc(m.source || "自行录入") + "</div></div>" +
      '<div class="section" style="display:flex;gap:8px"><button class="btn" style="flex:1" data-action="edit-monster" data-id="' + esc(m.id) + '">' + icon("edit", 17) + "编辑/补充</button>" +
        (m._custom ? '<button class="btn danger" data-action="delete-monster" data-id="' + esc(m.id) + '">' + icon("trash", 17) + "删除</button>" : (m._override ? '<button class="btn ghost" data-action="reset-monster" data-id="' + esc(m.id) + '">恢复初始</button>' : "")) +
      "</div>";
  }

  /* ---------------- 机器 ---------------- */
  function techCannons() { return (GUIDE.defense || []).filter(function (x) { return x.group === "机械动力火炮"; }); }
  function renderTechPage() {
    const createMods = ["Create", "Create Crafts & Additions", "Create Diesel Generators"];
    const machines = allMachines().filter(function (m) { return createMods.some(function (x) { return String(m.mod || "").indexOf(x) === 0; }); });
    const cannons = techCannons();
    renderTopbar({ back: "#/world", title: "科技板块", sub: machines.length + " 台机器 · " + cannons.length + " 件火炮" });
    document.title = "科技板块 · 亡者世界";
    const mcards = machines.map(function (m) {
      return '<button class="tech-card" data-go="#/machine/' + encodeURIComponent(m.id) + '">' +
        '<div class="tech-icon">' + icon("gear", 34) + '</div><div class="tech-main"><div class="tech-name">' + esc(m.name) + '</div>' +
        '<div class="tech-sub">' + esc(m.mod || "") + ' · ' + esc(m.stage || "") + ' · ' + esc(m.category || "") + '</div>' +
        '<div class="tech-desc">' + esc((m.purpose || "").slice(0, 60)) + '</div></div></button>';
    }).join("");
    const ccards = cannons.map(function (d) {
      return '<button class="tech-card" data-go="' + guideDetailHref("defense", d.id) + '">' + guideThumb(d, 64, "defense") +
        '<div class="tech-main"><div class="tech-name">' + esc(d.name) + '</div><div class="tech-sub">机械动力火炮 · ' + esc(d.group || "") + '</div></div></button>';
    }).join("");
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass("world") + '"' + heroStyle("world") + '><h1>科技板块</h1><div class="meta"><span class="badge">' + machines.length + ' 台机器</span><span class="badge custom">' + cannons.length + ' 件火炮</span></div><div class="hero-desc" style="margin-top:10px">机械动力生产线与火炮系统集中到这里；原防御页不再单独列出火炮。</div></div>' +
      '<div class="section"><div class="section-head"><div class="section-title">机械动力 · 生产线</div><div class="section-note">' + machines.length + ' 条</div></div><div class="tech-grid">' + (mcards || '<div class="guide-note">暂无</div>') + '</div></div>' +
      '<div class="section"><div class="section-head"><div class="section-title">机械动力 · 火炮</div><div class="section-note">' + cannons.length + ' 条</div></div><div class="tech-grid">' + (ccards || '<div class="guide-note">暂无</div>') + '</div></div>';
  }
  function renderMachines() {
    renderTopbar({
      back: "#/world",
      title: "实用机器",
      sub: allMachines().length + " 条 · Create / IE / RS",
      actions: ['<button class="icon-btn accent" data-action="add-machine" aria-label="录入机器">' + icon("plus") + "</button>"]
    });
    document.title = "实用机器 · 亡者世界";
    q("view").innerHTML =
      '<div class="detail-hero"><h1>实用机器</h1><div class="meta"><span class="badge">Create / 沉浸工程 / 精致存储</span><span class="badge custom">可自行补充</span></div>' +
        '<div class="hero-desc" style="margin-top:10px">从前期发电到全自动生产线。每条机器资料都关联了建筑生成点，方便你直接去搜刮。</div></div>' +
      '<div class="section"><div class="searchbar">' + icon("search") + '<input id="machine-search" type="search" placeholder="搜机器名称、模组或用途" value="' + esc(ui.machineQuery) + '" autocomplete="off"></div></div>' +
      '<div class="section"><div class="chip-row" id="machine-cats"></div></div>' +
      '<div class="section"><div class="list" id="machine-list"></div></div>' +
      '<button class="fab" data-action="add-machine">' + icon("plus", 18) + "录入机器</button>";

    q("machine-search").addEventListener("input", debounce(function (e) {
      ui.machineQuery = e.target.value;
      renderMachineList();
    }, 100));
    renderMachineCats();
    renderMachineList();
  }
  function machineCats() {
    const set = new Set(["全部"]);
    allMachines().forEach(function (m) { if (m.category) set.add(m.category); });
    return Array.from(set);
  }
  function renderMachineCats() {
    const cats = machineCats();
    q("machine-cats").innerHTML = cats.map(function (c) {
      const n = c === "全部" ? allMachines().length : allMachines().filter(function (m) { return m.category === c; }).length;
      return '<button class="chip ' + (ui.machineCat === c ? "active" : "") + '" data-action="machine-cat" data-cat="' + esc(c) + '">' + esc(c) + ' <span class="n">' + n + "</span></button>";
    }).join("");
  }
  function renderMachineList() {
    const query = ui.machineQuery.trim().toLowerCase();
    const list = allMachines().filter(function (m) {
      if (ui.machineCat !== "全部" && m.category !== ui.machineCat) return false;
      if (!query) return true;
      return [m.name, m.mod, m.category, m.stage, m.purpose, m.howToGet, m.tips].join(" ").toLowerCase().indexOf(query) >= 0;
    });
    q("machine-list").innerHTML = list.length ? list.map(function (m) {
      return '<button class="row-card" data-go="#/machine/' + encodeURIComponent(m.id) + '">' +
        machineIcon(m, 42) +
        '<div class="row-main"><div class="row-title">' + esc(m.name) + (m._custom ? ' <span class="badge custom">自制</span>' : m._override ? ' <span class="badge override">已补充</span>' : "") + "</div>" +
          '<div class="row-sub">' + esc([m.mod, m.stage].filter(Boolean).join(" · ")) + " · " + esc((m.purpose || "").slice(0, 34)) + "</div></div>" +
        '<div class="row-right"><span class="badge">' + esc(m.category || "未分类") + "</span></div>" +
        "</button>";
    }).join("") : '<div class="empty">' + icon("search", 28) + '<div class="em-title">没有匹配的机器</div><div class="em-sub">换个关键词，或点右下角录入新条目</div></div>';
  }

  function machineSourceList(machine) {
    const map = new Map();
    (machine.blockIds || []).forEach(function (bid) {
      (blockMap.get(bid) || []).forEach(function (b) {
        b.sources.forEach(function (s) {
          const k = s.building + "|" + s.floor;
          if (map.has(k)) { map.get(k).count++; return; }
          map.set(k, { block: b, source: s, count: 1 });
        });
      });
    });
    return Array.from(map.values());
  }

  function renderMachine(id) {
    const m = findMachine(id);
    if (!m) { go("#/world/machines"); return; }
    renderTopbar({
      back: "#/world/machines",
      title: m.name,
      sub: [m.mod, m.stage].filter(Boolean).join(" · "),
      actions: [
        '<button class="icon-btn ' + (isFav("machines", m.id) ? "accent" : "") + '" data-action="fav-machine" data-id="' + esc(m.id) + '" data-fav-type="machines" data-fav-id="' + esc(m.id) + '" aria-label="收藏">' + (isFav("machines", m.id) ? iconStarFill : icon("star")) + "</button>",
        '<button class="icon-btn" data-action="edit-machine" data-id="' + esc(m.id) + '" aria-label="编辑">' + icon("edit") + "</button>"
      ]
    });
    document.title = m.name + " · 实用机器";
    const allSrcs = machineSourceList(m);
    const srcs = allSrcs.slice(0, 16);
    const sourcesHTML = srcs.length ? '<div class="list">' + srcs.map(function (x) {
      const target = partMap.get(x.source.buildingId);
      const link = target ? "#/loot/building/" + encodeURIComponent(target.region.id) + "/" + encodeURIComponent(target.building.id) : "#/loot";
      return '<button class="row-card" data-go="' + link + '">' +
        '<div class="avatar" style="color:var(--green)">' + icon("box", 18) + "</div>" +
        '<div class="row-main"><div class="row-title">' + esc(x.source.building) + (x.count > 1 ? ' <span class="badge">×' + x.count + " 个区块</span>" : "") + '</div><div class="row-sub">' + esc(x.source.floor) + " · " + esc(x.block.name) + (x.block.note ? " → " + esc(x.block.note) : "") + "</div></div>" +
        (x.source.chance != null ? '<div class="row-right"><div class="big">' + fmtPct(x.source.chance) + '</div><div class="cap">生成概率</div></div>' : "") +
        "</button>";
    }).join("") + "</div>" : '<div class="tiny dim">暂无建筑生成点记录。可在编辑里填写方块 ID（例如 create:mechanical_crafter）来自动关联。</div>';

    q("view").innerHTML =
      '<div class="detail-hero"><div style="display:flex;align-items:center;gap:12px">' + machineIcon(m, 54) + '<div style="flex:1;min-width:0"><h1>' + esc(m.name) + "</h1><div class=\"meta\">" + (m.mod ? '<span class="badge">' + esc(m.mod) + "</span>" : "") + (m.stage ? '<span class="badge t1">' + esc(m.stage) + "</span>" : "") + '<span class="badge">' + esc(m.category || "未分类") + "</span>" + (m._custom ? '<span class="badge custom">自制</span>' : m._override ? '<span class="badge override">已补充</span>' : "") + "</div></div></div></div>" +
      '<div class="section"><div class="section-head"><div class="section-title">用途</div></div><div class="text-block">' + esc(m.purpose || "待补充") + "</div></div>" +
      '<div class="section"><div class="section-head"><div class="section-title">获取方式</div></div><div class="callout green"><div class="callout-title">去哪找 / 怎么做</div><div class="text-block">' + esc(m.howToGet || "待补充") + "</div></div></div>" +
      (m.materials ? '<div class="section"><div class="section-head"><div class="section-title">主要材料</div></div><div class="text-block">' + esc(m.materials) + "</div></div>" : "") +
      '<div class="section"><div class="section-head"><div class="section-title">使用要点</div></div><div class="text-block">' + esc(m.tips || "待补充") + "</div></div>" +
      '<div class="section"><div class="section-head"><div class="section-title">建筑生成点</div><div class="section-note">' + (allSrcs.length ? allSrcs.length + " 处" : "来自建筑方块表") + "</div></div>" + sourcesHTML +
        (allSrcs.length > 16 ? '<div class="tiny dim" style="margin-top:8px">仅显示前 16 处，其余 ' + (allSrcs.length - 16) + " 处可在对应建筑中查看。</div>" : "") + "</div>" +
      (m.source ? '<div class="section"><div class="section-head"><div class="section-title">资料来源</div></div><div class="tiny dim">' + esc(m.source) + "</div></div>" : "") +
      '<div class="section" style="display:flex;gap:8px"><button class="btn" style="flex:1" data-action="edit-machine" data-id="' + esc(m.id) + '">' + icon("edit", 17) + "编辑/补充</button>" +
        (m._custom ? '<button class="btn danger" data-action="delete-machine" data-id="' + esc(m.id) + '">' + icon("trash", 17) + "删除</button>" : (m._override ? '<button class="btn ghost" data-action="reset-machine" data-id="' + esc(m.id) + '">恢复初始</button>' : "")) +
      "</div>";
  }

  /* ---------------- 我的 ---------------- */
  function meBodyHTML() {
    const favCount = state.favorites.items.length + state.favorites.monsters.length;
    const customCount = state.customMonsters.length;
    const overrideCount = Object.keys(state.overrides.monsters).length;
    const sizeKB = Math.max(1, Math.round(JSON.stringify(state).length / 1024));
    return '<div class="card profile-card"><div class="profile-avatar">' + icon("user", 26) + '</div><div style="flex:1;min-width:0"><div class="profile-name">本地生存档案</div><div class="profile-sub">所有收藏与补充内容只保存在这台设备</div></div></div>' +
      '<div class="section mini-stats">' +
        '<button class="mini-stat" data-go="#/me/favorites"><b>' + favCount + '</b><span>收藏</span></button>' +
        '<div class="mini-stat"><b>' + customCount + '</b><span>自制条目</span></div>' +
        '<div class="mini-stat"><b>' + overrideCount + '</b><span>已补充</span></div>' +
      "</div>" +
      '<div class="section"><div class="section-head"><div class="section-title">我的内容</div></div><div class="menu-list">' +
        '<button class="menu-item" data-go="#/me/favorites"><span class="menu-ico">' + icon("star", 17) + '</span><span class="menu-main"><span class="menu-title">我的收藏</span><span class="menu-sub">物品与怪物</span></span>' + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-go="#/settings"><span class="menu-ico">' + icon("settings", 17) + '</span><span class="menu-main"><span class="menu-title">设置</span><span class="menu-sub">主题 / 电脑手机版 / 数据</span></span>' + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-action="export"><span class="menu-ico">' + icon("download", 17) + '</span><span class="menu-main"><span class="menu-title">导出备份</span><span class="menu-sub">把收藏和自制内容导出为 JSON</span></span>' + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-action="import"><span class="menu-ico">' + icon("upload", 17) + '</span><span class="menu-main"><span class="menu-title">导入备份 / 攻略包</span><span class="menu-sub">合并别人分享的条目，不覆盖现有内容</span></span>' + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-action="install"><span class="menu-ico">' + icon("install", 17) + '</span><span class="menu-main"><span class="menu-title">安装到手机桌面</span><span class="menu-sub">安卓 / iPhone · HTTPS 环境下可离线</span></span>' + icon("chevron", 17) + "</button>" +
      "</div></div>" +
      '<div class="section"><div class="section-head"><div class="section-title">数据管理</div></div><div class="menu-list">' +
        '<button class="menu-item" data-action="reset-overrides"><span class="menu-ico">' + icon("database", 17) + '</span><span class="menu-main"><span class="menu-title">恢复初始资料</span><span class="menu-sub">清除对种子条目的本地修改</span></span>' + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-action="clear-custom"><span class="menu-ico" style="color:var(--red)">' + icon("trash", 17) + '</span><span class="menu-main"><span class="menu-title" style="color:var(--red)">清空自制条目</span><span class="menu-sub">只删除自己录入的怪物</span></span>' + icon("chevron", 17) + "</button>" +
      "</div></div>" +
      '<div class="section"><div class="section-head"><div class="section-title">关于</div></div><div class="menu-list">' +
        '<button class="menu-item" data-action="about"><span class="menu-ico">' + icon("info", 17) + '</span><span class="menu-main"><span class="menu-title">数据来源与说明</span><span class="menu-sub">战利品表 ' + esc(DATA.meta.version) + " · 非官方工具</span></span>" + icon("chevron", 17) + "</button>" +
      "</div></div>" +
      '<div class="section tiny dim" style="text-align:center;line-height:1.9">本地数据约 ' + sizeKB + ' KB · 离线优先<br>战利品 ' + DATA.meta.entries.toLocaleString() + " 条 · 物品 " + DATA.meta.items.toLocaleString() + " 种<br>亡者世界图鉴 · 玩家自制</div>";
  }

  function renderMe() {
    renderTopbar({});
    document.title = "我的 · 亡者世界图鉴";
    q("view").innerHTML = meBodyHTML();
  }

  function openMeDrawer() {
    if (!q("me-drawer")) {
      const d = document.createElement("div");
      d.id = "me-drawer";
      d.className = "me-drawer";
      d.innerHTML = '<button class="me-drawer-backdrop" data-action="close-me" aria-label="关闭"></button><div class="me-drawer-panel" id="me-drawer-panel"></div>';
      document.body.appendChild(d);
    }
    q("me-drawer-panel").innerHTML = '<button class="me-drawer-close" data-action="close-me" aria-label="关闭">✕</button>' + meBodyHTML();
    document.body.classList.add("me-open");
  }
  function closeMeDrawer() {
    document.body.classList.remove("me-open");
  }

  function renderCommunity() {
    renderTopbar({ title: "社区", sub: "我的 · 在线功能", logo: true });
    document.body.classList.add("community-page");
    document.title = "社区 · 亡者世界图鉴";
    q("view").innerHTML = '<div id="community-root"><div class="empty">' + icon("globe", 28) + '<div class="em-title">正在连接社区服务器…</div><div class="em-sub">离线单文件不会联网；社区版需要先启动服务器。</div></div></div>';
    loadCommunity();
  }
  function communityOfflineHTML() {
    return '<div class="section"><div class="guide-note">' + icon("info", 18) + "<div><b>当前是离线版</b><br>社区功能需要先在本机启动「社区在线版服务器」，并通过 http://localhost:8080 打开。单文件 / 静态站点不会自动连服务器。</div></div></div>" +
      '<div class="section"><div class="menu-list">' +
        '<button class="menu-item" data-action="about"><span class="menu-ico">' + icon("info", 17) + '</span><span class="menu-main"><span class="menu-title">社区服务器说明</span><span class="menu-sub">启动方式与微软登录配置</span></span>' + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-go="#/settings"><span class="menu-ico">' + icon("settings", 17) + '</span><span class="menu-main"><span class="menu-title">返回设置</span><span class="menu-sub">查看本机功能</span></span>' + icon("chevron", 17) + "</button>" +
      "</div></div>";
  }
  function openCommunityAuth(mode) {
    const isReg = mode === "register";
    openSheet({
      title: isReg ? "注册邮箱账号" : "邮箱登录",
      body: '<div class="text-block"><form id="community-auth-form" class="community-auth-form">' +
        '<label>邮箱<input id="auth-email" type="email" required autocomplete="email" placeholder="you@example.com"></label>' +
        '<label>密码<input id="auth-password" type="password" required minlength="8" autocomplete="' + (isReg ? "new-password" : "current-password") + '" placeholder="至少 8 位"></label>' +
        (isReg ? '<label>昵称<input id="auth-name" maxlength="24" placeholder="聊天显示名（可选）"></label>' : "") +
        '<button class="btn primary block" type="submit">' + (isReg ? "注册并登录" : "登录") + '</button></form>' +
        '<div class="tiny dim" style="margin-top:10px">账号只用于本站聊天；不会上传游戏数据。</div></div>',
      foot: '<button class="btn ghost block" data-action="close-sheet">取消</button>'
    });
    setTimeout(function () {
      const f = q("community-auth-form");
      if (!f) return;
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        const body = { email: q("auth-email").value, password: q("auth-password").value };
        if (isReg) body.name = q("auth-name").value;
        fetch(isReg ? "/api/auth/register" : "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
          .then(function (x) { if (!x.ok) throw new Error(x.d.error || "失败"); closeSheet(); loadCommunity(); })
          .catch(function (err) { toast(err.message || "登录失败"); });
      });
    }, 0);
  }
  function loadCommunity() {
    const root = q("community-root");
    if (!root) return;
    if (typeof fetch !== "function") { root.innerHTML = communityOfflineHTML(); return; }
    Promise.all([
      fetch("/api/me").then(function (r) { return r.json(); }),
      fetch("/api/config").then(function (r) { return r.json(); }),
      fetch("/api/posts").then(function (r) { return r.json(); }),
      fetch("/api/photos").then(function (r) { return r.json(); }),
      fetch("/api/explored").then(function (r) { return r.json(); })
    ]).then(function (arr) {
      const me = arr[0] || {}, cfg = arr[1] || {}, posts = (arr[2] || {}).posts || [], photos = (arr[3] || {}).photos || [], explored = (arr[4] || {}).explored || [];
      const user = me.user || null;
      let h = '<div class="section"><div class="card profile-card"><div class="profile-avatar">' + icon("user", 26) + '</div><div style="flex:1;min-width:0"><div class="profile-name">' + esc(user ? user.name : "未登录") + '</div><div class="profile-sub">' + (user ? "邮箱账号已登录" : "邮箱登录 / 注册后参与聊天") + '</div></div>' +
        (user ? '<button class="btn ghost" data-action="community-logout">退出</button>' : '<button class="btn primary" data-action="community-login">邮箱登录</button><button class="btn ghost" data-action="community-register">注册</button>') + "</div></div>";
      h += '<div class="section"><div class="section-head"><div class="section-title">我的</div><div class="section-note">账号与收藏</div></div><div class="menu-list">' +
        '<button class="menu-item" data-go="#/me/favorites"><span class="menu-ico">' + icon("star", 17) + '</span><span class="menu-main"><span class="menu-title">我的收藏</span><span class="menu-sub">物品与怪物</span></span>' + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-go="#/settings"><span class="menu-ico">' + icon("settings", 17) + '</span><span class="menu-main"><span class="menu-title">设置</span><span class="menu-sub">主题、导出、安装</span></span>' + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-action="export"><span class="menu-ico">' + icon("download", 17) + '</span><span class="menu-main"><span class="menu-title">导出备份</span><span class="menu-sub">收藏与自制内容</span></span>' + icon("chevron", 17) + "</button>" +
        "</div></div>";
      h += '<div class="section"><div class="section-head"><div class="section-title">聊天</div><div class="section-note">' + posts.length + ' 条</div></div><div class="community-chat" id="community-chat">' +
        (posts.length ? posts.slice(-50).map(function (p) { return '<div class="chat-row"><b>' + esc(p.user) + '</b><span>' + esc(p.text) + '</span>' + (p.image ? '<img class="chat-img" src="' + esc(p.image) + '" alt="">' : '') + '</div>'; }).join("") : '<div class="guide-note">' + icon("info", 18) + "<div>还没有人说话。登录后发第一条。</div></div>") +
        '</div>' + (user ? '<form id="community-form" class="community-form"><input id="community-input" maxlength="500" placeholder="说点什么…" autocomplete="off"><button class="btn primary" type="submit">发送</button></form>' : "") + "</div>";
      h += '<div class="section"><div class="section-head"><div class="section-title">照片墙</div><div class="section-note">' + photos.length + ' 张</div></div>' +
        (photos.length ? '<div class="community-photos">' + photos.slice(-30).map(function (p) { return (p.image || p.dataUrl) ? '<figure class="community-photo"><img src="' + esc(p.image || p.dataUrl) + '" alt="' + esc(p.caption || "") + '"><figcaption>' + esc(p.caption || "") + '</figcaption></figure>' : ""; }).join("") + "</div>" : '<div class="guide-note">' + icon("info", 18) + "<div>还没有照片。Exposure 照片上传接口已预留。</div></div>") + "</div>";
      h += '<div class="section"><div class="section-head"><div class="section-title">已探索建筑</div><div class="section-note">' + explored.length + ' 条</div></div>' +
        (explored.length ? '<div class="list">' + explored.slice(-50).map(function (e) { return '<div class="row-card" style="cursor:default"><div class="row-main"><div class="row-title">' + esc(e.building || "未命名") + '</div><div class="row-sub">' + esc(e.region || "") + " · " + esc(e.user || "") + "</div></div></div>"; }).join("") + "</div>" : '<div class="guide-note">' + icon("info", 18) + "<div>还没有同步记录。后续由游戏内电脑 Mod 上传。</div></div>") + "</div>";
      root.innerHTML = h;
      const form = q("community-form");
      if (form) form.addEventListener("submit", function (e) {
        e.preventDefault();
        const input = q("community-input");
        if (!input || !input.value.trim()) return;
        fetch("/api/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: input.value.trim() }) })
          .then(function () { input.value = ""; loadCommunity(); })
          .catch(function () { toast("发送失败"); });
      });
    }).catch(function () { root.innerHTML = communityOfflineHTML(); });
  }

  function renderSettings() {
    renderTopbar({ back: "#/community", title: "设置" });
    document.title = "设置 · 亡者世界图鉴";
    const isPc = viewMode() === "pc";
    q("view").innerHTML =
      '<div class="section"><div class="section-head"><div class="section-title">界面与账号</div></div><div class="menu-list">' +
        '<button class="menu-item" data-action="toggle-theme"><span class="menu-ico">' + icon("moon", 17) + '</span><span class="menu-main"><span class="menu-title">深色 / 浅色</span><span class="menu-sub">切换页面配色</span></span>' + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-action="toggle-view"><span class="menu-ico">' + icon("monitor", 17) + '</span><span class="menu-main"><span class="menu-title">电脑 / 手机版</span><span class="menu-sub">' + (isPc ? "当前：电脑版（更宽的布局）" : "当前：手机版") + "</span></span>" + icon("chevron", 17) + "</button>" +
      "</div></div>" +
      '<div class="section"><div class="section-head"><div class="section-title">数据与安装</div></div><div class="menu-list">' +
        '<button class="menu-item" data-action="export"><span class="menu-ico">' + icon("download", 17) + '</span><span class="menu-main"><span class="menu-title">导出备份</span><span class="menu-sub">收藏与自制内容导出为 JSON</span></span>' + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-action="import"><span class="menu-ico">' + icon("upload", 17) + '</span><span class="menu-main"><span class="menu-title">导入备份</span><span class="menu-sub">合并攻略包</span></span>' + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-action="install"><span class="menu-ico">' + icon("install", 17) + '</span><span class="menu-main"><span class="menu-title">安装到手机桌面</span><span class="menu-sub">HTTPS 环境下可离线</span></span>' + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-action="about"><span class="menu-ico">' + icon("info", 17) + '</span><span class="menu-main"><span class="menu-title">数据来源与说明</span><span class="menu-sub">战利品、剧情、作者与版权</span></span>' + icon("chevron", 17) + "</button>" +
      "</div></div>" +
      '<div class="section tiny dim" style="text-align:center;line-height:1.9">亡者世界图鉴 · 玩家自制<br>所有资料仅供参考，以官方整合包数据为准</div>';
  }

  function openMsLogin() {
    openSheet({
      title: "我的世界正版登录",
      body: '<div class="text-block"><b>占位登录（待接入微软 OAuth）</b><br><br>当前离线单文件/静态站无法直接完成微软账号登录，需要部署社区服务器并配置微软 OAuth 的 client id 与回调地址。<br><br>社区在线版会内置完整登录流程；离线版这里先保留入口。</div>',
      foot: '<button class="btn primary block" data-action="close-sheet">知道了</button>'
    });
  }

  function renderFavorites() {
    renderTopbar({ back: "#/community", title: "我的收藏" });
    document.title = "我的收藏 · 亡者世界图鉴";
    if (ui.favTab === "machines") ui.favTab = "items";
    const tabs = [
      { id: "items", label: "物品", n: state.favorites.items.length },
      { id: "monsters", label: "怪物", n: state.favorites.monsters.length }
    ];
    q("view").innerHTML =
      '<div class="chip-row" style="margin-bottom:14px">' + tabs.map(function (t) {
        return '<button class="chip ' + (ui.favTab === t.id ? "active" : "") + '" data-action="fav-tab" data-tab="' + t.id + '">' + t.label + ' <span class="n">' + t.n + "</span></button>";
      }).join("") + "</div><div id=\"fav-list\"></div>";
    renderFavList();
  }
  function renderFavList() {
    const box = q("fav-list");
    if (!box) return;
    let html = "";
    if (ui.favTab === "items") {
      const recs = state.favorites.items.map(function (id) { return itemIndex.get(id); }).filter(Boolean);
      html = recs.length ? '<div class="list">' + recs.map(function (rec) {
        return '<button class="row-card" data-item-id="' + esc(rec.id) + '">' + itemIcon(rec.id, rec.name, firstNbt(rec), 32) + '<div class="row-main"><div class="row-title">' + esc(rec.name) + '</div><div class="row-sub mono">' + esc(rec.id) + '</div></div><div class="row-right"><div class="big">' + fmtPct(rec.bestDrop) + '</div><div class="cap">最高掉率</div></div></button>';
      }).join("") + "</div>" : emptyHTML("还没有收藏物品", "在物品详情页点右上角星标");
    } else if (ui.favTab === "monsters") {
      const list = state.favorites.monsters.map(findMonster).filter(Boolean);
      html = list.length ? '<div class="list">' + list.map(function (m) {
        return '<button class="row-card monster-row" data-go="#/monster/' + encodeURIComponent(m.id) + '"><div class="avatar" style="color:var(--red)">' + icon("skull", 20) + '</div><div class="row-main"><div class="row-title">' + esc(m.name) + '</div><div class="row-sub">' + esc(m.category || "") + " · " + esc(m.spawn || "") + '</div></div>' + monsterThreatBadge(m) + "</button>";
      }).join("") + "</div>" : emptyHTML("还没有收藏怪物", "在怪物详情页点星标");
    }
    box.innerHTML = html;
  }
  function emptyHTML(title, sub) {
    return '<div class="empty">' + icon("star", 28) + '<div class="em-title">' + esc(title) + '</div><div class="em-sub">' + esc(sub) + "</div></div>";
  }

  /* ---------------- 表单 / 弹层 ---------------- */
  function openSheet(opts) {
    const overlay = q("overlay");
    overlay.hidden = false;
    overlay.innerHTML = '<div class="sheet" role="dialog" aria-modal="true" aria-label="' + esc(opts.title) + '">' +
      '<div class="sheet-head"><div class="sheet-title">' + esc(opts.title) + '</div><button class="icon-btn" data-action="close-sheet" aria-label="关闭">' + icon("close") + "</button></div>" +
      '<div class="sheet-body">' + opts.body + "</div>" +
      (opts.foot ? '<div class="sheet-foot">' + opts.foot + "</div>" : "") +
      "</div>";
    document.body.style.overflow = "hidden";
    setTimeout(function () {
      const first = overlay.querySelector("input, textarea, select, button");
      if (first && first.tagName !== "BUTTON") first.focus();
    }, 60);
  }
  function closeSheet(silent) {
    const overlay = q("overlay");
    if (overlay.hidden) return;
    overlay.hidden = true;
    overlay.innerHTML = "";
    document.body.style.overflow = "";
    if (!silent) ui.editing = null;
  }

  function monsterForm(m) {
    m = m || {};
    const cats = ["普通感染体", "特殊感染体", "变异体", "感染动物", "Boss", "尸潮", "武装人类", "友好生物", "其他"];
    return '<form id="monster-form" class="form-grid">' +
      '<div class="field"><label>名称 <span class="req">*</span></label><input name="name" required maxlength="40" value="' + esc(m.name || "") + '" placeholder="例如：喘鸣体"></div>' +
      '<div class="form-2"><div class="field"><label>英文名</label><input name="en" maxlength="60" value="' + esc(m.en || "") + '" placeholder="Wheezer"></div>' +
      '<div class="field"><label>类别</label><select name="category">' + cats.map(function (c) { return '<option ' + (m.category === c ? "selected" : "") + ">" + c + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="form-2"><div class="field"><label>威胁等级（1-5）</label><select name="threat">' + [1,2,3,4,5].map(function (n) { return '<option value="' + n + '" ' + (Number(m.threat) === n ? "selected" : "") + ">" + n + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label>攻击方式</label><input name="attackType" maxlength="60" value="' + esc(m.attackType || "") + '" placeholder="近战 / 远程 / 爆炸"></div></div>' +
      '<div class="form-2"><div class="field"><label>生命</label><input name="hp" maxlength="40" value="' + esc(m.hp || "") + '" placeholder="40 / 待补充"></div>' +
      '<div class="field"><label>护甲</label><input name="armor" maxlength="40" value="' + esc(m.armor || "") + '" placeholder="12"></div></div>' +
      '<div class="field"><label>攻击力</label><input name="attack" maxlength="40" value="' + esc(m.attack || "") + '" placeholder="9"></div>' +
      '<div class="field"><label>出现区域</label><textarea name="spawn" maxlength="300" placeholder="荒地、实验室、距离出生点 15k 外…">' + esc(m.spawn || "") + "</textarea></div>" +
      '<div class="field"><label>资料描述 / 行为特性</label><textarea name="behavior" maxlength="800" placeholder="特殊攻击、增益、刷新条件…">' + esc(m.behavior || "") + "</textarea></div>" +
      '<div class="field"><label>打法建议</label><textarea name="strategy" maxlength="800" placeholder="怎么打、用什么武器、注意什么…">' + esc(m.strategy || "") + "</textarea></div>" +
      '<div class="field"><label>掉落</label><textarea name="drops" maxlength="400" placeholder="掉落物 / 待补充">' + esc(m.drops || "") + "</textarea></div>" +
      '<div class="field"><label>资料来源</label><input name="source" maxlength="120" value="' + esc(m.source || "") + '" placeholder="Wiki / 自己的实测"></div>' +
      '<div class="tiny dim">保存后会立即出现在怪物列表中，并只存储在本机。</div>' +
      "</form>";
  }

  function machineForm(m) {
    m = m || {};
    const cats = ["发电与能源", "动力与传动", "加工与制造", "存储与物流", "生存与医疗", "其他"];
    const stages = ["前期", "中期", "中后期", "后期"];
    return '<form id="machine-form" class="form-grid">' +
      '<div class="field"><label>名称 <span class="req">*</span></label><input name="name" required maxlength="40" value="' + esc(m.name || "") + '" placeholder="例如：热传导发电机"></div>' +
      '<div class="form-2"><div class="field"><label>模组</label><input name="mod" maxlength="40" value="' + esc(m.mod || "") + '" placeholder="Create"></div>' +
      '<div class="field"><label>分类</label><select name="category">' + cats.map(function (c) { return '<option ' + (m.category === c ? "selected" : "") + ">" + c + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="field"><label>阶段</label><select name="stage">' + stages.map(function (s) { return '<option ' + (m.stage === s ? "selected" : "") + ">" + s + "</option>"; }).join("") + "</select></div>" +
      '<div class="field"><label>用途</label><textarea name="purpose" maxlength="500" placeholder="这台机器解决什么问题…">' + esc(m.purpose || "") + "</textarea></div>" +
      '<div class="field"><label>获取方式</label><textarea name="howToGet" maxlength="600" placeholder="在哪座建筑搜到 / 怎么合成…">' + esc(m.howToGet || "") + "</textarea></div>" +
      '<div class="field"><label>主要材料</label><textarea name="materials" maxlength="400" placeholder="钢、铜、线圈…">' + esc(m.materials || "") + "</textarea></div>" +
      '<div class="field"><label>使用要点</label><textarea name="tips" maxlength="800" placeholder="转速、供电、摆放姿势、常见坑…">' + esc(m.tips || "") + "</textarea></div>" +
      '<div class="field"><label>关联方块 ID</label><input name="blockIds" maxlength="300" value="' + esc((m.blockIds || []).join(", ")) + '" placeholder="create:mechanical_crafter, ..."><div class="hint">用英文逗号分隔。填写后会自动从建筑方块表关联生成地点。</div></div>' +
      '<div class="field"><label>资料来源</label><input name="source" maxlength="120" value="' + esc(m.source || "") + '" placeholder="Wiki / 自己的实测"></div>' +
      '<div class="tiny dim">保存后会立即出现在机器列表中，并只存储在本机。</div>' +
      "</form>";
  }

  function openMonsterForm(id) {
    const existing = id ? findMonster(id) : null;
    const isCustom = existing && existing._custom;
    openSheet({
      title: existing ? "编辑怪物" : "录入怪物",
      body: monsterForm(existing || {}),
      foot: '<button class="btn primary block" type="submit" form="monster-form">' + icon("check", 18) + "保存</button>"
    });
    q("monster-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {};
      fd.forEach(function (v, k) { data[k] = String(v).trim(); });
      data.threat = Number(data.threat) || 1;
      if (!data.name) { toast("请填写名称"); return; }
      if (existing) {
        if (isCustom) {
          const idx = state.customMonsters.findIndex(function (x) { return x.id === existing.id; });
          if (idx >= 0) state.customMonsters[idx] = Object.assign({}, state.customMonsters[idx], data);
        } else {
          state.overrides.monsters[existing.id] = data;
        }
        saveState();
        closeSheet();
        toast("已保存");
        if (location.hash.indexOf("#/monster/") === 0 && decodeURIComponent(location.hash.split("/")[2] || "") === existing.id) renderMonster(existing.id);
        else route();
      } else {
        const item = Object.assign({ id: "custom_m_" + Date.now() }, data);
        state.customMonsters.push(item);
        saveState();
        closeSheet();
        toast("已添加");
        go("#/monster/" + encodeURIComponent(item.id));
      }
    });
  }

  function openMachineForm(id) {
    const existing = id ? findMachine(id) : null;
    const isCustom = existing && existing._custom;
    openSheet({
      title: existing ? "编辑机器" : "录入机器",
      body: machineForm(existing || {}),
      foot: '<button class="btn primary block" type="submit" form="machine-form">' + icon("check", 18) + "保存</button>"
    });
    q("machine-form").addEventListener("submit", function (e) {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {};
      fd.forEach(function (v, k) { data[k] = String(v).trim(); });
      data.blockIds = String(data.blockIds || "").split(/[,，]/).map(function (s) { return s.trim(); }).filter(Boolean);
      if (!data.name) { toast("请填写名称"); return; }
      if (existing) {
        if (isCustom) {
          const idx = state.customMachines.findIndex(function (x) { return x.id === existing.id; });
          if (idx >= 0) state.customMachines[idx] = Object.assign({}, state.customMachines[idx], data);
        } else {
          state.overrides.machines[existing.id] = data;
        }
        saveState();
        closeSheet();
        toast("已保存");
        if (location.hash.indexOf("#/machine/") === 0 && decodeURIComponent(location.hash.split("/")[2] || "") === existing.id) renderMachine(existing.id);
        else route();
      } else {
        const item = Object.assign({ id: "custom_mc_" + Date.now() }, data);
        state.customMachines.push(item);
        saveState();
        closeSheet();
        toast("已添加");
        go("#/machine/" + encodeURIComponent(item.id));
      }
    });
  }

  function aboutSheet() {
    openSheet({
      title: "数据来源与说明",
      body:
        '<div class="text-block">' +
        "<b>战利品数据</b>\n来自 QQ 频道「花生之鸠生花」整理的《亡者世界 v" + esc(DATA.meta.version) + " 建筑物战利品表》，共 " + DATA.meta.entries.toLocaleString() + " 条，已按区域/建筑/区块/楼层/容器整理。\n\n" +
        "<b>剧情</b>\n剧情书与任务线整理自官方资源包及「雨幕之下」。\n\n" +
        "<b>官方整合包</b>\nDeceasedCraft 整合包作者为 TqLxQuanZ；版本号、任务书与模组内容以官方发布为准。\n\n" +
        "<b>网站与展示</b>\n网页版由（ '▿ ' ）提供并维护；离线版与其数据保持同步。\n\n" +
        "<b>其他资料</b>\n怪物/NPC 种子资料参考 DeceasedCraft 官方 Wiki、MC百科；枪械、载具、近战与防御数据来自本机 5.11.19 整合包文件；部分攻略思路与演示参考 B站 UP 主「老king呀老king」「alan_llllll」「无敌萝卜王」的视频。带「待补充」的字段表示公开资料不足，可在详情页自行编辑。\n\n" +
        "<b>贴图与怪物形象</b>\n物品/方块贴图、实体头像从本机 11.19 整合包的 mods 与资源包中提取；网站图片、部分怪物贴图来源于 MC百科、B站整合包官方视频，以及 B站 UP 主「老king呀老king」「alan_llllll」「无敌萝卜王」。部分来源难以逐一确认，版权归原作者所有。页面背景使用整合包任务书官方美术（districts_art），仅作非商业攻略示意，如有侵权请联系删除。\n\n" +
        "<b>配方说明</b>\n配方数据可能随整合包版本变化而不准确。装备/武器页优先展示「可搜刮建筑」，合成材料仅作参考；载具材料来自 MTS/QMP 的 jsondefs。\n\n" +
        "<b>原声音乐</b>\n播放器收录 TqLxQuanZ（B站 UID 373594976）于 2026-05-30 发布的 7 首「亡者世界」配乐视频音频，包含《搜寻》《一线生机》《遗忘》《曾经的身影》《我们的蜕变》《曾经的我们》《残破》。版权归原作者所有，本工具仅作非商业攻略试听；可手动切换、暂停或停止播放。\n\n" +
        "<b>关于离线</b>\n应用本身不联网，所有数据与音频打包在本地；收藏与补充内容保存在浏览器 localStorage，不会上传。\n\n" +
        "<b>关于分享</b>\n可以在「我的」里导出 JSON 攻略包发给朋友，对方导入后即可合并。当前版本为单机离线版，所有数据都保存在本机。\n\n" +
        "<b>免责声明</b>\n非官方工具，与整合包作者无关。所有资料仅供参考，以官方整合包数据、游戏内任务书与 JEI 为准；版本更新后可能有出入。" +
        "</div>",
      foot: '<button class="btn primary block" data-action="close-sheet">知道了</button>'
    });
  }

  function installSheet() {
    const standalone = window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const fileMode = location.protocol === "file:";
    const insecure = !window.isSecureContext && !fileMode;
    let body;
    if (standalone) {
      body = "当前已经是独立应用模式，直接从桌面图标打开即可，断网也能用。";
    } else if (fileMode) {
      body = "<b>当前是单文件离线模式</b>\n页面本身可以完全离线使用，但浏览器不会提供「安装到主屏幕」入口。\n\n想要桌面图标 + 离线缓存，请把 app 文件夹部署到 HTTPS 静态托管（GitHub Pages / Netlify / Vercel 等），再用手机访问并安装。";
    } else if (insecure) {
      body = "<b>当前通过局域网 HTTP 打开</b>\n手机浏览器通常不会在这种地址上启用 Service Worker，因此即使添加到主屏幕，也不能保证断网后还能打开。\n\n要真正离线使用，二选一：\n1. 直接用「单文件版 HTML」（发到手机，浏览器打开即可离线）。\n2. 把 app 文件夹部署到 HTTPS 静态托管，再安装。\n\n如果你只是想在电脑开着时用手机查资料，现在这样也够用。";
    } else if (iOS) {
      body = "<b>iPhone / iPad（Safari）</b>\n1. 用 Safari 打开本页面\n2. 点底部「分享」按钮\n3. 选择「添加到主屏幕」\n4. 确认添加\n\n安装后从桌面图标打开，数据会由 Service Worker 缓存，断网也能用。";
    } else {
      body = "<b>Android（Chrome / Edge）</b>\n1. 用浏览器打开本页面\n2. 点右上角菜单\n3. 选择「安装应用」或「添加到主屏幕」\n4. 确认安装\n\n安装后从桌面图标打开，数据会由 Service Worker 缓存，断网也能用。";
    }
    openSheet({
      title: standalone ? "已安装" : "安装到手机桌面",
      body: '<div class="text-block">' + body + "</div>",
      foot: '<button class="btn primary block" data-action="close-sheet">知道了</button>'
    });
  }

  /* ---------------- 备份 ---------------- */
  function exportBackup() {
    const payload = {
      app: "wz-guide",
      schema: 1,
      pack: DATA.meta.version,
      exportedAt: new Date().toISOString(),
      data: state,
    };
    downloadFile("亡者世界图鉴-备份-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(payload, null, 2));
    toast("已导出备份");
  }
  function downloadFile(filename, text) {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 400);
  }
  function importBackup() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", function () {
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function () {
        try {
          const obj = JSON.parse(String(reader.result));
          const data = obj.data || obj;
          if (!data || !data.favorites) throw new Error("格式不对");
          mergeImported(data);
          toast("导入完成");
          route();
        } catch (e) {
          toast("导入失败：不是有效的备份文件");
        }
      };
      reader.readAsText(file, "utf-8");
    });
    input.click();
  }
  function mergeImported(data) {
    ["items", "monsters", "machines"].forEach(function (k) {
      const arr = (data.favorites && data.favorites[k]) || [];
      arr.forEach(function (id) {
        if (state.favorites[k].indexOf(id) < 0) state.favorites[k].push(id);
      });
    });
    (data.customMonsters || []).forEach(function (m) {
      if (m && m.id && !state.customMonsters.some(function (x) { return x.id === m.id; })) state.customMonsters.push(m);
    });
    (data.customMachines || []).forEach(function (m) {
      if (m && m.id && !state.customMachines.some(function (x) { return x.id === m.id; })) state.customMachines.push(m);
    });
    const om = (data.overrides && data.overrides.monsters) || {};
    const omc = (data.overrides && data.overrides.machines) || {};
    Object.keys(om).forEach(function (k) { state.overrides.monsters[k] = Object.assign({}, state.overrides.monsters[k] || {}, om[k]); });
    Object.keys(omc).forEach(function (k) { state.overrides.machines[k] = Object.assign({}, state.overrides.machines[k] || {}, omc[k]); });
    saveState();
  }
  /* ---------------- 事件 ---------------- */
  document.addEventListener("click", function (e) {
    const actionEl = e.target.closest("[data-action]");
    if (actionEl) {
      const action = actionEl.dataset.action;
      if (action !== "toggle-acc" && action !== "toggle-container") e.preventDefault();
      handleAction(action, actionEl, e);
      return;
    }
    const itemEl = e.target.closest("[data-item-id]");
    if (itemEl) {
      e.preventDefault();
      ui.itemBack = currentHash();
      go("#/item/" + encodeURIComponent(itemEl.dataset.itemId));
      return;
    }
    const goEl = e.target.closest("[data-go]");
    if (goEl) {
      e.preventDefault();
      go(goEl.dataset.go);
      return;
    }
    if (e.target === q("overlay")) closeSheet();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      const pm = q("poster-modal");
      if (pm && !pm.hidden) { pm.hidden = true; return; }
      const ov = q("overlay");
      if (ov && !ov.hidden) { closeSheet(); return; }
      const back = document.querySelector(".back-btn");
      if (back) { back.click(); return; }
      if (location.hash && location.hash !== "#/") { history.back(); }
      return;
    }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-item-id]")) {
      e.preventDefault();
      ui.itemBack = currentHash();
      go("#/item/" + encodeURIComponent(e.target.dataset.itemId));
    }
  });

  function handleAction(action, el, e) {
    switch (action) {
      case "community-login": openCommunityAuth("login"); break;
      case "community-register": openCommunityAuth("register"); break;
      case "community-logout": fetch("/api/auth/logout", { method: "POST" }).then(function () { loadCommunity(); }).catch(function () { toast("退出失败"); }); break;
      case "toggle-theme": {
        const next = (document.documentElement.dataset.theme === "light") ? "dark" : "light";
        applyTheme(next);
        route();
        break;
      }
      case "install": installApp(); break;
      case "close-sheet": closeSheet(); break;
      case "clear-loot-search": {
        const input = q("loot-search");
        if (input) { input.value = ""; ui.lootQuery = ""; applyLootSearch(""); input.focus(); }
        const btn = document.querySelector('[data-action="clear-loot-search"]');
        if (btn) btn.hidden = true;
        break;
      }
      case "toggle-acc": {
        const acc = el.closest(".accordion");
        if (acc) acc.classList.toggle("open");
        break;
      }
      case "toggle-container": {
        const block = el.closest(".container-block");
        if (!block) break;
        const open = block.classList.toggle("open");
        if (open) fillContainer(block);
        break;
      }
      case "building-part": {
        ui.buildingPart[el.dataset.key] = Number(el.dataset.part);
        const parsed = parseHash();
        if (parsed.parts[1] === "building") renderBuilding(parsed.parts[2], parsed.parts[3]);
        break;
      }
      case "fav-item": toggleFav("items", el.dataset.id); break;
      case "fav-monster": toggleFav("monsters", el.dataset.id); break;
      case "fav-machine": toggleFav("machines", el.dataset.id); break;
      case "show-all-sources": ui.showAllSources = true; renderItem(parseHash().parts[1]); break;
      case "region-page": {
        if (!ui.regionPage) ui.regionPage = {};
        const rid = el.dataset.region || "";
        const delta = parseInt(el.dataset.delta || "0", 10) || 0;
        ui.regionPage[rid] = Math.max(1, (ui.regionPage[rid] || 1) + delta);
        const reg = DATA.regions.filter(function (r) { return r.id === rid; })[0];
        if (reg) renderRegionList(reg);
        break;
      }
      case "view-poster": {
        const im = q("poster-modal-img"), box = q("poster-modal");
        if (im) im.src = el.dataset.img || "";
        if (box) box.hidden = false;
        break;
      }
      case "close-poster": { const box = q("poster-modal"); if (box) box.hidden = true; break; }
      case "monster-cat-exact": ui.monsterCatExact = el.dataset.cat; renderMonsterCategoriesExact(); renderMonsterLevels(); renderMonsterList(); break;
      case "monster-level": ui.monsterLevel = el.dataset.lv; ui.monsterPage = 1; renderMonsterLevels(); renderMonsterRegions(); renderMonsterList(); break;
      case "monster-region": ui.monsterRegion = el.dataset.region; ui.monsterPage = 1; renderMonsterLevels(); renderMonsterRegions(); renderMonsterList(); break;
      case "vehicle-page": { const g = el.dataset.group; if (!ui.vehiclePage) ui.vehiclePage = {}; ui.vehiclePage[g] = Math.max(1, (ui.vehiclePage[g] || 1) + (parseInt(el.dataset.delta || "0", 10) || 0)); renderVehicleGroup(g); break; }
      case "stat-filter": ui.statFilter = el.dataset.filter || "全部"; Array.prototype.forEach.call(document.querySelectorAll("[data-action=\"stat-filter\"]"), function (b) { b.classList.toggle("active", b.dataset.filter === ui.statFilter); }); renderStatRows(); break;
      case "monster-page": { const d = parseInt(el.dataset.delta || "0", 10) || 0; ui.monsterPage = (ui.monsterPage || 1) + d; renderMonsterList(); break; }
      case "gear-group": {
        const gt = el.dataset.type, gs = gearShowState(gt); gs.group = el.dataset.group || "全部"; gs.id = ""; renderGearShowcase(gt); break;
      }
      case "gear-select": {
        const gt = el.dataset.type, gs = gearShowState(gt); gs.id = el.dataset.id || ""; renderGearShowcase(gt); break;
      }
      case "gear-page": {
        const gt = el.dataset.type, gs = gearShowState(gt); const arr = gearShowFiltered(gt, gs);
        const cur = arr.map(function (x) { return x.id; }).indexOf(gs.id); const next = Math.max(0, Math.min(arr.length - 1, cur + (parseInt(el.dataset.delta || "0", 10) || 0)));
        if (arr[next]) gs.id = arr[next].id; renderGearShowcase(gt); break;
      }
      case "monster-cat": ui.monsterCat = el.dataset.cat; renderMonsterCats(); renderMonsterList(); break;
      case "monster-zone": ui.monsterZone = el.dataset.zone; renderMonsterZones(); renderMonsterList(); break;
      case "guide-group": ui.guideGroup[el.dataset.type] = el.dataset.group; renderGuideGroups(el.dataset.type); renderGuideRows(el.dataset.type); break;
      case "npc-trade-toggle": {
        const open = !ui.npcTradeOpen[el.dataset.id];
        ui.npcTradeOpen[el.dataset.id] = open;
        document.querySelectorAll('[data-npc-extra="' + el.dataset.id + '"]').forEach(function (row) { row.hidden = !open; });
        el.textContent = open ? "收起" : "展开全部 " + (el.dataset.total || "") + " 条";
        break;
      }
      case "building-region": ui.buildingRegion = el.dataset.region; renderBuildingRegions(); renderBuildingRows(); break;
      case "machine-cat": ui.machineCat = el.dataset.cat; renderMachineCats(); renderMachineList(); break;
      case "fav-tab": ui.favTab = el.dataset.tab; renderFavorites(); break;
      case "add-monster": openMonsterForm(null); break;
      case "edit-monster": openMonsterForm(el.dataset.id); break;
      case "add-machine": openMachineForm(null); break;
      case "edit-machine": openMachineForm(el.dataset.id); break;
      case "delete-monster": {
        if (!confirm("确定删除这条自制怪物资料？此操作不可恢复。")) break;
        state.customMonsters = state.customMonsters.filter(function (x) { return x.id !== el.dataset.id; });
        state.favorites.monsters = state.favorites.monsters.filter(function (x) { return x !== el.dataset.id; });
        saveState(); toast("已删除"); go("#/monsters");
        break;
      }
      case "delete-machine": {
        if (!confirm("确定删除这条自制机器资料？此操作不可恢复。")) break;
        state.customMachines = state.customMachines.filter(function (x) { return x.id !== el.dataset.id; });
        state.favorites.machines = state.favorites.machines.filter(function (x) { return x !== el.dataset.id; });
        saveState(); toast("已删除"); go("#/machines");
        break;
      }
      case "reset-monster": {
        if (!confirm("恢复这条怪物的初始资料？本地补充的内容会被清除。")) break;
        delete state.overrides.monsters[el.dataset.id];
        saveState(); toast("已恢复"); renderMonster(el.dataset.id);
        break;
      }
      case "reset-machine": {
        if (!confirm("恢复这条机器的初始资料？本地补充的内容会被清除。")) break;
        delete state.overrides.machines[el.dataset.id];
        saveState(); toast("已恢复"); renderMachine(el.dataset.id);
        break;
      }
      case "reset-overrides": {
        if (!confirm("清除所有对初始资料的本地修改？自制条目和收藏不受影响。")) break;
        state.overrides = { monsters: {}, machines: {} };
        saveState(); toast("已恢复初始资料"); renderMe();
        break;
      }
      case "clear-custom": {
        if (!confirm("清空所有自制怪物？此操作不可恢复。")) break;
        const ids = state.customMonsters.map(function (x) { return x.id; }).concat(state.customMachines.map(function (x) { return x.id; }));
        state.customMonsters = [];
        state.customMachines = [];
        state.favorites.monsters = state.favorites.monsters.filter(function (x) { return ids.indexOf(x) < 0; });
        state.favorites.machines = state.favorites.machines.filter(function (x) { return ids.indexOf(x) < 0; });
        saveState(); toast("已清空自制条目"); renderMe();
        break;
      }
      case "export": exportBackup(); break;
      case "import": importBackup(); break;
      case "toggle-view": applyViewMode(viewMode() === "pc" ? "mobile" : "pc"); route(); break;
      case "open-me": openMeDrawer(); break;
      case "close-me": closeMeDrawer(); break;
      case "ms-login": openMsLogin(); break;
      case "community-logout":
        fetch("/api/logout", { method: "POST" }).then(function () { loadCommunity(); }).catch(function () { toast("退出失败"); });
        break;
      case "about": aboutSheet(); break;
      case "open-site-changelog": openSiteChangelog(); break;
      default: break;
    }
  }

  /* ---------------- 安装 / PWA ---------------- */
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    ui.installPrompt = e;
  });
  window.addEventListener("appinstalled", function () {
    ui.installPrompt = null;
    toast("已安装到桌面");
  });
  function installApp() {
    if (ui.installPrompt) {
      ui.installPrompt.prompt();
      ui.installPrompt.userChoice.then(function (choice) {
        if (choice && choice.outcome === "accepted") toast("正在安装…");
        ui.installPrompt = null;
      });
    } else {
      installSheet();
    }
  }
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("./sw.js").catch(function () {});
    });
  }

  /* ---------------- Toast ---------------- */
  let toastTimer;
  function toast(msg) {
    const el = q("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 1900);
  }

  /* ---------------- 启动 ---------------- */
  // 给独立模块（改枪台等）复用顶栏、主题与通用图标
  window.WZ_APP_UI = {
    q: q, esc: esc, icon: icon, renderTopbar: renderTopbar,
    heroClass: heroClass, heroStyle: heroStyle, toast: toast,
    go: go, closeSheet: closeSheet, openSheet: openSheet
  };
  function installWatermark() {
    if (document.querySelector(".site-watermark")) return;
    const d = document.createElement("div");
    d.className = "site-watermark";
    d.textContent = "该资料仅供参考，所有资料以官方整合包数据为准";
    document.body.appendChild(d);
  }
  function setupBackTop() {
    if (q("back-top")) return;
    const btn = document.createElement("button");
    btn.id = "back-top";
    btn.className = "back-top";
    btn.type = "button";
    btn.setAttribute("aria-label", "返回顶部");
    btn.textContent = "↑";
    btn.addEventListener("click", function () {
      try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { window.scrollTo(0, 0); }
    });
    document.body.appendChild(btn);
    function onScroll() {
      const y = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
      btn.classList.toggle("show", y > 260);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }
  installWatermark();
  setupBackTop();
  function loadBuildingContent() {
    if (typeof fetch !== "function") return;
    fetch("/api/buildings/content").then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.content) {
        window.WZ_BUILDING_CONTENT = Object.assign({}, window.WZ_BUILDING_CONTENT || {}, d.content);
        if (location.hash.indexOf("#/loot/region/") === 0) route();
      }
    }).catch(function () {});
  }
  if (!q("poster-modal")) {
    const pm = document.createElement("div");
    pm.id = "poster-modal"; pm.className = "poster-modal"; pm.hidden = true;
    pm.innerHTML = '<div class="poster-modal-inner"><button class="poster-modal-close" data-action="close-poster" aria-label="关闭">✕</button><img id="poster-modal-img" alt="海报"></div>';
    pm.addEventListener("click", function (e) { if (e.target === pm) pm.hidden = true; });
    document.body.appendChild(pm);
  }
  function setupReveal() {
    if (!("IntersectionObserver" in window)) return;
    const selector = ".tier-card, .region-card, .hub-card, .monster-row, .row-card, .showcase-item, .showcase-main, .guide-card, .log-item, .vehicle-cat, .vehicle-card, .section > .section-head, .poster-side";
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("revealed");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.06, rootMargin: "0px 0px -30px 0px" });
    function scan() {
      const els = document.querySelectorAll("#view " + selector);
      Array.prototype.forEach.call(els, function (el, i) {
        if (el.hasAttribute("data-reveal")) return;
        el.setAttribute("data-reveal", "");
        el.style.transitionDelay = Math.min(i % 8, 7) * 45 + "ms";
        io.observe(el);
      });
    }
    scan();
    const mo = new MutationObserver(function () { scan(); });
    const view = document.getElementById("view");
    if (view) mo.observe(view, { childList: true, subtree: true });
  }
  applyViewMode(getViewMode());
  setupWheelPaging();
  setupReveal();
  loadBuildingContent();
  window.addEventListener("hashchange", route);
  applyTheme(getTheme());
  route();
})();
