const YM = 112323537;
const BOT_USER = "teacher_life_bot";
const LIFE_API = (window.LIFE_API || "https://million.up.railway.app").replace(/\/$/, "");
let PRICE_RUBLES = 65000;

const SECTIONS = Array.isArray(window.PAGE_SECTIONS) ? window.PAGE_SECTIONS : [];

function api(path){
  return LIFE_API ? LIFE_API + path : path;
}

function qsUtm(){
  const qs = new URLSearchParams(location.search);
  return {
    yclid: qs.get("yclid") || "",
    utm_source: qs.get("utm_source") || "",
    utm_medium: qs.get("utm_medium") || "",
    utm_campaign: qs.get("utm_campaign") || "",
    utm_content: qs.get("utm_content") || "",
    utm_term: qs.get("utm_term") || ""
  };
}

function sessionId(){
  try {
    let id = sessionStorage.getItem("vs_sid");
    if (!id) {
      id = "s" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem("vs_sid", id);
    }
    return id;
  } catch {
    return "s" + Date.now().toString(36);
  }
}

function ymGoal(name, price){
  if (typeof ym !== "function") return;
  const params = price != null ? {order_price: price, currency: "RUB"} : undefined;
  ym(YM, "reachGoal", name, params);
}

function getClientID(){
  return new Promise(resolve => {
    if (typeof ym !== "function") return resolve("");
    try { ym(YM, "getClientID", id => resolve(id || "")); }
    catch { resolve(""); }
  });
}

const behavior = (function(){
  const sid = sessionId();
  const startedAt = Date.now();
  const state = {};
  SECTIONS.forEach(s => {
    state[s.key] = {reached: false, time_to_ms: null, dwell_ms: 0, _since: null};
  });
  let clickedTelegram = false;
  let botStarted = false;
  let lastSent = 0;
  let metrikaCid = "";

  function now(){ return Date.now(); }

  function pauseAll(){
    const t = now();
    Object.values(state).forEach(row => {
      if (row._since != null) {
        row.dwell_ms += Math.max(0, t - row._since);
        row._since = null;
      }
    });
  }

  function enter(key){
    const row = state[key];
    if (!row) return;
    const t = now();
    if (!row.reached) {
      row.reached = true;
      row.time_to_ms = Math.max(0, t - startedAt);
      const sec = SECTIONS.find(s => s.key === key);
      if (sec && sec.headline) {
        ymGoal("headline_" + sec.headline);
        if (typeof ym === "function") {
          ym(YM, "params", {headline_reached: sec.headline, headline_title: sec.label, section_key: key});
        }
      }
      ymGoal("section_" + key);
    }
    if (row._since == null) row._since = t;
  }

  function leave(key){
    const row = state[key];
    if (!row || row._since == null) return;
    row.dwell_ms += Math.max(0, now() - row._since);
    row._since = null;
  }

  function snapshot(){
    const t = now();
    return {
      session_id: sid,
      metrika_client_id: metrikaCid,
      clicked_telegram: clickedTelegram ? 1 : 0,
      bot_started: botStarted ? 1 : 0,
      page_ms: Math.max(0, t - startedAt),
      landing_url: location.href,
      referrer: document.referrer || "",
      ...qsUtm(),
      sections: SECTIONS.map(s => {
        const row = state[s.key];
        const live = row._since != null ? Math.max(0, t - row._since) : 0;
        return {
          key: s.key,
          label: s.label,
          reached: row.reached ? 1 : 0,
          time_to_ms: row.time_to_ms,
          dwell_ms: Math.round(row.dwell_ms + live)
        };
      })
    };
  }

  function pushMetrikaParams(payload){
    if (typeof ym !== "function") return;
    const params = {
      ad: payload.utm_content || "",
      campaign: payload.utm_campaign || "",
      term: payload.utm_term || "",
      tg_click: payload.clicked_telegram,
      page_sec: Math.round(payload.page_ms / 1000)
    };
    payload.sections.forEach(s => {
      if (!s.reached) return;
      params["tt_" + s.key] = Math.round((s.time_to_ms || 0) / 1000);
      params["dw_" + s.key] = Math.round((s.dwell_ms || 0) / 1000);
    });
    ym(YM, "params", params);
  }

  function send(force){
    const payload = snapshot();
    const t = now();
    if (!force && t - lastSent < 2500) return;
    lastSent = t;
    pushMetrikaParams(payload);
    const body = JSON.stringify(payload);
    const url = api("/api/behavior");
    // fetch надёжнее sendBeacon(application/json) кросс-доменом
    fetch(url, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body,
      keepalive: true,
      mode: "cors"
    }).catch(() => {
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(url, new Blob([body], {type: "text/plain;charset=UTF-8"}));
        }
      } catch {}
    });
  }

  function markTelegramClick(){
    clickedTelegram = true;
    ymGoal("tg_click", 30);
    send(true);
  }

  function setCid(cid){ metrikaCid = cid || ""; }

  if ("IntersectionObserver" in window) {
    // Порог 0.35 ломал высокие секции (max ratio = viewport/высота < 0.35)
    const io = new IntersectionObserver(entries => {
      let changed = false;
      entries.forEach(entry => {
        const key = entry.target.getAttribute("data-section");
        if (!key) return;
        if (entry.isIntersecting) {
          const before = state[key] && state[key].reached;
          enter(key);
          if (!before) changed = true;
        } else {
          leave(key);
        }
      });
      if (changed) send(true);
      else send(false);
    }, {threshold: [0, 0.05, 0.15, 0.35], rootMargin: "-8% 0px -18% 0px"});
    SECTIONS.forEach(s => {
      const el = document.getElementById(s.id);
      if (!el) return;
      el.setAttribute("data-section", s.key);
      io.observe(el);
    });
  } else {
    // Fallback: считаем доскролл по положению scroll
    function checkScroll(){
      const vh = window.innerHeight || 800;
      SECTIONS.forEach(s => {
        const el = document.getElementById(s.id);
        if (!el) return;
        const r = el.getBoundingClientRect();
        if (r.top < vh * 0.75 && r.bottom > vh * 0.2) enter(s.key);
        else leave(s.key);
      });
      send(false);
    }
    window.addEventListener("scroll", checkScroll, {passive: true});
    checkScroll();
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pauseAll();
      send(true);
    }
  });
  window.addEventListener("pagehide", () => send(true));
  setInterval(() => send(false), 8000);
  // Первый пинг сразу после загрузки
  setTimeout(() => send(true), 800);

  return {markTelegramClick, setCid, send, snapshot, sid};
})();

async function openBot(e){
  e.preventDefault();
  const utm = qsUtm();
  const cid = await getClientID();
  behavior.setCid(cid);
  behavior.markTelegramClick();
  const snap = behavior.snapshot();
  let start = "site";
  try {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 2000) : null;
    const r = await fetch(api("/api/intent"), {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        metrika_client_id: cid,
        session_id: behavior.sid,
        ...utm,
        landing_url: location.href,
        referrer: document.referrer,
        page_ms: snap.page_ms,
        sections: snap.sections
      }),
      signal: ctrl ? ctrl.signal : undefined,
      keepalive: true
    });
    if (timer) clearTimeout(timer);
    if (r.ok) {
      const data = await r.json();
      if (data.start) start = data.start;
    }
  } catch {}
  location.href = "https://t.me/" + BOT_USER + "?start=" + encodeURIComponent(start);
}

document.querySelectorAll(".js-bot").forEach(el => el.addEventListener("click", openBot));

// Синхронизация цены с бэкендом (даты, счётчики и места не используются)
(function syncPrice(){
  function applyPrice(data){
    if (!data || !data.price_display) return;
    document.querySelectorAll(".js-price-text").forEach(el => {
      el.textContent = data.price_display;
    });
    document.querySelectorAll('meta[property="product:price:amount"]').forEach(el => {
      el.setAttribute("content", String(data.price_rubles));
    });
    PRICE_RUBLES = Number(data.price_rubles) || PRICE_RUBLES;
    try {
      const ld = document.querySelector('script[type="application/ld+json"]');
      if (ld && data.price_rubles != null) {
        const graph = JSON.parse(ld.textContent);
        const nodes = graph["@graph"] || (Array.isArray(graph) ? graph : [graph]);
        nodes.forEach(node => {
          const t = node["@type"];
          const isProduct = t === "Product" || (Array.isArray(t) && t.indexOf("Product") !== -1);
          if (isProduct && node.offers) node.offers.price = String(data.price_rubles);
        });
        ld.textContent = JSON.stringify(graph);
      }
    } catch {}
  }
  fetch(api("/api/dates"))
    .then(r => r.ok ? r.json() : null)
    .then(data => { if (data && data.ok) applyPrice(data); })
    .catch(() => {});
})();

document.addEventListener("yacounter" + YM + "inited", async () => {
  const utm = qsUtm();
  const cid = await getClientID();
  behavior.setCid(cid);
  ym(YM, "userParams", {
    landing: (window.PAGE_LANDING || "home"),
    has_yclid: utm.yclid ? "1" : "0",
    utm_source: utm.utm_source || "",
    utm_campaign: utm.utm_campaign || "",
    utm_content: utm.utm_content || "",
    utm_term: utm.utm_term || ""
  });
  ym(YM, "params", {
    page: location.pathname,
    utm_source: utm.utm_source || "",
    utm_medium: utm.utm_medium || "",
    utm_campaign: utm.utm_campaign || "",
    utm_content: utm.utm_content || "",
    utm_term: utm.utm_term || ""
  });
  behavior.send(true);
});

(function watchOffer(){
  const el = document.getElementById("price");
  if (!el || !("IntersectionObserver" in window)) return;
  let sent = false;
  const io = new IntersectionObserver(entries => {
    if (sent || !entries.some(x => x.isIntersecting && x.intersectionRatio >= 0.35)) return;
    sent = true;
    ymGoal("view_offer", 50);
    window.dataLayer.push({
      ecommerce: {
        currencyCode: "RUB",
        detail: { products: [{ id: "vs-individual-7", name: "Верни себе себя · индивидуальная программа 7 дней", price: PRICE_RUBLES, quantity: 1 }] }
      }
    });
    io.disconnect();
  }, {threshold: [0.35]});
  io.observe(el);
})();

(function revealOnScroll(){
  const nodes = document.querySelectorAll(".reveal, .stagger");
  if (!nodes.length) return;
  if (!("IntersectionObserver" in window)) {
    nodes.forEach(n => n.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add("in");
      io.unobserve(e.target);
    });
  }, {threshold: 0.12, rootMargin: "0px 0px -8% 0px"});
  nodes.forEach(n => io.observe(n));
})();

// ---- Интерактив: карточки-перевороты, карта дней, чипы ----
(function interactions(){
  // индекс для ступенчатой анимации
  document.querySelectorAll(".stagger").forEach(group => {
    Array.prototype.forEach.call(group.children, (el, i) => el.style.setProperty("--i", i));
  });

  const canHover = window.matchMedia && window.matchMedia("(hover:hover)").matches;

  // flip: на touch — тап, с клавиатуры — Enter/Space; на hover-устройствах переворот делает CSS
  document.querySelectorAll(".flip").forEach(card => {
    function toggle(){
      const open = card.classList.toggle("is-open");
      card.setAttribute("aria-expanded", open ? "true" : "false");
    }
    card.addEventListener("click", () => { if (!canHover) toggle(); });
    card.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
  });

  // карта дней: раскрытие карточки
  document.querySelectorAll(".dcard").forEach(card => {
    const btn = card.querySelector(".dbtn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const open = card.classList.toggle("open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      const label = btn.querySelector(".dtoggle");
      if (label && label.firstChild) label.firstChild.nodeValue = open ? "Свернуть" : "Подробнее";
    });
  });

  // чипы «Я ленивая…»: тап включает заливку
  document.querySelectorAll(".word").forEach(chip => {
    chip.addEventListener("click", () => {
      const on = chip.classList.toggle("on");
      chip.setAttribute("aria-pressed", on ? "true" : "false");
    });
  });
})();

