/* ==========================================================================
   GlTV Web — port del widget MovieWidget.qml (Quickshell) a página responsive.
   Mismo contrato de datos: addon TMDB de Stremio (es-MX) + Cinemeta fallback,
   catálogo de anime de Vimeus, géneros de anime vía Kitsu, 11 servidores embed.
   Persistencia: localStorage (mismos esquemas que los JSON del widget).
   ========================================================================== */

"use strict";

// ============ CONFIG ============
const META_BASE = "https://tmdb.elfhosted.com/es-MX";
const CINEMETA = "https://v3-cinemeta.strem.io";
const KITSU_BASE = "https://anime-kitsu.strem.fun";
const VIMEUS_VIEW_KEY = "hZLj0kp54XECkc48PTvxAB1C5PWF7y6pXiOPkQ0dqSg";
const VIMEUS_API_KEY = "ak_3J24aoWzvKTBJGEvHEzY6nzehLOaf2Y3";
// Personalización del reproductor configurada en el panel de Vimeus
const VIMEUS_PLAYER_OPTS = "title=GlTV&theme=cosmic&loader=v2&font=v2&overlay=v2&selector=v3&playUI=v3&epanel=v3&splash=v3&autoplay=1";
const RPDB_POSTER = (tt) => `https://api.ratingposterdb.com/imdb/poster-default/${tt}.jpg`;
const CACHE_MAX_AGE = 12 * 60 * 60 * 1000; // 12 h, igual que el widget

// idKind: "tmdb" (id numérico) o "imdb" (tt...). Los primeros tienen pista
// "Español (Latino)". urlAnime solo existe en Vimeus; el resto reproduce
// anime con su URL de series (los ids TMDB son los mismos).
const SERVERS = [
  { name: "Vimeus",    latino: true,  idKind: "tmdb",
    urlMovie: `https://vimeus.com/e/movie?tmdb={id}&view_key=${VIMEUS_VIEW_KEY}&${VIMEUS_PLAYER_OPTS}`,
    urlTv:    `https://vimeus.com/e/serie?tmdb={id}&se={s}&ep={e}&view_key=${VIMEUS_VIEW_KEY}&${VIMEUS_PLAYER_OPTS}`,
    urlAnime: `https://vimeus.com/e/anime?tmdb={id}&se={s}&ep={e}&view_key=${VIMEUS_VIEW_KEY}&${VIMEUS_PLAYER_OPTS}` },
  { name: "Videasy",   latino: true,  idKind: "tmdb",
    urlMovie: "https://player.videasy.net/movie/{id}?progress=true",
    urlTv:    "https://player.videasy.net/tv/{id}/{s}/{e}?progress=true" },
  { name: "VidFast",   latino: true,  idKind: "tmdb",
    urlMovie: "https://vidfast.pro/movie/{id}?autoPlay=true",
    urlTv:    "https://vidfast.pro/tv/{id}/{s}/{e}?autoPlay=true" },
  { name: "111Movies", latino: false, idKind: "tmdb",
    urlMovie: "https://111movies.com/movie/{id}",
    urlTv:    "https://111movies.com/tv/{id}/{s}/{e}" },
  { name: "VidLink",   latino: false, idKind: "tmdb",
    urlMovie: "https://vidlink.pro/movie/{id}?autoplay=1",
    urlTv:    "https://vidlink.pro/tv/{id}/{s}/{e}?autoplay=1" },
  { name: "RiveStream", latino: false, idKind: "tmdb",
    urlMovie: "https://rivestream.app/embed?type=movie&id={id}",
    urlTv:    "https://rivestream.app/embed?type=tv&id={id}&season={s}&episode={e}" },
  { name: "VidSrc.cc", latino: false, idKind: "imdb",
    urlMovie: "https://vidsrc.cc/v2/embed/movie/{id}?autoPlay=true",
    urlTv:    "https://vidsrc.cc/v2/embed/tv/{id}/{s}/{e}?autoPlay=true" },
  { name: "VidSrc.net", latino: false, idKind: "imdb",
    urlMovie: "https://vidsrc.net/embed/movie/{id}?ds_lang=es",
    urlTv:    "https://vidsrc.net/embed/tv/{id}/{s}/{e}?ds_lang=es" },
  { name: "Embed.su",  latino: false, idKind: "imdb",
    urlMovie: "https://embed.su/embed/movie/{id}",
    urlTv:    "https://embed.su/embed/tv/{id}/{s}/{e}" },
  { name: "2Embed",    latino: false, idKind: "imdb",
    urlMovie: "https://www.2embed.cc/embed/{id}",
    urlTv:    "https://www.2embed.cc/embedtv/{id}&s={s}&e={e}" },
  { name: "AutoEmbed", latino: false, idKind: "imdb",
    urlMovie: "https://autoembed.to/movie/imdb/{id}",
    urlTv:    "https://autoembed.to/tv/imdb/{id}-{s}-{e}" },
];

const MOVIE_GENRES = ["Acción","Animación","Aventura","Bélica","Ciencia ficción","Comedia","Crimen","Documental","Drama","Familia","Fantasía","Historia","Misterio","Música","Romance","Suspense","Terror","Western"];
const TV_GENRES = ["Action & Adventure","Animación","Comedia","Crimen","Documental","Drama","Familia","Kids","Misterio","Reality","Sci-Fi & Fantasy","Soap","War & Politics","Western"];
const ANIME_GENRES = [
  { label: "Acción", value: "Action" }, { label: "Aventura", value: "Adventure" },
  { label: "Comedia", value: "Comedy" }, { label: "Drama", value: "Drama" },
  { label: "Ciencia ficción", value: "Sci-Fi" }, { label: "Fantasía", value: "Fantasy" },
  { label: "Romance", value: "Romance" }, { label: "Misterio", value: "Mystery" },
  { label: "Sobrenatural", value: "Supernatural" }, { label: "Deportes", value: "Sports" },
  { label: "Terror", value: "Horror" }, { label: "Psicológico", value: "Psychological" },
  { label: "Thriller", value: "Thriller" }, { label: "Recuentos de la vida", value: "Slice of Life" },
  { label: "Escolar", value: "School" }, { label: "Artes marciales", value: "Martial Arts" },
  { label: "Histórico", value: "Historical" },
];

// ============ ESTADO ============
const state = {
  mediaType: "movie",          // movie | tv | anime
  trending: { movie: [], tv: [], anime: [] },
  extraRows: {                 // filas Tendencias / Recién agregadas (solo movie/tv)
    movie: { trending: [], latest: [] },
    tv: { trending: [], latest: [] },
    anime: { trending: [], latest: [] },
  },
  rawAnimeCatalog: [],
  heroIndex: 0,
  selectedGenre: "",
  selectedGenreLabel: "",
  catalogPage: 0,
  browseItems: [],
  browseHasMore: true,
  browseSeq: 0,
  searchQuery: "",
  searchItems: [],
  searchSeq: 0,
  sortMode: "Por defecto",
  detail: null,                // { imdbId, tmdbId, title, poster, backdrop, description, type, year, rating, seasonsMap, season }
  pendingMedia: null,          // { type, imdbId, tmdbId, title, poster, season, ep, description }
  chosenSource: -1,
  loading: false,
};

const isBrowsing = () => state.selectedGenre !== "" || state.catalogPage > 0;
const isSearching = () => state.searchQuery.trim() !== "";

// ============ PERSISTENCIA (localStorage ≈ los JSON del widget) ============
const store = {
  get(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem("gltv_" + key)); return v ?? fallback; }
    catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem("gltv_" + key, JSON.stringify(value)); } catch {}
  },
};

let favorites = store.get("favorites", []);          // [{imdbId,title,poster,type}]
let watchHistory = store.get("watch_history", []);   // [{imdbId,title,poster,type}] máx 15
let searchHistory = store.get("search_history", []); // [query] máx 10
let sourcePrefs = store.get("source_prefs", {});     // { imdbId: serverName }

function saveFavorites() { store.set("favorites", favorites); }
function saveWatchHistory() { store.set("watch_history", watchHistory); } // incluye season/ep/progress
function saveSearchHistory() { store.set("search_history", searchHistory); }

const isFavorite = (id) => favorites.some((f) => f.imdbId === id);

function toggleFavorite(item) {
  if (!item.imdbId) return;
  const i = favorites.findIndex((f) => f.imdbId === item.imdbId);
  if (i >= 0) favorites.splice(i, 1);
  else favorites.unshift({ imdbId: item.imdbId, title: item.title || "", poster: item.poster || "", type: item.type || "movie" });
  saveFavorites();
  renderRows();
  updateFavButtons();
}

function addToWatchHistory(item) {
  const prev = watchHistory.find((h) => h.imdbId === item.imdbId);
  watchHistory = watchHistory.filter((h) => h.imdbId !== item.imdbId);
  const entry = {
    imdbId: item.imdbId, title: item.title, poster: item.poster, type: item.type,
    season: item.season || 0, ep: item.ep || 0,
  };
  // Mismo episodio que la última vez → conservar el progreso guardado
  if (prev && prev.season === entry.season && prev.ep === entry.ep) {
    entry.progress = prev.progress || 0;
    entry.position = prev.position || 0;
    entry.duration = prev.duration || 0;
  }
  watchHistory.unshift(entry);
  if (watchHistory.length > 15) watchHistory.length = 15;
  saveWatchHistory();
  renderRows();
}

// Progreso reportado por el reproductor (postMessage) → entrada del historial
function updateWatchProgress(imdbId, position, duration) {
  const h = watchHistory.find((x) => x.imdbId === imdbId);
  if (!h || !duration) return;
  h.position = Math.floor(position);
  h.duration = Math.floor(duration);
  h.progress = Math.min(100, Math.round((position / duration) * 100));
  saveWatchHistory();
  // Refresca solo la barrita de la tarjeta, sin re-render completo
  document.querySelectorAll(`.card[data-id="${CSS.escape(imdbId)}"] .card-progress > span`)
    .forEach((bar) => { bar.style.width = h.progress + "%"; });
}

function addSearchHistory(q) {
  q = q.trim();
  if (!q) return;
  searchHistory = searchHistory.filter((s) => s.toLowerCase() !== q.toLowerCase());
  searchHistory.unshift(q);
  if (searchHistory.length > 10) searchHistory.length = 10;
  saveSearchHistory();
}

// ============ HELPERS ============
const $ = (id) => document.getElementById(id);

async function fetchJson(url, timeoutMs = 10000, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// El addon concatena "null" cuando TMDB no tiene imagen → tratar como vacía
function cleanImg(url) {
  if (!url || url.slice(-4) === "null") return "";
  return url;
}

function posterSized(url, size) {
  if (!url) return "";
  if (url.includes("image.tmdb.org")) return url.replace(/\/t\/p\/(w\d+|original)\//, `/t/p/${size}/`);
  return url;
}

function cleanYear(v) {
  return String(v || "N/A").replace(/[-–].*$/, "");
}

function metaToItem(m, type) {
  return {
    imdbId: m.imdb_id || m.id,
    title: m.name || "Desconocido",
    poster: cleanImg(m.poster || m.background || m.logo || ""),
    backdrop: cleanImg(m.background || ""),
    description: m.description || "",
    type,
    year: cleanYear(m.releaseInfo || m.year),
    rating: parseFloat(m.imdbRating) || 0,
  };
}

function sortItems(items) {
  const mode = state.sortMode;
  const yr = (it) => parseInt(it.year) || 0;
  const ti = (it) => (it.title || "").toString();
  const ra = (it) => parseFloat(it.rating) || 0;
  const arr = items.slice();
  if (mode === "Año (recientes)") arr.sort((a, b) => yr(b) - yr(a));
  else if (mode === "Año (antiguas)") arr.sort((a, b) => yr(a) - yr(b));
  else if (mode === "Título (A-Z)") arr.sort((a, b) => ti(a).localeCompare(ti(b)));
  else if (mode === "Título (Z-A)") arr.sort((a, b) => ti(b).localeCompare(ti(a)));
  else if (mode === "Puntaje (mejor)") arr.sort((a, b) => ra(b) - ra(a));
  else if (mode === "Puntaje (peor)") arr.sort((a, b) => ra(a) - ra(b));
  return arr;
}

// ============ CATÁLOGOS: POPULARES ============
async function fetchTrending(typeStr) {
  const key = typeStr === "movie" ? "movie" : "tv";
  const cached = store.get("trending_" + key, null);
  if (cached && cached.items?.length && Date.now() - cached.lastFetch < CACHE_MAX_AGE) {
    state.trending[key] = cached.items;
    onTabDataChanged(key);
    return;
  }
  let metas = null;
  try {
    const res = await fetchJson(`${META_BASE}/catalog/${typeStr}/tmdb.top.json`);
    if (res?.metas?.length) metas = res.metas;
  } catch {}
  if (!metas) {
    try {
      const res = await fetchJson(`${CINEMETA}/catalog/${typeStr}/top.json`);
      if (res?.metas?.length) metas = res.metas;
    } catch {}
  }
  if (!metas) {
    if (cached?.items?.length) { state.trending[key] = cached.items; onTabDataChanged(key); }
    return;
  }
  const items = metas.filter((m) => (m.imdb_id || m.id) && m.poster).map((m) => metaToItem(m, key));
  state.trending[key] = items;
  store.set("trending_" + key, { lastFetch: Date.now(), items });
  onTabDataChanged(key);
}

// ============ FILAS TEMÁTICAS (Tendencias / Recién agregadas) ============
// Mismos catálogos del addon: tmdb.trending y tmdb.latest (formato de tmdb.top)
async function fetchExtraRows(typeStr) {
  const key = typeStr === "movie" ? "movie" : "tv";
  for (const catalog of ["trending", "latest"]) {
    const cacheKey = `row_${catalog}_${key}`;
    const cached = store.get(cacheKey, null);
    if (cached?.items?.length && Date.now() - cached.lastFetch < CACHE_MAX_AGE) {
      state.extraRows[key][catalog] = cached.items;
      if (state.mediaType === key) renderRows();
      continue;
    }
    try {
      const res = await fetchJson(`${META_BASE}/catalog/${typeStr}/tmdb.${catalog}.json`);
      const metas = res?.metas || [];
      const items = metas.filter((m) => (m.imdb_id || m.id) && m.poster).slice(0, 20).map((m) => metaToItem(m, key));
      if (items.length) {
        state.extraRows[key][catalog] = items;
        store.set(cacheKey, { lastFetch: Date.now(), items });
        if (state.mediaType === key) renderRows();
      }
    } catch {}
  }
}

// ============ CATÁLOGO DE ANIME (Vimeus) ============
// ~1100 animes, 100/página en data.result; la búsqueda de anime filtra esto
// localmente (no hay endpoint de búsqueda).
async function fetchAnimeCatalog() {
  const cached = store.get("anime_catalog", null);
  if (cached?.items?.length) {
    state.rawAnimeCatalog = cached.items;
    applyAnimeTrending();
    if (Date.now() - cached.lastFetch < CACHE_MAX_AGE) return;
  }
  const items = [];
  try {
    for (let p = 1; p <= 30; p++) {
      const res = await fetchJson(`https://vimeus.com/api/listing/animes?page=${p}`, 20000,
        { headers: { "X-API-Key": VIMEUS_API_KEY } }).catch(() => null);
      // La respuesta real difiere de su doc: los items vienen en data.result
      const list = res?.data?.result;
      if (!list?.length) break;
      for (const r of list) {
        if (!r.tmdb_id && !r.imdb_id) continue;
        items.push({
          imdbId: r.imdb_id?.indexOf("tt") === 0 ? r.imdb_id : "tmdb:" + r.tmdb_id,
          title: r.title || "Desconocido",
          poster: r.poster ? "https://image.tmdb.org/t/p/w342" + r.poster : "",
          backdrop: r.backdrop ? "https://image.tmdb.org/t/p/w780" + r.backdrop : "",
          description: "",
          type: "anime", year: "N/A", rating: 0,
        });
      }
      if (res?.data?.pages && p >= res.data.pages) break;
    }
  } catch {}
  if (items.length) {
    state.rawAnimeCatalog = items;
    store.set("anime_catalog", { lastFetch: Date.now(), items });
    applyAnimeTrending();
  } else if (!state.rawAnimeCatalog.length && state.mediaType === "anime") {
    showEmpty("No se pudo cargar el catálogo de anime (¿bloqueo CORS de Vimeus?). Intenta buscar en la pestaña Series.");
  }
}

function applyAnimeTrending() {
  state.trending.anime = state.rawAnimeCatalog.slice(0, 60);
  onTabDataChanged("anime");
}

function onTabDataChanged(key) {
  if (state.mediaType !== key) return;
  renderHero();
  if (!isSearching() && !isBrowsing()) { state.loading = false; renderGrid(); }
  if (key === "anime") {
    if (isSearching()) doSearch(state.searchQuery);
    else if (isBrowsing() && state.selectedGenre === "") fetchBrowse();
  }
}

// ============ EXPLORAR POR GÉNERO + PAGINACIÓN ============
async function fetchBrowse() {
  const seq = ++state.browseSeq;
  const mt = state.mediaType;

  if (mt === "anime" && state.selectedGenre === "") {
    // Paginación local del catálogo de Vimeus (60 por página)
    const start = state.catalogPage * 60;
    const end = Math.min(start + 60, state.rawAnimeCatalog.length);
    state.browseItems = state.rawAnimeCatalog.slice(start, end);
    state.browseHasMore = end < state.rawAnimeCatalog.length;
    state.loading = false;
    renderGrid();
    return;
  }

  state.loading = true;
  renderGrid();
  let url;
  if (mt === "anime") {
    url = `${KITSU_BASE}/catalog/anime/kitsu-anime-popular/genre=${encodeURIComponent(state.selectedGenre)}`
      + (state.catalogPage > 0 ? `&skip=${state.catalogPage * 20}` : "") + ".json";
  } else {
    const extras = [];
    if (state.selectedGenre !== "") extras.push("genre=" + encodeURIComponent(state.selectedGenre));
    if (state.catalogPage > 0) extras.push("skip=" + state.catalogPage * 20);
    url = `${META_BASE}/catalog/${mt === "movie" ? "movie" : "series"}/tmdb.top`
      + (extras.length ? "/" + extras.join("&") : "") + ".json";
  }

  let metas = [];
  try {
    const res = await fetchJson(url);
    metas = res?.metas || [];
  } catch {}
  if (seq !== state.browseSeq) return;
  state.loading = false;
  state.browseHasMore = metas.length >= 20;

  const seen = {};
  state.browseItems = [];
  for (const m of metas) {
    const mid = m.imdb_id || m.id;
    // En Kitsu solo sirven entradas con id IMDB (las kitsu: no se pueden reproducir)
    if (mt === "anime" && (!m.imdb_id || m.imdb_id.indexOf("tt") !== 0)) continue;
    if (!mid || seen[mid]) continue;
    seen[mid] = 1;
    state.browseItems.push({ ...metaToItem(m, mt), imdbId: mid });
  }
  renderGrid();
}

// ============ BÚSQUEDA ============
async function doSearch(query) {
  const q = query.trim();
  state.searchQuery = q;
  saveUiState();
  if (!q) { state.searchItems = []; renderAll(); return; }
  addSearchHistory(q);

  if (state.mediaType === "anime") {
    // Búsqueda local sobre el catálogo de Vimeus (sin red)
    const ql = q.toLowerCase();
    state.searchItems = state.rawAnimeCatalog.filter((a) => a.title.toLowerCase().includes(ql));
    state.loading = false;
    renderAll();
    return;
  }

  const seq = ++state.searchSeq;
  const typeStr = state.mediaType === "movie" ? "movie" : "series";
  const expectedType = state.mediaType;
  state.loading = true;
  renderAll();

  let metas = null;
  try {
    const res = await fetchJson(`${META_BASE}/catalog/${typeStr}/tmdb.top/search=${encodeURIComponent(q)}.json`);
    metas = res?.metas || null;
  } catch {}
  if (!metas) {
    try {
      const res = await fetchJson(`${CINEMETA}/catalog/${typeStr}/top/search=${encodeURIComponent(q)}.json`);
      metas = res?.metas || null;
    } catch {}
  }
  if (seq !== state.searchSeq || state.mediaType !== expectedType) return;
  state.loading = false;
  state.searchItems = (metas || []).filter((m) => m.id).map((m) => metaToItem(m, expectedType));
  renderAll();
  enrichMissingPosters(state.searchItems, typeStr);
}

// Búsquedas sin póster: pedir el meta individual y, si tampoco trae, RPDB
async function enrichMissingPosters(items, typeStr) {
  for (const it of items) {
    if (it.poster) continue;
    const id = it.imdbId;
    try {
      const res = await fetchJson(`${META_BASE}/meta/${typeStr}/${id}.json`, 6000);
      const p = cleanImg(res?.meta?.poster || res?.meta?.background || "");
      if (p) { it.poster = p; updateCardPoster(id, p); continue; }
    } catch {}
    if (id?.indexOf("tt") === 0) { it.poster = RPDB_POSTER(id); updateCardPoster(id, it.poster); }
  }
}

function updateCardPoster(imdbId, poster) {
  document.querySelectorAll(`.card[data-id="${CSS.escape(imdbId)}"]`).forEach((card) => {
    const img = card.querySelector("img");
    if (img) img.src = posterSized(poster, "w342");
  });
}

// ============ META / DETALLE ============
async function fetchMeta(metaType, id) {
  try {
    const res = await fetchJson(`${META_BASE}/meta/${metaType}/${id}.json`);
    if (res?.meta) return res.meta;
  } catch {}
  if (id.indexOf("tt") === 0) {
    try {
      const res = await fetchJson(`${CINEMETA}/meta/${metaType}/${id}.json`);
      if (res?.meta) return res.meta;
    } catch {}
  }
  return null;
}

// videos[] del meta → { temporada: [episodios] }
function buildSeasonsMap(videos) {
  const map = {};
  for (const v of videos || []) {
    if (v.season === 0 || v.season == null) continue;
    let epTitle = v.name || v.title || null;
    if (epTitle && /^(episode\s*\d+|episodio\s*\d+|s\d+e\d+|ep\.?\s*\d+)$/i.test(epTitle.trim())) epTitle = null;
    (map[v.season] ||= []).push({
      ep: v.episode,
      title: epTitle || "Episodio " + v.episode,
      thumb: cleanImg(v.thumbnail || ""),
      overview: v.overview || v.description || "",
      runtime: parseInt(v.runtime) || 0,
    });
  }
  for (const k of Object.keys(map)) map[k].sort((a, b) => a.ep - b.ep);
  return map;
}

let pushedDetailHash = false;

async function openDetail(item) {
  const kind = item.type === "series" ? "tv" : item.type;
  state.detail = { ...item, type: kind, seasonsMap: null, season: 1 };
  $("similarSection").hidden = true;
  renderDetail();
  $("detailOverlay").hidden = false;
  $("detailOverlay").scrollTop = 0;
  document.body.style.overflow = "hidden";

  // URL con hash: permite compartir el título y que "atrás" cierre el detalle
  const targetHash = "#/t/" + kind + "/" + encodeURIComponent(item.imdbId);
  if (location.hash !== targetHash) { pushedDetailHash = true; location.hash = targetHash; }

  const metaType = kind === "movie" ? "movie" : "series";
  $("episodesSpinner").hidden = kind === "movie";
  const meta = await fetchMeta(metaType, item.imdbId);
  if (!state.detail || state.detail.imdbId !== item.imdbId) return;
  $("episodesSpinner").hidden = true;
  if (!meta) return;

  const d = state.detail;
  if (meta.imdb_id) d.imdbId = meta.imdb_id;
  if (meta.id?.indexOf("tmdb:") === 0) d.tmdbId = meta.id.substring(5);
  d.title = d.title || meta.name || "";
  d.description = d.description || meta.description || meta.synopsis || "";
  d.poster = d.poster || cleanImg(meta.poster || "");
  d.backdrop = cleanImg(meta.background || "") || d.backdrop || "";
  if (!d.year || d.year === "N/A") d.year = cleanYear(meta.releaseInfo || meta.year);
  if (!d.rating) d.rating = parseFloat(meta.imdbRating) || 0;
  // Ficha rica: el meta del addon trae género, duración, reparto, director y tráiler
  d.genres = meta.genres || meta.genre || [];
  d.runtime = meta.runtime || "";
  d.cast = (meta.cast || []).slice(0, 6);
  d.director = meta.director || [];
  d.trailerYt = (meta.trailers || []).find((t) => t.source)?.source || meta.trailerStreams?.[0]?.ytId || "";

  if (kind !== "movie") {
    const map = buildSeasonsMap(meta.videos);
    const seasons = Object.keys(map).map(Number).sort((a, b) => a - b);
    if (seasons.length === 0 && kind === "anime") {
      // Película de anime (sin episodios): se reproduce directo como película
      d.type = "movie";
    } else if (seasons.length > 0) {
      d.seasonsMap = map;
      d.season = seasons[0];
    }
  }
  renderDetail();
  fetchSimilar(d);
}

// Abrir desde la URL (#/t/{kind}/{id}): el título/póster los completa el meta
function openDetailById(kind, id) {
  openDetail({ imdbId: id, title: "", poster: "", type: kind });
}

function closeDetail(fromHash = false) {
  state.detail = null;
  $("detailOverlay").hidden = true;
  if ($("sourceOverlay").hidden && $("playerOverlay").hidden) document.body.style.overflow = "";
  if (!fromHash && location.hash.indexOf("#/t/") === 0) {
    if (pushedDetailHash) { pushedDetailHash = false; history.back(); }
    else history.replaceState(null, "", location.pathname + location.search);
  }
}

// ============ MÁS COMO ESTO ============
// Busca en el catálogo por el primer género del título (Kitsu para anime)
let similarSeq = 0;
async function fetchSimilar(d) {
  const seq = ++similarSeq;
  $("similarSection").hidden = true;
  const genres = d.genres || [];
  if (!genres.length) return;
  let url = null;
  if (d.type === "anime") {
    const g = ANIME_GENRES.find((x) => genres.includes(x.label) || genres.includes(x.value));
    if (g) url = `${KITSU_BASE}/catalog/anime/kitsu-anime-popular/genre=${encodeURIComponent(g.value)}.json`;
  } else {
    url = `${META_BASE}/catalog/${d.type === "movie" ? "movie" : "series"}/tmdb.top/genre=${encodeURIComponent(genres[0])}.json`;
  }
  if (!url) return;
  try {
    const res = await fetchJson(url);
    if (seq !== similarSeq || !state.detail || state.detail.imdbId !== d.imdbId) return;
    const items = (res?.metas || [])
      .filter((m) => (m.imdb_id || m.id) && (m.imdb_id || m.id) !== d.imdbId && m.poster)
      .filter((m) => d.type !== "anime" || (m.imdb_id && m.imdb_id.indexOf("tt") === 0))
      .slice(0, 12)
      .map((m) => metaToItem(m, d.type));
    if (!items.length) return;
    const row = $("similarRow");
    row.innerHTML = "";
    items.forEach((it) => row.appendChild(makeCard(it, { showRating: false })));
    $("similarSection").hidden = false;
  } catch {}
}

// ============ MODAL DE FUENTES ============
function buildSourceUrl(idx, media) {
  const src = SERVERS[idx];
  const id = src.idKind === "tmdb" ? media.tmdbId || "" : media.imdbId || "";
  if (!id || (src.idKind === "imdb" && id.indexOf("tt") !== 0)) return "";
  let tpl;
  if (media.type === "movie") tpl = src.urlMovie;
  else tpl = media.type === "anime" && src.urlAnime ? src.urlAnime : src.urlTv;
  return tpl.replace("{id}", id).replace("{s}", media.season).replace("{e}", media.ep);
}

async function openSourceModal(type, rawId, title, poster, season, ep, description) {
  rawId = rawId || "";
  const media = {
    type,
    imdbId: rawId.indexOf("tt") === 0 ? rawId : "",
    tmdbId: rawId.indexOf("tmdb:") === 0 ? rawId.substring(5) : "",
    title, poster, season: season || 0, ep: ep || 0,
    description: description || "",
    historyKey: rawId, // clave con la que quedó en "Seguir viendo" (puede ser tmdb:...)
  };
  state.pendingMedia = media;
  state.chosenSource = -1;
  addToWatchHistory({ imdbId: rawId, title, poster, type, season: media.season, ep: media.ep });
  renderSourceModal();
  $("sourceOverlay").hidden = false;
  document.body.style.overflow = "hidden";

  // Una sola llamada meta rellena el id que falte (tmdb <-> imdb) y la sinopsis
  if (!media.tmdbId || !media.imdbId || !media.description) {
    const metaType = type === "movie" ? "movie" : "series";
    const metaId = media.tmdbId ? "tmdb:" + media.tmdbId : media.imdbId;
    if (metaId) {
      const meta = await fetchMeta(metaType, metaId);
      if (meta && state.pendingMedia === media) {
        if (meta.imdb_id) media.imdbId = meta.imdb_id;
        if (meta.id?.indexOf("tmdb:") === 0) media.tmdbId = meta.id.substring(5);
        if (!media.description) media.description = meta.description || meta.synopsis || "";
      }
    }
  }
  if (state.pendingMedia !== media) return;
  // Preselecciona el servidor preferido del título, o el primero disponible
  const preferred = sourcePrefs[media.imdbId];
  let pick = preferred ? SERVERS.findIndex((s) => s.name === preferred) : -1;
  if (pick < 0 || !buildSourceUrl(pick, media)) pick = SERVERS.findIndex((_, i) => buildSourceUrl(i, media) !== "");
  state.chosenSource = pick;
  renderSourceModal();
}

function closeSourceModal() {
  state.pendingMedia = null;
  state.chosenSource = -1;
  $("sourceOverlay").hidden = true;
  if ($("detailOverlay").hidden && $("playerOverlay").hidden) document.body.style.overflow = "";
}

function renderSourceModal() {
  const m = state.pendingMedia;
  if (!m) return;
  $("sourceTitle").textContent = m.title;
  $("sourceSub").textContent = m.type === "movie" ? "Película" : `T${m.season} · E${m.ep} · ${m.type === "anime" ? "Anime" : "Serie"}`;
  $("sourceDesc").textContent = m.description || "";
  $("sourceDesc").hidden = !m.description;

  const list = $("sourceList");
  list.innerHTML = "";
  const preferred = sourcePrefs[m.imdbId];
  SERVERS.forEach((src, i) => {
    const url = buildSourceUrl(i, m);
    const btn = document.createElement("button");
    btn.className = "source-item" + (i === state.chosenSource ? " selected" : "");
    btn.disabled = url === "";
    btn.style.opacity = url === "" ? ".35" : "";
    btn.innerHTML = `<span class="num">${i + 1}</span><span>${src.name}</span>`
      + (src.latino ? `<span class="badge">Latino</span>` : "")
      + (src.name === preferred ? `<span class="star">★ preferido</span>` : "");
    btn.addEventListener("click", () => {
      if (url === "") return;
      state.chosenSource = i;
      renderSourceModal();
    });
    list.appendChild(btn);
  });

  const hasChoice = state.chosenSource >= 0 && buildSourceUrl(state.chosenSource, m) !== "";
  $("sourcePlay").disabled = !hasChoice;
  $("sourcePrefer").disabled = !hasChoice || !m.imdbId;
  $("sourceBrowser").disabled = !hasChoice;
}

// ============ REPRODUCTOR ============
let nowPlaying = null;   // { key } → entrada del historial que recibe el progreso
let trailerMode = false; // el overlay está mostrando un tráiler de YouTube

function playChosen() {
  const m = state.pendingMedia;
  if (!m || state.chosenSource < 0) return;
  const url = buildSourceUrl(state.chosenSource, m);
  if (!url) return;
  nowPlaying = { key: m.historyKey || m.imdbId };
  trailerMode = false;
  $("playerSources").hidden = false;
  $("playerTitle").textContent = m.title + (m.type !== "movie" ? ` · T${m.season} E${m.ep}` : "") + ` — ${SERVERS[state.chosenSource].name}`;
  $("playerFrame").src = url;
  $("playerOverlay").hidden = false;
  $("sourceOverlay").hidden = true;
  document.body.style.overflow = "hidden";
}

// --- Progreso real: Videasy y VidLink emiten eventos postMessage desde su
// iframe con currentTime/duration; otros servidores no lo exponen. Se acepta
// cualquier forma conocida del payload y se guarda como % en "Seguir viendo".
let lastProgressSave = 0;
window.addEventListener("message", (ev) => {
  if (!nowPlaying || $("playerOverlay").hidden) return;
  let data = ev.data;
  if (typeof data === "string") { try { data = JSON.parse(data); } catch { return; } }
  if (!data || typeof data !== "object") return;
  const c = data.data && typeof data.data === "object" ? data.data : data;
  const pos = Number(c.currentTime ?? c.time ?? c.watched ?? c.position ?? NaN);
  const dur = Number(c.duration ?? c.total ?? NaN);
  if (!isFinite(pos) || !isFinite(dur) || dur <= 0) return;
  const now = Date.now();
  if (now - lastProgressSave < 5000) return; // guardar cada ~5 s alcanza
  lastProgressSave = now;
  updateWatchProgress(nowPlaying.key, pos, dur);
});

// Tráiler de YouTube en el mismo overlay del reproductor
function playTrailer(ytId, title) {
  trailerMode = true;
  nowPlaying = null;
  $("playerSources").hidden = true;
  $("playerTitle").textContent = "Tráiler — " + title;
  $("playerFrame").src = `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1`;
  $("playerOverlay").hidden = false;
  document.body.style.overflow = "hidden";
}

function playInTab() {
  const m = state.pendingMedia;
  if (!m || state.chosenSource < 0) return;
  const url = buildSourceUrl(state.chosenSource, m);
  if (url) window.open(url, "_blank", "noopener");
}

function closePlayer() {
  $("playerFrame").src = "about:blank";
  $("playerOverlay").hidden = true;
  nowPlaying = null;
  if (!trailerMode && state.pendingMedia) {
    $("sourceOverlay").hidden = false; // volver al modal para cambiar de servidor
  } else if ($("detailOverlay").hidden && $("sourceOverlay").hidden) {
    document.body.style.overflow = "";
  }
  trailerMode = false;
  renderRows(); // refresca progreso/orden de "Seguir viendo"
}

// ============ RENDER: TARJETAS ============
function makeCard(item, { showRating = true, history = false } = {}) {
  const card = document.createElement("article");
  card.className = "card";
  card.tabIndex = 0;
  card.dataset.id = item.imdbId;
  card.setAttribute("aria-label", item.title);

  const poster = posterSized(item.poster, "w342");
  if (poster) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.alt = item.title;
    img.src = poster;
    img.addEventListener("error", () => {
      img.remove();
      const ph = document.createElement("div");
      ph.className = "no-poster";
      ph.textContent = item.title;
      card.prepend(ph);
    });
    card.appendChild(img);
  } else {
    const ph = document.createElement("div");
    ph.className = "no-poster";
    ph.textContent = item.title;
    card.appendChild(ph);
  }

  if (showRating && parseFloat(item.rating) > 0) {
    const r = document.createElement("span");
    r.className = "card-rating";
    r.textContent = "★ " + item.rating;
    card.appendChild(r);
  }

  const fav = document.createElement("button");
  fav.className = "card-fav" + (isFavorite(item.imdbId) ? " faved" : "");
  fav.textContent = isFavorite(item.imdbId) ? "✓" : "+";
  fav.title = "Mi lista";
  fav.setAttribute("aria-label", "Agregar a Mi lista");
  fav.addEventListener("click", (e) => { e.stopPropagation(); toggleFavorite(item); });
  card.appendChild(fav);

  const title = document.createElement("div");
  title.className = "card-title";
  title.textContent = item.title;
  card.appendChild(title);

  // Extras de "Seguir viendo": chip T·E, botón siguiente episodio y barra de progreso
  if (history) {
    if (item.season > 0) {
      const badge = document.createElement("span");
      badge.className = "card-ep-badge";
      badge.textContent = `T${item.season}·E${item.ep}`;
      card.appendChild(badge);

      const resume = document.createElement("button");
      resume.className = "card-resume";
      resume.textContent = "▶";
      resume.title = "Siguiente episodio";
      resume.setAttribute("aria-label", "Reproducir siguiente episodio");
      resume.addEventListener("click", (e) => { e.stopPropagation(); resumeNext(item); });
      card.appendChild(resume);
    }
    if (item.progress > 0) {
      const prog = document.createElement("div");
      prog.className = "card-progress";
      prog.innerHTML = `<span style="width:${item.progress}%"></span>`;
      card.appendChild(prog);
    }
  }

  const open = () => openDetail(item);
  card.addEventListener("click", open);
  card.addEventListener("keydown", (e) => { if (e.key === "Enter") open(); });
  return card;
}

// "Siguiente episodio": con el meta de la serie ubica el episodio que sigue al
// último visto (misma temporada, o primera de la siguiente) y abre las fuentes.
// Si quedó a medias (<95%), ofrece el mismo episodio.
async function resumeNext(item) {
  const meta = await fetchMeta("series", item.imdbId);
  const map = buildSeasonsMap(meta?.videos);
  const seasons = Object.keys(map).map(Number).sort((a, b) => a - b);
  let s = item.season, e = item.ep;
  if (seasons.length && !(item.progress > 0 && item.progress < 95)) {
    const inSeason = (map[item.season] || []).filter((ep) => ep.ep > item.ep);
    if (inSeason.length) {
      e = inSeason[0].ep;
    } else {
      const nextSeason = seasons.find((n) => n > item.season);
      if (nextSeason) { s = nextSeason; e = map[nextSeason][0].ep; }
    }
  }
  const desc = meta?.description || meta?.synopsis || "";
  openSourceModal(item.type === "anime" ? "anime" : "tv", item.imdbId, item.title, item.poster, s, e, desc);
}

function updateFavButtons() {
  document.querySelectorAll(".card").forEach((card) => {
    const btn = card.querySelector(".card-fav");
    if (!btn) return;
    const faved = isFavorite(card.dataset.id);
    btn.classList.toggle("faved", faved);
    btn.textContent = faved ? "✓" : "+";
  });
  const d = state.detail;
  if (d) {
    const b = $("detailFav");
    b.classList.toggle("faved", isFavorite(d.imdbId));
    b.textContent = isFavorite(d.imdbId) ? "✓ En Mi lista" : "+ Mi lista";
  }
  const h = currentHeroItem();
  if (h) {
    const b = $("heroFav");
    b.classList.toggle("faved", isFavorite(h.imdbId));
    b.textContent = isFavorite(h.imdbId) ? "✓ Mi lista" : "+ Mi lista";
  }
}

// ============ RENDER: HERO ============
let heroTimer = null;

function currentHeroList() {
  return state.trending[state.mediaType].slice(0, 8);
}
function currentHeroItem() {
  const list = currentHeroList();
  return list.length ? list[state.heroIndex % list.length] : null;
}

function renderHero() {
  const hero = $("hero");
  const list = currentHeroList();
  const showHero = list.length > 0 && !isSearching() && !isBrowsing();
  hero.hidden = !showHero;
  if (heroTimer) { clearInterval(heroTimer); heroTimer = null; }
  if (!showHero) return;

  if (state.heroIndex >= list.length) state.heroIndex = 0;
  const it = list[state.heroIndex];
  $("heroTitle").textContent = it.title;
  $("heroDesc").textContent = it.description || "";
  const bg = posterSized(it.backdrop || it.poster, "w780");
  $("heroBg").style.backgroundImage = bg ? `url("${bg}")` : "none";

  // La descripción de los animes de Vimeus no viene en el catálogo → pedirla al addon
  if (!it.description) {
    const want = it.imdbId;
    fetchMeta(it.type === "movie" ? "movie" : "series", want).then((meta) => {
      if (meta?.description && currentHeroItem()?.imdbId === want) {
        it.description = meta.description;
        $("heroDesc").textContent = meta.description;
      }
    });
  }

  const dots = $("heroDots");
  dots.innerHTML = "";
  list.forEach((_, i) => {
    const d = document.createElement("button");
    d.className = "hero-dot" + (i === state.heroIndex ? " active" : "");
    d.setAttribute("aria-label", "Destacado " + (i + 1));
    d.addEventListener("click", () => { state.heroIndex = i; renderHero(); });
    dots.appendChild(d);
  });

  updateFavButtons();

  // Rotación cada 8 s, como el widget
  if (list.length > 1) {
    heroTimer = setInterval(() => {
      if (!$("detailOverlay").hidden || !$("sourceOverlay").hidden || !$("playerOverlay").hidden) return;
      state.heroIndex = (state.heroIndex + 1) % list.length;
      renderHero();
    }, 8000);
  }
}

// ============ RENDER: FILAS ============
function renderRows() {
  const showRows = !isSearching() && !isBrowsing();
  const ex = state.extraRows[state.mediaType];
  $("favRow").hidden = !showRows || favorites.length === 0;
  $("historyRow").hidden = !showRows || watchHistory.length === 0;
  $("trendingRow").hidden = !showRows || ex.trending.length === 0;
  $("latestRow").hidden = !showRows || ex.latest.length === 0;
  if (!showRows) return;

  const favInner = $("favRowInner");
  favInner.innerHTML = "";
  favorites.forEach((f) => favInner.appendChild(makeCard(f, { showRating: false })));

  const histInner = $("historyRowInner");
  histInner.innerHTML = "";
  watchHistory.forEach((h) => histInner.appendChild(makeCard(h, { showRating: false, history: true })));

  const trendInner = $("trendingRowInner");
  trendInner.innerHTML = "";
  ex.trending.forEach((it) => trendInner.appendChild(makeCard(it)));

  const latestInner = $("latestRowInner");
  latestInner.innerHTML = "";
  ex.latest.forEach((it) => latestInner.appendChild(makeCard(it)));
}

// ============ RENDER: GÉNEROS ============
function currentGenres() {
  const all = [{ label: state.mediaType === "anime" ? "Todos" : "Todas", value: "" }];
  if (state.mediaType === "movie") return all.concat(MOVIE_GENRES.map((g) => ({ label: g, value: g })));
  if (state.mediaType === "tv") return all.concat(TV_GENRES.map((g) => ({ label: g, value: g })));
  return all.concat(ANIME_GENRES);
}

function renderChips() {
  const wrap = $("genreChips");
  wrap.innerHTML = "";
  for (const g of currentGenres()) {
    const chip = document.createElement("button");
    chip.className = "chip" + (state.selectedGenre === g.value ? " active" : "");
    chip.textContent = g.label;
    chip.addEventListener("click", () => selectGenre(g.label, g.value));
    wrap.appendChild(chip);
  }
}

function selectGenre(label, value) {
  if (state.selectedGenre === value && state.catalogPage === 0) return;
  state.selectedGenre = value;
  state.selectedGenreLabel = value === "" ? "" : label;
  state.catalogPage = 0;
  renderChips();
  if (isBrowsing()) fetchBrowse();
  saveUiState();
  renderAll();
  window.scrollTo({ top: 0 });
}

// ============ RENDER: GRID + PAGINACIÓN ============
function showEmpty(msg) {
  $("gridEmpty").textContent = msg;
  $("gridEmpty").hidden = false;
}

function renderGrid() {
  const grid = $("mediaGrid");
  const title = $("gridTitle");
  $("gridEmpty").hidden = true;
  $("gridSpinner").hidden = !state.loading;

  let items;
  if (isSearching()) {
    items = sortItems(state.searchItems);
    title.textContent = `Resultados para “${state.searchQuery.trim()}”`;
  } else if (isBrowsing()) {
    items = state.browseItems.slice(); // el orden de páginas del addon ya viene dado; sort local igual aplica
    items = sortItems(items);
    title.textContent = state.selectedGenreLabel || "Explorar";
  } else {
    items = sortItems(state.trending[state.mediaType]);
    title.textContent = "Populares";
  }

  grid.innerHTML = "";
  const frag = document.createDocumentFragment();
  items.forEach((it) => frag.appendChild(makeCard(it)));
  grid.appendChild(frag);

  if (!state.loading && items.length === 0) {
    if (isSearching()) {
      showEmpty(state.mediaType === "anime"
        ? "Sin resultados en el catálogo de anime. Prueba buscarlo en la pestaña Series."
        : "Sin resultados.");
    } else if (isBrowsing()) {
      showEmpty("No hay títulos en esta página.");
    }
  }

  // Paginación al explorar y también desde Populares (Siguiente entra al catálogo
  // paginado del addon, como nextPage() en el widget); la búsqueda no pagina
  const pag = $("pagination");
  pag.hidden = isSearching() || (items.length === 0 && !isBrowsing());
  if (!pag.hidden) {
    $("pageLabel").textContent = "Página " + (state.catalogPage + 1);
    $("prevPage").disabled = state.catalogPage === 0;
    $("nextPage").disabled = isBrowsing()
      ? !state.browseHasMore
      : (state.mediaType === "anime" && state.rawAnimeCatalog.length <= 60);
  }
}

function changePage(delta) {
  if (delta < 0 && state.catalogPage === 0) return;
  if (delta > 0 && isBrowsing() && !state.browseHasMore) return;
  state.catalogPage += delta;
  if (isBrowsing()) fetchBrowse();
  else { state.browseItems = []; state.loading = false; } // volvió a Populares (página 0 sin género)
  saveUiState();
  renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============ RENDER: DETALLE ============
function renderDetail() {
  const d = state.detail;
  if (!d) return;
  $("detailTitle").textContent = d.title;
  $("detailDesc").textContent = d.description || "";
  const bg = posterSized(d.backdrop || d.poster, "w780");
  $("detailBackdrop").style.backgroundImage = bg ? `url("${bg}")` : "none";

  const meta = $("detailMeta");
  meta.innerHTML = "";
  if (d.year && d.year !== "N/A") meta.insertAdjacentHTML("beforeend", `<span>${d.year}</span>`);
  if (parseFloat(d.rating) > 0) meta.insertAdjacentHTML("beforeend", `<span class="rating">★ ${d.rating}</span>`);
  if (d.runtime) meta.insertAdjacentHTML("beforeend", `<span>${escapeHtml(String(d.runtime))}</span>`);
  meta.insertAdjacentHTML("beforeend", `<span class="kind">${d.type === "movie" ? "Película" : d.type === "anime" ? "Anime" : "Serie"}</span>`);

  const genresBox = $("detailGenres");
  genresBox.innerHTML = "";
  (d.genres || []).slice(0, 6).forEach((g) => {
    genresBox.insertAdjacentHTML("beforeend", `<span class="genre-tag">${escapeHtml(g)}</span>`);
  });
  genresBox.hidden = !(d.genres || []).length;

  const cast = $("detailCast");
  let castHtml = "";
  if (d.director?.length) castHtml += `<b>Dirección:</b> ${escapeHtml(d.director.slice(0, 3).join(", "))}`;
  if (d.cast?.length) castHtml += (castHtml ? " &nbsp;·&nbsp; " : "") + `<b>Reparto:</b> ${escapeHtml(d.cast.join(", "))}`;
  cast.innerHTML = castHtml;
  cast.hidden = !castHtml;

  $("detailTrailer").hidden = !d.trailerYt;

  updateFavButtons();

  const epSection = $("episodesSection");
  if (d.seasonsMap) {
    epSection.hidden = false;
    const seasons = Object.keys(d.seasonsMap).map(Number).sort((a, b) => a - b);
    const sel = $("seasonSelect");
    sel.innerHTML = "";
    for (const s of seasons) {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = "Temporada " + s;
      if (s === d.season) opt.selected = true;
      sel.appendChild(opt);
    }
    renderEpisodes();
  } else {
    epSection.hidden = true;
  }
}

function renderEpisodes() {
  const d = state.detail;
  const list = $("episodeList");
  list.innerHTML = "";
  if (!d?.seasonsMap) return;
  const eps = d.seasonsMap[d.season] || [];
  for (const ep of eps) {
    const btn = document.createElement("button");
    btn.className = "episode-item";
    const thumb = ep.thumb
      ? `<img class="episode-thumb" loading="lazy" src="${ep.thumb}" alt="" onerror="this.style.visibility='hidden'">`
      : `<div class="episode-thumb"></div>`;
    btn.innerHTML = `
      <span class="episode-num">${ep.ep}</span>
      ${thumb}
      <span class="episode-info">
        <span class="episode-title-row"><span>${escapeHtml(ep.title)}</span><span class="episode-runtime">${ep.runtime > 0 ? ep.runtime + " min" : ""}</span></span>
        <span class="episode-overview">${escapeHtml(ep.overview)}</span>
      </span>`;
    btn.addEventListener("click", () => {
      openSourceModal(d.type === "anime" ? "anime" : "tv", d.imdbId, d.title, d.poster, d.season, ep.ep, d.description);
    });
    list.appendChild(btn);
  }
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ============ RENDER GLOBAL ============
function renderAll() {
  renderHero();
  renderRows();
  renderGrid();
}

// ============ SESIÓN (equivale a qs_ui_state.json del widget) ============
function saveUiState() {
  store.set("ui_state", {
    mediaType: state.mediaType,
    selectedGenre: state.selectedGenre,
    selectedGenreLabel: state.selectedGenreLabel,
    catalogPage: state.catalogPage,
    sortMode: state.sortMode,
    searchQuery: state.searchQuery,
  });
}

function restoreUiState() {
  const s = store.get("ui_state", null);
  if (!s) return;
  if (["movie", "tv", "anime"].includes(s.mediaType)) state.mediaType = s.mediaType;
  state.selectedGenre = s.selectedGenre || "";
  state.selectedGenreLabel = s.selectedGenreLabel || "";
  state.catalogPage = s.catalogPage || 0;
  if (s.sortMode) { state.sortMode = s.sortMode; $("sortSelect").value = s.sortMode; }
  if (s.searchQuery) {
    state.searchQuery = s.searchQuery;
    $("searchInput").value = s.searchQuery;
    $("searchBox").classList.add("has-text");
  }
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.type === state.mediaType));
}

// ============ NAVEGACIÓN DE PESTAÑAS ============
function setMediaType(t) {
  if (state.mediaType === t) return;
  state.mediaType = t;
  state.selectedGenre = "";
  state.selectedGenreLabel = "";
  state.catalogPage = 0;
  state.browseItems = [];
  state.heroIndex = 0;
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.type === t));
  renderChips();
  if (t === "anime" && !state.rawAnimeCatalog.length) fetchAnimeCatalog();
  if (isSearching()) doSearch(state.searchQuery);
  saveUiState();
  renderAll();
  window.scrollTo({ top: 0 });
}

// ============ EVENTOS ============
function setupEvents() {
  // Pestañas
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => setMediaType(btn.dataset.type));
  });
  $("logoBtn").addEventListener("click", (e) => {
    e.preventDefault();
    $("searchInput").value = "";
    $("searchBox").classList.remove("has-text");
    state.searchQuery = "";
    selectGenre("", "");
    setMediaType("movie");
    saveUiState();
    renderAll();
    window.scrollTo({ top: 0 });
  });

  // Búsqueda con debounce de 400 ms (igual que el widget)
  const input = $("searchInput");
  let debounce = null;
  input.addEventListener("input", () => {
    $("searchBox").classList.toggle("has-text", input.value !== "");
    renderSearchHistoryDropdown();
    clearTimeout(debounce);
    debounce = setTimeout(() => doSearch(input.value), 400);
  });
  input.addEventListener("focus", renderSearchHistoryDropdown);
  document.addEventListener("click", (e) => {
    if (!$("searchBox").contains(e.target)) $("searchHistory").classList.remove("open");
  });
  $("searchClear").addEventListener("click", () => {
    input.value = "";
    $("searchBox").classList.remove("has-text");
    state.searchQuery = "";
    saveUiState();
    renderAll();
    input.focus();
  });

  // Orden
  $("sortSelect").addEventListener("change", (e) => {
    state.sortMode = e.target.value;
    saveUiState();
    renderGrid();
  });

  // Paginación
  $("prevPage").addEventListener("click", () => changePage(-1));
  $("nextPage").addEventListener("click", () => changePage(1));

  // Hero
  $("heroPlay").addEventListener("click", () => {
    const it = currentHeroItem();
    if (!it) return;
    if (it.type === "movie") openSourceModal("movie", it.imdbId, it.title, it.poster, 0, 0, it.description);
    else openDetail(it);
  });
  $("heroInfo").addEventListener("click", () => { const it = currentHeroItem(); if (it) openDetail(it); });
  $("heroFav").addEventListener("click", () => { const it = currentHeroItem(); if (it) toggleFavorite(it); });

  // Detalle (sin pasar el MouseEvent: closeDetail(fromHash) lo malinterpretaría)
  $("detailClose").addEventListener("click", () => closeDetail());
  $("detailOverlay").addEventListener("click", (e) => { if (e.target === $("detailOverlay")) closeDetail(); });
  $("detailFav").addEventListener("click", () => { if (state.detail) toggleFavorite(state.detail); });
  $("detailPlay").addEventListener("click", () => {
    const d = state.detail;
    if (!d) return;
    if (d.type === "movie" || !d.seasonsMap) {
      openSourceModal("movie", d.imdbId, d.title, d.poster, 0, 0, d.description);
    } else {
      const eps = d.seasonsMap[d.season] || [];
      const first = eps[0];
      if (first) openSourceModal(d.type === "anime" ? "anime" : "tv", d.imdbId, d.title, d.poster, d.season, first.ep, d.description);
    }
  });
  $("seasonSelect").addEventListener("change", (e) => {
    if (state.detail) { state.detail.season = parseInt(e.target.value); renderEpisodes(); }
  });
  $("detailTrailer").addEventListener("click", () => {
    const d = state.detail;
    if (d?.trailerYt) playTrailer(d.trailerYt, d.title);
  });

  // Fuentes
  $("sourceClose").addEventListener("click", closeSourceModal);
  $("sourceOverlay").addEventListener("click", (e) => { if (e.target === $("sourceOverlay")) closeSourceModal(); });
  $("sourcePlay").addEventListener("click", playChosen);
  $("sourceBrowser").addEventListener("click", playInTab);
  $("sourcePrefer").addEventListener("click", () => {
    const m = state.pendingMedia;
    if (!m?.imdbId || state.chosenSource < 0) return;
    sourcePrefs[m.imdbId] = SERVERS[state.chosenSource].name;
    store.set("source_prefs", sourcePrefs);
    renderSourceModal();
  });

  // Reproductor
  $("playerClose").addEventListener("click", closePlayer);
  $("playerSources").addEventListener("click", () => {
    $("playerFrame").src = "about:blank";
    $("playerOverlay").hidden = true;
    $("sourceOverlay").hidden = false;
  });

  // Escape cierra en cascada: reproductor → fuentes → detalle → búsqueda (como el widget)
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!$("playerOverlay").hidden) closePlayer();
    else if (!$("sourceOverlay").hidden) closeSourceModal();
    else if (!$("detailOverlay").hidden) closeDetail();
    else if (isSearching()) {
      $("searchInput").value = "";
      $("searchBox").classList.remove("has-text");
      state.searchQuery = "";
      saveUiState();
      renderAll();
    }
  });

  // Flechas navegan el grid (Enter abre — ya lo maneja cada tarjeta)
  document.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    if (!$("detailOverlay").hidden || !$("sourceOverlay").hidden || !$("playerOverlay").hidden) return;
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    const cards = [...document.querySelectorAll("#mediaGrid .card")];
    if (!cards.length) return;
    let idx = cards.indexOf(document.activeElement);
    if (idx === -1) { cards[0].focus(); e.preventDefault(); return; }
    const firstTop = cards[0].offsetTop;
    let cols = cards.findIndex((c) => c.offsetTop > firstTop);
    if (cols <= 0) cols = cards.length;
    if (e.key === "ArrowLeft") idx -= 1;
    else if (e.key === "ArrowRight") idx += 1;
    else if (e.key === "ArrowUp") idx -= cols;
    else idx += cols;
    if (idx >= 0 && idx < cards.length) {
      cards[idx].focus();
      cards[idx].scrollIntoView({ block: "center", behavior: "smooth" });
    }
    e.preventDefault();
  });

  // Hash routing: #/t/{kind}/{id} ↔ modal de detalle (atrás/adelante funcionan)
  window.addEventListener("hashchange", () => {
    const m = location.hash.match(/^#\/t\/(movie|tv|anime)\/(.+)$/);
    if (m) {
      const id = decodeURIComponent(m[2]);
      if (!state.detail || state.detail.imdbId !== id) { pushedDetailHash = false; openDetailById(m[1], id); }
    } else if (state.detail) {
      closeDetail(true);
    }
  });
}

function renderSearchHistoryDropdown() {
  const box = $("searchHistory");
  const q = $("searchInput").value.trim().toLowerCase();
  const matches = searchHistory.filter((s) => q === "" || s.toLowerCase().includes(q));
  if (!matches.length) { box.classList.remove("open"); return; }
  box.innerHTML = "";
  for (const s of matches.slice(0, 8)) {
    const item = document.createElement("button");
    item.className = "search-history-item";
    item.textContent = s;
    item.addEventListener("mousedown", (e) => {
      e.preventDefault();
      $("searchInput").value = s;
      $("searchBox").classList.add("has-text");
      box.classList.remove("open");
      doSearch(s);
    });
    box.appendChild(item);
  }
  box.classList.add("open");
}

// ============ INIT ============
function init() {
  setupEvents();
  restoreUiState();
  renderChips();
  renderRows();
  state.loading = true;
  renderGrid();
  fetchTrending("movie");
  fetchTrending("series");
  fetchExtraRows("movie");
  fetchExtraRows("series");
  fetchAnimeCatalog();

  // Retomar donde ibas: género/página o búsqueda activa de la sesión anterior
  if (isBrowsing()) fetchBrowse();
  else if (isSearching() && state.mediaType !== "anime") doSearch(state.searchQuery); // anime espera su catálogo

  // Enlace directo a un título (#/t/{kind}/{id})
  const m = location.hash.match(/^#\/t\/(movie|tv|anime)\/(.+)$/);
  if (m) openDetailById(m[1], decodeURIComponent(m[2]));

  // PWA: el service worker cachea el shell para abrirla instalada/offline
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

init();
