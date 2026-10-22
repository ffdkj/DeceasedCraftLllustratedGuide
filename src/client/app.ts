// @ts-nocheck
// TODO(types): legacy SPA renderer; split into router/store/render modules and type incrementally.
import {
  buildCatalog, entryMatrix, quickRows, buildingStats,
  TIERS, TIER_LABEL, METRIC_LABEL, THREATS
} from "./monsters";
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
  const SPAWNDATA = window.WZ_MONSTER_SPAWN || null;
  const DIFFDATA = window.WZ_MONSTER_DIFF || null;
  const HBDATA = window.WZ_HORDE_BUILDINGS || null;
  const STORE_KEY = "wz_guide_v1";
  const THEME_KEY = "wz_theme";
  const VIEW_MODE_KEY = "wz_viewmode_v2";

  function getTheme() {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "dark" || saved === "light") return saved;
    } catch (e) {}
    return "light";
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
      const saved = localStorage.getItem(VIEW_MODE_KEY);
      if (saved === "pc" || saved === "mobile") return saved;
    } catch (e) {}
    return window.matchMedia && window.matchMedia("(min-width: 960px)").matches ? "pc" : "mobile";
  }
  function viewMode() { return document.body.classList.contains("view-pc") ? "pc" : "mobile"; }
  function applyViewMode(m, persist) {
    const mode = m === "pc" ? "pc" : "mobile";
    document.body.classList.toggle("view-pc", mode === "pc");
    if (persist) {
      try { localStorage.setItem(VIEW_MODE_KEY, mode); } catch (e) {}
    }
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
    machineQuery: "",
    machineCat: "全部",
    guideQuery: {},
    guideGroup: {},
    regionShown: {},
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
    "multi_officethefirst", "multi_workshop", "building_policeoffice1",
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
      b._horde = HORDE_BUILDINGS.has(b.id);
      b._gunChance = gunChance;
      b._sizeKind = bparts < 2 ? "small" : (bparts <= 4 ? "medium" : "large");
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
    const kinds = { small: ["szdot gray", 1], medium: ["szdot blue", 2], large: ["szdot gold", 3] };
    const kind = kinds[b._sizeKind] || kinds.small;
    let h = '<span class="b-size" title="建筑体型：' + (b._sizeKind === "small" ? "小型" : b._sizeKind === "medium" ? "中型" : "大型") + '（' + b._partCount + " 区块）\">";
    for (let i = 0; i < kind[1]; i++) h += '<i class="' + kind[0] + '"></i>';
    return h + "</span>";
  }
  function hordeSkullCount(b) {
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

  // 生物目录：手写条目 + 生成数据合并后的 200 条（见 monsters.ts），再叠本地覆盖与自制条目
  function allMonsters() {
    const out = [];
    monsterCatalog().entries.forEach(function (e) {
      const ov = state.overrides.monsters[e.id];
      out.push(ov ? Object.assign({}, e, ov, { _override: true }) : Object.assign({}, e));
    });
    state.customMonsters.forEach(function (m) {
      out.push(Object.assign({ status: "spawns", tiers: [], cityDetail: {}, anywhere: null,
        horde: { normal: [], hard: [] }, buildings: [], evidence: [], conflicts: [] }, m, { _custom: true }));
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
    defense: { title: "防御工事", list: "#/world/defense", back: "#/world", data: GUIDE.defense || [], groupKey: "group", icon: "shield", subtitle: "按 FTB 任务书分类的基地防御", accent: "#7fc79a" },
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
    return '<button class="hub-card" style="--hub-accent:' + opts.accent + '" data-go="' + opts.href + '">' +
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
        hubCard({ href: "#/creatures/monsters", icon: "skull", title: "怪物", sub: "普通 / 特殊 / 小头目 / 头领 / 灾厄 / 真菌", count: monsterCount, unit: "种", accent: "#e07a5f" }) +
        hubCard({ href: "#/creatures/npcs", icon: "users", title: "NPC", sub: "友军 / 敌对 / 雇佣兵", count: npcCount, unit: "个", accent: "#7fc79a" }) +
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
        hubCard({ href: "#/gear/armor", icon: "shield", title: "护甲套装", sub: "护甲部件与套装效果", count: GUIDE_TYPES.armor.data.length, unit: "套", accent: "#e0a94a" }) +
        hubCard({ href: "#/gear/ammo", icon: "box", title: "弹药库", sub: "合成材料 / 适用枪械 / 区域来源", count: (GUIDE.ammo || []).length, unit: "种", accent: "#e0a94a" }) +
        hubCard({ href: "#/gear/gunsmith", icon: "gear", title: "改枪台", sub: "配件兼容 / 数值对比 / 推荐方案", count: ((window.WZ_GUNSMITH || {}).counts || {}).attachments || 0, unit: "件配件", accent: "#7fc79a" }) +
        hubCard({ href: "#/gear/melee", icon: "sword", title: "近战兵器库", sub: "棒球棒 / 斧 / 刀 / 特殊武器", count: GUIDE_TYPES.melee.data.length, unit: "件", accent: "#e07a5f" }) +
        hubCard({ href: "#/gear/trinkets", icon: "gem", title: "饰品收藏", sub: "饰品、徽章与收藏", count: GUIDE_TYPES.trinkets.data.length, unit: "件", accent: "#b09acb" }) +
      "</div></div>" +
      '<div class="section"><div class="guide-note">' + icon("info", 18) + "<div>套装效果解析自 <span class=\"mono\">config/armorsets</span>；枪械数据解析自 TACZ 的 index / data 文件；近战与饰品来自任务书条目。</div></div></div>";
  }

  function renderWorldHub() {
    renderTopbar({});
    document.title = "世界图鉴 · 亡者世界";
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass("world") + '"' + heroStyle("world") + '><h1>世界图鉴</h1><div class="meta"><span class="badge">载具</span><span class="badge">剧情</span><span class="badge">防御</span><span class="badge custom">更新日志</span></div>' +
        '<div class="hero-desc" style="margin-top:10px">载具组装、全剧情书与基地防御。建筑外观与战利品已合并到「战利品」板块，避免重复。</div></div>' +
      '<div class="section"><div class="hub-grid">' +
        hubCard({ href: "#/world/vehicles", icon: "car", title: "载具", sub: "民用 / 军用 / 船只 / 飞机", count: GUIDE_TYPES.vehicles.data.length, unit: "种", accent: "#7ea8c9" }) +
        hubCard({ href: "#/world/story", icon: "book", title: "剧情故事", sub: "新闻 / 各区域笔记与录音", count: GUIDE_TYPES.story.data.length, unit: "篇", accent: "#e0a94a" }) +
        hubCard({ href: "#/world/difficulty", icon: "skull", title: "世界难度", sub: "和平 / 简单 / 普通 / 困难 / 末日", count: 5, unit: "级", accent: "#e07a5f" }) +
        hubCard({ href: "#/world/defense", icon: "shield", title: "防御工事", sub: "爆炸物 / 防御墙 / 电击 / 炮塔", count: GUIDE_TYPES.defense.data.length, unit: "条", accent: "#7fc79a" }) +
        hubCard({ href: "#/world/changelog", icon: "book", title: "更新日志", sub: "5.11.0 → 5.11.19 版本改动", count: (window.WZ_CHANGELOG || []).length, unit: "版", accent: "#b09acb" }) +
      "</div></div>" +
      '<div class="section"><div class="guide-note">' + icon("info", 18) + "<div>载具配方来自 MTS / Immersive Aircraft 定义；剧情书整理截止 5.11.19；改枪台方案可用 WZG1- 分享码传递。</div></div></div>";
  }

  function changelogVersions() {
    const logs = (window.WZ_CHANGELOG || []).slice();
    logs.sort(function (a, b) {
      const pa = String(a.version || "").split(".").map(Number);
      const pb = String(b.version || "").split(".").map(Number);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const d = (pb[i] || 0) - (pa[i] || 0);
        if (d) return d;
      }
      return 0;
    });
    return logs;
  }

  function renderChangelog() {
    const logs = changelogVersions();
    const newest = logs[0] ? logs[0].version : "";
    const oldest = logs.length ? logs[logs.length - 1].version : "";
    const total = logs.reduce(function (a, l) { return a + ((l.items || []).length); }, 0);
    renderTopbar({ back: "#/world", title: "更新日志", sub: logs.length + " 个版本" });
    document.title = "更新日志 · 亡者世界";
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass("world") + '"' + heroStyle("world") + '><h1>更新日志</h1><div class="meta"><span class="badge">' + (oldest ? "v" + esc(oldest) + " → v" + esc(newest) : "待收录") + '</span><span class="badge">' + total + ' 条改动</span><span class="badge custom">整理自官方日志</span></div><div class="hero-desc" style="margin-top:10px">按版本查看新增内容、平衡调整与修复，最新版本排在最前，点击标题展开或收起。</div></div>' +
      '<div class="section"><div class="log-list">' + logs.map(function (log, i) {
        const cleanTitle = String(log.title || "").replace(/^v?[\d.]+\s*(更新日志|更新列表|Patch Notes[^:：]*)?[:：]?/i, "").trim();
        const items = log.items || [];
        return '<details class="log-item"' + (i === 0 ? " open" : "") + '><summary><span class="log-version">v' + esc(log.version) + '</span><span class="log-title">' + esc(cleanTitle || "版本改动") + '</span><span class="log-count">' + items.length + ' 条</span></summary><ul>' + items.map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("") + '</ul></details>';
      }).join("") + '</div></div>' +
      '<div class="section"><div class="guide-note">' + icon("info", 18) + "<div>更新日志整理自整合包官方更新记录，按原文保留作者署名与说明；条目中的数值以游戏内实际版本为准。</div></div></div>";
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
      const v = guideGroupOf(type, x);
      if (v) set.add(String(v));
    });
    const list = Array.from(set);
    if (type === "guns") {
      const at = list.indexOf("未实装");
      if (at >= 0) { list.splice(at, 1); list.push("未实装"); }
    }
    return ["全部"].concat(list);
  }
  function guideGroupOf(type, item) {
    if (type === "guns" && item && window.WZ_RECIPES_UI && window.WZ_RECIPES_UI.isUnreleased(item.id)) return "未实装";
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
          '<div class="difficulty-block"><b>奖励 / 收益</b><ul>'+l.rewards.map(function(x){return '<li>'+esc(x)+'</li>';}).join("")+'</ul></div></div>';
      }).join("")+'</div></div>';
  }
  function renderGuideList(type) {
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
    if (type === "guns") {
      if (window.WZ_RECIPES_UI && window.WZ_RECIPES_UI.isUnreleased(item.id)) return "未实装";
      return item.type || "枪械";
    }
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
      const src = size <= 64 && item.thumb ? item.thumb : item.image;
      return "<div class=\"guide-thumb\" style=\"width:" + size + "px;height:" + size + "px;background-image:url('" + esc(src) + "')\"></div>";
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
        '<div class="row-right"><span class="badge' + (type === "guns" && window.WZ_RECIPES_UI && window.WZ_RECIPES_UI.isUnreleased(item.id) ? " unreleased" : "") + '">' + esc(guideRowTag(type, item)) + "</span></div>" +
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
  function gunLootSources(gunId) {
    const rec = itemIndex.get("tacz:modern_kinetic_gun");
    if (!rec) return [];
    const names = [];
    const guide = ((GUIDE_TYPES.guns || {}).data || []).filter(function (x) { return x.id === gunId; })[0];
    if (guide && guide.name) names.push(String(guide.name));
    const gs = ((window.WZ_GUNSMITH || {}).guns || {})[gunId];
    if (gs && gs.name && names.indexOf(String(gs.name)) < 0) names.push(String(gs.name));
    if (!names.length) return [];
    const matches = function (note) {
      const body = String(note || "").replace(/^枪械\s*[:：]\s*/, "").trim();
      if (!body) return false;
      return names.some(function (n) { return n && (body === n || body.indexOf(n) >= 0 || n.indexOf(body) >= 0); });
    };
    const map = new Map();
    rec.sources.forEach(function (s) {
      if (!matches(s.it[7])) return;
      const key = s.r.id + "/" + s.b.id;
      let row = map.get(key);
      if (!row) { row = { region: s.r, building: s.b, best: 0, count: 0 }; map.set(key, row); }
      row.best = Math.max(row.best, Number(s.it[4]) || 0);
      row.count += 1;
    });
    return Array.from(map.values()).sort(function (a, b) { return b.best - a.best; });
  }
  function lootSourcesSection(ids, limit) {
    return lootRowsSection(lootSourcesFor(ids), limit);
  }
  function lootRowsSection(list, limit) {
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
    const rows = items.map(function (it) {
      return npcTradeRow(t, it);
    }).join("");
    return head +
      '<div class="npc-quote-bar">' +
        '<div class="npc-shop-title">' + icon(isMoney ? "gem" : "box", 15) + "<span>" + esc(t.title || "交易") + "</span></div>" +
        '<div class="npc-currency-chip ' + (isMoney ? "money" : "barter") + '">' + (isMoney ? "💰" : "⇄") + " " + esc(t.currencyName || "以物易物") + "</div>" +
        '<div class="npc-quote-total">' + items.length + " 条</div>" +
      "</div>" +
      '<div class="quote-list">' + rows + "</div>" +
      '<div class="quote-foot">' + (isMoney ? "➜ 使用货币购买；右侧为获得数量。" : "⇄ 以物易物；左侧为支付数量，右侧为获得数量。") + "</div>";
  }
  function guideDetailExtra(type, item) {
    if (type === "armor") {
      let h = '<div class="stat-grid">' +
        '<div class="stat-box"><b>' + esc(item.tier || "未分类") + '</b><span>阶级</span></div>' +
        '<div class="stat-box"><b>' + (item.pieces || []).length + '</b><span>部件</span></div></div>' +
        (item.armorStats ? '<div class="section"><div class="stat-grid">' +
          '<div class="stat-box"><b>' + fmtNum(item.armorStats.armor) + '</b><span>护甲值</span></div>' +
          '<div class="stat-box"><b>' + fmtNum(item.armorStats.toughness) + '</b><span>韧性</span></div>' +
          '<div class="stat-box"><b>' + (Number(item.armorStats.knockback || 0) * 100).toFixed(0) + '%</b><span>击退抗性</span></div>' +
          '<div class="stat-box"><b>' + fmtNum(item.armorStats.enchantability) + '</b><span>附魔能力</span></div>' +
          "</div></div>" : "") +
        (item.stars ? '<div class="section"><div class="star-line">同阶护甲 ' + starsHTML(item.stars.armor,"同阶护甲") + ' · 同阶推荐 ' + starsHTML(item.stars.recommend,"同阶推荐") + ' <span class="star-note">仅同 T 阶级内比较</span></div></div>' : "") +
        (item.tierNote ? '<div class="tier-note">' + icon("info", 17) + "<span>" + esc(item.tierNote) + "</span></div>" : "") +
        (item.weaponRequirement ? '<div class="guide-note" style="margin-top:10px">' + icon("gun", 18) + "<div>套装要求：" + esc(item.weaponRequirement) + "</div></div>" : "");
      h += '<div class="section"><div class="section-head"><div class="section-title">套装部件</div></div><div class="list">' +
        (item.pieces || []).map(function (p) {
          return '<div class="piece-row">' + itemIcon(p.id, p.name, null, 34) +
            '<div class="piece-main"><div class="piece-name">' + esc(p.name || p.id) + '</div><div class="piece-id mono">' + esc(p.id) + '</div></div>' +
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
        ((window.WZ_RECIPES_UI && window.WZ_RECIPES_UI.available()) ? window.WZ_RECIPES_UI.gunCostSection(item.id) : "") +
        lootRowsSection(gunLootSources(item.id), 6);
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
      const starLine = '<div class="section"><div class="star-line">同阶伤害 ' + starsHTML(st.damage,"同阶伤害") + ' · 同阶攻速 ' + starsHTML(st.speed,"同阶攻速") + ' · 同阶推荐 ' + starsHTML(st.recommend,"同阶推荐") + ' <span class="star-note">仅同 T 阶级内比较</span></div></div>';
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
    const unreleased = type === "guns" && window.WZ_RECIPES_UI && window.WZ_RECIPES_UI.isUnreleased(item.id);
    const meta = [
      unreleased ? '<span class="badge unreleased">未实装</span>' : "",
      '<span class="badge">' + esc(type === "guns" ? (item.type || "枪械") : guideRowTag(type, item)) + "</span>",
      type === "vehicles" && item.source ? '<span class="badge">' + esc(item.source) + "</span>" : "",
      type === "guns" && window.WZ_TIERS_UI && window.WZ_TIERS_UI.available() ? window.WZ_TIERS_UI.badges(item.id) : ""
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
      const small = (window.WZ_BUILDING_THUMBS_SMALL || {})[b.id];
      const src = size <= 64 && small ? small : g.image;
      return "<div class=\"guide-thumb\" style=\"width:" + size + "px;height:" + size + "px;background-image:url('" + esc(src) + "')\"></div>";
    }
    return '<div class="avatar">' + esc(initial(b.name)) + "</div>";
  }
  function renderBuildingsList() {
    renderTopbar({ back: "#/world", title: "建筑图鉴", sub: DATA.meta.buildings + " 座建筑" });
    document.title = "建筑图鉴 · 亡者世界";
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass("buildings") + '"' + heroStyle("buildings") + '><h1>建筑图鉴</h1><div class="meta"><span class="badge">任务书拍立得</span><span class="badge custom">战利品入口</span></div>' +
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
  function monsterLevelKey(m) {
    const lv = m && m.level;
    if (lv === "普通" || lv === "特殊" || lv === "小头目" || lv === "头领" || lv === "灾厄" || lv === "真菌" || lv === "友好") return lv;
    // 兼容旧数据 / 自制条目
    if (m && m.calamityLevel) return "灾厄";
    if (m && (m.bossTier === 3 || m.bossTier === 4)) return "头领";
    if (m && (m.category === "Boss" || MONSTER_LEADERS.has(m.name))) return "小头目";
    if (m && m.category === "普通感染体") return "普通";
    if (m && m.category === "友好生物") return "友好";
    if (m && String(m.source || "").indexOf("Spore") >= 0) return "真菌";
    return "特殊";
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
    else if (root === "me" || root === "settings" || root === "community") tab = "community";
    renderTabbar(tab);

    if (root === "loot") {
      if (p[1] === "region" && p[2]) renderRegion(p[2]);
      else if (p[1] === "building" && p[2] && p[3]) renderBuilding(p[2], p[3]);
      else if (p[1] === "search") renderLootHome(parsed.query.get("q") || "");
      else renderLootHome("");
    } else if (root === "item" && p[1]) {
      renderItem(p[1]);
    } else if (root === "creatures") {
      if (p[1] === "monsters") renderMonsters();
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
        if (p[1] && GUIDE_TYPES[gearType]) {
          if (p[2]) renderGuideDetail(gearType, p[2]);
          else renderGuideList(gearType);
        } else renderGearHub();
      }
    } else if (root === "world") {
      if (p[1] === "vehicle-audit") renderVehicleAudit();
      else if (p[1] === "changelog") renderChangelog();
      else if (p[1] === "difficulty") renderWorldDifficulty();
      else if (p[1] === "buildings") renderBuildingsList();
      else if (p[1] === "vehicles" || p[1] === "vehicle") {
        if (p[2]) renderGuideDetail("vehicles", p[2]);
        else renderGuideList("vehicles");
      } else if (p[1] === "story") {
        if (p[2]) renderGuideDetail("story", p[2]);
        else renderGuideList("story");
      } else if (p[1] === "defense") {
        if (p[2]) renderGuideDetail("defense", p[2]);
        else renderGuideList("defense");
      } else renderWorldHub();
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
      else renderMe();
    } else {
      renderLootHome("");
    }
    activeRoute = nextHash;
    restoreScroll(nextHash);
  }

  /* ---------------- 框架 ---------------- */
  function renderTopbar(opts) {
    opts = opts || {};
    let left;
    if (opts.back) {
      left = '<button class="back-btn" data-go="' + esc(opts.back) + '">' + icon("back", 18) + "<span>返回</span></button>";
    } else {
      left = '<button class="me-btn" data-action="open-me" aria-label="我的">' + icon("user", 21) + '<span class="me-btn-label">我的</span></button>';
    }
    const brand = '<div class="brand"><div class="brand-mark">' + icon("skull", 21) + '</div><div class="brand-text"><div class="brand-title">亡者图鉴</div><div class="brand-sub">DECEASEDCRAFT ' + esc((GUIDE.meta || {}).version || DATA.meta.version) + "</div></div></div>";
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
      { id: "loot", label: "战利品", icon: "box", href: "#/loot" },
      { id: "creatures", label: "生物", icon: "skull", href: "#/creatures" },
      { id: "gear", label: "装备", icon: "shield", href: "#/gear" },
      { id: "world", label: "世界", icon: "globe", href: "#/world" },
      { id: "community", label: "社区", icon: "globe", href: "#/community" }
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
    return '<span class="badge ' + tier.toLowerCase() + '">' + esc(tier) + "</span>";
  }
  function badgeClimate(c) {
    if (!c) return "";
    const cls = String(c).indexOf("/") >= 0 ? "mixed" : (c === "炎热" ? "hot" : c === "寒冷" ? "cold" : c === "辐射" ? "rad" : "warm");
    return '<span class="badge ' + cls + '">' + esc(c) + "</span>";
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
  function monsterThreatInfo(m) {
    const src = String(m.source || "") + " " + String(m.mod || "");
    const isSpore = src.indexOf("Spore") >= 0;
    if (m._custom && m.threat) {
      return { key: "custom", label: "自定义威胁", dots: Number(m.threat) || 0 };
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
    let h = '<span class="threat-dots">';
    for (let i = 1; i <= total; i++) h += '<i class="' + (i <= n ? "on" : "") + '"></i>';
    return h + "</span>";
  }
  function monsterThreatBadge(m) {
    const info = monsterThreatInfo(m);
    let symbol = "";
    if (info.dots != null) symbol = threatDotsHTML(info.dots, 5);
    else symbol = '<span class="threat-rad">' + info.icon + "</span>";
    let cls = "threat-tag " + info.key;
    if (info.level) cls += " level" + info.level;
    let badge = '<span class="' + cls + '">' + symbol + "<em>" + esc(info.label) + "</em>" +
      (info.fungus ? '<span class="fungus-mini">🍄</span>' : "") + "</span>";
    return badge;
  }
  function monsterThreatDesc(m) {
    const info = monsterThreatInfo(m);
    if (m.status === "unimplemented" || m.status === "unconfirmed") {
      return info.label + "：评级按基础属性与模组定位推定；当前不会生成，只作资料参考，不代表会在哪个梯度遇到它。";
    }
    if (info.key === "calamity") {
      const base = "灾厄：当前最高威胁等级。建议组队、准备重火力与逃生路线，不要在没有掩体的情况下正面硬抗。";
      return info.fungus ? base + " 属于真菌灾厄生物。" : base;
    }
    if (info.key === "leader") return "头领：由原一级灾厄与高阶 Boss 下沉后的阶级，拥有独特机制或阶段变化。先清理召唤物，再集中火力处理本体。";
    if (info.key === "minor") return "小头目 " + ["I", "II", "III"][Math.max(0, Math.min(2, Number(info.minorTier || 1) - 1))] + "：T2 起地标建筑尸潮才会刷新的高血量单位，血量高于普通僵尸。红色圆点 1–3 表示级别。优先清理周围小怪，再集中火力处理。";
    if (info.key === "fungus") return "真菌感染体。攻击常附带孢子、感染或范围效果。保持距离，避免被孢子云包围。";
    if (info.key === "normal") return "普通感染体，单体威胁较低，但成群时仍可能拖垮弹药与体力。";
    if (info.key === "friendly") return "友好生物，不会主动攻击。可交易或提供任务。";
    if (info.key === "custom") return "本地录入的自定义威胁等级。";
    return "特殊感染体 / 高危单位，拥有突进、爆炸、远程或控制能力。优先攻击弱点，避免被围。";
  }

  /* ---------------- 战利品首页 ---------------- */
  function renderLootHome(initialQuery) {
    renderTopbar({
      actions: [
        '<button class="icon-btn" data-action="install" aria-label="安装到手机">' + icon("install") + "</button>"
      ]
    });
    document.title = "亡者世界 · 生存图鉴";
    const m = DATA.meta;
    function regionImage(name) {
      const all = GUIDE.buildings || {};
      for (const k in all) {
        const g = all[k];
        if (g && g.region === name && g.image) return g.image;
      }
      return null;
    }
    const regionCards = DATA.regions.map(function (r) {
      const img = r.cover || regionImage(r.name);
      const cc = climateClass(r);
      return '<button class="region-card ' + cc + (img ? " has-img" : "") + '" style="--accent:' + tone(r.id) + '" data-go="#/loot/region/' + encodeURIComponent(r.id) + '">' +
        (img ? '<img class="rc-bg" src="' + esc(img) + '" alt="" loading="lazy">' : "") +
        '<div class="rc-top"><div><div class="rc-name">' + esc(r.name) + (cc === "climate-rad" ? '<span class="rc-rad-tag">辐射</span>' : "") + '</div><div class="rc-meta">' + badgeTier(r.tier) + badgeClimate(r.climate) + "</div></div>" + icon("chevron", 18) + "</div>" +
        '<div class="rc-nums"><div class="rc-num"><b>' + r.buildings.length + '</b><span>建筑</span></div><div class="rc-num"><b>' + r._entries.toLocaleString() + '</b><span>掉落条目</span></div></div>' +
        (cc === "climate-rad" ? '<div class="rc-rad-warn">高辐射 · 需防护服</div>' : "") +
        "</button>";
    }).join("");

    const hot = ["铁锭", "钢锭", "金苹果", "弹药", "绷带", "罐头", "汽油", "钻石"];
    const hotChips = hot.map(function (x) {
      return '<button class="hot-chip" data-hot="' + esc(x) + '">' + esc(x) + "</button>";
    }).join("");

    q("view").innerHTML =
      '<section class="hero' + heroClass("home") + '"' + heroStyle("home") + '>' +
        '<div class="hero-kicker">SURVIVAL FIELD GUIDE</div>' +
        '<h1 class="hero-title">搜刮之前，先查清楚。</h1>' +
        '<div class="hero-desc">亡者世界 ' + esc((GUIDE.meta || {}).version || m.version) + " 生存图鉴：战利品（表 " + esc(m.version) + "）· 怪物与 NPC · 装备 · 载具 · 剧情。所有数据离线可用。</div>" +
        '<div class="hero-stats">' +
          '<div class="hero-stat"><div class="v">' + m.regions + '</div><div class="k">区域</div></div>' +
          '<div class="hero-stat"><div class="v">' + m.buildings + '</div><div class="k">建筑</div></div>' +
          '<div class="hero-stat"><div class="v">' + m.entries.toLocaleString() + '</div><div class="k">掉落条目</div></div>' +
          '<div class="hero-stat"><div class="v">' + m.items.toLocaleString() + '</div><div class="k">物品</div></div>' +
        "</div>" +
      "</section>" +
      '<div class="quick-search"><div class="searchbar">' + icon("search") +
        '<input id="loot-search" type="search" placeholder="搜物品名或 ID，例如：铁锭 / minecraft:iron_ingot" value="' + esc(initialQuery || ui.lootQuery) + '" autocomplete="off" autocapitalize="off" spellcheck="false">' +
        '<button class="search-clear" data-action="clear-loot-search" aria-label="清空" hidden>' + icon("close", 15) + "</button>" +
      "</div></div>" +
      '<div id="loot-results" hidden></div>' +
      '<div id="loot-home">' +
        '<section class="section"><div class="section-head"><div class="section-title">按区域浏览</div><div class="section-note">点击进入建筑列表</div></div><div class="region-grid">' + regionCards + "</div></section>" +
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
          '<div class="poster-badges"><span class="poster-tier">' + esc(region.tier) + '</span><span class="poster-climate">' + esc(climateLabel(region)) + "</span>" +
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

  const REGION_PAGE = 6;

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
      '<div class="section"><div class="section-head"><div class="section-title">建筑列表</div><div class="section-note" id="region-count"></div></div><div class="list" id="region-list"></div></div>';

    const input = q("region-search");
    if (input) input.addEventListener("input", debounce(function () {
      ui.regionQuery[rid] = input.value;
      // 搜索条件变化时回到第一批，滚动加载重新开始
      if (ui.regionShown) ui.regionShown[rid] = REGION_PAGE;
      renderRegionList(region);
    }, 100));
    renderRegionList(region);
    initRegionPoster(region);
  }

  function renderRegionList(region) {
    const query = (ui.regionQuery[region.id] || "").trim().toLowerCase();
    const list = region.buildings.filter(function (b) {
      return !query || b.name.toLowerCase().indexOf(query) >= 0 || b.id.toLowerCase().indexOf(query) >= 0;
    });
    const box = q("region-list");
    if (!box) return;
    const countEl = q("region-count");
    if (countEl) countEl.textContent = list.length + " / " + region.buildings.length + " 座";
    if (!ui.regionShown) ui.regionShown = {};
    const shownCount = Math.min(list.length, Math.max(REGION_PAGE, ui.regionShown[region.id] || REGION_PAGE));
    ui.regionShown[region.id] = shownCount;
    const shown = list.slice(0, shownCount);
    box.innerHTML = shown.length ? shown.map(function (b) {
      return '<button class="row-card building-row ' + climateClass(region) + '" data-go="#/loot/building/' + encodeURIComponent(region.id) + "/" + encodeURIComponent(b.id) + '">' +
        buildingThumb(b, 42) +
        '<div class="row-main"><div class="row-title b-title-wrap">' + buildingTitleHTML(b) + "</div>" +
          '<div class="row-sub">' + b._floors + " 个楼层 · " + b._containers + " 个容器 · " + b._entries.toLocaleString() + " 条掉落</div></div>" +
        '<div class="row-right"><div class="big">' + b._entries.toLocaleString() + '</div><div class="cap">条目</div><div class="prob-mini"><i style="width:' + Math.min(100, Math.max(4, b._entries / Math.max(1, region._entries) * 100 * 4)) + '%"></i></div></div>' +
        "</button>";
    }).join("") : '<div class="empty">' + icon("search", 28) + '<div class="em-title">没有匹配的建筑</div><div class="em-sub">换个关键词试试</div></div>';

    // 滚动加载：上一轮监听先解绑，列表底部留一个哨兵
    if (ui._regionObs) { ui._regionObs.disconnect(); ui._regionObs = null; }
    const old = box.parentElement.querySelector(".region-sentinel");
    if (old) old.remove();
    const rest = list.length - shown.length;
    if (rest > 0) {
      box.insertAdjacentHTML("afterend", '<div class="region-sentinel" id="region-sentinel">向下滚动加载更多 · 还有 ' + rest + " 座</div>");
      const sentinel = q("region-sentinel");
      if (sentinel && window.IntersectionObserver) {
        ui._regionObs = new IntersectionObserver(function (entries) {
          for (let i = 0; i < entries.length; i++) {
            if (!entries[i].isIntersecting) continue;
            if (ui._regionObs) { ui._regionObs.disconnect(); ui._regionObs = null; }
            ui.regionShown[region.id] = (ui.regionShown[region.id] || REGION_PAGE) + REGION_PAGE;
            ui._regionObs = null;
            renderRegionList(region);
            break;
          }
        }, { rootMargin: "300px 0px" });
        ui._regionObs.observe(sentinel);
      } else {
        ui.regionShown[region.id] = list.length;
        renderRegionList(region);
      }
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
          return '<div class="container-block open" data-fi="' + floorIndex + '" data-ci="' + ci + '" data-part="' + x.i + '">' +
            '<button class="container-head" data-action="toggle-container">' +
              '<span class="container-name">' + esc(c.name) + '</span><span class="container-count">' + c.items.length + " 项</span>" + icon("chevron", 16) +
            "</button>" +
            '<div class="container-items" data-loaded="0"></div>' +
          "</div>";
        }).join("");
        return '<div class="accordion open">' +
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
    const heroThumbSource = (window.WZ_BUILDING_THUMBS || {})[building.id] || (bg && bg.image) || "";
    const heroThumb = heroThumbSource
      ? '<img class="poster-thumb-img building-hero-thumb" id="poster-thumb-img" src="' + esc(heroThumbSource) + '" alt="' + esc(building.name) + '小地图缩略图" loading="eager" decoding="async">'
      : "";
    q("view").innerHTML =
      radiationBanner(region) +
      '<div class="detail-hero climate-hero ' + cc + ' building-detail-hero' + (heroThumb ? " has-thumb" : "") + '">' +
        '<div class="building-hero-copy">' +
          '<div class="b-title-row"><h1>' + esc(building.name) + "</h1>" + buildingHordeBadge(building) + buildingSizeBadges(building) + "</div>" +
          '<div class="meta">' + badgeTier(region.tier) + badgeClimate(region.climate) + '<span class="badge">' + esc(region.name) + "</span>" + (building.multi ? '<span class="badge custom">多体建筑 · ' + building._partCount + " 区块</span>" : "") + "</div>" +
        "</div>" +
        heroThumb +
        '<div class="detail-stats"><div><b>' + building._floors + '</b><span>楼层</span></div><div><b>' + building._containers + '</b><span>容器</span></div><div><b>' + building._entries.toLocaleString() + '</b><span>掉落条目</span></div></div>' +
      "</div>" +
      buildingHero +
      partChips +
      '<div class="section" style="margin-top:14px"><div class="section-head"><div class="section-title">按楼层查看</div><div class="section-note">当前 ' + entriesShown.toLocaleString() + " 条</div></div>" + floorsHTML + "</div>" +
      '<div class="section tiny dim">楼层与容器默认展开，点击标题可收起；点击物品查看全图所有掉落来源。</div>';

    // 保存当前建筑供容器填充使用
    ui.currentBuilding = building;
    ui.currentPartIndex = shown.length === 1 ? shown[0].i : null;
    // 默认展开全部容器：渲染后一次性填充掉落行
    Array.prototype.forEach.call(q("view").querySelectorAll(".container-block"), fillContainer);
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

  /* ---------------- 生物图鉴（按刷怪梯度） ---------------- */
  const MONSTER_INPUT = { guides: GUIDE, spawn: SPAWNDATA, diff: DIFFDATA, buildings: HBDATA };
  const TIER_SHORT = { T1: "郊区", T2: "办公·住宅", T3: "酒店·商业", T4: "荒地" };
  const METRIC_CLASS = { hp: "ico-hp", dmg: "ico-attack", armor: "ico-armor", toPlayer: "ico-toplayer" };
  let MONSTER_CAT = null;
  function monsterCatalog() {
    if (!MONSTER_CAT) MONSTER_CAT = buildCatalog(MONSTER_INPUT);
    return MONSTER_CAT;
  }
  function statValue(v) { return v == null ? "—" : String(fmtNum(v)); }
  const COND_NAME = { overworld: "主世界", abyss: "深渊" };
  function condText(c) {
    const m1 = /^维度 (\w+)$/.exec(c);
    if (m1) return "维度 " + (COND_NAME[m1[1]] || m1[1]);
    const m2 = /^群系标签 (\w+)$/.exec(c);
    if (m2) return "群系 " + m2[1];
    return c;
  }
  function condListText(list) {
    return (list || []).map(condText).join(" / ");
  }
  function statChipsHTML(stats, keys) {
    const list = keys || ["hp", "armor", "dmg"];
    return '<span class="stat-chips">' + list.map(function (k) {
      const v = stats ? stats[k] : null;
      const cls = v == null ? (k === "armor" ? "ico-armor-empty" : "ico-hp-empty") : METRIC_CLASS[k];
      return '<span class="stat-chip" title="' + METRIC_LABEL[k] + '"><i class="stat-ico ' + cls + '"></i>' + statValue(v) + "</span>";
    }).join("") + "</span>";
  }
  function tierDotsHTML(m) {
    if (m.status === "unimplemented" || m.status === "unconfirmed") return "";
    const tiers = Array.isArray(m.tiers) ? m.tiers : [];
    const anywhere = m.status === "spawns" && !tiers.length;
    const isAbyss = anywhere && ((m.anywhere && (m.anywhere.conditions || []).indexOf("维度 abyss") >= 0));
    return '<span class="tier-dots" role="img" aria-label="' +
      (anywhere ? (isAbyss ? "深渊维度" : "全图刷新") : tiers.length ? "梯度 " + tiers.join(" ") : "无刷怪梯度") + '">' +
      TIERS.map(function (t) {
        return '<i class="tier-dot ' + (tiers.indexOf(t) >= 0 ? "on" : "") + '" data-tier="' + t + '">' + t + "</i>";
      }).join("") + "</span>" + (anywhere ? '<i class="tier-any">' + (isAbyss ? "深渊" : "全图") + "</i>" : "");
  }
  function monsterBadgesHTML(m) {
    let h = "";
    if (m.kind === "npc") h += '<span class="badge custom">NPC</span>';
    else if (m.kind === "neutral") h += '<span class="badge">中立</span>';
    if (m.status === "unconfirmed") h += '<span class="badge override">来源未确认</span>';
    if (m._custom) h += '<span class="badge custom">自制</span>';
    else if (m._override) h += '<span class="badge override">已补充</span>';
    return h;
  }
  function monsterRowHTML(m) {
    return '<div class="row-card monster-row" data-go="#/monster/' + encodeURIComponent(m.id) + '" role="button" tabindex="0">' +
      '<div class="row-main">' +
        '<div class="row-title">' + esc(m.name) + (m.en ? ' <span class="row-en">' + esc(m.en) + "</span>" : "") + monsterBadgesHTML(m) + "</div>" +
        '<div class="row-sub">' + tierDotsHTML(m) + (m.hasStats === false ? '<span class="stat-none">无数值</span>' : statChipsHTML(m.base)) + "</div>" +
      "</div>" +
      (m.status === "unimplemented" || m.status === "unconfirmed"
        ? '<span class="num-none">无梯度</span>'
        : '<button class="num-btn" type="button" data-action="monster-nums" data-id="' + esc(m.id) + '">数值</button>') +
      "</div>";
  }
  function monsterFilter() {
    const parts = parseHash().parts;
    const qs = parseHash().query;
    return {
      tab: parts[0] === "creatures" && parts[2] === "unimplemented" ? "unimplemented" : "all",
      tier: qs.get("t") || "全部",
      threat: qs.get("th") || "全部"
    };
  }
  function monsterHref(tab, tier, threat) {
    const qs = [];
    if (tier && tier !== "全部") qs.push("t=" + encodeURIComponent(tier));
    if (threat && threat !== "全部") qs.push("th=" + encodeURIComponent(threat));
    return "#/creatures/monsters" + (tab === "unimplemented" ? "/unimplemented" : "") + (qs.length ? "?" + qs.join("&") : "");
  }
  function monsterScope(tab) {
    return allMonsters().filter(function (m) {
      if (tab === "unimplemented") return m.status === "unimplemented" || m.status === "unconfirmed";
      return m.status !== "unimplemented" && m.status !== "unconfirmed";
    });
  }
  function monsterMatch(m, f, query) {
    if (f.tier !== "全部") {
      const tiers = m.tiers || [];
      const abyssOnly = tiers.length === 0 && ((m.anywhere || {}).conditions || []).some(function (c) { return c === "维度 abyss"; });
      if (f.tier === "全图") { if (tiers.length || abyssOnly) return false; }
      else if (f.tier === "深渊") { if (!abyssOnly) return false; }
      else if (tiers.indexOf(f.tier) < 0) return false;
    }
    if (f.threat !== "全部" && m.threat !== f.threat) return false;
    if (!query) return true;
    const hay = [m.name, m.en, m.category, m.threat, m.id, m.strategy, m.behavior, m.spawnText,
      (m.buildings || []).map(function (b) { return b.name; }).join(" ")].join(" ").toLowerCase();
    return hay.indexOf(query) >= 0;
  }
  function monsterTierRank(m) {
    const t = (m.tiers || [])[0];
    return t ? TIERS.indexOf(t) : TIERS.length;
  }

  function renderMonsters() {
    const cat = monsterCatalog();
    const f = monsterFilter();
    const isUn = f.tab === "unimplemented";
    renderTopbar({
      back: "#/creatures",
      title: isUn ? "未实装生物" : "生物图鉴",
      sub: isUn
        ? cat.counts.unimplemented + " 不会生成 · " + cat.counts.unconfirmed + " 待确认"
        : cat.counts.spawns + " 条会刷 · 共 " + cat.counts.total + " 条资料",
      actions: ['<button class="icon-btn accent" data-action="add-monster" aria-label="录入怪物">' + icon("plus") + "</button>"]
    });
    document.title = (isUn ? "未实装生物" : "生物图鉴") + " · 亡者世界";
    q("view").innerHTML =
      '<div class="detail-hero' + heroClass("monsters") + '"' + heroStyle("monsters") + '><h1>' + (isUn ? "未实装生物" : "生物图鉴") + "</h1>" +
        '<div class="meta"><span class="badge">' + cat.counts.total + ' 条收录</span><span class="badge custom">会刷 ' + cat.counts.spawns + "</span>" +
          (isUn ? '<span class="badge unreleased">不参与筛选</span>' : "") + "</div>" +
        '<div class="hero-desc" style="margin-top:10px">' + (isUn
          ? "这些生物当前不会生成，或找不到会生成的证据。只列它原本的属性与判定依据，不给梯度与尸潮的假设数值。"
          : "按刷怪梯度分区：每行四个点＝T1–T4，实心即会在该梯度刷；「全图」不挑区域。点「数值」看困难难度下各场景的具体数字（取自 attribute.js、InControl spawn.json 与尸潮表）。") +
        "</div></div>" +
      '<div class="section"><div class="chip-row">' +
        '<button class="chip ' + (isUn ? "" : "active") + '" data-go="' + monsterHref("all", f.tier, f.threat) + '">会刷 <span class="n">' + cat.counts.spawns + "</span></button>" +
        '<button class="chip ' + (isUn ? "active" : "") + '" data-go="' + monsterHref("unimplemented", f.tier, f.threat) + '">未实装 <span class="n">' + (cat.counts.unimplemented + cat.counts.unconfirmed) + "</span></button>" +
      "</div></div>" +
      (isUn ? '<div class="section"><div class="guide-note">' + icon("info", 18) + "<div>不参与其他筛选：上排是四个刷怪来源全空的 " + cat.counts.unimplemented + " 只；下排是包内有注册名、但四个来源都扫不到刷怪规则的 " + cat.counts.unconfirmed + " 只。它们不会出现在梯度列表与数值查询里。</div></div></div>" : "") +
      '<div class="section"><div class="searchbar">' + icon("search") + '<input id="monster-search" type="search" placeholder="搜名称、英文名、模组或建筑" value="' + esc(ui.monsterQuery) + '" autocomplete="off"></div></div>' +
      (isUn ? "" : '<div class="section"><div class="chip-row" id="monster-tiers"></div></div>') +
      '<div class="section"><div class="chip-row" id="monster-threats"></div></div>' +
      '<div class="section" id="monster-sections"></div>' +
      '<button class="fab" data-action="add-monster" aria-label="录入怪物">' + icon("plus", 20) + "</button>";

    q("monster-search").addEventListener("input", debounce(function (e) {
      ui.monsterQuery = e.target.value;
      renderMonsterList();
    }, 100));
    renderMonsterTierChips();
    renderMonsterThreatChips();
    renderMonsterList();
  }
  function renderMonsterTierChips() {
    const box = q("monster-tiers");
    if (!box) return;
    const f = monsterFilter();
    const scope = monsterScope("all");
    const chips = [{ key: "全部", label: "全部", n: scope.length }];
    TIERS.forEach(function (t) {
      chips.push({
        key: t,
        label: t + " " + TIER_SHORT[t],
        n: scope.filter(function (m) { return (m.tiers || []).indexOf(t) >= 0; }).length
      });
    });
    chips.push({
      key: "全图",
      label: "全图",
      n: scope.filter(function (m) {
        return !(m.tiers || []).length && !((m.anywhere || {}).conditions || []).some(function (c) { return c === "维度 abyss"; });
      }).length
    });
    chips.push({
      key: "深渊",
      label: "深渊",
      n: scope.filter(function (m) {
        return !(m.tiers || []).length && ((m.anywhere || {}).conditions || []).some(function (c) { return c === "维度 abyss"; });
      }).length
    });
    box.innerHTML = chips.map(function (c) {
      return '<button class="chip ' + (f.tier === c.key ? "active" : "") + '" data-go="' + monsterHref("all", c.key, f.threat) + '">' +
        esc(c.label) + ' <span class="n">' + c.n + "</span></button>";
    }).join("");
  }
  function renderMonsterThreatChips() {
    const box = q("monster-threats");
    if (!box) return;
    const f = monsterFilter();
    const scope = monsterScope(f.tab);
    const chips = [{ key: "全部", n: scope.length }];
    THREATS.forEach(function (t) {
      const n = scope.filter(function (m) { return m.threat === t; }).length;
      if (n) chips.push({ key: t, n: n });
    });
    box.innerHTML = chips.map(function (c) {
      return '<button class="chip ' + (f.threat === c.key ? "active" : "") + '" data-go="' + monsterHref(f.tab, f.tier, c.key) + '">' +
        esc(c.key) + ' <span class="n">' + c.n + "</span></button>";
    }).join("");
  }
  function renderMonsterList() {
    const f = monsterFilter();
    const query = ui.monsterQuery.trim().toLowerCase();
    const box = q("monster-sections");
    if (!box) return;
    const list = monsterScope(f.tab)
      .filter(function (m) { return monsterMatch(m, f, query); })
      .sort(function (a, b) { return monsterTierRank(a) - monsterTierRank(b) || a.name.localeCompare(b.name, "zh"); });
    if (!list.length) {
      box.innerHTML = '<div class="empty">' + icon("search", 28) + '<div class="em-title">没有匹配的生物</div><div class="em-sub">换个梯度、威胁等级或关键词</div></div>';
      return;
    }
    if (f.tab === "unimplemented") {
      const groups = [
        { key: "unimplemented", title: "确认不会生成", sub: "四个刷怪来源全空", list: list.filter(function (m) { return m.status === "unimplemented"; }) },
        { key: "unconfirmed", title: "来源未确认", sub: "包内有注册名，扫不到刷怪规则", list: list.filter(function (m) { return m.status !== "unimplemented"; }) }
      ];
      box.innerHTML = groups.filter(function (g) { return g.list.length; }).map(function (g) {
        return '<div class="section-head"><div class="section-title">' + g.title + " · " + g.list.length + ' 条</div><div class="section-note">' + g.sub + "</div></div>" +
          '<div class="list">' + g.list.map(monsterRowHTML).join("") + "</div>";
      }).join("");
      return;
    }
    box.innerHTML = '<div class="list">' + list.map(monsterRowHTML).join("") + "</div>";
  }

  /* ---------------- 数值矩阵 ---------------- */
  function metricHeadsHTML() {
    return ["hp", "armor", "dmg", "toPlayer"].map(function (k) {
      return '<th><i class="stat-ico ' + METRIC_CLASS[k] + '"></i>' + METRIC_LABEL[k] + "</th>";
    }).join("");
  }
  function matrixCellsHTML(stats) {
    return ["hp", "armor", "dmg", "toPlayer"].map(function (k) {
      return '<td class="num">' + statValue(stats ? stats[k] : null) + "</td>";
    }).join("");
  }
  function matrixTableHTML(sections) {
    let h = '<div class="table-wrap num-wrap"><table class="num-table"><thead><tr><th>难度</th>' + metricHeadsHTML() + "</tr></thead><tbody>";
    sections.forEach(function (sec) {
      h += '<tr class="nm-sec"><td colspan="5">' + esc(sec.title) + "</td></tr>";
      sec.rows.forEach(function (r) { h += "<tr><td>" + esc(r.label) + "</td>" + matrixCellsHTML(r.stats) + "</tr>"; });
    });
    return h + "</tbody></table></div>";
  }
  function openMonsterNumbers(id) {
    const m = findMonster(id);
    if (!m) return;
    if (m.status === "unimplemented" || m.status === "unconfirmed") { go("#/monster/" + encodeURIComponent(m.id)); return; }
    const rows = quickRows(m, MONSTER_INPUT);
    if (!rows.length) {
      openSheet({
        title: m.name,
        body: '<div class="tiny dim">这只怪没有可用的数值数据。</div>',
        foot: '<button class="btn primary block" data-action="close-sheet">知道了</button>'
      });
      return;
    }
    let t = '<div class="table-wrap num-wrap"><table class="num-table"><thead><tr><th>场景 · 困难</th>' + metricHeadsHTML() + "</tr></thead><tbody>";
    rows.forEach(function (r) { t += "<tr><td>" + esc(r.label) + "</td>" + matrixCellsHTML(r.stats) + "</tr>"; });
    t += "</tbody></table></div>";
    openSheet({
      title: m.name + " · 困难数值",
      body: t + '<div class="tiny dim" style="margin-top:10px">梯度按 InControl 的区域标签，建筑尸潮按建筑所在区域。「对玩家」是含原版难度系数的实际伤害。</div>',
      foot: '<button class="btn primary block" data-go="#/monster/' + encodeURIComponent(m.id) + '">看完整矩阵</button>'
    });
  }

  /* ---------------- 怪物详情 ---------------- */
  function spawnRowsHTML(m) {
    const out = [];
    TIERS.forEach(function (t) {
      if ((m.tiers || []).indexOf(t) < 0) return;
      const d = (m.cityDetail || {})[t];
      out.push('<div class="spawn-row on">' +
        '<i class="tier-dot on" data-tier="' + t + '">' + t + "</i>" +
        '<div class="spawn-main"><div class="spawn-title">' + esc(TIER_LABEL[t]) + "</div>" +
        '<div class="spawn-sub">' + (d
          ? esc((d.districts || []).join("、")) + (d.conditions.length ? " · " + esc(condListText(d.conditions)) : "") + " · 每秒 " + d.rate
          : "会刷新") + "</div></div></div>");
    });
    if (m.anywhere) {
      const abyss = (m.anywhere.conditions || []).indexOf("维度 abyss") >= 0;
      out.push('<div class="spawn-row on"><i class="tier-dot on" data-tier="any">' + (abyss ? "深渊" : "全图") + '</i>' +
        '<div class="spawn-main"><div class="spawn-title">' + (abyss ? "深渊维度" : "全图任意区域") + '</div><div class="spawn-sub">每秒 ' + m.anywhere.rate +
        (m.anywhere.conditions.length ? " · " + esc(condListText(m.anywhere.conditions)) : "") + "</div></div></div>");
    } else if (m.status === "spawns" && !(m.tiers || []).length) {
      out.push('<div class="spawn-row on"><i class="tier-dot on" data-tier="any">全图</i>' +
        '<div class="spawn-main"><div class="spawn-title">随原版刷新</div><div class="spawn-sub">' + esc((m.evidence || []).filter(function (x) { return x.indexOf("原版变体") === 0; })[0] || "不挑区域") + "</div></div></div>");
    }
    if ((m.horde.normal || []).length || (m.horde.hard || []).length) {
      out.push('<div class="spawn-row on"><i class="tier-dot on" data-tier="horde">潮</i>' +
        '<div class="spawn-main"><div class="spawn-title">天数尸潮</div><div class="spawn-sub">' +
        '普通 · 第 ' + ((m.horde.normal || []).join(" / ") || "—") + " 天档；困难 · 第 " + ((m.horde.hard || []).join(" / ") || "—") + " 天档</div></div></div>");
    }
    if ((m.buildings || []).length) {
      out.push('<div class="spawn-row on"><i class="tier-dot on" data-tier="build">筑</i>' +
        '<div class="spawn-main"><div class="spawn-title">尸潮建筑 · ' + m.buildings.length + ' 座</div><div class="spawn-sub">' +
        esc(m.buildings.slice(0, 4).map(function (b) { return b.name; }).join("、")) +
        (m.buildings.length > 4 ? " 等（明细见下表）" : "") + "</div></div></div>");
    }
    return out.join("");
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
    const ti = monsterThreatInfo(m);
    const spawns = m.status === "spawns";
    const sections = spawns ? entryMatrix(m, MONSTER_INPUT) : [];
    const bstats = buildingStats(m, MONSTER_INPUT);
    const base = m.base || { hp: null, dmg: null, armor: null };

    const buildingTable = bstats.length
      ? '<div class="table-wrap num-wrap"><table class="num-table"><thead><tr><th>建筑</th><th>梯度</th><th>困难血量</th><th>护甲</th><th>攻击</th><th>对玩家</th><th>占比</th></tr></thead><tbody>' +
        bstats.map(function (b) {
          return "<tr><td>" + esc(b.name) + "</td><td>" + esc(b.tier || "—") + '</td><td class="num">' + statValue(b.hp) +
            '</td><td class="num">' + statValue(b.armor) + '</td><td class="num">' +
            (b.dmgMin == null ? "—" : b.dmgMin === b.dmgMax ? statValue(b.dmgMin) : b.dmgMin + "–" + b.dmgMax) +
            '</td><td class="num">' + statValue(b.toPlayer) + '</td><td class="num">' + (b.share == null ? "—" : b.share + "%") + "</td></tr>";
        }).join("") + "</tbody></table></div>"
      : "";

    const evidence = (m.evidence || []).slice();
    if ((m.conflicts || []).length) evidence.push.apply(evidence, m.conflicts);

    q("view").innerHTML =
      '<div class="detail-hero"><div style="display:flex;align-items:center;gap:12px">' + monsterAvatar(m, 54) +
        '<div style="flex:1;min-width:0"><h1>' + esc(m.name) + "</h1>" +
          '<div class="meta">' + (m.en ? '<span class="badge">' + esc(m.en) + "</span>" : "") +
            (m.category ? '<span class="badge">' + esc(m.category) + "</span>" : "") +
            (m.threat === "未评级"
              ? '<span class="badge">中立 · 无威胁评级</span>'
              : (ti.label === m.category ? "" : '<span class="badge threat-meta ' + ti.key + '">' + esc(ti.label) + "</span>")) +
            monsterBadgesHTML(m) +
            (m.status === "unimplemented" ? '<span class="badge unreleased">未实装</span>' : "") +
          "</div></div></div>" +
        '<div class="detail-stats">' +
          '<div><b><i class="stat-ico ico-hp"></i>' + statValue(base.hp) + "</b><span>基础生命</span></div>" +
          '<div><b><i class="stat-ico ico-armor"></i>' + statValue(base.armor) + "</b><span>基础护甲</span></div>" +
          '<div><b><i class="stat-ico ico-attack"></i>' + statValue(base.dmg) + "</b><span>基础攻击</span></div>" +
        "</div></div>" +
      (!m._custom && spawns ? '<div class="section"><div class="section-head"><div class="section-title">刷怪定位</div><div class="section-note">按生成数据的刷怪来源</div></div><div class="spawn-list">' + spawnRowsHTML(m) + "</div></div>" : "") +
      (spawns && sections.length
        ? '<div class="section"><div class="section-head"><div class="section-title">数值矩阵</div><div class="section-note">场景 × 难度</div></div>' +
          matrixTableHTML(sections) +
          '<div class="tiny dim" style="margin-top:10px">生命 / 护甲 / 攻击为叠加后的属性值；「对玩家」含原版难度系数。天数尸潮不吃区域加成；建筑尸潮按建筑所在区域叠一层；深渊尸潮为推算值，包里尚未配置。</div></div>'
        : "") +
      (buildingTable ? '<div class="section"><div class="section-head"><div class="section-title">尸潮建筑数值</div><div class="section-note">困难难度 · ' + bstats.length + " 座</div></div>" + buildingTable + "</div>" : "") +
      (m.status === "unconfirmed"
        ? '<div class="section callout"><div class="callout-title">为什么归到「来源未确认」</div>包内能看到它的注册名，但四个刷怪来源（区域刷怪器 / 模组自然刷 / 天数尸潮 / 尸潮建筑）都扫不到它，所以不给数值矩阵，避免和真实数据混在一起。</div>'
        : "") +
      (m.status === "unimplemented"
        ? '<div class="section callout"><div class="callout-title">为什么判定未实装</div>四个刷怪来源全空，也没有任何刷怪表引用它。下面只列它原本的属性，不给梯度与尸潮的假设数值。</div>'
        : "") +
      (m.threat === "未评级" ? "" : '<div class="section threat-section ' + ti.key + '"><div class="section-head"><div class="section-title">威胁评级</div><div class="section-note">' + esc(ti.label) + "</div></div>" +
        '<div class="threat-block">' + monsterThreatBadge(m) + '<div class="threat-desc">' + esc(monsterThreatDesc(m)) + "</div></div></div>") +
      (m.behavior ? '<div class="section"><div class="section-head"><div class="section-title">行为特性</div></div><div class="text-block">' + esc(m.behavior) + "</div></div>" : "") +
      (m.strategy ? '<div class="section"><div class="section-head"><div class="section-title">打法建议</div></div><div class="callout red"><div class="callout-title">生存提示</div><div class="text-block">' + esc(m.strategy) + "</div></div></div>" : "") +
      (m.drops ? '<div class="section"><div class="section-head"><div class="section-title">掉落</div></div><div class="text-block">' + esc(m.drops) + "</div></div>" : "") +
      '<div class="section"><div class="section-head"><div class="section-title">数据来源</div></div><dl class="kv">' +
        "<dt>实体 ID</dt><dd class=\"mono\">" + esc(m.id) + "</dd>" +
        "<dt>模组</dt><dd>" + esc(m.source || (m.id.split(":")[0])) + "</dd>" +
        "<dt>判定依据</dt><dd>" + esc(evidence.length ? evidence.join("；") : "—") + "</dd>" +
      "</dl></div>" +
      '<div class="section" style="display:flex;gap:8px">' +
        '<button class="btn" style="flex:1" data-action="edit-monster" data-id="' + esc(m.id) + '">' + icon("edit", 17) + "编辑/补充</button>" +
        (m._custom ? '<button class="btn danger" data-action="delete-monster" data-id="' + esc(m.id) + '">' + icon("trash", 17) + "删除</button>"
          : (m._override ? '<button class="btn ghost" data-action="reset-monster" data-id="' + esc(m.id) + '">恢复初始</button>' : "")) +
      "</div>";
  }

  /* ---------------- 机器 ---------------- */
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
        '<button class="menu-item" data-go="#/settings"><span class="menu-ico">' + icon("settings", 17) + '</span><span class="menu-main"><span class="menu-title">设置</span><span class="menu-sub">主题 / 电脑手机版 / 登录 / 数据</span></span>' + icon("chevron", 17) + "</button>" +
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
    renderTopbar({ back: "#/loot", title: "我的" });
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
    renderTopbar({ title: "社区", sub: "在线版" });
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
      let h = '<div class="section"><div class="card profile-card"><div class="profile-avatar">' + icon("user", 26) + '</div><div style="flex:1;min-width:0"><div class="profile-name">' + esc(user ? user.name : "未登录") + '</div><div class="profile-sub">' + (cfg.ready ? "微软正版登录已配置" : "服务器未配置微软登录") + '</div></div>' +
        (user ? '<button class="btn ghost" data-action="community-logout">退出</button>' : (cfg.ready ? '<a class="btn primary" href="/auth/login">正版登录</a>' : '<span class="badge">未配置</span>')) + "</div></div>";
      h += '<div class="section"><div class="section-head"><div class="section-title">聊天</div><div class="section-note">' + posts.length + ' 条</div></div><div class="community-chat" id="community-chat">' +
        (posts.length ? posts.slice(-50).map(function (p) { return '<div class="chat-row"><b>' + esc(p.user) + '</b><span>' + esc(p.text) + '</span></div>'; }).join("") : '<div class="guide-note">' + icon("info", 18) + "<div>还没有人说话。登录后发第一条。</div></div>") +
        '</div>' + (user ? '<form id="community-form" class="community-form"><input id="community-input" maxlength="500" placeholder="说点什么…" autocomplete="off"><button class="btn primary" type="submit">发送</button></form>' : "") + "</div>";
      h += '<div class="section"><div class="section-head"><div class="section-title">照片墙</div><div class="section-note">' + photos.length + ' 张</div></div>' +
        (photos.length ? '<div class="community-photos">' + photos.slice(-30).map(function (p) { return p.dataUrl ? '<figure class="community-photo"><img src="' + esc(p.dataUrl) + '" alt="' + esc(p.caption || "") + '"><figcaption>' + esc(p.caption || "") + '</figcaption></figure>' : ""; }).join("") + "</div>" : '<div class="guide-note">' + icon("info", 18) + "<div>还没有照片。Exposure 照片上传接口已预留。</div></div>") + "</div>";
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
    renderTopbar({ back: "#/me", title: "设置" });
    document.title = "设置 · 亡者世界图鉴";
    const isPc = viewMode() === "pc";
    q("view").innerHTML =
      '<div class="section"><div class="section-head"><div class="section-title">界面与账号</div></div><div class="menu-list">' +
        '<button class="menu-item" data-action="toggle-theme"><span class="menu-ico">' + icon("moon", 17) + '</span><span class="menu-main"><span class="menu-title">深色 / 浅色</span><span class="menu-sub">切换页面配色</span></span>' + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-action="toggle-view"><span class="menu-ico">' + icon("monitor", 17) + '</span><span class="menu-main"><span class="menu-title">电脑 / 手机版</span><span class="menu-sub">' + (isPc ? "当前：电脑版（更宽的布局）" : "当前：手机版") + "</span></span>" + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-action="ms-login"><span class="menu-ico">' + icon("user", 17) + '</span><span class="menu-main"><span class="menu-title">我的世界正版登录</span><span class="menu-sub">社区在线版 · 用微软账号登录</span></span>' + icon("chevron", 17) + "</button>" +
      "</div></div>" +
      '<div class="section"><div class="section-head"><div class="section-title">数据与安装</div></div><div class="menu-list">' +
        '<button class="menu-item" data-action="export"><span class="menu-ico">' + icon("download", 17) + '</span><span class="menu-main"><span class="menu-title">导出备份</span><span class="menu-sub">收藏与自制内容导出为 JSON</span></span>' + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-action="import"><span class="menu-ico">' + icon("upload", 17) + '</span><span class="menu-main"><span class="menu-title">导入备份</span><span class="menu-sub">合并攻略包</span></span>' + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-action="install"><span class="menu-ico">' + icon("install", 17) + '</span><span class="menu-main"><span class="menu-title">安装到手机桌面</span><span class="menu-sub">HTTPS 环境下可离线</span></span>' + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-action="offline-images"><span class="menu-ico">' + icon("download", 17) + '</span><span class="menu-main"><span class="menu-title">下载离线图片包</span><span class="menu-sub">缩略图 + 详情大图 · 不含音频</span></span>' + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-action="offline-audio"><span class="menu-ico">' + icon("download", 17) + '</span><span class="menu-main"><span class="menu-title">下载离线音频</span><span class="menu-sub">7 首原声 · 约 10.8MB</span></span>' + icon("chevron", 17) + "</button>" +
        '<button class="menu-item" data-action="clear-offline"><span class="menu-ico" style="color:var(--red)">' + icon("trash", 17) + '</span><span class="menu-main"><span class="menu-title" style="color:var(--red)">清除离线图片/音频</span><span class="menu-sub">保留应用壳层缓存</span></span>' + icon("chevron", 17) + "</button>" +
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
    renderTopbar({ back: "#/me", title: "我的收藏" });
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
      '<div class="field"><label>行为特性</label><textarea name="behavior" maxlength="800" placeholder="特殊攻击、增益、刷新条件…">' + esc(m.behavior || "") + "</textarea></div>" +
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
        "<b>剧情</b>\n剧情书文本与任务线整理自「雨幕之下」的剧情资料。\n\n" +
        "<b>官方整合包</b>\nDeceasedCraft 整合包作者为 TqLxQuanZ；版本号、任务书与模组内容以官方发布为准。\n\n" +
        "<b>网站与展示</b>\n网页版由（ '▿ ' ）提供并维护；离线版与其数据保持同步。\n\n" +
        "<b>其他资料</b>\n怪物/NPC 种子资料参考 DeceasedCraft 官方 Wiki、MC百科；枪械、载具、近战与防御数据来自本机 5.11.19 整合包文件；部分攻略思路与演示参考 B站「无敌萝卜王」等创作者视频。带「待补充」的字段表示公开资料不足，可在详情页自行编辑。\n\n" +
        "<b>贴图与怪物形象</b>\n物品/方块贴图、实体头像从本机 11.19 整合包的 mods 与资源包中提取；怪物图片可能来自官方宣传视频、任务书立绘或 B站/社区创作者（包括「无敌萝卜王」等），部分来源难以逐一确认，版权归原作者所有。页面背景使用整合包任务书官方美术（districts_art），仅作非商业攻略示意，如有侵权请联系删除。\n\n" +
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
    if (e.key === "Escape") { closeSheet(); return; }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-item-id]")) {
      e.preventDefault();
      ui.itemBack = currentHash();
      go("#/item/" + encodeURIComponent(e.target.dataset.itemId));
    }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-go]")) {
      e.preventDefault();
      go(e.target.dataset.go);
    }
  });

  function handleAction(action, el, e) {
    switch (action) {
      case "toggle-theme": {
        const next = (document.documentElement.dataset.theme === "light") ? "dark" : "light";
        applyTheme(next);
        route();
        break;
      }
      case "install": installApp(); break;
      case "offline-images": requestOffline("prefetch-images"); break;
      case "offline-audio": requestOffline("prefetch-audio"); break;
      case "clear-offline": requestOffline("clear-offline"); break;
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
      case "monster-nums": openMonsterNumbers(el.dataset.id); break;
      case "guide-group": ui.guideGroup[el.dataset.type] = el.dataset.group; renderGuideGroups(el.dataset.type); renderGuideRows(el.dataset.type); break;
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
      case "toggle-view": applyViewMode(viewMode() === "pc" ? "mobile" : "pc", true); route(); break;
      case "open-me": openMeDrawer(); break;
      case "close-me": closeMeDrawer(); break;
      case "ms-login": openMsLogin(); break;
      case "community-logout":
        fetch("/api/logout", { method: "POST" }).then(function () { loadCommunity(); }).catch(function () { toast("退出失败"); });
        break;
      case "about": aboutSheet(); break;
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
  function requestOffline(type) {
    if (!("serviceWorker" in navigator)) {
      toast("当前浏览器不支持离线缓存");
      return;
    }
    if (!navigator.serviceWorker.controller) {
      toast("离线缓存尚未就绪，请刷新后重试");
      return;
    }
    if (type !== "clear-offline" && !navigator.onLine) {
      toast("当前离线，无法下载");
      return;
    }
    navigator.serviceWorker.controller.postMessage({ type: type });
    if (type === "prefetch-images") toast("开始缓存图片…");
    if (type === "prefetch-audio") toast("开始缓存音频…");
  }

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.addEventListener("message", function (event) {
      const d = event.data || {};
      const label = d.kind === "audio" ? "音频" : "图片";
      if (d.type === "prefetch-progress") {
        toast(label + " " + d.done + "/" + d.total + (d.failed ? " · 失败 " + d.failed : ""));
      } else if (d.type === "prefetch-done") {
        toast(label + "缓存完成" + (d.failed ? "（失败 " + d.failed + "）" : ""));
      } else if (d.type === "offline-cleared") {
        toast("离线图片/音频缓存已清除");
      }
    });
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
  installWatermark();
  applyViewMode(getViewMode());
  window.addEventListener("hashchange", route);
  applyTheme(getTheme());
  route();
})();
