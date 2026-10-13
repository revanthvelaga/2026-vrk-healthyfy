import { FOODS } from "./foods.js";
import { MACROS, DETAIL_MACROS, MICROS, ALL_KEYS, hasMicros, cleanNutrients } from "./nutrients.js";
import * as store from "./store.js";
import { S, day, ensureDay, saveDay, saveProfile } from "./store.js";
import * as ai from "./ai.js";

// ================= helpers =================
const $ = (s, el = document) => el.querySelector(s);
const R = Math.round;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n, d = 1) => (Number.isInteger(+n) ? String(+n) : (+n).toFixed(d).replace(/\.0+$/, ""));
const iso = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => iso();
const MEALS = [
  { k: "Breakfast", e: "🍳", bg: "#FFF1D6", dbg: "#3A2A10" },
  { k: "Lunch", e: "🍛", bg: "#E1F6E9", dbg: "#123322" },
  { k: "Snacks", e: "🍎", bg: "#FDE4E4", dbg: "#3A1A1A" },
  { k: "Dinner", e: "🌙", bg: "#E6E6FC", dbg: "#1D1D3B" },
];
const mealByTime = () => { const h = new Date().getHours(); return h < 11 ? "Breakfast" : h < 16 ? "Lunch" : h < 19 ? "Snacks" : "Dinner"; };
const isDark = () => document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
const mealBg = (m) => (isDark() ? m.dbg : m.bg);

// ================= targets =================
const P = () => S.profile;
const bmr = (p = P()) => 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.male ? 5 : -161);
const kcalTarget = (p = P()) => Math.max(1200, R(bmr(p) * p.activity + ({ lose: -500, gain: 300 }[p.goal] || 0)));
const proteinTarget = (p = P()) => R(p.weightKg * (p.goal === "lose" ? 2 : p.goal === "gain" ? 1.8 : 1.6));
const fatTarget = (p = P()) => R((kcalTarget(p) * 0.25) / 9);
const carbTarget = (p = P()) => Math.max(0, R((kcalTarget(p) - proteinTarget(p) * 4 - fatTarget(p) * 9) / 4));
const macroTarget = (k) => ({ protein: proteinTarget(), carbs: carbTarget(), fat: fatTarget() }[k]);
const nGoal = (n) => (n.goal ? n.goal(P(), kcalTarget()) : n.limit(P(), kcalTarget()));

function totals(date) {
  const t = Object.fromEntries(ALL_KEYS.map((k) => [k, 0]));
  let withMicros = 0;
  const foods = day(date).foods;
  foods.forEach((e) => {
    ALL_KEYS.forEach((k) => (t[k] += (e.n[k] || 0) * e.qty));
    if (hasMicros(e.n)) withMicros++;
  });
  return { ...t, count: foods.length, withMicros };
}
const burned = (date) => day(date).workouts.reduce((a, w) => a + (w.kcal || 0), 0);
function streak() {
  let s = 0, d = today();
  if (!day(d).foods.length) d = addDays(d, -1);
  while (day(d).foods.length) { s++; d = addDays(d, -1); }
  return s;
}

// ================= ui state =================
const ui = {
  tab: "home", date: today(), seg: "food", expanded: {}, nutrOpen: false,
  ob: null, obStep: 0, obDir: 1, prev: {}, next: {}, lastScreen: "", loginErr: "", busy: {},
};

// animated values: templates read the previous value, post-render animates to the new one
const prevOf = (k, d = 0) => (k in ui.prev ? ui.prev[k] : d);
function aRing(key, frac, C) {
  const to = C * (1 - Math.max(0, Math.min(1, frac)));
  ui.next[key] = to;
  return `stroke-dasharray="${C}" stroke-dashoffset="${prevOf(key, C)}" data-akey="${key}" data-prop="ring" data-to="${to}"`;
}
function aBar(key, pct) {
  const to = Math.max(0, Math.min(100, pct));
  ui.next[key] = to;
  return `style="width:${prevOf(key, 0)}%" data-akey="${key}" data-prop="width" data-to="${to}"`;
}
function aNum(key, val, dec = 0) {
  ui.next[key] = val;
  const from = prevOf(key, 0);
  return `<span data-akey="${key}" data-prop="count" data-from="${from}" data-to="${val}" data-dec="${dec}">${fmt(dec ? from : R(from), dec)}</span>`;
}
function runAnimations() {
  const els = document.querySelectorAll("[data-akey]");
  requestAnimationFrame(() => requestAnimationFrame(() => {
    els.forEach((el) => {
      const to = +el.dataset.to;
      if (el.dataset.prop === "ring") el.style.strokeDashoffset = to;
      else if (el.dataset.prop === "width") el.style.width = to + "%";
      else if (el.dataset.prop === "height") el.style.height = to + "%";
      else if (el.dataset.prop === "count") countUp(el, +el.dataset.from, to, +el.dataset.dec);
    });
  }));
  Object.assign(ui.prev, ui.next);
  ui.next = {};
}
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
function countUp(el, from, to, dec) {
  if (from === to || reduced) { el.textContent = fmt(dec ? to : R(to), dec); return; }
  const t0 = performance.now(), dur = 900;
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3), v = from + (to - from) * e;
    el.textContent = fmt(dec ? Math.round(v * 10) / 10 : R(v), dec);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ================= toast / confetti =================
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("show"), 2200);
}
function confetti() {
  if (reduced) return;
  const c = $("#confetti"), x = c.getContext("2d");
  const W = (c.width = innerWidth * devicePixelRatio), H = (c.height = innerHeight * devicePixelRatio);
  const cols = ["#13a05a", "#f28b1d", "#7a5af8", "#12a4d9", "#ffc23d", "#ff6b6f"];
  const ps = Array.from({ length: 140 }, () => ({
    x: W / 2, y: H * 0.35, vx: (Math.random() - 0.5) * 22 * devicePixelRatio, vy: (Math.random() * -18 - 6) * devicePixelRatio,
    s: (4 + Math.random() * 6) * devicePixelRatio, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0],
  }));
  let f = 0;
  (function loop() {
    x.clearRect(0, 0, W, H);
    ps.forEach((p) => {
      p.vy += 0.55 * devicePixelRatio; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore();
    });
    if (++f < 150) requestAnimationFrame(loop); else x.clearRect(0, 0, W, H);
  })();
}

// ================= icons =================
const I = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>',
  diary: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  google: '<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
};

// ================= root render =================
function render(forceEnter = false) {
  const app = $("#app");
  const tb = $("#tabbar");
  if (S.mode === "loading") { app.innerHTML = `<div class="splash"><div class="logo">Health<i>yfi</i></div></div>`; tb.hidden = true; return; }
  if (S.mode === "signedout") { app.innerHTML = loginView(); tb.hidden = true; return; }
  if (!P().onboarded) { app.innerHTML = onboardingView(); tb.hidden = true; return; }
  const key = ui.tab + "|" + (ui.tab === "diary" ? ui.seg : "");
  const enter = forceEnter || key !== ui.lastScreen;
  ui.lastScreen = key;
  const view = { home: homeView, diary: diaryView, progress: progressView, me: meView }[ui.tab]();
  app.innerHTML = `<main class="screen ${enter ? "enter" : ""}">${view}</main>`;
  tb.hidden = false;
  renderTabbar();
  runAnimations();
}

function renderTabbar() {
  const tabs = [["home", "Home", I.home], ["diary", "Diary", I.diary], ["fab"], ["progress", "Progress", I.chart], ["me", "Me", I.me]];
  const nav = $("#tabbar nav");
  nav.innerHTML = `<span class="tab-ind"></span>` + tabs.map(([k, l, ic]) =>
    k === "fab" ? `<button class="fab" data-a="fab" aria-label="Quick add">+</button>`
      : `<button class="tab ${ui.tab === k ? "on" : ""}" data-a="tab" data-v="${k}" aria-label="${l}" ${ui.tab === k ? 'aria-current="page"' : ""}>${ic}<span>${l}</span></button>`).join("");
  const on = nav.querySelector(".tab.on"), ind = nav.querySelector(".tab-ind");
  if (on) {
    const prevX = ui.prev.tabX;
    ind.style.width = on.offsetWidth + "px";
    ind.style.transform = `translateX(${prevX ?? on.offsetLeft - 6}px)`;
    requestAnimationFrame(() => (ind.style.transform = `translateX(${on.offsetLeft - 6}px)`));
    ui.prev.tabX = on.offsetLeft - 6;
  }
}

// ================= login =================
function loginView() {
  const bubbles = [["🥗", 8, 10], ["🍳", 70, 6], ["🥑", 40, 18], ["🍎", 80, 26], ["🥛", 12, 32], ["🍛", 56, 36], ["💪", 26, 44]].map(([e, l, t]) => [e, l, t * 1.6]);
  return `<section class="login">
    <div class="bubbles">${bubbles.map(([e, l, t], i) => `<span style="left:${l}%;top:${t}%;animation-delay:${i * -0.9}s">${e}</span>`).join("")}</div>
    <div style="position:relative">
      <div class="logo">Health<i>yfi</i></div>
      <p class="tag">Snap your plate, see every calorie, protein gram and vitamin. Built for Indian food.</p>
      <div class="feat"><span>📸 AI photo scan</span><span>🧬 Micronutrients</span><span>🍛 Indian foods</span><span>🔥 Streaks</span></div>
    </div>
    <div style="position:relative;display:flex;flex-direction:column;gap:12px">
      ${ui.loginErr ? `<div class="err">${esc(ui.loginErr)}</div>` : ""}
      <button class="gbtn" data-a="google">${I.google} Continue with Google</button>
      <button class="guest" data-a="guest">Use without an account</button>
      <p class="fine">Without an account, your data stays on this device only.</p>
    </div>
  </section>`;
}

// ================= onboarding =================
function obDraft() {
  if (!ui.ob) ui.ob = { ...P(), name: P().name || (S.user?.name || "").split(" ")[0] || "" };
  return ui.ob;
}
function onboardingView() {
  const d = obDraft(), st = ui.obStep, steps = 5;
  const body = [
    () => `<p class="eyebrow">Step 1 of 4</p><h1>Hi! What should I call you?</h1>
      <div class="field"><label for="ob-name">First name</label><input id="ob-name" value="${esc(d.name)}" autocomplete="given-name" placeholder="Revanth"></div>
      <div class="field"><span class="label">I am</span><div class="opts" style="grid-template-columns:1fr 1fr">
        <button class="opt ${d.male ? "on" : ""}" data-a="ob-set" data-k="male" data-v="1"><span class="e">👨</span><b>Male</b></button>
        <button class="opt ${!d.male ? "on" : ""}" data-a="ob-set" data-k="male" data-v="0"><span class="e">👩</span><b>Female</b></button></div></div>`,
    () => `<p class="eyebrow">Step 2 of 4</p><h1>Your body today</h1><p class="muted">Used to work out how much energy you burn.</p>
      <div class="grid2"><div class="field"><label for="ob-age">Age</label><input id="ob-age" inputmode="numeric" value="${d.age}"></div>
      <div class="field"><label for="ob-h">Height (cm)</label><input id="ob-h" inputmode="decimal" value="${d.heightCm}"></div></div>
      <div class="grid2"><div class="field"><label for="ob-w">Weight (kg)</label><input id="ob-w" inputmode="decimal" value="${d.weightKg}"></div>
      <div class="field"><label for="ob-gw">Goal weight (kg)</label><input id="ob-gw" inputmode="decimal" value="${d.goalWeightKg}"></div></div>`,
    () => `<p class="eyebrow">Step 3 of 4</p><h1>What's your goal?</h1><div class="opts">
      ${[["lose", "🔥", "Lose fat", "500 kcal under maintenance, high protein"], ["maintain", "⚖️", "Stay fit", "Eat at maintenance"], ["gain", "💪", "Build muscle", "300 kcal surplus with 1.8 g/kg protein"]]
        .map(([v, e, t, s]) => `<button class="opt ${d.goal === v ? "on" : ""}" data-a="ob-set" data-k="goal" data-v="${v}"><span class="e">${e}</span><span><b>${t}</b><span>${s}</span></span></button>`).join("")}</div>`,
    () => `<p class="eyebrow">Step 4 of 4</p><h1>How active are you?</h1><div class="opts">
      ${[[1.2, "🪑", "Mostly sitting", "Desk job, little exercise"], [1.375, "🚶", "Lightly active", "Walks, workout 1–3 days a week"], [1.55, "🏃", "Active", "Workout 3–5 days a week"], [1.725, "🏋️", "Very active", "Hard training 6–7 days or a physical job"]]
        .map(([v, e, t, s]) => `<button class="opt ${d.activity === v ? "on" : ""}" data-a="ob-set" data-k="activity" data-v="${v}"><span class="e">${e}</span><span><b>${t}</b><span>${s}</span></span></button>`).join("")}</div>`,
    () => `<h1>Your daily plan${d.name ? ", " + esc(d.name) : ""}</h1>
      <div class="result"><div><span class="eyebrow" style="color:rgba(255,255,255,.75)">Eat every day</span><div class="kc">${aNum("ob-kc", kcalTarget(d))}</div><span>kcal</span></div>
      <div class="row3"><div><b>${aNum("ob-p", proteinTarget(d))}g</b><span>protein</span></div><div><b>${aNum("ob-c", carbTarget(d))}g</b><span>carbs</span></div><div><b>${aNum("ob-f", fatTarget(d))}g</b><span>fat</span></div></div>
      <p class="small" style="color:rgba(255,255,255,.85)">BMR ${R(bmr(d))} kcal × activity ${d.activity}${d.goal === "lose" ? " − 500 for fat loss" : d.goal === "gain" ? " + 300 for muscle gain" : ""}. You can change this any time.</p></div>`,
  ][st]();
  const html = `<section class="ob">
    <div class="ob-top">${st ? `<button class="x" data-a="ob-back" aria-label="Back">‹</button>` : ""}<div class="ob-prog"><i style="width:${((st + 1) / steps) * 100}%"></i></div></div>
    <div class="ob-body ${ui.obDir < 0 ? "back" : ""}">${body}</div>
    <button class="btn lg block" data-a="ob-next">${st === steps - 1 ? "Start tracking" : "Continue"}</button>
  </section>`;
  if (st === steps - 1) setTimeout(runAnimations);
  return html;
}
function obCollect() {
  const d = obDraft(), v = (id) => $("#" + id)?.value;
  if (ui.obStep === 0) d.name = (v("ob-name") || "").trim();
  if (ui.obStep === 1) {
    d.age = R(+v("ob-age") || d.age); d.heightCm = +v("ob-h") || d.heightCm;
    d.weightKg = +v("ob-w") || d.weightKg; d.goalWeightKg = +v("ob-gw") || d.goalWeightKg;
  }
}

// ================= home =================
function weekStrip() {
  const t = today();
  // the 7 days ending today, or centred on the chosen day when it is older
  const end = ui.date < addDays(t, -3) ? addDays(ui.date, 3) : t;
  const days = [...Array(7)].map((_, i) => addDays(end, i - 6));
  return `<div class="week">${days.map((d) => {
    const tt = totals(d), frac = Math.min(1, tt.kcal / kcalTarget()), C = 2 * Math.PI * 14, dt = new Date(d + "T12:00:00");
    return `<button class="wday ${d === ui.date ? "on" : ""}" data-a="date" data-v="${d}" ${d > t ? "disabled" : ""}>
      <span>${dt.toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2)}</span>
      <span class="rw"><svg viewBox="0 0 34 34"><circle cx="17" cy="17" r="14" fill="none" stroke="var(--line)" stroke-width="3"/>
      <circle cx="17" cy="17" r="14" fill="none" stroke="${frac > 1.1 ? "var(--saffron)" : "var(--emerald)"}" stroke-width="3" stroke-linecap="round" transform="rotate(-90 17 17)" class="ring-arc" ${aRing("w" + d, frac, C)}/></svg><span class="d">${dt.getDate()}</span></span></button>`;
  }).join("")}</div>`;
}

function dateTitle() {
  const t = today();
  if (ui.date === t) return "Today";
  if (ui.date === addDays(t, -1)) return "Yesterday";
  return new Date(ui.date + "T12:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
}

function homeView() {
  const p = P(), d = day(ui.date), t = totals(ui.date), b = burned(ui.date), target = kcalTarget();
  const left = target + b - R(t.kcal), C = 2 * Math.PI * 70;
  const h = new Date().getHours(), hello = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const st = streak();
  const initials = (p.name || S.user?.name || "?").slice(0, 1).toUpperCase();
  return `
  <header class="topbar">
    <button class="avatar" data-a="tab" data-v="me" aria-label="Profile">${S.user?.photo ? `<img src="${esc(S.user.photo)}" alt="" referrerpolicy="no-referrer">` : initials}</button>
    <div class="hi"><p class="muted small">${hello}</p><h1>${esc(p.name || "there")}</h1></div>
    <span class="chip-streak" title="Days in a row with food logged">🔥 ${st}</span>
  </header>
  ${weekStrip()}
  <section class="hero">
    <div class="top"><span class="eyebrow">${dateTitle()}</span><span class="badge">Goal ${target} kcal</span></div>
    <div class="hero-main">
      <div class="hstat"><b>${aNum("eaten", R(t.kcal))}</b><span>Eaten</span></div>
      <div class="bigring"><svg viewBox="0 0 168 168"><circle cx="84" cy="84" r="70" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="14"/>
        <circle cx="84" cy="84" r="70" fill="none" stroke="${left < 0 ? "#FFB55C" : "#FFFFFF"}" stroke-width="14" stroke-linecap="round" class="ring-arc" ${aRing("cal", t.kcal / (target + b || 1), C)}/></svg>
        <div class="c"><b>${aNum("left", Math.abs(left))}</b><span>${left < 0 ? "kcal over" : "kcal left"}</span></div></div>
      <div class="hstat"><b>${aNum("burned", b)}</b><span>Burned</span></div>
    </div>
    <div class="hero-macros">${MACROS.map((m) => { const v = t[m.k], g = macroTarget(m.k);
      return `<div class="hm"><div class="t"><span>${m.label}</span><span>${g ? R((v / g) * 100) : 0}%</span></div><div class="bar"><i ${aBar("m" + m.k, g ? (v / g) * 100 : 0)} data-c="${m.k}"></i></div><b>${aNum("mv" + m.k, R(v))}<small> / ${g}g</small></b></div>`; }).join("")}</div>
  </section>
  ${nutrientsCard(t)}
  <section class="card">
    <div class="card-h"><h2>Meals</h2><button class="link" data-a="tab" data-v="diary">Diary ›</button></div>
    <div>${MEALS.map((m) => { const items = d.foods.filter((e) => e.meal === m.k), k = items.reduce((a, e) => a + e.n.kcal * e.qty, 0);
      return `<div class="meal"><div class="mic" style="background:${mealBg(m)}">${m.e}</div><div class="grow"><b>${m.k}</b><p>${items.length ? esc(items.map((e) => e.name).join(", ")) : "Nothing logged"}</p></div>
        <span class="num" style="font-size:15px">${R(k)}<span class="muted xs"> kcal</span></span><button class="plus" data-a="add" data-m="${m.k}" aria-label="Add to ${m.k}">+</button></div>`; }).join("")}</div>
  </section>
  ${waterCard(d)}
  ${p.supplements.length ? `<section class="card"><div class="card-h"><h2>Supplements</h2><span class="meta">${p.supplements.filter((s) => d.supps.includes(s)).length} of ${p.supplements.length}</span></div>
    <div class="pills">${p.supplements.map((s, i) => `<button class="pill ${d.supps.includes(s) ? "on" : ""}" data-a="supp" data-i="${i}"><span class="tick">✓</span>${esc(s)}</button>`).join("")}</div></section>` : ""}
  <section class="card"><div class="card-h"><h2>Body</h2><button class="link" data-a="body">Update ›</button></div>
    <div class="tiles">
      <button class="tile" data-a="body"><span class="ic">⚖️</span><b>${d.body.w ? fmt(d.body.w) : "–"}</b><span>kg weight</span></button>
      <button class="tile" data-a="body"><span class="ic">😴</span><b>${d.body.sleep ? fmt(d.body.sleep) : "–"}</b><span>h sleep</span></button>
      <button class="tile" data-a="body"><span class="ic">👟</span><b>${d.body.steps ? (d.body.steps / 1000).toFixed(1) + "k" : "–"}</b><span>of ${(p.stepsTarget / 1000).toFixed(0)}k steps</span></button>
    </div></section>
  <section class="card insight"><div class="card-h"><h2>Today's insight</h2><span>✨</span></div><ul>${insights().map((x) => `<li><span>${x}</span></li>`).join("")}</ul></section>`;
}

function pctClass(n, v, g) {
  if (n.limit) return v > g ? "bad" : v > g * 0.8 ? "warn" : "";
  return "";
}
function nutrientsCard(t) {
  const all = [...DETAIL_MACROS, ...MICROS];
  const pick = ["fiber", "sodium", "iron", "calcium", "vitC", "vitB12"].map((k) => all.find((n) => n.k === k));
  const missing = t.count - t.withMicros;
  const row = (n) => { const g = nGoal(n), v = t[n.k] || 0;
    return `<div class="nrow"><span>${n.label}${n.limit ? ' <span class="muted xs">limit</span>' : ""}</span><span class="v">${fmt(R(v * 10) / 10)}<small> / ${g} ${n.unit}</small></span>
      <div class="mini"><i class="${pctClass(n, v, g)}" ${aBar("n" + n.k, (v / g) * 100)}></i></div></div>`; };
  return `<section class="card ${ui.nutrOpen ? "open-chev" : ""}">
    <div class="card-h"><h2>Nutrients</h2><button class="link" data-a="nutr">${ui.nutrOpen ? "Less" : "All nutrients"} <span class="chev">⌄</span></button></div>
    <div class="nchips">${pick.map((n) => { const g = nGoal(n), v = t[n.k] || 0;
      return `<div class="nchip"><span class="l">${n.label}</span><b>${fmt(R(v * 10) / 10)}<span class="muted xs"> ${n.unit}</span></b><div class="mini"><i class="${pctClass(n, v, g)}" ${aBar("c" + n.k, (v / g) * 100)}></i></div></div>`; }).join("")}</div>
    ${missing > 0 ? `<div class="missing"><span>🧬</span><span class="grow">${missing} food${missing > 1 ? "s" : ""} without vitamin & mineral data</span><button class="btn sm saffron" data-a="enrich-day" ${ui.busy.enrichDay ? "disabled" : ""}>${ui.busy.enrichDay ? "Fetching…" : "Fetch with AI"}</button></div>` : ""}
    <div class="collapse ${ui.nutrOpen ? "open" : ""}"><div><div class="ngroup" style="padding-top:4px">
      <p class="eyebrow">More macros</p>${DETAIL_MACROS.map(row).join("")}
      <p class="eyebrow" style="margin-top:6px">Minerals</p>${MICROS.filter((n) => n.group === "Minerals").map(row).join("")}
      <p class="eyebrow" style="margin-top:6px">Vitamins</p>${MICROS.filter((n) => n.group === "Vitamins").map(row).join("")}
      <p class="muted xs">Daily values: ICMR-NIN 2020 RDA for Indian adults; sodium and sugar use WHO limits.</p>
    </div></div></div>
  </section>`;
}

function waterCard(d) {
  const p = P(), frac = Math.min(1, d.water / p.waterTarget);
  ui.next.water = frac * 100;
  return `<section class="card"><div class="card-h"><h2>Water</h2><span class="meta">${d.water * 250} / ${p.waterTarget * 250} ml</span></div>
    <div class="water">
      <div class="glass"><div class="fill" style="height:${prevOf("water", 0)}%" data-akey="water" data-prop="height" data-to="${frac * 100}">
        <svg class="wave" viewBox="0 0 300 12" preserveAspectRatio="none"><path d="M0 6 Q 12.5 0 25 6 T 50 6 T 75 6 T 100 6 T 125 6 T 150 6 T 175 6 T 200 6 T 225 6 T 250 6 T 275 6 T 300 6 V12 H0z"/></svg></div></div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <div><span class="big">${aNum("wn", d.water)}</span><span class="muted"> / ${p.waterTarget} glasses</span></div>
        <div class="dots">${Array.from({ length: p.waterTarget }, (_, i) => `<i class="${i < d.water ? "on" : ""}"></i>`).join("")}</div>
        <div class="ctl"><button class="roundbtn" data-a="water-" aria-label="Remove a glass">−</button><button class="roundbtn primary" data-a="water+" aria-label="Add a glass">+</button><span class="muted small">250 ml each</span></div>
      </div></div></section>`;
}

function insights() {
  const p = P(), d = day(ui.date), t = totals(ui.date), out = [];
  const left = kcalTarget() + burned(ui.date) - R(t.kcal), pl = proteinTarget() - R(t.protein);
  if (!d.foods.length) out.push("Nothing logged yet. Tap + and snap a photo of your next meal.");
  if (pl > 10) out.push(`<b>${pl} g protein</b> to go. Whey scoop 24 g, 100 g chicken breast 31 g, 100 g paneer 18 g, 50 g soya chunks 26 g.`);
  else if (d.foods.length) out.push("Protein goal hit. Nice work 💪");
  if (left < -150) out.push(`You're <b>${-left} kcal over</b>. A 30-minute brisk walk burns about 150 kcal.`);
  if (t.withMicros) {
    const low = MICROS.filter((n) => n.goal && t[n.k] < nGoal(n) * 0.5).map((n) => n.label).slice(0, 3);
    if (low.length && new Date().getHours() >= 18) out.push(`Running low on ${low.join(", ")} today.`);
    if (t.sodium > 2000) out.push(`Sodium is at ${R(t.sodium)} mg, above the 2,000 mg limit. Go easy on pickles and papad.`);
  }
  if (d.water < p.waterTarget) out.push(`${p.waterTarget - d.water} more glass${p.waterTarget - d.water > 1 ? "es" : ""} of water to hit your goal.`);
  const miss = p.supplements.filter((s) => !d.supps.includes(s));
  if (miss.length) out.push(`Still to take: ${esc(miss.join(", "))}.`);
  if (d.body.sleep && d.body.sleep < 7) out.push(`Only ${fmt(d.body.sleep)} h sleep. 7–8 h helps recovery and appetite control.`);
  return out.slice(0, 4);
}

// ================= diary =================
function diaryView() {
  const t = totals(ui.date);
  return `<header class="topbar"><div class="hi"><p class="muted small">Diary</p><h1>${dateTitle()}</h1></div>
    <button class="x" data-a="day-" aria-label="Previous day">‹</button><button class="x" data-a="day+" aria-label="Next day" ${ui.date >= today() ? "disabled" : ""}>›</button></header>
  <div class="seg" data-seg>${["food", "workout"].map((s) => `<button class="${ui.seg === s ? "on" : ""}" data-a="seg" data-v="${s}">${s === "food" ? "Food" : "Workout"}</button>`).join("")}<span class="ind" style="width:calc(50% - 4px);transform:translateX(${ui.seg === "food" ? 0 : "100%"})"></span></div>
  ${ui.seg === "food" ? `<div class="dsum"><div><b>${aNum("deaten", R(t.kcal))}</b><span>of ${kcalTarget()} kcal</span></div>
    ${MACROS.map((m) => `<div><b style="color:${m.color}">${aNum("d" + m.k, R(t[m.k]))}g</b><span>${m.label}</span></div>`).join("")}</div>
  ${MEALS.map(mealCard).join("")}` : workoutView()}`;
}

function mealCard(m) {
  const d = day(ui.date), items = d.foods.filter((e) => e.meal === m.k), k = items.reduce((a, e) => a + e.n.kcal * e.qty, 0);
  const prev = day(addDays(ui.date, -1)).foods.filter((e) => e.meal === m.k);
  return `<section class="card"><div class="card-h"><div style="display:flex;align-items:center;gap:12px"><div class="mic" style="background:${mealBg(m)};width:40px;height:40px;font-size:19px">${m.e}</div><div><h2>${m.k}</h2><span class="muted xs">${R(k)} kcal · P ${R(items.reduce((a, e) => a + e.n.protein * e.qty, 0))} g</span></div></div>
    <button class="plus" data-a="add" data-m="${m.k}" aria-label="Add to ${m.k}">+</button></div>
    ${items.length ? `<div>${items.map(entryRow).join("")}</div>` : `<div class="muted small" style="display:flex;gap:10px;align-items:center;justify-content:space-between">Nothing logged.${prev.length ? `<button class="btn sm ghost" data-a="repeat" data-m="${m.k}">Repeat yesterday</button>` : ""}</div>`}
  </section>`;
}

function entryRow(e) {
  const open = !!ui.expanded[e.id], n = e.n, q = e.qty;
  const src = { ai: "AI", photo: "Photo", custom: "Custom", db: "" }[e.src] || "";
  return `<div class="entry"><button class="entry-row" data-a="expand" data-id="${e.id}" aria-expanded="${open}">
      <span class="thumb">${e.img ? `<img src="${e.img}" alt="">` : foodEmoji(e.name)}</span>
      <span class="grow"><span class="nm">${esc(e.name)}</span><span class="sub">${fmt(q)} × ${esc(e.unit)} ${src ? `· <span class="srcchip">${src}</span>` : ""}</span></span>
      <span class="kc">${R(n.kcal * q)}<small>kcal</small></span></button>
    <div class="collapse ${open ? "open" : ""}"><div>${open ? `<div class="entry-detail">
      <div class="mgrid"><div><b>${R(n.kcal * q)}</b><span>kcal</span></div>${MACROS.map((m) => `<div><b style="color:${m.color}">${fmt(R(n[m.k] * q * 10) / 10)}g</b><span>${m.label}</span></div>`).join("")}</div>
      ${hasMicros(n) ? microList(n, q) : `<div class="missing"><span>🧬</span><span class="grow">See fibre, vitamins and minerals for this food</span><button class="btn sm saffron" data-a="enrich" data-id="${e.id}" ${ui.busy[e.id] ? "disabled" : ""}>${ui.busy[e.id] ? "Fetching…" : "Get with AI"}</button></div>`}
      <div style="display:flex;gap:10px;align-items:center"><div class="qty"><button data-a="eq-" data-id="${e.id}" aria-label="Less">−</button><span>${fmt(q)}</span><button data-a="eq+" data-id="${e.id}" aria-label="More">+</button></div><span class="muted small grow" style="flex:1">servings</span>
        <button class="btn sm danger" data-a="del" data-id="${e.id}">Remove</button></div>
    </div>` : ""}</div></div></div>`;
}

function microList(n, q = 1) {
  const items = [...DETAIL_MACROS, ...MICROS].filter((x) => typeof n[x.k] === "number");
  return `<div class="ngroup">${items.map((x) => { const v = n[x.k] * q, g = nGoal(x);
    return `<div class="nrow"><span>${x.label}</span><span class="v">${fmt(R(v * 10) / 10)} ${x.unit} <small>${R((v / g) * 100)}%</small></span><div class="mini"><i class="${pctClass(x, v, g)}" style="width:${Math.min(100, (v / g) * 100)}%"></i></div></div>`; }).join("")}</div>`;
}

function foodEmoji(name) {
  const n = name.toLowerCase();
  const map = [["egg", "🥚"], ["chicken", "🍗"], ["fish", "🐟"], ["prawn", "🦐"], ["mutton", "🍖"], ["paneer", "🧀"], ["rice", "🍚"], ["biryani", "🍛"], ["dosa", "🥞"], ["idli", "⚪"], ["roti", "🫓"], ["chapati", "🫓"], ["paratha", "🫓"], ["dal", "🍲"], ["pappu", "🍲"], ["sambar", "🍲"], ["rasam", "🍲"], ["curd", "🥣"], ["yogurt", "🥣"], ["milk", "🥛"], ["buttermilk", "🥛"], ["tea", "☕"], ["coffee", "☕"], ["banana", "🍌"], ["apple", "🍎"], ["mango", "🥭"], ["papaya", "🍈"], ["watermelon", "🍉"], ["guava", "🍐"], ["almond", "🌰"], ["peanut", "🥜"], ["whey", "🥤"], ["oats", "🥣"], ["bread", "🍞"], ["samosa", "🥟"], ["noodle", "🍜"], ["maggi", "🍜"], ["coconut", "🥥"], ["salad", "🥗"], ["sprout", "🌱"], ["laddu", "🟠"], ["jamun", "🟤"]];
  return (map.find(([k]) => n.includes(k)) || [, "🍽️"])[1];
}

// ================= workouts =================
function workoutView() {
  const list = day(ui.date).workouts, b = burned(ui.date);
  const vol = list.filter((w) => !w.cardio).reduce((a, w) => a + w.sets * w.reps * w.weightKg, 0);
  const prs = {};
  Object.values(S.days).forEach((dd) => dd.workouts.forEach((w) => { if (!w.cardio && w.weightKg > 0) { const k = w.exercise.toLowerCase(); prs[k] = Math.max(prs[k] || 0, w.weightKg); } }));
  return `<div class="tiles"><div class="tile"><span class="ic">🔥</span><b>${aNum("wb", b)}</b><span>kcal burned</span></div><div class="tile"><span class="ic">🏋️</span><b>${aNum("wv", R(vol))}</b><span>kg volume</span></div><div class="tile"><span class="ic">⏱️</span><b>${list.reduce((a, w) => a + (w.minutes || 0), 0)}</b><span>minutes</span></div></div>
  <button class="btn lg block" data-a="workout">+ Log exercise</button>
  <section class="card">${list.length ? list.map((w) => { const pr = prs[w.exercise.toLowerCase()];
    const det = w.cardio ? `${w.minutes} min` : `${w.sets} × ${w.reps}${w.weightKg > 0 ? ` @ ${fmt(w.weightKg)} kg` : ""}`;
    return `<div class="wo"><div class="ic">${w.cardio ? "🏃" : "🏋️"}</div><div class="grow"><b>${esc(w.exercise)}</b><span class="muted small">${det} · ${w.kcal} kcal</span>
      ${!w.cardio && pr ? (w.weightKg > 0 && w.weightKg >= pr ? `<div class="pb">Personal best</div>` : `<div class="muted xs">Best ${fmt(pr)} kg</div>`) : ""}</div><button class="x" data-a="wdel" data-id="${w.id}" aria-label="Remove">✕</button></div>`; }).join("")
    : `<div class="empty"><span class="em">🏃</span><b>No exercise logged</b><span class="small">Log a gym session or a walk to see calories burned.</span></div>`}</section>`;
}

// ================= progress =================
function progressView() {
  const p = P(), t = today(), days = [...Array(7)].map((_, i) => addDays(t, i - 6));
  const tot = days.map(totals), labels = days.map((d) => new Date(d + "T12:00:00").toLocaleDateString("en-IN", { weekday: "narrow" }));
  const logged = tot.filter((x) => x.count), avgK = logged.length ? R(logged.reduce((a, x) => a + x.kcal, 0) / logged.length) : 0;
  const weights = Object.keys(S.days).sort().filter((d) => S.days[d].body?.w).slice(-30).map((d) => ({ d, w: +S.days[d].body.w }));
  const woDays = days.filter((d) => day(d).workouts.length).length;
  const mdays = tot.filter((x) => x.withMicros);
  const bmi = p.weightKg / (p.heightCm / 100) ** 2, bmiL = bmi < 18.5 ? "Underweight" : bmi < 23 ? "Healthy" : bmi < 25 ? "Overweight" : "Obese";
  return `<header class="topbar"><div class="hi"><p class="muted small">Last 7 days</p><h1>Progress</h1></div><span class="chip-streak">🔥 ${streak()} day streak</span></header>
  <div class="tiles"><div class="tile"><span class="ic">🍽️</span><b>${aNum("pavg", avgK)}</b><span>avg kcal/day</span></div><div class="tile"><span class="ic">💪</span><b>${woDays}/7</b><span>workout days</span></div><div class="tile"><span class="ic">📏</span><b>${fmt(R(bmi * 10) / 10)}</b><span>BMI · ${bmiL}</span></div></div>
  <section class="card"><div class="card-h"><h2>Weight</h2><span class="meta" style="color:var(--saffron)">Goal ${fmt(p.goalWeightKg)} kg</span></div>
    ${weights.length < 2 ? `<div class="empty"><span class="em">⚖️</span><span class="small">Log your weight on two or more days to see your trend.</span><button class="btn sm ghost" data-a="body">Log weight</button></div>` : weightChart(weights, p.goalWeightKg)}</section>
  <section class="card"><div class="card-h"><h2>Calories</h2><span class="meta">target ${kcalTarget()}</span></div>${bars(tot.map((x) => x.kcal), labels, kcalTarget(), "var(--emerald)")}</section>
  <section class="card"><div class="card-h"><h2>Protein</h2><span class="meta">target ${proteinTarget()} g</span></div>${bars(tot.map((x) => x.protein), labels, proteinTarget(), "var(--protein)")}</section>
  <section class="card"><div class="card-h"><h2>Vitamins & minerals</h2><span class="meta">avg % of daily value</span></div>
    ${mdays.length ? `<div class="ngroup">${MICROS.map((n) => { const avg = mdays.reduce((a, x) => a + x[n.k], 0) / mdays.length, g = nGoal(n), pc = R((avg / g) * 100);
      return `<div class="nrow"><span>${n.label}</span><span class="v">${pc}%<small> · ${fmt(R(avg * 10) / 10)} ${n.unit}</small></span><div class="mini"><i class="${n.limit ? pctClass(n, avg, g) : pc < 50 ? "warn" : ""}" ${aBar("pm" + n.k, pc)}></i></div></div>`; }).join("")}</div>
      <p class="muted xs">Averaged over ${mdays.length} day${mdays.length > 1 ? "s" : ""} with full nutrient data.</p>`
    : `<div class="empty"><span class="em">🧬</span><span class="small">Scan a meal or fetch nutrients with AI to see your vitamin and mineral intake.</span></div>`}</section>`;
}

function weightChart(pts, goal) {
  const W = 340, H = 170, L = 30, Rt = 8, T = 10, B = 22;
  const vals = pts.map((p) => p.w).concat(goal), mn = Math.floor(Math.min(...vals) - 1), mx = Math.ceil(Math.max(...vals) + 1);
  const x = (i) => L + ((W - L - Rt) * i) / (pts.length - 1), y = (v) => T + (H - T - B) * (1 - (v - mn) / (mx - mn));
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.w).toFixed(1)}`).join("");
  const first = pts[0], last = pts[pts.length - 1], diff = last.w - first.w, toGo = goal - last.w;
  const ticks = [mn, R((mn + mx) / 2), mx];
  return `<div><span class="num" style="font-size:28px">${fmt(last.w)}</span><span class="muted"> kg</span> <span class="small" style="color:${(diff < 0) === (P().goal !== "gain") ? "var(--good)" : "var(--saffron)"};font-weight:700">${diff >= 0 ? "▲" : "▼"} ${fmt(Math.abs(R(diff * 10) / 10))} kg</span></div>
  <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend">
    <defs><linearGradient id="wg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--emerald)" stop-opacity=".28"/><stop offset="1" stop-color="var(--emerald)" stop-opacity="0"/></linearGradient></defs>
    ${ticks.map((t) => `<line x1="${L}" x2="${W - Rt}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)"/><text x="${L - 6}" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join("")}
    <line x1="${L}" x2="${W - Rt}" y1="${y(goal)}" y2="${y(goal)}" stroke="var(--saffron)" stroke-width="2" stroke-dasharray="6 5"/>
    <path d="${line}L${x(pts.length - 1)},${H - B}L${L},${H - B}Z" fill="url(#wg)"/>
    <path class="chart-path" d="${line}" fill="none" stroke="var(--emerald)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(pts.length - 1)}" cy="${y(last.w)}" r="6" fill="var(--emerald)" stroke="var(--card)" stroke-width="3"/>
    <text x="${L}" y="${H - 4}">${first.d.slice(8)}/${first.d.slice(5, 7)}</text><text x="${W - Rt}" y="${H - 4}" text-anchor="end">${last.d.slice(8)}/${last.d.slice(5, 7)}</text>
  </svg><p class="muted small">${Math.abs(toGo) < 0.5 ? "You're at your goal weight 🎉" : `${fmt(Math.abs(R(toGo * 10) / 10))} kg to ${toGo < 0 ? "lose" : "gain"}`}</p>`;
}

function bars(vals, labels, target, color) {
  const W = 340, H = 150, T = 18, B = 20, mx = Math.max(target, ...vals) * 1.12 || 1, slot = W / vals.length, bw = slot * 0.5;
  const y = (v) => T + (H - T - B) * (1 - v / mx);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Last 7 days">
    ${vals.map((v, i) => { const x = i * slot + (slot - bw) / 2, h = ((H - T - B) * v) / mx;
      return `<rect x="${x}" y="${T}" width="${bw}" height="${H - T - B}" rx="9" fill="var(--card-2)"/>${h > 0 ? `<rect class="chart-bar" style="animation-delay:${i * 0.05}s" x="${x}" y="${y(v)}" width="${bw}" height="${h}" rx="9" fill="${v > target * 1.1 ? "var(--saffron)" : color}"/>` : ""}
      ${i === vals.length - 1 && v > 0 ? `<text x="${x + bw / 2}" y="${y(v) - 5}" text-anchor="middle" style="fill:var(--fg)">${R(v)}</text>` : ""}
      <text x="${x + bw / 2}" y="${H - 4}" text-anchor="middle">${labels[i]}</text>`; }).join("")}
    <line x1="0" x2="${W}" y1="${y(target)}" y2="${y(target)}" stroke="var(--fg)" stroke-opacity=".35" stroke-dasharray="4 5"/>
  </svg>`;
}

// ================= me =================
function meView() {
  const p = P(), cloud = S.mode === "cloud", key = ai.getKey();
  const theme = localStorage.getItem("healthyfi.theme") || "system";
  return `<header class="topbar"><div class="hi"><p class="muted small">Profile</p><h1>Me</h1></div></header>
  <section class="card" style="flex-direction:row;align-items:center;gap:14px">
    <div class="avatar" style="width:58px;height:58px;font-size:22px">${S.user?.photo ? `<img src="${esc(S.user.photo)}" alt="" referrerpolicy="no-referrer">` : esc((p.name || "?").slice(0, 1).toUpperCase())}</div>
    <div style="flex:1;min-width:0"><b style="font-size:17px">${esc(S.user?.name || p.name || "Guest")}</b><p class="muted small" style="overflow:hidden;text-overflow:ellipsis">${cloud ? esc(S.user.email) : "Not signed in · data on this device"}</p>
      <p class="xs" style="margin-top:4px"><span class="status-dot ${cloud ? "ok" : ""}"></span>${cloud ? "Synced to your account" : "Local only"}</p></div>
  </section>
  <section class="hero" style="gap:12px"><div class="top"><span class="eyebrow">Daily plan</span><span class="badge">${{ lose: "Lose fat", maintain: "Stay fit", gain: "Build muscle" }[p.goal]}</span></div>
    <div class="hero-macros" style="grid-template-columns:repeat(4,1fr)"><div class="hm"><b>${kcalTarget()}</b><span class="xs">kcal</span></div>${MACROS.map((m) => `<div class="hm"><b>${macroTarget(m.k)}g</b><span class="xs">${m.label}</span></div>`).join("")}</div></section>
  <div class="list">
    <button class="li" data-a="profile"><span class="ic">👤</span><span class="grow"><b>Edit profile & goals</b><span>${p.age} yrs · ${fmt(p.heightCm)} cm · ${fmt(p.weightKg)} → ${fmt(p.goalWeightKg)} kg</span></span><span class="go">›</span></button>
    <button class="li" data-a="ai"><span class="ic">✨</span><span class="grow"><b>AI settings</b><span><span class="status-dot ${key ? "ok" : ""}"></span>${key ? "Gemini connected · " + esc(ai.getModel()) : "Add a Gemini key to scan photos"}</span></span><span class="go">›</span></button>
    <button class="li" data-a="supps"><span class="ic">💊</span><span class="grow"><b>Supplements</b><span>${p.supplements.length ? esc(p.supplements.join(", ")) : "None"}</span></span><span class="go">›</span></button>
  </div>
  <div class="list"><div class="li" style="flex-wrap:wrap"><span class="ic">🌓</span><span class="grow"><b>Appearance</b></span>
    <div class="seg" style="width:100%">${["system", "light", "dark"].map((t) => `<button class="${theme === t ? "on" : ""}" data-a="theme" data-v="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}<span class="ind" style="width:calc(33.33% - 2.67px);transform:translateX(${["system", "light", "dark"].indexOf(theme) * 100}%)"></span></div></div></div>
  <div class="list">
    <button class="li" data-a="export"><span class="ic">📦</span><span class="grow"><b>Export my data</b><span>Download everything as a JSON file</span></span><span class="go">›</span></button>
    <button class="li" data-a="clear"><span class="ic">🧹</span><span class="grow"><b>Clear all logs</b><span>Keeps your profile and goals</span></span><span class="go">›</span></button>
    ${cloud ? `<button class="li" data-a="signout"><span class="ic">🚪</span><span class="grow"><b>Sign out</b></span></button>`
      : `<button class="li" data-a="signin"><span class="ic">🔐</span><span class="grow"><b>Sign in with Google</b><span>Back up and sync across devices</span></span><span class="go">›</span></button>`}
  </div>
  <p class="muted xs" style="text-align:center">Healthyfi 2.0 · nutrition values are estimates, not medical advice</p>`;
}

// ================= sheets =================
let sheet = null; // {type, ...}
function openSheet(s) {
  sheet = s;
  let root = $("#sheetRoot");
  root.innerHTML = `<div class="scrim" data-a="close-sheet"></div><div class="sheet ${s.full ? "full" : ""}" role="dialog" aria-modal="true"><div class="grab"></div><div id="sheetInner" style="display:flex;flex-direction:column;min-height:0;flex:1"></div></div>`;
  renderSheet();
  requestAnimationFrame(() => requestAnimationFrame(() => { root.querySelector(".scrim").classList.add("show"); root.querySelector(".sheet").classList.add("show"); }));
  document.body.style.overflow = "hidden";
}
function closeSheet() {
  const root = $("#sheetRoot");
  const sc = root.querySelector(".scrim"), sh = root.querySelector(".sheet");
  if (abortCtl) abortCtl.abort();
  sheet = null;
  document.body.style.overflow = "";
  if (!sh) return;
  sc.classList.remove("show"); sh.classList.remove("show");
  setTimeout(() => { if (!sheet) root.innerHTML = ""; }, 420);
}
function renderSheet(focusId) {
  if (!sheet) return;
  const inner = $("#sheetInner");
  const views = { add: addSheet, fab: fabSheet, workout: workoutSheet, body: bodySheet, profile: profileSheet, ai: aiSheet, supps: suppSheet, clear: clearSheet };
  const [title, body] = views[sheet.type]();
  inner.innerHTML = `<div class="sheet-h"><h2>${title}</h2><button class="x" data-a="close-sheet" aria-label="Close">✕</button></div><div class="sheet-b">${body}</div>`;
  if (focusId) { const el = $("#" + focusId); if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch {} } }
}

function fabSheet() {
  const m = mealByTime();
  return ["Quick add", `<div class="qa">
    <button data-a="add" data-m="${m}" data-seg="scan"><span class="e" style="background:var(--mint)">📸</span><b>Scan meal</b><span>Photo to nutrition with AI</span></button>
    <button data-a="add" data-m="${m}"><span class="e" style="background:var(--saffron-soft)">🔎</span><b>Log food</b><span>Search or describe it</span></button>
    <button data-a="water+" data-close="1"><span class="e" style="background:color-mix(in srgb,var(--water) 15%,transparent)">💧</span><b>Water</b><span>Add a 250 ml glass</span></button>
    <button data-a="workout"><span class="e" style="background:var(--saffron-soft)">🏋️</span><b>Exercise</b><span>Gym or cardio</span></button>
    <button data-a="body"><span class="e" style="background:var(--card-2)">⚖️</span><b>Weight & sleep</b><span>Body log</span></button>
    <button data-a="add" data-m="${m}" data-seg="quick"><span class="e" style="background:var(--card-2)">✍️</span><b>Custom food</b><span>Enter values yourself</span></button>
  </div>`];
}

// ---------- add food ----------
let abortCtl = null;
function addSheet() {
  const s = sheet;
  if (s.detail) return [esc(s.detail.item.name), detailView()];
  const segs = [["search", "Search"], ["scan", "Scan photo"], ["quick", "Custom"]];
  const i = segs.findIndex(([k]) => k === s.seg);
  const head = `<div class="chips">${MEALS.map((m) => `<button class="chip ${s.meal === m.k ? "on" : ""}" data-a="meal" data-v="${m.k}">${m.e} ${m.k}</button>`).join("")}</div>
    <div class="seg">${segs.map(([k, l]) => `<button class="${s.seg === k ? "on" : ""}" data-a="aseg" data-v="${k}">${l}</button>`).join("")}<span class="ind" style="width:calc(33.33% - 2.67px);transform:translateX(${i * 100}%)"></span></div>`;
  const body = s.seg === "search" ? `<div class="search"><span>🔎</span><input id="q" placeholder="Search or type e.g. 2 idli with sambar" value="${esc(s.q || "")}" autocomplete="off" enterkeyhint="search"></div><div id="results" style="display:flex;flex-direction:column;gap:12px">${resultsHTML()}</div>`
    : s.seg === "scan" ? scanView() : quickView();
  return [`Add to ${s.meal}`, head + body];
}

function allFoods() { return S.customFoods.map((f) => ({ ...f, src: "custom" })).concat(FOODS.map((f) => ({ ...f, src: "db" }))); }
function resultsHTML() {
  const s = sheet, q = (s.q || "").trim(), ql = q.toLowerCase(), all = allFoods();
  let html = "";
  s.list = [];
  const item = (f) => { s.list.push(f); const idx = s.list.length - 1;
    return `<button class="fitem" data-a="pick" data-i="${idx}"><span class="thumb" style="width:38px;height:38px;border-radius:12px;background:var(--card-2);display:grid;place-items:center;font-size:18px;flex:none">${foodEmoji(f.name)}</span><span class="grow"><b>${esc(f.name)}${f.qty && f.qty !== 1 ? ` <span class="muted">× ${fmt(f.qty)}</span>` : ""}</b><span>${esc(f.unit)} · P ${fmt(f.n.protein)} g${hasMicros(f.n) ? " · 🧬" : ""}</span></span><span class="k">${R(f.n.kcal * (f.qty || 1))}</span><span class="fadd">+</span></button>`; };
  if (q.length >= 2) {
    html += `<button class="ai-row" data-a="ask-ai" ${s.ai?.loading ? "disabled" : ""}><span class="spark">✨</span><span class="grow"><b>${s.ai?.loading ? "Working it out…" : `Ask AI about “${esc(q)}”`}</b><span>Full macros, vitamins and minerals for any food or mix of foods</span></span><span>›</span></button>`;
  }
  if (s.ai?.loading) html += `<div class="shimmer"></div><div class="shimmer" style="opacity:.6"></div>`;
  if (s.ai?.error) html += `<div class="missing"><span>⚠️</span><span class="grow">${esc(s.ai.error)}</span>${s.ai.code === "no_key" || s.ai.code === "bad_key" ? `<button class="btn sm" data-a="ai">Add key</button>` : ""}</div>`;
  if (s.ai?.items?.length && s.ai.forQ === q) {
    html += `<div class="lbl">AI results</div><div class="flist">${s.ai.items.map((f) => item({ ...f, src: "ai" })).join("")}</div>`;
    if (s.ai.items.length > 1) html += `<button class="btn block" data-a="add-all-ai">Add all ${s.ai.items.length} · ${R(s.ai.items.reduce((a, f) => a + f.n.kcal * f.qty, 0))} kcal</button>`;
  }
  if (!q) {
    const names = [...new Set(Object.keys(S.days).sort().reverse().flatMap((d) => S.days[d].foods.slice().reverse().map((e) => e.name)))].slice(0, 6);
    const recent = names.map((n) => { for (const d of Object.keys(S.days).sort().reverse()) { const e = S.days[d].foods.find((x) => x.name === n); if (e) return { name: e.name, unit: e.unit, n: e.n, src: e.src }; } return null; }).filter(Boolean);
    if (recent.length) html += `<div class="lbl">Recent</div><div class="flist">${recent.map(item).join("")}</div>`;
    const cats = [...new Set(FOODS.map((f) => f.cat))];
    cats.forEach((c) => { html += `<div class="lbl">${esc(c)}</div><div class="flist">${all.filter((f) => f.cat === c).map(item).join("")}</div>`; });
    if (S.customFoods.length) html = html.replace('<div class="lbl">' + esc(cats[0]), `<div class="lbl">My foods</div><div class="flist">${S.customFoods.map((f) => item({ ...f, src: "custom" })).join("")}</div><div class="lbl">${esc(cats[0])}`);
  } else {
    const hits = all.filter((f) => f.name.toLowerCase().includes(ql)).slice(0, 30);
    if (hits.length) html += `<div class="lbl">Food list</div><div class="flist">${hits.map(item).join("")}</div>`;
    else if (!s.ai?.items && !s.ai?.loading) html += `<p class="muted small" style="text-align:center">Not in the list. Ask AI above to get it.</p>`;
  }
  return html;
}

async function askAI() {
  const s = sheet, q = (s.q || "").trim();
  if (q.length < 2) return;
  abortCtl?.abort(); abortCtl = new AbortController();
  s.ai = { loading: true, forQ: q };
  $("#results").innerHTML = resultsHTML();
  try {
    const items = await ai.lookupFood(q, { signal: abortCtl.signal });
    if (sheet !== s) return;
    items.forEach((f) => (S.cache[f.name.toLowerCase() + "|" + f.unit] = f.n));
    s.ai = { items, forQ: q };
    if (!items.length) s.ai.error = "AI couldn't find that food. Try describing it differently.";
  } catch (e) {
    if (e.name === "AbortError") return;
    s.ai = { error: e.message, code: e.code, forQ: q };
  }
  if (sheet === s && s.seg === "search" && !s.detail) $("#results").innerHTML = resultsHTML();
}

function detailView() {
  const s = sheet, d = s.detail, it = d.item, n = it.n, q = +d.qty || 0;
  const pk = n.protein * 4 * q, ck = n.carbs * 4 * q, fk = n.fat * 9 * q, tot = pk + ck + fk || 1, C = 2 * Math.PI * 44;
  let off = 0;
  const seg = (v, col) => { const len = (v / tot) * C; const html = `<circle cx="55" cy="55" r="44" fill="none" stroke="${col}" stroke-width="14" stroke-dasharray="${Math.max(0, len - 2)} ${C}" stroke-dashoffset="${-off}"/>`; off += len; return html; };
  const microsBlock = hasMicros(n) ? `<div class="panel"><div class="card-h"><h2 style="font-size:16px">Vitamins & minerals</h2><span class="meta">% daily value</span></div>${microList(n, q)}</div>`
    : d.enriching ? `<div class="panel"><b>Fetching vitamins & minerals…</b><div class="shimmer" style="height:20px"></div><div class="shimmer" style="height:20px"></div><div class="shimmer" style="height:20px"></div></div>`
    : `<div class="missing"><span>🧬</span><span class="grow">${d.enrichErr ? esc(d.enrichErr) : ai.getKey() ? "Get fibre, vitamins and minerals" : "Add a Gemini key to see vitamins and minerals"}</span><button class="btn sm saffron" data-a="${ai.getKey() ? "enrich-detail" : "ai"}">${ai.getKey() ? "Get with AI" : "Add key"}</button></div>`;
  return `<div class="fd-hero"><div class="donut"><svg viewBox="0 0 110 110"><circle cx="55" cy="55" r="44" fill="none" stroke="var(--card-2)" stroke-width="14"/>${seg(pk, "var(--protein)")}${seg(ck, "var(--carbs)")}${seg(fk, "var(--fat)")}</svg><div class="c"><b>${R(n.kcal * q)}</b><span>kcal</span></div></div>
    <div class="legend">${MACROS.map((m) => `<div><i style="background:${m.color}"></i>${m.label}<b>${fmt(R(n[m.k] * q * 10) / 10)} g</b></div>`).join("")}</div></div>
  <div class="stepper"><button class="roundbtn" data-a="dq-" aria-label="Less">−</button><div class="v"><input id="dq" inputmode="decimal" value="${esc(d.qty)}" aria-label="Servings"><span>× ${esc(it.unit)}${it.grams ? ` (${R(it.grams)} g)` : ""}</span></div><button class="roundbtn" data-a="dq+" aria-label="More">+</button></div>
  ${microsBlock}
  <div class="sticky-foot"><button class="btn ghost" data-a="back">Back</button><button class="btn lg" style="flex:1" data-a="add-detail" ${q > 0 ? "" : "disabled"}>Add to ${s.meal} · ${R(n.kcal * q)} kcal</button></div>`;
}

async function enrichDetail() {
  const s = sheet, d = s.detail;
  if (!d || hasMicros(d.item.n)) return;
  const ck = d.item.name.toLowerCase() + "|" + d.item.unit;
  if (S.cache[ck] && hasMicros(S.cache[ck])) { d.item = { ...d.item, n: { ...d.item.n, ...pickMicros(S.cache[ck]) } }; renderSheet(); return; }
  d.enriching = true; d.enrichErr = ""; renderSheet();
  try {
    const r = await ai.enrichFood(d.item.name, d.item.unit);
    if (r) { S.cache[ck] = r.n; d.item = { ...d.item, n: { ...d.item.n, ...pickMicros(r.n) } }; saveProfile(); }
  } catch (e) { d.enrichErr = e.message; }
  d.enriching = false;
  if (sheet === s) renderSheet();
}
const pickMicros = (n) => Object.fromEntries(Object.entries(n).filter(([k]) => !["kcal", "protein", "carbs", "fat"].includes(k)));

// ---------- scan ----------
function scanView() {
  const sc = sheet.scan || {};
  if (!ai.getKey()) return `<div class="scan-drop"><div class="cam">📸</div><h3>Scan your plate</h3><p class="muted small">Photo scanning uses Google Gemini. Add your free API key once to switch it on.</p><button class="btn" data-a="ai">Add Gemini key</button></div>`;
  if (!sc.img) return `<label class="scan-drop" for="photo" style="cursor:pointer"><div class="cam">📸</div><h3>Snap or upload a meal</h3><p class="muted small">I'll spot each food, estimate the portion and work out calories, macros, vitamins and minerals.</p><span class="btn">Choose photo</span></label>
    <input id="photo" type="file" accept="image/*" capture="environment" hidden>
    <div class="field"><label for="scan-note">Anything I can't see? (optional)</label><input id="scan-note" placeholder="e.g. made with 1 tsp ghee, 2 rotis" value="${esc(sc.note || "")}"></div>`;
  const res = sc.result;
  return `<div class="scan-photo"><img src="${sc.img}" alt="Your meal">${sc.loading ? `<div class="beam"></div><span class="tag">Analysing your plate…</span>` : res ? `<span class="tag">${esc(res.title)}</span>` : ""}</div>
  ${sc.loading ? `<div class="shimmer"></div><div class="shimmer" style="opacity:.7"></div><div class="shimmer" style="opacity:.4"></div>` : ""}
  ${sc.error ? `<div class="missing"><span>⚠️</span><span class="grow">${esc(sc.error)}</span><button class="btn sm" data-a="rescan">Retry</button></div>` : ""}
  ${res ? (res.items.length ? `<div class="flist">${res.items.map((f, i) => `<div class="det"><span style="font-size:22px">${foodEmoji(f.name)}</span><div class="grow"><b>${esc(f.name)}</b><span>${esc(f.unit)} · ${R(f.n.kcal * f.qty)} kcal · P ${fmt(R(f.n.protein * f.qty * 10) / 10)} g</span></div>
      <div class="qty"><button data-a="sq-" data-i="${i}" aria-label="Less">−</button><span>${fmt(f.qty)}</span><button data-a="sq+" data-i="${i}" aria-label="More">+</button></div><button class="x" data-a="sdel" data-i="${i}" aria-label="Remove" style="width:30px;height:30px">✕</button></div>`).join("")}</div>
    ${res.note ? `<p class="muted small">ℹ️ ${esc(res.note)}${res.confidence === "low" ? " Low confidence: check the portions." : ""}</p>` : ""}
    ${scanTotals(res.items)}
    <div class="sticky-foot"><button class="btn ghost" data-a="newscan">New photo</button><button class="btn lg" style="flex:1" data-a="add-scan">Add ${res.items.length} to ${sheet.meal}</button></div>`
    : `<div class="empty"><span class="em">🤔</span><b>No food found in this photo</b><button class="btn sm ghost" data-a="newscan">Try another photo</button></div>`) : ""}`;
}
function scanTotals(items) {
  const t = Object.fromEntries(ALL_KEYS.map((k) => [k, items.reduce((a, f) => a + (f.n[k] || 0) * f.qty, 0)]));
  return `<div class="panel"><div class="mgrid"><div><b>${R(t.kcal)}</b><span>kcal</span></div>${MACROS.map((m) => `<div><b style="color:${m.color}">${fmt(R(t[m.k] * 10) / 10)}g</b><span>${m.label}</span></div>`).join("")}</div>
    <details><summary class="link" style="cursor:pointer">Vitamins & minerals</summary><div style="padding-top:10px">${microList(t, 1)}</div></details></div>`;
}
async function runScan(file) {
  const s = sheet;
  s.scan = { ...(s.scan || {}), loading: true, error: "", result: null, note: $("#scan-note")?.value || s.scan?.note || "" };
  try {
    const img = await ai.shrinkImage(file);
    s.scan.img = img.dataUrl; s.scan.b64 = img.base64; s.scan.mime = img.mime;
    renderSheet();
    await doScan(s);
  } catch (e) { s.scan.loading = false; s.scan.error = e.message; renderSheet(); }
}
async function doScan(s) {
  abortCtl?.abort(); abortCtl = new AbortController();
  s.scan.loading = true; s.scan.error = ""; renderSheet();
  try {
    const r = await ai.analyzePhoto(s.scan.b64, s.scan.mime, s.scan.note, { signal: abortCtl.signal });
    s.scan.result = r;
    s.scan.thumb = await thumb(s.scan.img);
  } catch (e) { if (e.name === "AbortError") return; s.scan.error = e.message; }
  s.scan.loading = false;
  if (sheet === s) renderSheet();
}
function thumb(dataUrl) {
  return new Promise((res) => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"), sz = 96, s = Math.max(sz / im.width, sz / im.height);
    c.width = c.height = sz; const w = im.width * s, h = im.height * s; c.getContext("2d").drawImage(im, (sz - w) / 2, (sz - h) / 2, w, h); res(c.toDataURL("image/jpeg", 0.7)); }; im.onerror = () => res(""); im.src = dataUrl; });
}

// ---------- custom ----------
function quickView() {
  const f = (id, l, ph = "", mode = "decimal") => `<div class="field"><label for="${id}">${l}</label><input id="${id}" inputmode="${mode}" placeholder="${ph}"></div>`;
  return `<div class="panel">${f("c-name", "Food name", "e.g. Amma's ragi dosa", "text")}${f("c-unit", "Serving", "1 pc", "text")}
    <div class="grid2">${f("c-k", "Calories (kcal)")}${f("c-p", "Protein (g)")}${f("c-c", "Carbs (g)")}${f("c-f", "Fat (g)")}</div>
    <details><summary class="link" style="cursor:pointer">Add fibre, sugar, sodium (optional)</summary><div class="grid3" style="padding-top:10px">${f("c-fi", "Fibre g")}${f("c-su", "Sugar g")}${f("c-na", "Sodium mg")}</div></details>
    <p class="muted xs">Saved to My foods for next time.</p></div>
  <button class="btn lg block" data-a="add-custom">Add to ${sheet.meal}</button>`;
}

// ---------- other sheets ----------
const STRENGTH = ["Bench press", "Squat", "Deadlift", "Overhead press", "Barbell row", "Lat pulldown", "Pull-up", "Incline dumbbell press", "Leg press", "Romanian deadlift", "Bicep curl", "Tricep pushdown", "Lateral raise", "Lunges", "Push-up", "Plank"];
const CARDIO = ["Walking", "Running", "Cycling", "Skipping", "Swimming", "Yoga", "Badminton", "Cricket"];
const met = (name, cardio) => { const e = (name || "").toLowerCase(); if (!cardio) return 5; for (const [k, v] of [["run", 9.8], ["skip", 11], ["cycl", 7.5], ["swim", 8], ["walk", 3.5], ["yoga", 3], ["badminton", 5.5], ["cricket", 5]]) if (e.includes(k)) return v; return 6; };
const woKcal = (w) => R((met(w.name, w.cardio) * P().weightKg * (w.cardio ? +w.minutes || 0 : (+w.sets || 0) * 3)) / 60);
function workoutSheet() {
  const w = sheet.w;
  const past = [...new Set(Object.keys(S.days).sort().reverse().flatMap((d) => S.days[d].workouts.map((x) => x.exercise)))];
  const isC = (n) => CARDIO.some((c) => c.toLowerCase() === n.toLowerCase());
  const sug = [...past.filter((n) => (w.cardio ? isC(n) : !isC(n))), ...(w.cardio ? CARDIO : STRENGTH)].filter((n, i, a) => a.findIndex((m) => m.toLowerCase() === n.toLowerCase()) === i).slice(0, 14);
  const f = (id, l, v, m = "numeric") => `<div class="field"><label for="${id}">${l}</label><input id="${id}" inputmode="${m}" value="${esc(v)}"></div>`;
  return ["Log exercise", `<div class="seg">${["Strength", "Cardio"].map((l, i) => `<button class="${+w.cardio === i ? "on" : ""}" data-a="wkind" data-v="${i}">${l}</button>`).join("")}<span class="ind" style="width:calc(50% - 4px);transform:translateX(${w.cardio ? 100 : 0}%)"></span></div>
    <div class="field"><label for="w-name">Exercise</label><input id="w-name" value="${esc(w.name)}" placeholder="${w.cardio ? "Running" : "Bench press"}"></div>
    <div class="chips" style="flex-wrap:wrap">${sug.map((n) => `<button class="chip ${n === w.name ? "on" : ""}" data-a="wsug" data-v="${esc(n)}">${esc(n)}</button>`).join("")}</div>
    ${w.cardio ? `<div class="grid2">${f("w-min", "Minutes", w.minutes)}</div>` : `<div class="grid3">${f("w-sets", "Sets", w.sets)}${f("w-reps", "Reps", w.reps)}${f("w-kg", "Weight kg", w.kg, "decimal")}</div>`}
    <div class="panel" style="flex-direction:row;align-items:center"><span style="font-size:24px">🔥</span><span class="grow" style="flex:1"><b id="w-k">${woKcal(w)} kcal</b><br><span class="muted xs">estimated from your weight and exercise intensity</span></span></div>
    <button class="btn lg block" data-a="save-wo">Add exercise</button>`];
}
function bodySheet() {
  const b = day(ui.date).body;
  const f = (id, l, v, m = "decimal") => `<div class="field"><label for="${id}">${l}</label><input id="${id}" inputmode="${m}" value="${esc(v ?? "")}"></div>`;
  return [`Body · ${dateTitle()}`, `<div class="panel">${f("b-w", "Weight (kg)", b.w ?? (ui.date === today() ? "" : ""))}${f("b-s", "Sleep (hours)", b.sleep)}${f("b-st", "Steps", b.steps, "numeric")}</div><button class="btn lg block" data-a="save-body">Save</button>`];
}
function profileSheet() {
  const p = P(), f = (id, l, v, m = "decimal") => `<div class="field"><label for="${id}">${l}</label><input id="${id}" inputmode="${m}" value="${esc(v)}"></div>`;
  const ch = (k, opts) => `<div class="chips" style="flex-wrap:wrap">${opts.map(([v, l]) => `<button class="chip ${String(sheet.d[k]) === String(v) ? "on" : ""}" data-a="pset" data-k="${k}" data-v="${v}">${l}</button>`).join("")}</div>`;
  return ["Profile & goals", `<div class="panel">${f("p-name", "Name", p.name, "text")}<div class="grid2">${f("p-age", "Age", p.age, "numeric")}${f("p-h", "Height (cm)", p.heightCm)}${f("p-w", "Weight (kg)", p.weightKg)}${f("p-gw", "Goal weight (kg)", p.goalWeightKg)}</div></div>
    <div class="panel"><span class="eyebrow">Sex</span>${ch("male", [[true, "Male"], [false, "Female"]])}<span class="eyebrow">Goal</span>${ch("goal", [["lose", "Lose fat"], ["maintain", "Stay fit"], ["gain", "Build muscle"]])}
    <span class="eyebrow">Activity</span>${ch("activity", [[1.2, "Mostly sitting"], [1.375, "Light"], [1.55, "Active"], [1.725, "Very active"]])}</div>
    <div class="panel"><div class="grid2">${f("p-water", "Water goal (glasses)", p.waterTarget, "numeric")}${f("p-steps", "Steps goal", p.stepsTarget, "numeric")}</div></div>
    <button class="btn lg block" data-a="save-profile">Save</button>`];
}
function suppSheet() {
  return ["Supplements", `<div class="panel"><div class="field"><label for="s-list">One per line</label><textarea id="s-list" rows="5">${esc(P().supplements.join("\n"))}</textarea></div><p class="muted xs">They show as a daily checklist on Home.</p></div><button class="btn lg block" data-a="save-supps">Save</button>`];
}
function aiSheet() {
  const s = sheet;
  return ["AI settings", `<div class="panel"><p class="small">Healthyfi uses <b>Google Gemini</b> to read meal photos and fetch full nutrition. The key is free from Google AI Studio.</p>
      <ol class="small" style="margin:0;padding-left:18px;color:var(--fg-2);display:flex;flex-direction:column;gap:4px"><li>Open <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="color:var(--emerald);font-weight:700">aistudio.google.com/apikey</a></li><li>Tap <b>Create API key</b> and copy it</li><li>Paste it below</li></ol></div>
    <div class="panel"><div class="field"><label for="ai-key">Gemini API key</label><input id="ai-key" type="password" autocomplete="off" value="${esc(ai.getKey())}" placeholder="AIza…"></div>
      <div class="field"><label for="ai-model">Model</label><select id="ai-model">${ai.MODELS.map((m) => `<option ${m === ai.getModel() ? "selected" : ""}>${m}</option>`).join("")}</select></div>
      ${S.mode === "cloud" ? `<label class="small" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="ai-sync" ${S.geminiKey ? "checked" : ""}> Keep the key in my account so it works on my other devices</label>` : `<p class="muted xs">The key is stored only on this device.</p>`}
      ${s.msg ? `<div class="missing" style="background:${s.ok ? "var(--mint)" : "var(--saffron-soft)"}"><span>${s.ok ? "✅" : "⚠️"}</span><span class="grow">${esc(s.msg)}</span></div>` : ""}</div>
    <div style="display:flex;gap:10px"><button class="btn ghost" data-a="test-ai" ${s.testing ? "disabled" : ""}>${s.testing ? "Testing…" : "Test key"}</button><button class="btn lg" style="flex:1" data-a="save-ai">Save</button></div>`];
}
function clearSheet() {
  return ["Clear all logs?", `<p>All food, water, workout and body logs will be deleted${S.mode === "cloud" ? " from every device" : ""}. Your profile and goals stay.</p>
    <div style="display:flex;gap:10px"><button class="btn ghost" style="flex:1" data-a="close-sheet">Cancel</button><button class="btn" style="flex:1;background:var(--danger);color:#fff" data-a="clear-yes">Clear logs</button></div>`];
}

// ================= actions =================
function addEntries(items, src, img) {
  const d = ui.date, before = totals(d);
  const dd = ensureDay(d);
  items.forEach((it) => dd.foods.push({ id: uid(), meal: sheet.meal, name: it.name, unit: it.unit, qty: +it.qty || 1, n: cleanNutrients(it.n), src: it.src || src, ...(img ? { img } : {}), t: Date.now() }));
  saveDay(d);
  const after = totals(d);
  const meal = sheet.meal;
  closeSheet();
  if (before.protein < proteinTarget() && after.protein >= proteinTarget()) { confetti(); toast("Protein goal hit! 💪"); }
  else toast(items.length > 1 ? `Added ${items.length} foods to ${meal.toLowerCase()}` : `Added to ${meal.toLowerCase()}`);
  render();
}

async function enrichEntry(e, d) {
  const ck = e.name.toLowerCase() + "|" + e.unit;
  let n = S.cache[ck] && hasMicros(S.cache[ck]) ? S.cache[ck] : null;
  if (!n) { const r = await ai.enrichFood(e.name, e.unit); if (!r) return; n = r.n; S.cache[ck] = n; }
  e.n = { ...e.n, ...pickMicros(n) };
  saveDay(d);
}

const handlers = {
  async google() {
    ui.loginErr = "";
    if (!store.firebaseConfigured()) { ui.loginErr = "Google sign-in isn't set up yet: add your Firebase config to config.js (see README). You can use the app without an account meanwhile."; render(); return; }
    try { await store.signInWithGoogle(); } catch (e) { ui.loginErr = e.code === "auth/unauthorized-domain" ? "This website isn't on Firebase's allowed domain list yet. Add it under Authentication → Settings → Authorized domains." : e.code === "auth/popup-closed-by-user" ? "" : "Sign-in didn't finish. Please try again."; render(); }
  },
  guest() { store.continueAsGuest(); },
  signin() { handlers.google(); },
  async signout() { await store.signOut(); ui.tab = "home"; ui.prev = {}; },
  "ob-set"(b) { obCollect(); const d = obDraft(), k = b.dataset.k, v = b.dataset.v; d[k] = k === "male" ? v === "1" : k === "activity" ? +v : v; render(); },
  "ob-next"() {
    obCollect();
    if (ui.obStep < 4) { ui.obStep++; ui.obDir = 1; render(); window.scrollTo(0, 0); return; }
    Object.assign(S.profile, ui.ob, { onboarded: true }); ui.ob = null; ui.obStep = 0; saveProfile(); ui.prev = {}; render(true); confetti();
  },
  "ob-back"() { obCollect(); ui.obStep = Math.max(0, ui.obStep - 1); ui.obDir = -1; render(); },
  tab(b) { ui.tab = b.dataset.v; ui.expanded = {}; render(); window.scrollTo({ top: 0 }); },
  date(b) { ui.date = b.dataset.v; render(); },
  "day-"() { ui.date = addDays(ui.date, -1); render(); },
  "day+"() { if (ui.date < today()) { ui.date = addDays(ui.date, 1); render(); } },
  seg(b) { ui.seg = b.dataset.v; render(); },
  nutr() { ui.nutrOpen = !ui.nutrOpen; render(); },
  fab() { openSheet({ type: "fab" }); },
  "water+"(b) { const d = ensureDay(ui.date); d.water++; saveDay(ui.date); if (d.water === P().waterTarget) { confetti(); toast("Water goal reached 💧"); } if (b.dataset.close) { closeSheet(); toast("+250 ml water"); } render(); },
  "water-"() { const d = ensureDay(ui.date); d.water = Math.max(0, d.water - 1); saveDay(ui.date); render(); },
  supp(b) { const s = P().supplements[+b.dataset.i], d = ensureDay(ui.date); d.supps = d.supps.includes(s) ? d.supps.filter((x) => x !== s) : d.supps.concat(s); saveDay(ui.date); render(); },
  add(b) { openSheet({ type: "add", full: true, meal: b.dataset.m || mealByTime(), seg: b.dataset.seg || "search", q: "" }); if (!b.dataset.seg) setTimeout(() => $("#q")?.focus(), 450); },
  meal(b) { sheet.meal = b.dataset.v; renderSheet(); },
  aseg(b) { sheet.seg = b.dataset.v; renderSheet(); },
  pick(b) { const f = sheet.list[+b.dataset.i]; const cached = S.cache[f.name.toLowerCase() + "|" + f.unit];
    const n = hasMicros(f.n) || !cached ? f.n : { ...f.n, ...pickMicros(cached) };
    sheet.detail = { item: { ...f, n }, qty: fmt(f.qty || 1) }; renderSheet(); $(".sheet-b").scrollTop = 0;
    if (!hasMicros(n) && ai.getKey()) enrichDetail(); },
  back() { sheet.detail = null; renderSheet(); },
  "ask-ai"() { askAI(); },
  "add-all-ai"() { addEntries(sheet.ai.items.map((f) => ({ ...f, src: "ai" })), "ai"); },
  "dq-"() { const d = sheet.detail; d.qty = fmt(Math.max(0.25, (+d.qty || 0) - (+d.qty > 1 ? 0.5 : 0.25))); renderSheet(); },
  "dq+"() { const d = sheet.detail; d.qty = fmt((+d.qty || 0) + (+d.qty >= 1 ? 0.5 : 0.25)); renderSheet(); },
  "enrich-detail"() { enrichDetail(); },
  "add-detail"() { const d = sheet.detail; addEntries([{ ...d.item, qty: +d.qty }], d.item.src || "db"); },
  rescan() { doScan(sheet); },
  newscan() { sheet.scan = { note: sheet.scan?.note || "" }; renderSheet(); },
  "sq-"(b) { const f = sheet.scan.result.items[+b.dataset.i]; f.qty = Math.max(0.25, f.qty - (f.qty > 1 ? 0.5 : 0.25)); renderSheet(); },
  "sq+"(b) { const f = sheet.scan.result.items[+b.dataset.i]; f.qty += f.qty >= 1 ? 0.5 : 0.25; renderSheet(); },
  sdel(b) { sheet.scan.result.items.splice(+b.dataset.i, 1); renderSheet(); },
  "add-scan"() { const sc = sheet.scan; addEntries(sc.result.items.map((f) => ({ ...f, src: "photo" })), "photo", sc.thumb); },
  "add-custom"() {
    const v = (id) => $("#" + id)?.value.trim(), num = (id) => parseFloat(v(id));
    const name = v("c-name"), k = num("c-k");
    if (!name || !Number.isFinite(k)) { toast("Add a name and calories"); return; }
    const it = { name, unit: v("c-unit") || "1 serving", n: cleanNutrients({ kcal: k, protein: num("c-p") || 0, carbs: num("c-c") || 0, fat: num("c-f") || 0, fiber: num("c-fi"), sugar: num("c-su"), sodium: num("c-na") }) };
    S.customFoods = S.customFoods.filter((f) => f.name !== name).concat(it); saveProfile();
    addEntries([{ ...it, qty: 1, src: "custom" }], "custom");
  },
  expand(b) { const id = b.dataset.id; ui.expanded[id] = !ui.expanded[id]; render(); },
  "eq-"(b) { const e = day(ui.date).foods.find((x) => x.id === b.dataset.id); e.qty = Math.max(0.25, e.qty - (e.qty > 1 ? 0.5 : 0.25)); saveDay(ui.date); render(); },
  "eq+"(b) { const e = day(ui.date).foods.find((x) => x.id === b.dataset.id); e.qty += e.qty >= 1 ? 0.5 : 0.25; saveDay(ui.date); render(); },
  del(b) { const d = ensureDay(ui.date); d.foods = d.foods.filter((x) => x.id !== b.dataset.id); saveDay(ui.date); toast("Removed"); render(); },
  async enrich(b) {
    if (!ai.getKey()) { handlers.ai(); return; }
    const id = b.dataset.id, d = ui.date, e = day(d).foods.find((x) => x.id === id);
    ui.busy[id] = true; render();
    try { await enrichEntry(e, d); } catch (err) { toast(err.message); }
    delete ui.busy[id]; render();
  },
  async "enrich-day"() {
    if (!ai.getKey()) { handlers.ai(); return; }
    const d = ui.date, list = day(d).foods.filter((e) => !hasMicros(e.n));
    ui.busy.enrichDay = true; render();
    for (const e of list) { try { await enrichEntry(e, d); } catch (err) { toast(err.message); break; } }
    delete ui.busy.enrichDay; render();
  },
  repeat(b) { const m = b.dataset.m, dd = ensureDay(ui.date); day(addDays(ui.date, -1)).foods.filter((f) => f.meal === m).forEach((f) => dd.foods.push({ ...f, id: uid(), t: Date.now() })); saveDay(ui.date); toast(`Copied yesterday's ${m.toLowerCase()}`); render(); },
  workout() { openSheet({ type: "workout", w: { cardio: false, name: "", sets: "3", reps: "10", kg: "", minutes: "30" } }); },
  wkind(b) { sheet.w.cardio = b.dataset.v === "1"; sheet.w.name = ""; renderSheet(); },
  wsug(b) { sheet.w.name = b.dataset.v; renderSheet(); },
  "save-wo"() {
    const w = sheet.w;
    if (!w.name.trim() || (w.cardio ? !(+w.minutes > 0) : !(+w.sets > 0 && +w.reps > 0))) { toast(w.cardio ? "Add the exercise and minutes" : "Add the exercise, sets and reps"); return; }
    ensureDay(ui.date).workouts.push({ id: uid(), exercise: w.name.trim(), cardio: w.cardio, sets: w.cardio ? 0 : R(+w.sets), reps: w.cardio ? 0 : R(+w.reps), weightKg: w.cardio ? 0 : +w.kg || 0, minutes: w.cardio ? R(+w.minutes) : R(+w.sets) * 3, kcal: woKcal(w) });
    saveDay(ui.date); closeSheet(); toast("Exercise logged 🔥"); render();
  },
  wdel(b) { const d = ensureDay(ui.date); d.workouts = d.workouts.filter((x) => x.id !== b.dataset.id); saveDay(ui.date); render(); },
  body() { openSheet({ type: "body" }); },
  "save-body"() {
    const g = (id) => parseFloat($("#" + id).value), d = ensureDay(ui.date), w = g("b-w"), sl = g("b-s"), st = g("b-st");
    d.body = {}; if (w > 0) d.body.w = w; if (sl > 0) d.body.sleep = sl; if (st > 0) d.body.steps = R(st);
    saveDay(ui.date);
    if (w > 0 && !Object.keys(S.days).some((k) => k > ui.date && S.days[k].body?.w)) { P().weightKg = w; saveProfile(); }
    closeSheet(); toast("Body log saved"); render();
  },
  profile() { openSheet({ type: "profile", d: { male: P().male, goal: P().goal, activity: P().activity } }); },
  pset(b) { const k = b.dataset.k, v = b.dataset.v; sheet.d[k] = k === "male" ? v === "true" : k === "activity" ? +v : v; const keep = collectProfileInputs(); renderSheet(); restoreProfileInputs(keep); },
  "save-profile"() {
    const p = P(), g = (id) => $("#" + id).value, n = (id, d) => (Number.isFinite(parseFloat(g(id))) ? parseFloat(g(id)) : d);
    Object.assign(p, sheet.d, { name: g("p-name").trim(), age: R(n("p-age", p.age)), heightCm: n("p-h", p.heightCm), weightKg: n("p-w", p.weightKg), goalWeightKg: n("p-gw", p.goalWeightKg), waterTarget: Math.min(20, Math.max(1, R(n("p-water", p.waterTarget)))), stepsTarget: R(n("p-steps", p.stepsTarget)) });
    saveProfile(); closeSheet(); toast("Profile saved"); render();
  },
  supps() { openSheet({ type: "supps" }); },
  "save-supps"() { P().supplements = $("#s-list").value.split(/\n|,/).map((s) => s.trim()).filter(Boolean); saveProfile(); closeSheet(); toast("Supplements saved"); render(); },
  ai() { const back = sheet && sheet.type === "add" ? sheet : null; openSheet({ type: "ai", back }); },
  async "test-ai"() {
    const key = $("#ai-key").value.trim(), model = $("#ai-model").value;
    const prev = [ai.getKey(), ai.getModel()];
    ai.saveAISettings(key, model);
    sheet.testing = true; sheet.msg = ""; renderSheet();
    try { await ai.testKey(); sheet.ok = true; sheet.msg = "Key works. You're ready to scan meals."; }
    catch (e) { sheet.ok = false; sheet.msg = e.message; ai.saveAISettings(prev[0], prev[1]); }
    sheet.testing = false; renderSheet(); $("#ai-key").value = key;
  },
  async "save-ai"() {
    const key = $("#ai-key").value.trim(), model = $("#ai-model").value, sync = $("#ai-sync")?.checked;
    ai.saveAISettings(key, model);
    if (S.mode === "cloud") await store.saveGeminiKeyToAccount(sync ? key : "").catch(() => {});
    const back = sheet.back;
    toast(key ? "AI is on ✨" : "AI key removed");
    if (back) { openSheet(back); } else { closeSheet(); render(); }
  },
  theme(b) { const t = b.dataset.v; try { localStorage.setItem("healthyfi.theme", t); } catch {} applyTheme(); render(); },
  export() {
    const blob = new Blob([store.exportJSON()], { type: "application/json" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `healthyfi-${today()}.json`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000); toast("Export downloaded");
  },
  clear() { openSheet({ type: "clear" }); },
  "clear-yes"() { store.clearLogs(); closeSheet(); toast("Logs cleared"); ui.prev = {}; render(); },
  "close-sheet"() { closeSheet(); },
};
function collectProfileInputs() { const o = {}; document.querySelectorAll(".sheet input").forEach((i) => (o[i.id] = i.value)); return o; }
function restoreProfileInputs(o) { Object.entries(o).forEach(([id, v]) => { const el = $("#" + id); if (el) el.value = v; }); }

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-a]");
  if (!b || b.disabled) return;
  const h = handlers[b.dataset.a];
  if (h) { e.preventDefault(); h(b); }
});
document.addEventListener("input", (e) => {
  const id = e.target.id;
  if (!sheet) return;
  if (id === "q") { sheet.q = e.target.value; if (sheet.ai && sheet.ai.forQ !== sheet.q.trim()) sheet.ai = null; $("#results").innerHTML = resultsHTML(); }
  else if (id === "dq") { sheet.detail.qty = e.target.value; const pos = e.target.selectionStart; renderSheet(); const el = $("#dq"); el.focus(); el.setSelectionRange(pos, pos); }
  else if (id === "scan-note") { sheet.scan = { ...(sheet.scan || {}), note: e.target.value }; }
  else if (id.startsWith("w-")) {
    const map = { "w-name": "name", "w-sets": "sets", "w-reps": "reps", "w-kg": "kg", "w-min": "minutes" };
    sheet.w[map[id]] = e.target.value;
    const k = $("#w-k"); if (k) k.textContent = woKcal(sheet.w) + " kcal";
  }
});
document.addEventListener("change", (e) => { if (e.target.id === "photo" && e.target.files[0]) runScan(e.target.files[0]); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && sheet) closeSheet();
  if (e.key === "Enter" && e.target.id === "q") { e.preventDefault(); askAI(); }
});

function applyTheme() {
  const t = localStorage.getItem("healthyfi.theme") || "system";
  if (t === "system") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.content = isDark() ? "#080e0b" : "#0b5e37";
}

// keep "today" fresh if the app stays open past midnight
let lastToday = today();
setInterval(() => { if (today() !== lastToday) { if (ui.date === lastToday) ui.date = today(); lastToday = today(); render(); } }, 60000);

applyTheme();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { applyTheme(); render(); });
store.onChange(() => { if (!sheet || sheet.type !== "add") render(); else renderTabbarSafe(); });
function renderTabbarSafe() { const y = scrollY; render(); scrollTo(0, y); } // data changed under an open sheet: refresh the page behind it
render();
store.init();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
