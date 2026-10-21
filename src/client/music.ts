/* ============ 亡者世界 · 原声播放器（TypeScript） ============ */

interface Track {
  id: string;
  title: string;
  src: string;
}

interface SavedState {
  index?: number;
  volume?: number;
  muted?: boolean;
}

const KEY = "wz_music_v1";
const TRACKS: Track[] = [
  { id: "search", title: "搜寻", src: "/media/audio/search.m4a" },
  { id: "hope", title: "一线生机", src: "/media/audio/hope.m4a" },
  { id: "forgotten", title: "遗忘", src: "/media/audio/forgotten.m4a" },
  { id: "silhouettes", title: "曾经的身影", src: "/media/audio/silhouettes.m4a" },
  { id: "transformation", title: "我们的蜕变", src: "/media/audio/transformation.m4a" },
  { id: "we", title: "曾经的我们", src: "/media/audio/we.m4a" },
  { id: "broken", title: "残破", src: "/media/audio/broken.m4a" }
];
const ARTIST = "TqLxQuanZ";
const SOURCE_URL = "https://space.bilibili.com/373594976";

const ICONS: Record<string, string> = {
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  play: '<path d="M8 5v14l11-7-11-7z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7 5h4v14H7zM14 5h4v14h-4z" fill="currentColor" stroke="none"/>',
  prev: '<path d="M18 5v14L8 12l10-7z" fill="currentColor" stroke="none"/><path d="M5 5v14"/>',
  next: '<path d="M6 5v14l10-7L6 5z" fill="currentColor" stroke="none"/><path d="M19 5v14"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1.5" fill="currentColor" stroke="none"/>',
  close: '<path d="M18 6L6 18M6 6l12 12"/>',
  volume: '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13"/>',
  mute: '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6"/>',
  note: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'
};

function svg(name: string, size?: number): string {
  const s = size || 20;
  return '<svg width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
}

function esc(v: unknown): string {
  return String(v == null ? "" : v).replace(/[&<>"']/g, (c) => {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string;
  });
}

function fmtTime(sec: number): string {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ":" + (s < 10 ? "0" : "") + s;
}

function must<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
}

function initMusic(): void {
  let saved: SavedState = {};
  try {
    saved = JSON.parse(localStorage.getItem(KEY) || "{}") as SavedState;
  } catch {
    saved = {};
  }
  let index = Number.isInteger(saved.index) && saved.index! >= 0 && saved.index! < TRACKS.length ? saved.index! : 0;
  let volume = typeof saved.volume === "number" && saved.volume >= 0 && saved.volume <= 1 ? saved.volume : 0.55;
  let muted = !!saved.muted;
  let open = false;
  let seeking = false;
  let lastVolume = volume || 0.55;

  const audio = new Audio();
  audio.preload = "none";
  audio.volume = volume;
  audio.muted = muted;

  const host = document.createElement("div");
  host.className = "music-host";
  host.innerHTML =
    '<button class="music-fab" id="musicFab" type="button" aria-label="打开原声播放器" aria-expanded="false" aria-controls="musicPanel">' +
      '<span class="music-fab-disc">' + svg("music", 16) + '</span>' +
      '<span class="music-bars" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' +
    '</button>' +
    '<div class="music-backdrop" id="musicBackdrop" hidden></div>' +
    '<section class="music-panel" id="musicPanel" aria-label="亡者世界原声播放器" hidden>' +
      '<div class="music-head">' +
        '<div class="music-head-main"><div class="music-kicker">DECEASEDCRAFT · OST</div><div class="music-head-title">末世原声</div></div>' +
        '<button class="music-icon-btn" type="button" data-music="close" aria-label="收起播放器">' + svg("close", 18) + '</button>' +
      '</div>' +
      '<div class="music-now">' +
        '<div class="music-cover" aria-hidden="true">' + svg("note", 26) + '</div>' +
        '<div class="music-now-main"><div class="music-now-title" id="musicNowTitle">搜寻</div><div class="music-now-sub" id="musicNowSub">' + ARTIST + ' · 官方配乐</div></div>' +
        '<button class="music-icon-btn music-stop" type="button" data-music="stop" aria-label="停止播放" title="停止播放">' + svg("stop", 17) + '</button>' +
      '</div>' +
      '<div class="music-progress"><input class="music-range" id="musicSeek" type="range" min="0" max="1000" value="0" step="1" aria-label="播放进度"><div class="music-times"><span id="musicTimeNow">0:00</span><span id="musicTimeAll">0:00</span></div></div>' +
      '<div class="music-controls">' +
        '<button class="music-icon-btn" type="button" data-music="prev" aria-label="上一首">' + svg("prev", 22) + '</button>' +
        '<button class="music-play" id="musicPlay" type="button" data-music="toggle" aria-label="播放">' + svg("play", 26) + '</button>' +
        '<button class="music-icon-btn" type="button" data-music="next" aria-label="下一首">' + svg("next", 22) + '</button>' +
      '</div>' +
      '<div class="music-volume"><button class="music-icon-btn" type="button" data-music="mute" id="musicMute" aria-label="静音">' + svg("volume", 18) + '</button><input class="music-range" id="musicVolume" type="range" min="0" max="100" step="1" aria-label="音量"><span class="music-status" id="musicStatus">点击播放</span></div>' +
      '<div class="music-list" id="musicList" role="list"></div>' +
      '<div class="music-src">音乐：' + ARTIST + '（B站 UID 373594976）· 2026-05-30 发布。版权归原作者，仅限非商业攻略试听。<a href="' + SOURCE_URL + '" target="_blank" rel="noopener noreferrer">作者主页</a></div>' +
    '</section>';
  document.body.appendChild(host);

  const fab = must<HTMLButtonElement>("musicFab");
  const panel = must<HTMLElement>("musicPanel");
  const backdrop = must<HTMLDivElement>("musicBackdrop");
  const nowTitle = must<HTMLElement>("musicNowTitle");
  const nowSub = must<HTMLElement>("musicNowSub");
  const playBtn = must<HTMLButtonElement>("musicPlay");
  const seek = must<HTMLInputElement>("musicSeek");
  const volumeInput = must<HTMLInputElement>("musicVolume");
  const muteBtn = must<HTMLButtonElement>("musicMute");
  const timeNow = must<HTMLElement>("musicTimeNow");
  const timeAll = must<HTMLElement>("musicTimeAll");
  const status = must<HTMLElement>("musicStatus");
  const list = must<HTMLElement>("musicList");

  function save(): void {
    try {
      localStorage.setItem(KEY, JSON.stringify({ index, volume, muted }));
    } catch {
      /* ignore quota errors */
    }
  }

  function updatePlayingUI(): void {
    const playing = !audio.paused && !audio.ended;
    playBtn.innerHTML = svg(playing ? "pause" : "play", 26);
    playBtn.setAttribute("aria-label", playing ? "暂停" : "播放");
    fab.classList.toggle("playing", playing);
    status.textContent = playing ? "正在播放" : (audio.currentTime > 0 ? "已暂停" : "点击播放");
    if ("mediaSession" in navigator) {
      try {
        navigator.mediaSession.playbackState = playing ? "playing" : "paused";
      } catch {
        /* ignore unsupported */
      }
    }
  }

  function updateMuteUI(): void {
    muteBtn.innerHTML = svg(muted || volume === 0 ? "mute" : "volume", 18);
    muteBtn.setAttribute("aria-label", muted ? "取消静音" : "静音");
    muteBtn.classList.toggle("is-muted", muted || volume === 0);
  }

  function renderList(): void {
    list.innerHTML = TRACKS.map((t, i) => {
      return '<button class="music-track' + (i === index ? " active" : "") + '" type="button" role="listitem" data-track="' + i + '" aria-current="' + (i === index ? "true" : "false") + '">' +
        '<span class="music-track-no">' + (i === index ? '<span class="mini-bars" aria-hidden="true"><i></i><i></i><i></i></span>' : String(i + 1).padStart(2, "0")) + '</span>' +
        '<span class="music-track-title">' + esc(t.title) + '</span>' +
        '<span class="music-track-kind">配乐</span>' +
      '</button>';
    }).join("");
  }

  function updateMediaSession(): void {
    if (!("mediaSession" in navigator) || typeof MediaMetadata === "undefined") return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: TRACKS[index].title,
        artist: ARTIST,
        album: "亡者世界 DeceasedCraft",
        artwork: [{ src: "./icons/icon-192.png", sizes: "192x192", type: "image/png" }]
      });
    } catch {
      /* ignore unsupported */
    }
  }

  function loadTrack(i: number, startPlayback: boolean): void {
    index = (i + TRACKS.length) % TRACKS.length;
    const t = TRACKS[index];
    audio.src = t.src;
    audio.load();
    nowTitle.textContent = t.title;
    nowSub.textContent = ARTIST + " · 官方配乐";
    seek.value = "0";
    timeNow.textContent = "0:00";
    timeAll.textContent = "0:00";
    renderList();
    updatePlayingUI();
    updateMediaSession();
    save();
    if (startPlayback) play();
  }

  function play(): void {
    const p = audio.play();
    if (p && p.catch) {
      p.catch(() => {
        status.textContent = "点击播放";
        updatePlayingUI();
      });
    }
  }

  function stop(): void {
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      /* ignore */
    }
    seek.value = "0";
    timeNow.textContent = "0:00";
    updatePlayingUI();
  }

  function togglePanel(force?: boolean): void {
    open = typeof force === "boolean" ? force : !open;
    fab.setAttribute("aria-expanded", open ? "true" : "false");
    fab.setAttribute("aria-label", open ? "收起原声播放器" : "打开原声播放器");
    panel.hidden = !open;
    backdrop.hidden = !open;
    document.body.classList.toggle("music-open", open);
    if (open) {
      panel.classList.remove("music-in");
      void panel.offsetWidth;
      panel.classList.add("music-in");
    }
  }

  function toggle(): void {
    if (audio.paused || audio.ended) {
      if (audio.ended) audio.currentTime = 0;
      if (!audio.src) loadTrack(index, true);
      else play();
    } else {
      audio.pause();
    }
  }

  function changeVolume(v: number): void {
    volume = Math.max(0, Math.min(1, v));
    audio.volume = volume;
    if (volume > 0 && muted) {
      muted = false;
      audio.muted = false;
    }
    volumeInput.value = String(Math.round(volume * 100));
    updateMuteUI();
    save();
  }

  function toggleMute(): void {
    if (muted || volume === 0) {
      if (volume === 0) volume = lastVolume;
      muted = false;
      audio.volume = volume;
      audio.muted = false;
      volumeInput.value = String(Math.round(volume * 100));
    } else {
      lastVolume = volume;
      muted = true;
      audio.muted = true;
    }
    updateMuteUI();
    save();
  }

  fab.addEventListener("click", () => togglePanel());
  backdrop.addEventListener("click", () => togglePanel(false));
  panel.addEventListener("click", (e) => {
    const target = e.target as HTMLElement;
    const action = target.closest<HTMLElement>("[data-music]");
    if (action) {
      const a = action.getAttribute("data-music");
      if (a === "toggle") toggle();
      else if (a === "prev") loadTrack(index - 1, true);
      else if (a === "next") loadTrack(index + 1, true);
      else if (a === "stop") stop();
      else if (a === "mute") toggleMute();
      else if (a === "close") togglePanel(false);
      return;
    }
    const track = target.closest<HTMLElement>("[data-track]");
    if (track) {
      const i = Number(track.getAttribute("data-track"));
      if (i === index) toggle();
      else loadTrack(i, true);
    }
  });

  list.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const rows = Array.from(list.querySelectorAll<HTMLElement>("[data-track]"));
    const i = rows.indexOf(document.activeElement as HTMLElement);
    if (i < 0) return;
    e.preventDefault();
    const next = (i + (e.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length;
    rows[next].focus();
  });

  seek.addEventListener("input", () => {
    seeking = true;
    if (audio.duration && isFinite(audio.duration)) {
      timeNow.textContent = fmtTime((Number(seek.value) / 1000) * audio.duration);
    }
  });
  seek.addEventListener("change", () => {
    if (audio.duration && isFinite(audio.duration)) {
      audio.currentTime = (Number(seek.value) / 1000) * audio.duration;
    }
    seeking = false;
  });
  volumeInput.addEventListener("input", () => changeVolume(Number(volumeInput.value) / 100));

  audio.addEventListener("loadedmetadata", () => {
    timeAll.textContent = fmtTime(audio.duration);
    updatePlayingUI();
  });
  audio.addEventListener("timeupdate", () => {
    if (!seeking && audio.duration && isFinite(audio.duration)) {
      seek.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
      timeNow.textContent = fmtTime(audio.currentTime);
    }
  });
  audio.addEventListener("play", updatePlayingUI);
  audio.addEventListener("pause", updatePlayingUI);
  audio.addEventListener("ended", () => {
    updatePlayingUI();
    status.textContent = "播放结束 · 点击重播";
  });
  audio.addEventListener("error", () => {
    status.textContent = "音频加载失败";
    updatePlayingUI();
  });

  if ("mediaSession" in navigator) {
    try {
      navigator.mediaSession.setActionHandler("play", toggle);
      navigator.mediaSession.setActionHandler("pause", toggle);
      navigator.mediaSession.setActionHandler("previoustrack", () => loadTrack(index - 1, true));
      navigator.mediaSession.setActionHandler("nexttrack", () => loadTrack(index + 1, true));
      navigator.mediaSession.setActionHandler("stop", stop);
    } catch {
      /* ignore unsupported */
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && open) togglePanel(false);
  });

  renderList();
  updateMuteUI();
  volumeInput.value = String(Math.round(volume * 100));
  loadTrack(index, false);
  window.WZMusic = {
    play,
    stop,
    next: () => loadTrack(index + 1, true),
    prev: () => loadTrack(index - 1, true),
    tracks: TRACKS.map((t) => t.title),
    state: () => ({
      index,
      title: TRACKS[index].title,
      paused: audio.paused,
      currentTime: audio.currentTime,
      duration: audio.duration,
      volume,
      muted
    })
  };
}

initMusic();
