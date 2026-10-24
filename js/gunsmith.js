/* 亡者世界 · TACZ 改枪台 */
(function () {
  "use strict";

  const GS = window.WZ_GUNSMITH || { guns: {}, attachments: {}, slots: [], attachmentOrder: {}, counts: {} };
  const GUIDE = window.WZ_GUIDES || { guns: [] };
  const BUILD_KEY = "wz_gunsmith_builds";
  const RECORD_KEY = "wz_gunsmith_records_v1";
  const MAX_RECORDS = 30;
  const UI = function () { return window.WZ_APP_UI || {}; };

  const SLOT_ORDER = ["scope", "muzzle", "stock", "grip", "laser", "extended_mag"];
  const SLOT_NAMES = { scope: "瞄具", muzzle: "枪口", stock: "枪托", grip: "握把", laser: "激光", extended_mag: "弹匣 / 弹药" };
  const SLOT_ICONS = { scope: "◎", muzzle: "⌁", stock: "▰", grip: "╱", laser: "◉", extended_mag: "▣" };
  const TYPE_ORDER = ["步枪", "冲锋枪", "手枪", "机枪", "狙击枪", "霰弹枪", "精确射手步枪", "重型武器", "特殊武器", "卡宾枪", "枪械"];

  const STATS = [
    { key: "damage", label: "伤害", unit: "", digits: 1, better: "high", max: 100 },
    { key: "headshot", label: "爆头倍率", unit: "×", digits: 2, better: "high", max: 3 },
    { key: "rpm", label: "射速", unit: "RPM", digits: 0, better: "high", max: 1200 },
    { key: "mag", label: "弹容", unit: "发", digits: 0, better: "high", max: 100 },
    { key: "reload", label: "换弹", unit: "s", digits: 2, better: "low", max: 6 },
    { key: "recoilPitch", label: "垂直后坐力", unit: "", digits: 2, better: "low", max: 3 },
    { key: "recoilYaw", label: "水平后坐力", unit: "", digits: 2, better: "low", max: 3 },
    { key: "inaccStand", label: "腰射散布", unit: "", digits: 2, better: "low", max: 20 },
    { key: "inaccAim", label: "瞄准散布", unit: "", digits: 2, better: "low", max: 10 },
    { key: "aimTime", label: "瞄准时间", unit: "s", digits: 3, better: "low", max: 1.2 },
    { key: "weight", label: "重量", unit: "kg", digits: 2, better: "low", max: 30 },
    { key: "armorIgnore", label: "护甲穿透", unit: "%", digits: 0, better: "high", max: 100, scale: 100 },
    { key: "pierce", label: "穿透", unit: "", digits: 0, better: "high", max: 5 },
    { key: "speed", label: "枪口初速", unit: "m/s", digits: 0, better: "high", max: 1200 },
    { key: "range", label: "有效射程", unit: "m", digits: 0, better: "high", max: 200 },
  ];

  const PRESETS = [
    { id: "hipfire", name: "冲锋腰射", desc: "低散布、快开镜，适合室内和尸群近战", accent: "#7ea8c9" },
    { id: "range", name: "远距点射", desc: "瞄准散布与后坐力优先，适合步枪/狙击", accent: "#7fc79a" },
    { id: "penetration", name: "穿透穿甲", desc: "优先 FMJ / 穿甲弹与高穿透枪口", accent: "#e0a94a" },
    { id: "control", name: "稳定压枪", desc: "优先降低垂直/水平后坐力", accent: "#b09acb" },
    { id: "stealth", name: "消音潜行", desc: "消音器 + 低散布，降低枪声传播", accent: "#e07a5f" },
  ];

  const guideGuns = (GUIDE.guns || []).slice();
  const guideById = {};
  guideGuns.forEach(function (g) { guideById[g.id] = g; });

  let state = {
    gunId: "",
    attachments: {},
    modal: null,
    gunQuery: "",
    gunType: "全部",
    attQuery: "",
  };

  function esc(s) {
    const f = UI().esc;
    if (f) return f(s);
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function icon(name, size) {
    const f = UI().icon;
    return f ? f(name, size) : "";
  }
  function topbar(opts) { if (UI().renderTopbar) UI().renderTopbar(opts); }
  function heroClass(k) { return UI().heroClass ? UI().heroClass(k) : ""; }
  function heroStyle(k) { return UI().heroStyle ? UI().heroStyle(k) : ""; }
  function toast(msg) { if (UI().toast) UI().toast(msg); }

  function fmt(v, digits) {
    if (v == null || isNaN(v)) return "—";
    const n = Number(v);
    if (!isFinite(n)) return "—";
    return n.toFixed(digits == null ? 1 : digits).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
  }
  function pct(n) { return (n > 0 ? "+" : "") + Math.round(n) + "%"; }

  function saveBuilds(obj) {
    try { localStorage.setItem(BUILD_KEY, JSON.stringify(obj)); } catch (e) {}
  }
  function loadBuilds() {
    try { return JSON.parse(localStorage.getItem(BUILD_KEY) || "{}") || {}; } catch (e) { return {}; }
  }
  function buildFor(gunId) {
    const all = loadBuilds();
    return Object.assign({}, all[gunId] || {});
  }
  function persistBuild() {
    if (!state.gunId) return;
    const all = loadBuilds();
    all[state.gunId] = Object.assign({}, state.attachments);
    saveBuilds(all);
  }
  function loadRecords() {
    try { return JSON.parse(localStorage.getItem(RECORD_KEY) || "[]") || []; } catch (e) { return []; }
  }
  function saveRecords(list) {
    try { localStorage.setItem(RECORD_KEY, JSON.stringify(list)); } catch (e) {}
  }
  function recordsFor(gunId) {
    return loadRecords().filter(function (r) { return r.gunId === gunId; });
  }
  function recordName() {
    const gd = guideGun(state.gunId) || gunData(state.gunId) || {};
    const d = new Date();
    const pad = function (n) { return n < 10 ? "0" + n : String(n); };
    return (gd.name || "枪械") + " " + (d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
  }
  function addRecord(name, source, atts, gunId) {
    const gid = gunId || state.gunId;
    if (!gid) return null;
    const list = loadRecords();
    const rec = {
      id: "rec_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      gunId: gid,
      name: String(name || recordName()).slice(0, 60),
      attachments: Object.assign({}, atts || state.attachments),
      source: source || "手动存档",
      createdAt: new Date().toISOString(),
    };
    list.unshift(rec);
    const same = list.filter(function (r) { return r.gunId === gid; });
    if (same.length > MAX_RECORDS) {
      const drop = new Set(same.slice(MAX_RECORDS).map(function (r) { return r.id; }));
      saveRecords(list.filter(function (r) { return !drop.has(r.id); }));
    } else saveRecords(list);
    return rec;
  }
  function deleteRecord(id) {
    saveRecords(loadRecords().filter(function (r) { return r.id !== id; }));
  }
  function loadRecord(id) {
    const rec = loadRecords().filter(function (r) { return r.id === id; })[0];
    if (!rec) return false;
    state.gunId = rec.gunId;
    state.attachments = Object.assign({}, rec.attachments || {});
    persistBuild();
    return true;
  }

  /* ---------- 改枪分享码 ---------- */
  function utf8ToB64(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  }
  function b64ToUtf8(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function encodeBuildCode(gunId, atts, note) {
    const payload = { v: 1, g: gunId, a: atts || {}, n: note || "" };
    return "WZG1-" + utf8ToB64(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decodeBuildCode(code) {
    const text = String(code || "").trim();
    if (text.indexOf("WZG1-") !== 0) return null;
    let b64 = text.slice(5).replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    let obj;
    try { obj = JSON.parse(b64ToUtf8(b64)); } catch (e) { return null; }
    if (!obj || obj.v !== 1 || typeof obj.g !== "string") return null;
    const gs = gunData(obj.g);
    const gd = guideGun(obj.g);
    const gun = gs || gd;
    if (!gun) return null;
    const allowed = (gun.allow || []).slice();
    const atts = {};
    Object.keys(obj.a || {}).forEach(function (slot) {
      const id = obj.a[slot];
      if (allowed.indexOf(slot) >= 0 && typeof id === "string" && attData(id)) atts[slot] = id;
    });
    return { gunId: obj.g, gunName: (gd && gd.name) || (gs && gs.name) || obj.g, attachments: atts, note: obj.n || "" };
  }
  function describeBuild(gunId, atts) {
    const gs = gunData(gunId);
    const gd = guideGun(gunId);
    if (!gs && !gd) return null;
    const parts = [];
    SLOT_ORDER.forEach(function (slot) {
      const a = attData((atts || {})[slot]);
      if (a) parts.push({ slot: slot, slotName: SLOT_NAMES[slot] || slot, name: a.name });
    });
    return {
      gunId: gunId,
      gunName: (gd && gd.name) || (gs && gs.name) || gunId,
      parts: parts,
      stats: calc(gs || {}, atts || {})
    };
  }
  function importBuildCode(code) {
    const payload = decodeBuildCode(code);
    if (!payload) return null;
    const all = loadBuilds();
    all[payload.gunId] = Object.assign({}, payload.attachments);
    saveBuilds(all);
    state.gunId = payload.gunId;
    state.attachments = Object.assign({}, payload.attachments);
    addRecord(payload.note || ("分享码导入 " + recordName()), "分享码导入", payload.attachments, payload.gunId);
    return payload;
  }

  function gunData(id) {
    return (GS.guns || {})[id] || null;
  }
  function guideGun(id) {
    return guideById[id] || null;
  }
  function attData(id) {
    return (GS.attachments || {})[id] || null;
  }
  function mergedAtt(gun, att) {
    if (!gun || !att) return att;
    const ex = (gun.exclusive || {})[att.id];
    return ex ? Object.assign({}, att, ex, { mods: (att.mods || []).concat(ex.mods || []) }) : att;
  }

  function calc(gun, selected) {
    if (!gun) return { damage: 0, rpm: 0, mag: 0, reload: 0, recoilPitch: 0, recoilYaw: 0,
      inaccStand: 0, inaccAim: 0, aimTime: 0, weight: 0, armorIgnore: 0, pierce: 0, speed: 0, range: 0, silence: 0 };
    let damage = +gun.damage || 0;
    let rpm = +gun.rpm || 0;
    let mag = +gun.mag || 0;
    let weight = +gun.weight || 0;
    let adsAdd = 0, adsMult = 1;
    let recoilPitch = +gun.recoilPitch || 0;
    let recoilYaw = +gun.recoilYaw || 0;
    let inaccStand = +((gun.inaccuracy || {}).stand) || 0;
    let inaccAim = +((gun.inaccuracy || {}).aim) || 0;
    let armorIgnore = +gun.armorIgnore || 0;
    let pierce = +gun.pierce || 0;
    let speed = +gun.speed || 0;
    let range = +gun.range || 0;
    let headshot = +gun.headshot || 1;
    let silence = 0;
    let magLevel = 0;
    let flags = [];

    SLOT_ORDER.forEach(function (slot) {
      const id = selected[slot];
      if (!id) return;
      const a = mergedAtt(gun, attData(id));
      if (!a) return;
      weight += +a.weight || 0;
      adsAdd += +a.adsAdd || 0;
      adsMult *= +a.adsMult || 1;
      recoilPitch *= +a.recoilPitchMult || 1;
      recoilYaw *= +a.recoilYawMult || 1;
      inaccStand *= +a.inaccMult || 1;
      inaccAim *= +a.aimInaccMult || 1;
      damage *= +a.damageMult || 1;
      rpm *= +a.rpmMult || 1;
      speed *= +a.ammoSpeedMult || 1;
      if (a.armorIgnoreMult) armorIgnore *= a.armorIgnoreMult;
      if (a.armorIgnoreAdd) armorIgnore += a.armorIgnoreAdd;
      if (a.pierceAdd) pierce += a.pierceAdd;
      if (a.rangeMult) range *= a.rangeMult;
      if (a.rangeAdd) range += a.rangeAdd;
      if (a.headshotMult) headshot *= a.headshotMult;
      if (a.silenceAdd) silence += a.silenceAdd;
      if (a.magLevel) magLevel = Math.max(magLevel, a.magLevel);
      if (a.armorIgnoreSpecial) flags.push("穿甲特殊");
      if (a.pierceSpecial) flags.push("穿透特殊");
      if (a.rangeSpecial) flags.push("射程特殊");
      if (a.headshotSpecial) flags.push("爆头特殊");
    });
    if (magLevel && Array.isArray(gun.extendedMag) && gun.extendedMag[magLevel - 1] != null) {
      mag = +gun.extendedMag[magLevel - 1] || mag;
    }
    armorIgnore = Math.max(0, Math.min(1, armorIgnore));
    return {
      damage: damage, rpm: rpm, mag: mag, reload: +gun.reloadTactical || 0,
      recoilPitch: recoilPitch, recoilYaw: recoilYaw,
      inaccStand: inaccStand, inaccAim: inaccAim,
      aimTime: (Number(gun.aimTime) || 0) * adsMult + adsAdd,
      weight: weight, armorIgnore: armorIgnore, pierce: pierce,
      speed: speed, range: range, headshot: headshot, silence: silence,
      flags: Array.from(new Set(flags)),
    };
  }

  function statValue(stats, def) {
    let v = stats[def.key] || 0;
    if (def.scale) v *= def.scale;
    return v;
  }
  function statClass(base, cur, better) {
    const eps = 0.0001;
    if (Math.abs(cur - base) < eps) return "same";
    const good = better === "high" ? cur > base : cur < base;
    return good ? "good" : "bad";
  }
  function deltaText(base, cur, def) {
    const d = cur - base;
    if (Math.abs(d) < 0.0001) return "±0";
    const sign = d > 0 ? "+" : "−";
    return sign + fmt(Math.abs(d), def.digits);
  }
  function statRows(base, cur) {
    return STATS.map(function (def) {
      const b = statValue(base, def);
      const c = statValue(cur, def);
      const cls = statClass(b, c, def.better);
      const width = Math.max(0, Math.min(100, (c / (def.max || 1)) * 100));
      const baseWidth = Math.max(0, Math.min(100, (b / (def.max || 1)) * 100));
      return '<div class="gs-stat-row">' +
        '<div class="gs-stat-label">' + esc(def.label) + '</div>' +
        '<div class="gs-stat-base">' + fmt(b, def.digits) + '</div>' +
        '<div class="gs-stat-value ' + cls + '">' + fmt(c, def.digits) + '<span>' + esc(def.unit) + '</span></div>' +
        '<div class="gs-stat-delta ' + cls + '">' + deltaText(b, c, def) + '</div>' +
        '<div class="gs-stat-bar"><i style="width:' + width + '%"></i><b style="left:' + baseWidth + '%"></b></div>' +
        '</div>';
    }).join("");
  }

  function typeOptions() {
    const present = new Set(["全部"]);
    guideGuns.forEach(function (g) {
      const t = (gunData(g.id) || {}).type || g.type || "枪械";
      present.add(t);
    });
    return Array.from(present).sort(function (a, b) {
      if (a === "全部") return -1;
      if (b === "全部") return 1;
      const ia = TYPE_ORDER.indexOf(a), ib = TYPE_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
  }

  function fireBadges(gs) {
    const labels = (gs && gs.fireModeLabels) || [];
    const bolt = gs && gs.boltLabel ? ['<span class="gs-badge bolt">' + esc(gs.boltLabel) + '</span>'] : [];
    return labels.map(function (x) { return '<span class="gs-badge fire">' + esc(x) + '</span>'; }).join("") + bolt.join("");
  }
  function fireText(gs) {
    const labels = ((gs && gs.fireModeLabels) || []).slice();
    if (gs && gs.bolt === "manual_action") labels.push("手动上膛");
    return labels.join(" / ");
  }

  function gunCard(g) {
    const gs = gunData(g.id);
    const modes = gs ? (fireText(gs) || g.type || "枪械") : (g.type || "枪械");
    return '<button class="gs-gun-card" data-gs-action="open" data-gun-id="' + esc(g.id) + '">' +
      '<div class="gs-gun-thumb">' + gunImg(g, gs, 76) + '</div>' +
      '<div class="gs-gun-body"><div class="gs-gun-name">' + esc(g.name || (gs && gs.name) || g.id) + '</div>' +
      '<div class="gs-gun-sub">' + esc((gs && gs.type) || g.type || "枪械") + ' · ' + esc(modes) + '</div>' +
      '<div class="gs-gun-stats"><span>伤害 <b>' + fmt(gs ? gs.damage : g.damage, 1) + '</b></span><span>RPM <b>' + fmt(gs ? gs.rpm : g.rpm, 0) + '</b></span><span>弹容 <b>' + ((gs && gs.magLabel) ? esc(gs.magLabel) : fmt(gs ? gs.mag : g.mag, 0)) + '</b></span></div></div>' +
      '<span class="gs-gun-arrow">' + icon("chevron", 16) + '</span></button>';
  }
  function gunImg(g, gs, size) {
    const src = g.image || (gs && gs.image) || "";
    if (src) return '<img loading="lazy" src="' + esc(src) + '" alt="' + esc(g.name) + '" onerror="this.style.display=\'none\'">';
    return '<span class="gs-fallback">' + icon("gun", Math.round(size * 0.55)) + '</span>';
  }

  function renderHub() {
    const UIx = UI();
    if (UIx.closeSheet) UIx.closeSheet(true);
    closeModal();
    state.modal = null;
    topbar({ back: "#/gear", title: "改枪台", sub: "TACZ 配件 / 数值 / 推荐" });
    document.title = "改枪台 · 亡者世界";
    const types = typeOptions();
    const total = guideGuns.length;
    const attCount = Object.keys(GS.attachments || {}).length;
    const list = guideGuns.filter(function (g) {
      const gs = gunData(g.id) || {};
      return state.gunType === "全部" || (gs.type || g.type) === state.gunType;
    }).filter(function (g) {
      const q = state.gunQuery.toLowerCase();
      if (!q) return true;
      const gs = gunData(g.id) || {};
      return [g.name, g.id, gs.name, gs.type, (gs.fireModeLabels || []).join(" ")].join(" ").toLowerCase().indexOf(q) >= 0;
    });
    const view = UIx.q ? UIx.q("view") : document.getElementById("view");
    view.innerHTML =
      '<div class="detail-hero ' + heroClass("guns") + '"' + heroStyle("guns") + '><h1>改枪台</h1>' +
      '<div class="meta"><span class="badge">' + total + ' 把枪</span><span class="badge">' + attCount + ' 个配件</span><span class="badge">前后对比</span></div>' +
      '<div class="hero-desc" style="margin-top:10px">按 TACZ 的 index / data 还原枪械数值与配件槽位。选枪后可以装配瞄具、枪口、枪托、握把、激光和弹匣/弹药，实时查看伤害、射速、弹容、散布、后坐力等变化。</div></div>' +
      '<div class="section"><div class="gs-toolbar">' +
      '<div class="gs-search"><span>' + icon("search", 18) + '</span><input id="gs-gun-search" type="search" placeholder="搜索枪械名称 / 类型 / 开火模式" value="' + esc(state.gunQuery) + '"></div>' +
      '<div class="gs-chiprow">' + types.map(function (t) {
        return '<button class="chip ' + (state.gunType === t ? "active" : "") + '" data-gs-action="gun-type" data-type="' + esc(t) + '">' + esc(t) + '</button>';
      }).join("") + '</div></div>' +
      '<div class="gs-gun-grid">' + (list.length ? list.map(gunCard).join("") : '<div class="empty"><div class="em-title">没有找到枪械</div><div class="em-sub">换个关键词或类型试试。</div></div>') + '</div></div>' +
      '<div class="section"><div class="guide-note">' + icon("info", 18) + '<div>数值来自 TACZ 的枪械/配件文件；不同枪包与整合包版本可能有差异，以游戏内 Z 键面板为准。</div></div></div>';
  }

  function slotCard(gun, slot, att) {
    const a = att ? mergedAtt(gun, att) : null;
    return '<button class="gs-slot ' + (a ? "filled" : "") + '" data-gs-action="slot" data-slot="' + esc(slot) + '">' +
      '<div class="gs-slot-head"><span>' + esc(SLOT_NAMES[slot] || slot) + '</span><span class="gs-slot-plus">' + (a ? "更换" : "+ 安装") + '</span></div>' +
      '<div class="gs-slot-main">' + (a ? attIcon(a, 46) + '<div><div class="gs-slot-name">' + esc(a.name) + '</div><div class="gs-slot-mods">' + esc((a.mods || []).slice(0, 3).join(" · ") || "无数值修正") + '</div></div>' : '<div class="gs-slot-empty">' + SLOT_ICONS[slot] + ' 未安装</div>') + '</div>' +
      '</button>';
  }

  function renderWorkspace(gunId) {
    const UIx = UI();
    closeModal();
    const g = guideGun(gunId);
    const gs = gunData(gunId);
    if (!g && !gs) {
      renderHub();
      return;
    }
    const item = Object.assign({}, gs || {}, g || {});
    if (!state.gunId || state.gunId !== gunId) {
      state.gunId = gunId;
      state.attachments = buildFor(gunId);
    }
    state.modal = null;
    topbar({ back: "#/gear/gunsmith", title: item.name || "改枪台", sub: (gs ? gs.type : item.type) || "改枪" });
    document.title = (item.name || "改枪台") + " · 改枪台";
    const base = calc(gs || {}, {});
    const cur = calc(gs || {}, state.attachments);
    const allow = (gs && gs.allow) || [];
    const slots = SLOT_ORDER.filter(function (s) { return allow.indexOf(s) >= 0; });
    const view = UIx.q ? UIx.q("view") : document.getElementById("view");
    const modes = fireBadges(gs);
    const builds = loadBuilds();
    const recs = recordsFor(gunId);
    const hasSaved = Object.prototype.hasOwnProperty.call(builds, gunId);
    const saved = builds[gunId] || {};
    const dirty = !hasSaved || JSON.stringify(saved) !== JSON.stringify(state.attachments);
    view.innerHTML =
      '<div class="gs-head">' +
        '<div class="gs-head-icon">' + gunImg(item, gs, 92) + '</div>' +
        '<div class="gs-head-body"><div class="gs-kicker">' + esc((gs && gs.type) || item.type || "枪械") + '</div><h1>' + esc(item.name || gunId) + '</h1>' +
        '<div class="gs-badges">' + modes + '</div>' +
        '<div class="gs-head-ammo">' + esc(item.ammo || (gs && gs.ammoName) || "—") + (gs && gs.bulletAmount > 1 ? " · " + gs.bulletAmount + " 弹丸" : "") + '</div></div>' +
        '<button class="gs-switch" data-gs-action="gun-picker">换枪</button>' +
      '</div>' +
      '<div class="gs-actions"><button class="gs-btn" data-gs-action="reset">' + icon("trash", 16) + ' 清空配件</button>' +
        '<button class="gs-btn primary" data-gs-action="save">' + icon("check", 16) + (dirty ? " 保存当前方案" : " 当前已保存") + '</button>' +
        '<button class="gs-btn" data-gs-action="preset" data-preset="recommended">推荐方案</button>' +
        '<button class="gs-btn" data-gs-action="share-code">' + icon("share", 16) + ' 分享码</button>' +
        '<button class="gs-btn" data-gs-action="import-code">' + icon("download", 16) + ' 导入码</button></div>' +
      '<div class="gs-bench-grid">' +
        '<div class="gs-bench-col"><div class="section"><div class="section-head"><div class="section-title">配件槽位</div><div class="gs-sub">' + slots.length + ' 个可用槽位</div></div>' +
          (slots.length ? '<div class="gs-slots">' + slots.map(function (s) { return slotCard(gs || {}, s, attData(state.attachments[s])); }).join("") + '</div>' : '<div class="guide-note">' + icon("info", 18) + '<div>这把枪在 TACZ 数据中没有开放配件槽。</div></div>') +
        '</div></div>' +
        '<div class="gs-bench-col"><div class="section"><div class="section-head"><div class="section-title">枪械数值</div><div class="gs-legend"><span class="good">绿=改善</span><span class="bad">红=变差</span></div></div>' +
          '<div class="gs-stat-table"><div class="gs-stat-header"><span>项目</span><span>基础</span><span>当前</span><span>变化</span><span></span></div>' + statRows(base, cur) + '</div>' +
          (cur.flags.length ? '<div class="gs-flags">特殊修正：' + cur.flags.map(function (f) { return '<span>' + esc(f) + '</span>'; }).join("") + '</div>' : "") +
          '<div class="gs-note">后坐力为 TACZ 后坐力曲线的峰值；散布为对应姿态的基础值。护甲穿透按百分比显示。</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="section"><div class="section-head"><div class="section-title">方案记录库</div><div class="gs-sub">' + recs.length + ' 条 · 手动存档</div></div>' +
        '<div class="gs-record-actions"><button class="gs-btn" data-gs-action="save-record">' + icon("check", 16) + ' 保存当前为记录</button><span class="gs-record-hint">当前方案自动保存；记录库可保留多套并区分来源</span></div>' +
        (recs.length ? '<div class="gs-records">' + recs.map(function (r) {
          const d = new Date(r.createdAt);
          const when = isNaN(d.getTime()) ? "" : (d.getMonth() + 1) + "-" + (d.getDate() < 10 ? "0" : "") + d.getDate() + " " + (d.getHours() < 10 ? "0" : "") + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
          const n = Object.keys(r.attachments || {}).length;
          return '<div class="gs-record"><div class="gs-record-main"><b>' + esc(r.name) + '</b><small>' + esc(when) + " · " + esc(r.source) + " · " + n + ' 件</small></div>' +
            '<button class="gs-record-btn" data-gs-action="load-record" data-record-id="' + esc(r.id) + '">载入</button>' +
            '<button class="gs-record-btn danger" data-gs-action="delete-record" data-record-id="' + esc(r.id) + '">删除</button></div>';
        }).join("") + '</div>' : '<div class="guide-note">' + icon("info", 18) + '<div>还没有手动存档。点「保存当前为记录」把当前配件组合存进记录库；分享码导入也会自动留档。</div></div>') +
      '</div>' +
      '<div class="section"><div class="section-head"><div class="section-title">推荐方案</div><div class="gs-sub">一键装配，可再手动调整</div></div><div class="gs-presets">' +
        PRESETS.map(function (p) {
          const picked = pickPreset(gs || {}, p.id);
          const names = Object.keys(picked).map(function (s) { return attData(picked[s]); }).filter(Boolean).map(function (a) { return a.name; });
          return '<div class="gs-preset" style="--gs-accent:' + p.accent + '"><div class="gs-preset-head"><b>' + esc(p.name) + '</b><span>' + names.length + ' 件</span></div>' +
            '<div class="gs-preset-desc">' + esc(p.desc) + '</div><div class="gs-preset-name">' + esc(names.join(" · ") || "当前枪械没有匹配配件") + '</div>' +
            '<button class="gs-preset-btn" data-gs-action="apply-preset" data-preset="' + p.id + '"' + (names.length ? "" : " disabled") + '>装配这套</button></div>';
        }).join("") + '</div></div>' +
      '<div class="section"><div class="guide-note">' + icon("info", 18) + '<div>配件兼容按枪械 <span class="mono">allow_attachment_types</span> 生成；同一配件在不同枪械上可能有专属修正。当前方案会保存在本机。</div></div></div>';
  }

  function attIcon(a, size) {
    if (a.image) return '<img class="gs-att-img" loading="lazy" src="' + esc(a.image) + '" alt="' + esc(a.name) + '" style="width:' + size + 'px;height:' + size + 'px" onerror="this.style.display=\'none\'">';
    return '<span class="gs-att-fallback" style="width:' + size + 'px;height:' + size + 'px">' + (SLOT_ICONS[a.type] || "▣") + '</span>';
  }

  function attFitsGun(a, gun) {
    const gc = gun.gunClass || "other";
    const tags = a.tags || [];
    if (tags.indexOf("shotgun") >= 0 && gc !== "shotgun") return false;
    if (tags.indexOf("pistol") >= 0 && gc !== "pistol") return false;
    if (tags.indexOf("sniper") >= 0 && gc !== "sniper") return false;
    if (tags.indexOf("smg") >= 0 && gc !== "smg" && gc !== "pistol") return false;
    if (tags.indexOf("rifle") >= 0 && ["rifle", "mg", "smg"].indexOf(gc) < 0) return false;
    return true;
  }

  function isMeleeOnly(a) {
    if (!a.meleeDamage) return false;
    const changed = function (v) { return v != null && Math.abs(v - 1) > 0.0001; };
    return !changed(a.recoilPitchMult) && !changed(a.recoilYawMult) && !changed(a.inaccMult) &&
      !changed(a.aimInaccMult) && !(a.adsAdd || 0) && !changed(a.adsMult) && !(a.magLevel || 0);
  }

  function pickPreset(gun, presetId) {
    const picked = {};
    const allow = gun.allow || [];
    allow.forEach(function (slot) {
      const ids = ((GS.attachmentOrder || {})[slot] || []).filter(function (id) {
        const a = attData(id);
        return !!a && attFitsGun(a, gun) && !isMeleeOnly(a);
      });
      let best = null, bestScore = -1e9;
      ids.forEach(function (id) {
        const a = mergedAtt(gun, attData(id));
        const score = scoreAttachment(a, slot, presetId);
        if (score > bestScore) { bestScore = score; best = id; }
      });
      if (best) picked[slot] = best;
    });
    return picked;
  }

  function scoreAttachment(a, slot, presetId) {
    const inacc = (1 - (a.inaccMult == null ? 1 : a.inaccMult)) * 100;
    const aim = (1 - (a.aimInaccMult == null ? 1 : a.aimInaccMult)) * 100;
    const rp = (1 - (a.recoilPitchMult == null ? 1 : a.recoilPitchMult)) * 100;
    const ry = (1 - (a.recoilYawMult == null ? 1 : a.recoilYawMult)) * 100;
    const dmg = ((a.damageMult == null ? 1 : a.damageMult) - 1) * 100;
    const rpm = ((a.rpmMult == null ? 1 : a.rpmMult) - 1) * 100;
    const weight = -(a.weight || 0);
    const ads = -(a.adsAdd || 0) * 100;
    const zoom = +a.zoom || 1;
    let score = 0;
    if (presetId === "hipfire") {
      score = inacc * 3 + aim * 1.4 + ads * 0.8 + weight * 0.5 + (a.magLevel || 0) * 1.5;
      if (slot === "laser") score += 8;
      if (slot === "grip") score += 4;
      if (slot === "muzzle") score += 2;
      if (slot === "scope") score += zoom > 2.5 ? -80 : (2.5 - zoom) * 2;
    } else if (presetId === "range") {
      score = aim * 3 + rp * 1.8 + ry * 1.2 + (a.rangeAdd || 0) * 0.6 + (a.rangeMult ? (a.rangeMult - 1) * 100 : 0) * 0.6 + weight * 0.2;
      if (slot === "scope") score += 12 + zoom * 4;
      if (slot === "stock") score += 4;
      if (slot === "muzzle") score += 3;
      if (slot === "grip") score += 3;
    } else if (presetId === "penetration") {
      score = (a.pierceSpecial ? 18 : 0) + (a.armorIgnoreSpecial ? 16 : 0) + (a.pierceAdd || 0) * 8 +
        ((a.armorIgnoreMult || 1) - 1) * 100 * 4 + dmg * 0.8 + (a.magLevel || 0) * 1.2 + weight * 0.15;
      if (slot === "extended_mag") score += 6;
      if (slot === "scope" && zoom > 4) score -= 8;
      if (/fmj|ap|穿甲|钨|硬芯/i.test(a.id + " " + a.name)) score += 12;
    } else if (presetId === "control") {
      score = rp * 4 + ry * 2.5 + aim * 1.2 + weight * 0.2;
      if (slot === "stock") score += 6;
      if (slot === "grip") score += 5;
      if (slot === "muzzle") score += 4;
      if (slot === "scope" && zoom > 4) score -= 30;
    } else if (presetId === "stealth") {
      score = (a.silenceAdd ? -a.silenceAdd : 0) * 1.5 + inacc * 1.4 + aim * 1.2 + weight * 0.2;
      if (a.silenceAdd) score += 20;
      if (slot === "muzzle") score += 2;
      if (slot === "scope" && zoom > 4) score -= 30;
    }
    return score;
  }

  function defaultPresetFor(gun) {
    const t = gun.type || "";
    if (t.indexOf("冲锋") >= 0 || t.indexOf("霰弹") >= 0) return "hipfire";
    if (t.indexOf("狙击") >= 0 || t.indexOf("精确") >= 0) return "range";
    if (t.indexOf("机枪") >= 0) return "control";
    if (t.indexOf("重型") >= 0) return "penetration";
    return "control";
  }

  function applyPreset(id) {
    const gs = gunData(state.gunId);
    if (!gs) return;
    const presetId = id === "recommended" ? defaultPresetFor(gs) : id;
    state.attachments = pickPreset(gs, presetId);
    persistBuild();
    renderWorkspaceKeepScroll(state.gunId);
    const p = PRESETS.filter(function (x) { return x.id === presetId; })[0];
    toast("已装配：" + (p ? p.name : "推荐方案"));
  }

  function openModal(html, cls) {
    closeModal();
    const d = document.createElement("div");
    d.className = "gs-modal " + (cls || "");
    d.id = "gs-modal";
    d.innerHTML = '<div class="gs-modal-bg" data-gs-action="close-modal"></div><div class="gs-sheet">' + html + '</div>';
    document.body.appendChild(d);
    document.body.classList.add("gs-modal-open");
    requestAnimationFrame(function () { d.classList.add("show"); });
  }
  function closeModal() {
    const d = document.getElementById("gs-modal");
    if (d) d.remove();
    document.body.classList.remove("gs-modal-open");
    state.modal = null;
  }

  function openAttachPicker(slot) {
    const gs = gunData(state.gunId);
    if (!gs) return;
    state.attQuery = "";
    const currentId = state.attachments[slot] || "";
    const ids = ((GS.attachmentOrder || {})[slot] || []).filter(function (id) { return !!attData(id); }).sort(function (a, b) {
      const fa = attFitsGun(attData(a), gs) ? 0 : 1;
      const fb = attFitsGun(attData(b), gs) ? 0 : 1;
      return fa - fb || attData(a).name.localeCompare(attData(b).name, "zh");
    });
    const rows = ids.map(function (id) {
      const a = mergedAtt(gs, attData(id));
      const preview = calc(gs, Object.assign({}, state.attachments, { [slot]: id }));
      const cur = calc(gs, state.attachments);
      const delta = compareSummary(cur, preview);
      const fits = attFitsGun(a, gs);
      return '<button class="gs-att-row ' + (id === currentId ? "active" : "") + (fits ? "" : " mismatch") + '" data-gs-action="attach" data-att-id="' + esc(id) + '">' +
        attIcon(a, 54) + '<div class="gs-att-body"><div class="gs-att-name">' + esc(a.name) + (id === currentId ? '<span class="gs-equipped">已装备</span>' : '') + (!fits ? '<span class="gs-mismatch">类型不匹配</span>' : '') + '</div>' +
        '<div class="gs-att-mods">' + esc((a.mods || []).slice(0, 4).join(" · ") || "无数值修正") + '</div>' +
        (delta.length ? '<div class="gs-att-delta">' + delta.map(function (x) { return '<span class="' + x.cls + '">' + esc(x.text) + '</span>'; }).join("") + '</div>' : '') +
        '</div><span class="gs-att-add">' + icon("chevron", 16) + '</span></button>';
    }).join("");
    openModal(
      '<div class="gs-sheet-head"><div><div class="gs-sheet-kicker">' + esc((gs.type || "枪械")) + '</div><div class="gs-sheet-title">' + esc(SLOT_NAMES[slot] || slot) + '</div></div>' +
      '<button class="gs-sheet-close" data-gs-action="close-modal" aria-label="关闭">' + icon("close", 18) + '</button></div>' +
      '<div class="gs-search small"><span>' + icon("search", 16) + '</span><input id="gs-att-search" type="search" placeholder="搜索配件名称 / 修正" value="' + esc(state.attQuery) + '"></div>' +
      '<button class="gs-att-row clear" data-gs-action="clear-slot" data-slot="' + esc(slot) + '"><div class="gs-att-clear">' + SLOT_ICONS[slot] + '</div><div class="gs-att-body"><div class="gs-att-name">不安装 / 卸下当前配件</div><div class="gs-att-mods">回到该槽位的基础数值</div></div></button>' +
      '<div class="gs-att-list" id="gs-att-list">' + (rows || '<div class="empty"><div class="em-title">没有兼容配件</div><div class="em-sub">该槽位在 TACZ 数据中没有可用配件。</div></div>') + '</div>'
    );
    state.modal = { type: "attach", slot: slot };
    filterAttList("");
  }

  function compareSummary(base, cur) {
    const out = [];
    [["recoilPitch", "垂直后坐力", 1], ["recoilYaw", "水平后坐力", 1], ["inaccStand", "腰射散布", 1], ["inaccAim", "瞄准散布", 1],
      ["damage", "伤害", 0], ["rpm", "射速", 0], ["mag", "弹容", 0], ["weight", "重量", 1], ["aimTime", "瞄准时间", 1]].forEach(function (x) {
      const k = x[0], label = x[1], dg = x[2];
      const d = (cur[k] || 0) - (base[k] || 0);
      if (Math.abs(d) < 0.0001) return;
      const lowerBetter = ["recoilPitch", "recoilYaw", "inaccStand", "inaccAim", "weight", "aimTime"].indexOf(k) >= 0;
      const good = lowerBetter ? d < 0 : d > 0;
      out.push({ cls: good ? "good" : "bad", text: label + " " + (d > 0 ? "+" : "−") + fmt(Math.abs(d), dg) });
    });
    return out.slice(0, 4);
  }

  function openGunPicker() {
    const q = state.gunQuery.toLowerCase();
    const list = guideGuns.filter(function (g) {
      const gs = gunData(g.id) || {};
      if (state.gunType !== "全部" && (gs.type || g.type) !== state.gunType) return false;
      if (!q) return true;
      return [g.name, g.id, gs.name, gs.type].join(" ").toLowerCase().indexOf(q) >= 0;
    });
    openModal(
      '<div class="gs-sheet-head"><div><div class="gs-sheet-kicker">改枪台</div><div class="gs-sheet-title">选择枪械</div></div>' +
      '<button class="gs-sheet-close" data-gs-action="close-modal" aria-label="关闭">' + icon("close", 18) + '</button></div>' +
      '<div class="gs-search small"><span>' + icon("search", 16) + '</span><input id="gs-gun-picker-search" type="search" placeholder="搜索枪械" value="' + esc(state.gunQuery) + '"></div>' +
      '<div class="gs-chiprow tight">' + typeOptions().map(function (t) {
        return '<button class="chip ' + (state.gunType === t ? "active" : "") + '" data-gs-action="gun-type" data-type="' + esc(t) + '">' + esc(t) + '</button>';
      }).join("") + '</div>' +
      '<div class="gs-att-list gun-list">' + list.map(function (g) {
        const gs = gunData(g.id) || {};
        return '<button class="gs-att-row" data-gs-action="switch-gun" data-gun-id="' + esc(g.id) + '">' +
          '<div class="gs-att-thumb">' + gunImg(g, gs, 52) + '</div><div class="gs-att-body"><div class="gs-att-name">' + esc(g.name || gs.name) + '</div>' +
          '<div class="gs-att-mods">' + esc((gs.type || g.type || "枪械") + " · " + (fireText(gs) || "开火模式未知")) + '</div></div><span class="gs-att-add">' + icon("chevron", 16) + '</span></button>';
      }).join("") + '</div>'
    );
    state.modal = { type: "guns" };
  }

  function copyTextValue(text) {
    function fallback() {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      toast(ok ? "分享码已复制" : "复制失败，请手动长按选择");
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast("分享码已复制"); }).catch(fallback);
    } else {
      fallback();
    }
  }

  function openShareCodeModal() {
    if (!state.gunId) return;
    const g = guideGun(state.gunId) || gunData(state.gunId) || {};
    const code = encodeBuildCode(state.gunId, state.attachments, g.name || "");
    const count = Object.keys(state.attachments || {}).length;
    openModal(
      '<div class="gs-sheet-head"><div><div class="gs-sheet-kicker">改枪台</div><div class="gs-sheet-title">分享方案</div></div>' +
      '<button class="gs-sheet-close" data-gs-action="close-modal" aria-label="关闭">' + icon("close", 18) + '</button></div>' +
      '<div class="field"><label>方案分享码</label><textarea id="gs-share-text" class="mono" rows="4" readonly>' + esc(code) + '</textarea></div>' +
      '<div class="gs-note">已包含 ' + count + ' 个配件。把这段代码发给朋友，对方在改枪台「导入码」粘贴即可还原方案。</div>' +
      '<div class="gs-actions"><button class="gs-btn primary" data-gs-action="copy-share-code">复制分享码</button>' +
      '<button class="gs-btn" data-gs-action="close-modal">关闭</button></div>'
    );
  }

  function openImportCodeModal() {
    openModal(
      '<div class="gs-sheet-head"><div><div class="gs-sheet-kicker">改枪台</div><div class="gs-sheet-title">导入分享码</div></div>' +
      '<button class="gs-sheet-close" data-gs-action="close-modal" aria-label="关闭">' + icon("close", 18) + '</button></div>' +
      '<div class="field"><label>粘贴 WZG1- 开头的分享码</label><textarea id="gs-import-text" class="mono" rows="4" placeholder="WZG1-..."></textarea></div>' +
      '<div class="gs-note">导入后会自动保存为当前枪械方案，并打开改枪台。</div>' +
      '<div class="gs-actions"><button class="gs-btn primary" data-gs-action="do-import-code">导入方案</button>' +
      '<button class="gs-btn" data-gs-action="close-modal">取消</button></div>'
    );
    setTimeout(function () {
      const ta = document.getElementById("gs-import-text");
      if (ta) ta.focus();
    }, 60);
  }

  function setAttach(slot, id) {
    if (id) state.attachments[slot] = id;
    else delete state.attachments[slot];
    persistBuild();
    closeModal();
    renderWorkspaceKeepScroll(state.gunId);
    toast(id ? "已安装配件" : "已卸下配件");
  }

  function setupDelegation() {
    document.addEventListener("click", function (e) {
      const el = e.target.closest("[data-gs-action]");
      if (!el) return;
      const action = el.getAttribute("data-gs-action");
      if (action === "open") {
        e.preventDefault();
        location.hash = "#/gear/gunsmith/" + encodeURIComponent(el.getAttribute("data-gun-id"));
      } else if (action === "gun-type") {
        state.gunType = el.getAttribute("data-type") || "全部";
        if (state.modal && state.modal.type === "guns") openGunPicker();
        else renderHub();
      } else if (action === "slot") {
        openAttachPicker(el.getAttribute("data-slot"));
      } else if (action === "attach") {
        setAttach(state.modal ? state.modal.slot : "", el.getAttribute("data-att-id"));
      } else if (action === "clear-slot") {
        setAttach(el.getAttribute("data-slot"), "");
      } else if (action === "close-modal") {
        closeModal();
      } else if (action === "reset") {
        state.attachments = {};
        persistBuild();
        renderWorkspaceKeepScroll(state.gunId);
        toast("已清空配件");
      } else if (action === "save") {
        persistBuild();
        renderWorkspaceKeepScroll(state.gunId);
        toast("当前方案已保存在本机");
      } else if (action === "save-record") {
        const nm = window.prompt("方案名称", recordName());
        if (nm === null) return;
        addRecord(nm, "手动存档");
        renderWorkspaceKeepScroll(state.gunId);
        toast("已存入方案记录库");
      } else if (action === "load-record") {
        if (loadRecord(el.getAttribute("data-record-id"))) {
          renderWorkspaceKeepScroll(state.gunId);
          toast("已载入记录");
        }
      } else if (action === "delete-record") {
        if (window.confirm("删除这条方案记录？")) {
          deleteRecord(el.getAttribute("data-record-id"));
          renderWorkspaceKeepScroll(state.gunId);
          toast("已删除记录");
        }
      } else if (action === "share-code") {
        openShareCodeModal();
      } else if (action === "import-code") {
        openImportCodeModal();
      } else if (action === "copy-share-code") {
        const ta = document.getElementById("gs-share-text");
        if (ta) copyTextValue(ta.value);
      } else if (action === "do-import-code") {
        const ta = document.getElementById("gs-import-text");
        const payload = ta ? importBuildCode(ta.value) : null;
        if (!payload) {
          toast("分享码无效或枪械不存在");
          return;
        }
        closeModal();
        location.hash = "#/gear/gunsmith/" + encodeURIComponent(payload.gunId);
        toast("已导入：" + payload.gunName);
      } else if (action === "apply-preset") {
        applyPreset(el.getAttribute("data-preset"));
      } else if (action === "preset") {
        applyPreset("recommended");
      } else if (action === "gun-picker") {
        openGunPicker();
      } else if (action === "switch-gun") {
        const gid = el.getAttribute("data-gun-id");
        const keepY = window.scrollY;
        closeModal();
        location.hash = "#/gear/gunsmith/" + encodeURIComponent(gid);
        requestAnimationFrame(function () { window.scrollTo(0, keepY); });
        setTimeout(function () { window.scrollTo(0, keepY); }, 60);
      }
    });
    document.addEventListener("input", function (e) {
      if (e.target.id === "gs-gun-search") {
        state.gunQuery = e.target.value;
        const v = e.target.value;
        const sel = document.activeElement;
        renderHub();
        const inp = document.getElementById("gs-gun-search");
        if (inp) { inp.focus(); inp.value = v; inp.setSelectionRange(v.length, v.length); }
      } else if (e.target.id === "gs-gun-picker-search") {
        state.gunQuery = e.target.value;
        const v = e.target.value;
        openGunPicker();
        const inp = document.getElementById("gs-gun-picker-search");
        if (inp) { inp.focus(); inp.value = v; inp.setSelectionRange(v.length, v.length); }
      } else if (e.target.id === "gs-att-search") {
        state.attQuery = e.target.value;
        filterAttList(e.target.value);
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });
  }

  function filterAttList(q) {
    q = q.toLowerCase().trim();
    const box = document.getElementById("gs-att-list");
    if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll(".gs-att-row"), function (row) {
      row.hidden = q && row.textContent.toLowerCase().indexOf(q) < 0;
    });
  }

  function renderWorkspaceKeepScroll(gunId) {
    const y = window.scrollY;
    renderWorkspace(gunId);
    requestAnimationFrame(function () { window.scrollTo(0, y); });
  }

  setupDelegation();

  window.WZ_GUNSMITH_UI = {
    renderHub: renderHub,
    renderWorkspace: function (id) {
      state.gunId = id;
      state.attachments = buildFor(id);
      renderWorkspace(id);
    },
    renderWorkspaceKeepScroll: renderWorkspaceKeepScroll,
    calc: calc,
    encodeBuildCode: encodeBuildCode,
    decodeBuildCode: decodeBuildCode,
    describeBuild: describeBuild,
    importBuildCode: importBuildCode,
    recommendedAttachments: function (gunId, presetId) {
      const gs = gunData(gunId);
      if (!gs) return {};
      const pid = presetId === "recommended" || !presetId ? defaultPresetFor(gs) : presetId;
      return pickPreset(gs, pid);
    },
  };
})();
