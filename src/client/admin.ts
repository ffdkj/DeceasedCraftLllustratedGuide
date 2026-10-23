/* 管理员就地换图。
   登录后（cookie wz_admin）站内每张可替换的图片右上角会出现「替换」按钮：
   选图 → 服务端转 WebP → 预览对比 + 比例警告 → 确认替换 → 当前页面立刻换成新图。
   按钮放在一个 position:fixed 的浮层里，不改页面布局，避免把现有 CSS 顶歪。 */
import { logicalImagePath, setImageVersion, versionMap, withVersion } from './image-versions';

type AppUI = {
  esc?: (s: unknown) => string;
  icon?: (name: string, size?: number) => string;
  toast?: (msg: string) => void;
  openSheet?: (opts: { title: string; body: string; foot?: string }) => void;
  closeSheet?: (silent?: boolean) => void;
  route?: () => void;
};

const app = (): AppUI => ((window as unknown as { WZ_APP_UI?: AppUI }).WZ_APP_UI ?? {}) as AppUI;
const esc = (s: unknown): string => (app().esc ? app().esc!(s) : String(s == null ? '' : s));
const icon = (name: string, size?: number): string => (app().icon ? app().icon!(name, size) : '');
const toast = (msg: string): void => {
  if (app().toast) app().toast!(msg);
};

interface Entry {
  el: HTMLElement;
  btn: HTMLButtonElement;
  logical: string;
}

let adminName: string | null = null;
let layer: HTMLDivElement | null = null;
let entries: Entry[] = [];
let rafId = 0;
let scanTimer = 0;
let writing = false;
let watching = false;

function urlOf(el: HTMLElement): string | null {
  if (el.tagName === 'IMG') return el.getAttribute('src');
  const style = el.getAttribute('style') || '';
  const hit = /url\((['"]?)([^'")]+)\1\)/.exec(style);
  return hit ? hit[2] : null;
}

function ensureLayer(): HTMLDivElement {
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'img-edit-layer';
    document.body.appendChild(layer);
  }
  return layer;
}

function layout(): void {
  for (const entry of entries) {
    const rect = entry.el.getBoundingClientRect();
    const visible =
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.top < window.innerHeight &&
      rect.right > 0 &&
      rect.left < window.innerWidth;
    if (!visible) {
      entry.btn.style.display = 'none';
      continue;
    }
    entry.btn.style.display = '';
    entry.btn.style.transform =
      'translate3d(' + Math.round(rect.right - 26) + 'px,' + Math.round(rect.top + 2) + 'px,0)';
  }
}

function scheduleLayout(): void {
  if (rafId) return;
  rafId = window.requestAnimationFrame(function () {
    rafId = 0;
    layout();
  });
}

function scan(): void {
  if (!adminName) return;
  const root = ensureLayer();
  writing = true;
  root.textContent = '';
  entries = [];
  const nodes: HTMLElement[] = [];
  document.querySelectorAll<HTMLElement>('img[src]').forEach((n) => nodes.push(n));
  document.querySelectorAll<HTMLElement>('[style*="url("]').forEach((n) => nodes.push(n));
  for (const el of nodes) {
    if (el.closest('#img-edit-layer, #overlay, .toast, .sheet')) continue;
    const logical = logicalImagePath(urlOf(el));
    if (!logical) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width < 24 || rect.height < 24) continue;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'img-edit-btn';
    btn.title = '替换这张图（仅管理员可见）';
    btn.setAttribute('aria-label', '替换这张图');
    btn.textContent = '换图';
    btn.addEventListener('click', function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      openReplace(logical, el);
    });
    root.appendChild(btn);
    entries.push({ el: el, btn: btn, logical: logical });
  }
  writing = false;
  layout();
}

function scheduleScan(): void {
  if (scanTimer) window.clearTimeout(scanTimer);
  scanTimer = window.setTimeout(function () {
    scanTimer = 0;
    scan();
  }, 180);
}

function watch(): void {
  if (watching || !adminName) return;
  watching = true;
  const observer = new MutationObserver(function (list) {
    if (writing) return;
    let structural = false;
    for (const mutation of list) {
      const target = mutation.target as HTMLElement | null;
      if (target && target.closest && target.closest('#img-edit-layer')) continue;
      if (mutation.type === 'childList' || mutation.attributeName === 'src') {
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
    attributeFilter: ['src', 'style', 'class']
  });
  window.addEventListener('scroll', scheduleLayout, { passive: true, capture: true });
  window.addEventListener('resize', scheduleLayout, { passive: true });
}

function enable(name: string): void {
  adminName = name;
  window.WZ_ADMIN = name;
  ensureLayer();
  watch();
  scan();
}

function disable(): void {
  adminName = null;
  window.WZ_ADMIN = null;
  entries = [];
  if (layer) {
    layer.remove();
    layer = null;
  }
  if (location.hash.indexOf('#/settings') === 0 && app().route) app().route!();
}

/* ---------------- 登录 ---------------- */

function loginError(message: string): void {
  const box = document.getElementById('admin-err');
  if (!box) {
    toast(message);
    return;
  }
  box.textContent = message;
  box.hidden = false;
}

function openLogin(): void {
  if (!app().openSheet) return;
  app().openSheet!({
    title: '管理员登录',
    body:
      '<div class="admin-login">' +
      '<div class="field"><label>账号</label><input id="admin-user" autocomplete="username" maxlength="80" placeholder="管理员账号"></div>' +
      '<div class="field"><label>密码</label><input id="admin-pass" type="password" autocomplete="current-password" maxlength="200" placeholder="密码"></div>' +
      '<div id="admin-err" class="admin-err" hidden></div>' +
      '<div class="tiny dim">仅站长可用。登录后站内每张可替换的图片右上角会出现「换图」按钮。</div>' +
      '</div>',
    foot: '<button class="btn primary block" id="admin-login-btn">登录</button>'
  });

  const user = document.getElementById('admin-user') as HTMLInputElement | null;
  const pass = document.getElementById('admin-pass') as HTMLInputElement | null;
  const button = document.getElementById('admin-login-btn') as HTMLButtonElement | null;
  if (user) user.focus();

  function submit(): void {
    const name = (user?.value ?? '').trim();
    const secret = pass?.value ?? '';
    if (!name || !secret) {
      loginError('请填写账号和密码');
      return;
    }
    if (!button) return;
    button.disabled = true;
    button.textContent = '登录中…';
    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: name, password: secret })
    })
      .then(function (res) {
        return res.json().catch(function () {
          return {};
        }).then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (out) {
        if (!out.ok) {
          button.disabled = false;
          button.textContent = '登录';
          loginError(String(out.data.error || '登录失败'));
          return;
        }
        if (app().closeSheet) app().closeSheet!(true);
        enable((out.data.admin && out.data.admin.name) || name);
        toast('已登录管理员，可以开始换图');
        if (location.hash.indexOf('#/settings') === 0 && app().route) app().route!();
      })
      .catch(function () {
        button.disabled = false;
        button.textContent = '登录';
        loginError('网络错误，请稍后再试');
      });
  }

  if (button) button.addEventListener('click', submit);
  if (pass)
    pass.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') submit();
    });
  if (user)
    user.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter') pass?.focus();
    });
}

function logout(): void {
  fetch('/api/admin/logout', { method: 'POST' })
    .then(function () {
      disable();
      toast('已退出管理员');
    })
    .catch(function () {
      toast('退出失败');
    });
}

/* ---------------- 换图 ---------------- */

interface PreviewResult {
  token: string;
  width: number;
  height: number;
  bytes: number;
  aspectDelta: number;
  dataUrl: string;
}

interface HistoryVersion {
  id: number;
  v: string;
  width: number;
  height: number;
  bytes: number;
  created_at: number;
  current: boolean;
}

function humanBytes(n: number): string {
  if (!n) return '0 B';
  if (n < 1024) return n + ' B';
  return (n / 1024).toFixed(n < 10240 ? 1 : 0) + ' KB';
}

function openReplace(logical: string, el?: HTMLElement): void {
  if (!app().openSheet) return;
  const version = versionMap()[logical] || '';
  const currentUrl = withVersion(el ? urlOf(el) || logical : logical, version);

  app().openSheet!({
    title: '替换图片',
    body:
      '<div class="admin-replace" data-path="' + esc(logical) + '">' +
      '<div class="admin-path mono">' + esc(logical) + '</div>' +
      '<div class="admin-preview">' +
      '<figure><img src="' + esc(currentUrl) + '" alt="当前图片" loading="lazy"><figcaption>当前</figcaption></figure>' +
      '<figure><img id="admin-new-img" alt="替换后的图片" hidden><figcaption>替换后</figcaption></figure>' +
      '</div>' +
      '<div class="field" style="margin-top:14px"><label>选择新图</label>' +
      '<input id="admin-file" type="file" accept="image/jpeg,image/png,image/webp,image/avif"></div>' +
      '<div id="admin-meta" class="admin-meta">JPG / PNG / WebP / AVIF，单张 ≤ 10MB。' +
      '会转成 WebP（长边 ≤ 2048，质量 90）后存入对象存储。</div>' +
      '<div class="admin-actions">' +
      '<button class="btn primary" id="admin-commit" disabled>确认替换</button>' +
      '<button class="btn ghost" id="admin-revert" disabled>回退上一版</button>' +
      '<button class="btn ghost" id="admin-original" disabled>恢复原图</button>' +
      '</div>' +
      '<div id="admin-history" class="admin-history"></div>' +
      '</div>',
    foot: '<button class="btn ghost block" data-action="close-sheet">关闭</button>'
  });

  const fileInput = document.getElementById('admin-file') as HTMLInputElement | null;
  const newImg = document.getElementById('admin-new-img') as HTMLImageElement | null;
  const meta = document.getElementById('admin-meta');
  const commit = document.getElementById('admin-commit') as HTMLButtonElement | null;
  const revert = document.getElementById('admin-revert') as HTMLButtonElement | null;
  const original = document.getElementById('admin-original') as HTMLButtonElement | null;
  const historyBox = document.getElementById('admin-history');
  let pending: PreviewResult | null = null;

  function setMeta(html: string, tone?: 'warn' | 'error'): void {
    if (!meta) return;
    meta.innerHTML = html;
    meta.className = 'admin-meta' + (tone ? ' ' + tone : '');
  }

  function apply(version2: string, message: string): void {
    setImageVersion(logical, version2);
    if (app().closeSheet) app().closeSheet!(true);
    toast(message);
  }

  function loadHistory(): void {
    fetch('/api/admin/image/history?path=' + encodeURIComponent(logical))
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        const versions: HistoryVersion[] = (data && data.versions) || [];
        if (revert) revert.disabled = !versions.some((v) => !v.current);
        if (original) original.disabled = !versions.some((v) => v.current);
        if (!historyBox) return;
        historyBox.innerHTML = versions.length
          ? '<div class="admin-history-title">最近 ' + versions.length + ' 个版本</div>' +
            versions
              .map(function (v) {
                const tag = v.current ? '<b>当前</b>' : '';
                return (
                  '<div class="admin-history-row">' +
                  '<span class="mono">' + esc(v.v) + '</span>' +
                  '<span>' + v.width + '×' + v.height + ' · ' + humanBytes(v.bytes) + '</span>' +
                  '<span>' + esc(new Date(v.created_at).toLocaleString()) + '</span>' +
                  tag +
                  '</div>'
                );
              })
              .join('')
          : '<div class="dim">这张图还没被替换过。</div>';
      })
      .catch(function () {
        if (historyBox) historyBox.textContent = '读取历史失败';
      });
  }

  if (fileInput)
    fileInput.addEventListener('change', function () {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      setMeta('正在转换…');
      if (commit) commit.disabled = true;
      const form = new FormData();
      form.append('file', file);
      form.append('path', logical);
      fetch('/api/admin/image/preview', { method: 'POST', body: form })
        .then(function (res) {
          return res.json().catch(function () {
            return {};
          }).then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (out) {
          if (!out.ok) {
            setMeta(esc(out.data.error || '转换失败'), 'error');
            return;
          }
          pending = out.data as PreviewResult;
          if (newImg) {
            newImg.src = pending.dataUrl;
            newImg.hidden = false;
          }
          const ratio = Math.round((pending.aspectDelta || 0) * 100);
          const warn = ratio > 10;
          setMeta(
            '新图 ' + pending.width + '×' + pending.height + ' · ' + humanBytes(pending.bytes) +
              (ratio > 0 ? ' · 与原图比例差 ' + ratio + '%' : '') +
              (warn ? '<br><b>比例变化较大，可能被拉伸变形</b>' : ''),
            warn ? 'warn' : undefined
          );
          if (commit) commit.disabled = false;
        })
        .catch(function () {
          setMeta('网络错误，转换失败', 'error');
        });
    });

  if (commit)
    commit.addEventListener('click', function () {
      if (!pending) return;
      commit.disabled = true;
      commit.textContent = '提交中…';
      fetch('/api/admin/image/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: logical, token: pending.token })
      })
        .then(function (res) {
          return res.json().catch(function () {
            return {};
          }).then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (out) {
          commit.disabled = false;
          commit.textContent = '确认替换';
          if (!out.ok) {
            setMeta(esc(out.data.error || '替换失败'), 'error');
            return;
          }
          apply(String(out.data.v || ''), '已替换，全站立即生效');
        })
        .catch(function () {
          commit.disabled = false;
          commit.textContent = '确认替换';
          setMeta('网络错误，替换失败', 'error');
        });
    });

  if (revert)
    revert.addEventListener('click', function () {
      fetch('/api/admin/image/revert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: logical })
      })
        .then(function (res) {
          return res.json().catch(function () {
            return {};
          }).then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (out) {
          if (!out.ok) {
            setMeta(esc(out.data.error || '回退失败'), 'error');
            return;
          }
          apply(String(out.data.v || ''), '已回退上一版');
        })
        .catch(function () {
          setMeta('网络错误，回退失败', 'error');
        });
    });

  if (original)
    original.addEventListener('click', function () {
      fetch('/api/admin/image/original', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: logical })
      })
        .then(function (res) {
          return res.json().catch(function () {
            return {};
          }).then(function (data) {
            return { ok: res.ok, data: data };
          });
        })
        .then(function (out) {
          if (!out.ok) {
            setMeta(esc(out.data.error || '恢复失败'), 'error');
            return;
          }
          apply('', '已恢复原图');
        })
        .catch(function () {
          setMeta('网络错误，恢复失败', 'error');
        });
    });

  loadHistory();
}

/* ---------------- 启动 ---------------- */

window.WZ_ADMIN_UI = {
  openLogin: openLogin,
  logout: logout,
  openReplace: openReplace,
  isAdmin: function () {
    return adminName !== null;
  },
  name: function () {
    return adminName;
  }
};

fetch('/api/me', { cache: 'no-store' })
  .then(function (res) {
    return res.json();
  })
  .then(function (data) {
    if (data && data.admin) enable(String(data.admin));
  })
  .catch(function () {
    // 离线单文件 / 纯静态部署没有这个端点：忽略
  });

export { openLogin, openReplace };
