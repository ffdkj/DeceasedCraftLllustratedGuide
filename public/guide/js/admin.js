/* 管理员就地换图（guide 外壳版）。
   登录后（cookie wz_admin）站内每张可替换的图片右上角会出现「换图」按钮：
   选图 → 服务端转 WebP → 预览对比 + 比例警告 → 确认替换 → 当前页面立刻换成新图，并有版本历史可回退。
   按钮放在一个 position:fixed 的浮层里，不改页面布局，避免把现有 CSS 顶歪。

   与根站实现的两点差别（因为站点换成 guide 了）：
   1. 数据根是 guide 的 WZ_* 全局（WZ_GUIDES / WZ_GUNSMITH / WZ_SEED …），不是 WZ_SEED 单根；
   2. guide 的图片路径里有中文（monster 缩略图），所以逻辑路径比对前先解码，
      否则浏览器给的 %E7%88%AC… 形式永远匹配不上服务端按磁盘名建的键。 */
(function () {
  "use strict";

  /* ---------------- 版本串：换图后必须换 URL ---------------- */
  var HASHED = /\.[0-9a-f]{8}(\.[a-z0-9]+)$/i;
  /* 这些全局不是图鉴数据（函数集合 / 映射表 / UI 对象），改写会破坏它们。 */
  var SKIP = {
    WZ_IMAGE_VERSIONS: 1,
    WZ_IMAGE_VERSION_COUNT: 1,
    WZ_APP_UI: 1,
    WZ_GUNSMITH_UI: 1,
    WZ_LAZY: 1,
    WZ_AMMO_ICONS: 1,
    WZ_ADMIN: 1,
    WZ_ADMIN_UI: 1,
    WZMusic: 1
  };

  function versionMap() {
    var map = window.WZ_IMAGE_VERSIONS;
    return map && typeof map === "object" ? map : {};
  }

  function decodePath(p) {
    try {
      return decodeURIComponent(p);
    } catch (e) {
      return p;
    }
  }

  /* 任意图片地址 → 逻辑路径（去 query、去 8 位指纹哈希、/media/images → /images、解码中文）。 */
  function logicalImagePath(url) {
    if (!url || typeof url !== "string") return null;
    if (url.indexOf("data:") === 0 || url.indexOf("blob:") === 0) return null;
    var p = url.split("?")[0].split("#")[0];
    if (p.indexOf("./") === 0) p = "/" + p.slice(2);
    if (p.indexOf("/media/images/") === 0) p = p.slice("/media".length);
    if (p.indexOf("/images/") !== 0) return null;
    return decodePath(p).replace(HASHED, "$1");
  }

  /* 逻辑路径 + 版本号 → 可以直接放进 src / url() 的地址。 */
  function withVersion(url, version) {
    var base = url.split("?")[0].split("#")[0];
    return version ? base + "?v=" + version : base;
  }

  /* 注意：guide 的 WZ_DATA 是有环的（建筑索引互相引用），必须记住走过的对象，否则会栈溢出。 */
  function rewrite(node, logical, version, seen) {
    if (!node || typeof node !== "object") return 0;
    if (!seen) seen = new WeakSet();
    if (seen.has(node)) return 0;
    seen.add(node);
    var changed = 0;
    if (Object.prototype.toString.call(node) === "[object Array]") {
      for (var i = 0; i < node.length; i += 1) {
        var item = node[i];
        if (typeof item === "string") {
          if (logicalImagePath(item) === logical) {
            node[i] = withVersion(item, version);
            changed += 1;
          }
        } else {
          changed += rewrite(item, logical, version, seen);
        }
      }
      return changed;
    }
    var keys = Object.keys(node);
    for (var k = 0; k < keys.length; k += 1) {
      var value = node[keys[k]];
      if (typeof value === "string") {
        if (logicalImagePath(value) === logical) {
          node[keys[k]] = withVersion(value, version);
          changed += 1;
        }
      } else if (value && typeof value === "object") {
        changed += rewrite(value, logical, version, seen);
      }
    }
    return changed;
  }

  function dataRoots() {
    var roots = [];
    var keys = Object.keys(window);
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (key.indexOf("WZ_") !== 0 || SKIP[key]) continue;
      var value = window[key];
      if (value && typeof value === "object") roots.push(value);
    }
    return roots;
  }

  function urlOf(el) {
    if (el.tagName === "IMG") return el.getAttribute("src");
    var style = el.getAttribute("style") || "";
    var hit = /url\((['"]?)([^'")]+)\1\)/.exec(style);
    return hit ? hit[2] : null;
  }

  function patchDom(logical, version) {
    var changed = 0;
    var imgs = document.querySelectorAll("img[src]");
    for (var i = 0; i < imgs.length; i += 1) {
      var url = imgs[i].getAttribute("src");
      if (!url || logicalImagePath(url) !== logical) continue;
      imgs[i].setAttribute("src", withVersion(url, version));
      changed += 1;
    }
    var styled = document.querySelectorAll("[style]");
    for (var j = 0; j < styled.length; j += 1) {
      var style = styled[j].getAttribute("style");
      if (!style || style.indexOf("url(") < 0) continue;
      var next = style.replace(/url\((['"]?)([^'")]+)\1\)/g, function (whole, quote, raw) {
        if (logicalImagePath(raw) !== logical) return whole;
        return "url(" + quote + withVersion(raw, version) + quote + ")";
      });
      if (next !== style) {
        styled[j].setAttribute("style", next);
        changed += 1;
      }
    }
    return changed;
  }

  /* 覆盖表变更后调用：内存表、数据对象、已渲染 DOM 一起更新（不用刷新页面）。 */
  function setImageVersion(logical, version) {
    var map = versionMap();
    if (version) map[logical] = version;
    else delete map[logical];
    var roots = dataRoots();
    var changed = 0;
    for (var i = 0; i < roots.length; i += 1) changed += rewrite(roots[i], logical, version);
    return changed + patchDom(logical, version);
  }

  /* 首屏渲染前跑一次：把服务端下发的版本串写进所有图片地址。 */
  function installImageVersions() {
    var map = versionMap();
    var logicals = Object.keys(map);
    if (!logicals.length) return 0;
    var roots = dataRoots();
    var changed = 0;
    for (var i = 0; i < logicals.length; i += 1) {
      for (var j = 0; j < roots.length; j += 1) changed += rewrite(roots[j], logicals[i], map[logicals[i]]);
    }
    window.WZ_IMAGE_VERSION_COUNT = changed;
    return changed;
  }

  /* ---------------- 浮层与按钮 ---------------- */
  function app() {
    return window.WZ_APP_UI || {};
  }
  function esc(s) {
    if (app().esc) return app().esc(s);
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function toast(msg) {
    if (app().toast) app().toast(msg);
  }

  var adminName = null;
  var layer = null;
  var entries = [];
  var rafId = 0;
  var scanTimer = 0;
  var writing = false;
  var watching = false;

  function ensureLayer() {
    if (!layer) {
      layer = document.createElement("div");
      layer.id = "img-edit-layer";
      document.body.appendChild(layer);
    }
    return layer;
  }

  function layout() {
    for (var i = 0; i < entries.length; i += 1) {
      var entry = entries[i];
      var rect = entry.el.getBoundingClientRect();
      var visible =
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight &&
        rect.right > 0 &&
        rect.left < window.innerWidth;
      if (!visible) {
        entry.btn.style.display = "none";
        continue;
      }
      entry.btn.style.display = "";
      entry.btn.style.transform =
        "translate3d(" + Math.round(rect.right - 26) + "px," + Math.round(rect.top + 2) + "px,0)";
    }
  }

  function scheduleLayout() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(function () {
      rafId = 0;
      layout();
    });
  }

  function scan() {
    if (!adminName) return;
    var root = ensureLayer();
    writing = true;
    root.textContent = "";
    entries = [];
    var nodes = [];
    var imgs = document.querySelectorAll("img[src]");
    for (var i = 0; i < imgs.length; i += 1) nodes.push(imgs[i]);
    var styled = document.querySelectorAll('[style*="url("]');
    for (var j = 0; j < styled.length; j += 1) nodes.push(styled[j]);
    for (var k = 0; k < nodes.length; k += 1) {
      var el = nodes[k];
      if (el.closest("#img-edit-layer, #overlay, .toast, .sheet")) continue;
      var logical = logicalImagePath(urlOf(el));
      if (!logical) continue;
      var rect = el.getBoundingClientRect();
      if (rect.width < 24 || rect.height < 24) continue;
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "img-edit-btn";
      btn.title = "替换这张图（仅管理员可见）";
      btn.setAttribute("aria-label", "替换这张图");
      btn.textContent = "换图";
      btn.addEventListener(
        "click",
        (function (path, target) {
          return function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            openReplace(path, target);
          };
        })(logical, el)
      );
      root.appendChild(btn);
      entries.push({ el: el, btn: btn, logical: logical });
    }
    writing = false;
    layout();
  }

  function scheduleScan() {
    if (scanTimer) window.clearTimeout(scanTimer);
    scanTimer = window.setTimeout(function () {
      scanTimer = 0;
      scan();
    }, 180);
  }

  function watch() {
    if (watching || !adminName) return;
    watching = true;
    var observer = new MutationObserver(function (list) {
      if (writing) return;
      var structural = false;
      for (var i = 0; i < list.length; i += 1) {
        var target = list[i].target;
        if (target && target.closest && target.closest("#img-edit-layer")) continue;
        if (list[i].type === "childList" || list[i].attributeName === "src") {
          structural = true;
          break;
        }
      }
      if (structural) scheduleScan();
      else scheduleLayout();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "style", "class"]
    });
    window.addEventListener("scroll", scheduleLayout, { passive: true, capture: true });
    window.addEventListener("resize", scheduleLayout, { passive: true });
  }

  function enable(name) {
    adminName = name;
    window.WZ_ADMIN = name;
    ensureLayer();
    watch();
    scan();
  }

  function disable() {
    adminName = null;
    window.WZ_ADMIN = null;
    entries = [];
    if (layer) {
      layer.parentNode.removeChild(layer);
      layer = null;
    }
  }

  function refresh() {
    return fetch("/api/me", { cache: "no-store" })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (data && data.admin) enable(String(data.admin));
        else disable();
        return adminName;
      })
      .catch(function () {
        disable();
        return null;
      });
  }

  /* ---------------- 换图 ---------------- */
  function humanBytes(n) {
    if (!n) return "0 B";
    if (n < 1024) return n + " B";
    return (n / 1024).toFixed(n < 10240 ? 1 : 0) + " KB";
  }

  function openReplace(logical, el) {
    var sheet = app();
    if (!sheet.openSheet) {
      toast("页面还没准备好，请稍后再试");
      return;
    }
    var version = versionMap()[logical] || "";
    var currentUrl = withVersion(el ? urlOf(el) || logical : logical, version);

    sheet.openSheet({
      title: "替换图片",
      body:
        '<div class="admin-replace" data-path="' + esc(logical) + '">' +
        '<div class="admin-path mono">' + esc(logical) + "</div>" +
        '<div class="admin-preview">' +
        '<figure><img src="' + esc(currentUrl) + '" alt="当前图片" loading="lazy"><figcaption>当前</figcaption></figure>' +
        '<figure><img id="admin-new-img" alt="替换后的图片" hidden><figcaption>替换后</figcaption></figure>' +
        "</div>" +
        '<div class="field" style="margin-top:14px"><label>选择新图</label>' +
        '<input id="admin-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif"></div>' +
        '<div id="admin-meta" class="admin-meta">JPG / PNG / WebP / AVIF，单张 ≤ 10MB。' +
        "会转成 WebP（长边 ≤ 2048，质量 90）后存入对象存储。</div>" +
        '<div class="admin-actions">' +
        '<button class="btn primary" id="admin-commit" disabled>确认替换</button>' +
        '<button class="btn ghost" id="admin-revert" disabled>回退上一版</button>' +
        '<button class="btn ghost" id="admin-original" disabled>恢复原图</button>' +
        "</div>" +
        '<div id="admin-history" class="admin-history"></div>' +
        "</div>",
      foot: '<button class="btn ghost block" data-action="close-sheet">关闭</button>'
    });

    var fileInput = document.getElementById("admin-file");
    var newImg = document.getElementById("admin-new-img");
    var meta = document.getElementById("admin-meta");
    var commit = document.getElementById("admin-commit");
    var revert = document.getElementById("admin-revert");
    var original = document.getElementById("admin-original");
    var historyBox = document.getElementById("admin-history");
    var pending = null;

    function setMeta(html, tone) {
      if (!meta) return;
      meta.innerHTML = html;
      meta.className = "admin-meta" + (tone ? " " + tone : "");
    }

    function apply(nextVersion, message) {
      setImageVersion(logical, nextVersion);
      if (app().closeSheet) app().closeSheet(true);
      toast(message);
    }

    function postJson(url, payload, okMessage) {
      return fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (out) {
          if (!out.ok) {
            setMeta(esc(out.data.error || "操作失败"), "error");
            return;
          }
          apply(String(out.data.v || ""), okMessage);
        })
        .catch(function () {
          setMeta("网络错误，请稍后再试", "error");
        });
    }

    function loadHistory() {
      fetch("/api/admin/image/history?path=" + encodeURIComponent(logical))
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          var versions = (data && data.versions) || [];
          var hasOlder = false;
          var hasCurrent = false;
          for (var i = 0; i < versions.length; i += 1) {
            if (versions[i].current) hasCurrent = true;
            else hasOlder = true;
          }
          if (revert) revert.disabled = !hasOlder;
          if (original) original.disabled = !hasCurrent;
          if (!historyBox) return;
          if (!versions.length) {
            historyBox.innerHTML = '<div class="dim">这张图还没被替换过。</div>';
            return;
          }
          var rows = versions.map(function (v) {
            return (
              '<div class="admin-history-row">' +
              '<span class="mono">' + esc(v.v || "原图") + "</span>" +
              "<span>" + v.width + "×" + v.height + " · " + humanBytes(v.bytes) + "</span>" +
              "<span>" + esc(new Date(v.created_at).toLocaleString()) + "</span>" +
              (v.current ? "<b>当前</b>" : "") +
              "</div>"
            );
          });
          historyBox.innerHTML = '<div class="admin-history-title">最近 ' + versions.length + " 个版本</div>" + rows.join("");
        })
        .catch(function () {
          if (historyBox) historyBox.textContent = "读取历史失败";
        });
    }

    if (fileInput) {
      fileInput.addEventListener("change", function () {
        var file = fileInput.files && fileInput.files[0];
        if (!file) return;
        setMeta("正在转换…");
        if (commit) commit.disabled = true;
        var form = new FormData();
        form.append("file", file);
        form.append("path", logical);
        fetch("/api/admin/image/preview", { method: "POST", body: form })
          .then(function (res) {
            return res.json().catch(function () { return {}; }).then(function (data) {
              return { ok: res.ok, data: data };
            });
          })
          .then(function (out) {
            if (!out.ok) {
              setMeta(esc(out.data.error || "转换失败"), "error");
              return;
            }
            pending = out.data;
            if (newImg) {
              newImg.src = pending.dataUrl;
              newImg.hidden = false;
            }
            var ratio = Math.round((pending.aspectDelta || 0) * 100);
            var warn = ratio > 10;
            setMeta(
              "新图 " + pending.width + "×" + pending.height + " · " + humanBytes(pending.bytes) +
                (ratio > 0 ? " · 与原图比例差 " + ratio + "%" : "") +
                (warn ? "<br><b>比例变化较大，可能被拉伸变形</b>" : ""),
              warn ? "warn" : undefined
            );
            if (commit) commit.disabled = false;
          })
          .catch(function () {
            setMeta("网络错误，转换失败", "error");
          });
      });
    }

    if (commit) {
      commit.addEventListener("click", function () {
        if (!pending) return;
        commit.disabled = true;
        commit.textContent = "提交中…";
        postJson("/api/admin/image/commit", { path: logical, token: pending.token }, "已替换，全站立即生效")
          .then(function () {
            commit.disabled = false;
            commit.textContent = "确认替换";
          });
      });
    }
    if (revert) {
      revert.addEventListener("click", function () {
        postJson("/api/admin/image/revert", { path: logical }, "已回退上一版");
      });
    }
    if (original) {
      original.addEventListener("click", function () {
        postJson("/api/admin/image/original", { path: logical }, "已恢复原图");
      });
    }

    loadHistory();
  }

  /* ---------------- 启动 ---------------- */
  installImageVersions();

  window.WZ_ADMIN_UI = {
    openReplace: openReplace,
    refresh: refresh,
    isAdmin: function () {
      return adminName !== null;
    },
    name: function () {
      return adminName;
    }
  };

  if (typeof fetch === "function") {
    refresh().catch(function () {
      /* 纯静态部署没有 /api/me：忽略 */
    });
  }
})();
