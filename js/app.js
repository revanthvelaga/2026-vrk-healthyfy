import { FOODS, CATEGORIES } from "./foods.js";
import { MACROS, DETAIL_MACROS, MICROS, ALL_KEYS, hasMicros, cleanNutrients } from "./nutrients.js";
import * as store from "./store.js";
import { S, day, ensureDay, saveDay, saveProfile } from "./store.js";
import * as ai from "./ai.js";

// ================= helpers =================
const $ = (s, el = document) => el.querySelector(s);
const R = Math.round;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n, d = 1) => (Number.isInteger(+n) ? String(+n) : (+n).toFixed(d).replace(/\.?0+$/, ""));
const comma = (n) => R(n).toLocaleString("en-IN");
const iso = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const addDays = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => iso();
const ic = (slug, size = 32, cls = "") => `<img class="i3d ${cls}" src="img/3d/${slug}.webp" width="${size}" height="${size}" alt="" loading="lazy" decoding="async">`;
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

const MEALS = [
  { k: "Breakfast", icon: "sunrise", share: 0.25 },
  { k: "Morning snack", icon: "green-apple", share: 0.1 },
  { k: "Lunch", icon: "curry-rice", share: 0.3 },
  { k: "Evening snack", icon: "teacup-without-handle", share: 0.1 },
  { k: "Dinner", icon: "crescent-moon", share: 0.25 },
];
const mealOf = (k) => MEALS.find((m) => m.k === k) || MEALS[3];
const normMeal = (k) => (k === "Snacks" ? "Evening snack" : MEALS.some((m) => m.k === k) ? k : "Evening snack");
function mealByTime() { const h = new Date().getHours(); return h < 10.5 ? "Breakfast" : h < 12 ? "Morning snack" : h < 15.5 ? "Lunch" : h < 19 ? "Evening snack" : "Dinner"; }

// ================= foods =================
const FOOD = Object.fromEntries(FOODS.map((f) => [f.id, f]));
const per100 = (f) => ({ kcal: f.per[0], protein: f.per[1], carbs: f.per[2], fat: f.per[3], fiber: f.per[4] });
const microCache = (name) => S.cache["m:" + name.toLowerCase()];
const NONMICRO = ["kcal", "protein", "carbs", "fat"];
const pickMicros = (n) => Object.fromEntries(Object.entries(n).filter(([k]) => !NONMICRO.includes(k)));
// "food-like" objects are shared by database foods, AI results and saved entries
function fromDb(f) { return { fid: f.id, name: f.name, icon: f.icon, units: [...f.units, ["g", 1]], per: per100(f), pair: f.pair || [] }; }
function fromAI(it) {
  const units = [[it.unit.replace(/^1\s+/, ""), it.grams || null]];
  if (it.grams) units.push(["g", 1]);
  return { name: it.name, icon: iconFor(it.name), units, nUnit: it.n, pair: [] };
}
function fromEntry(e) {
  const f = e.fid && FOOD[e.fid];
  if (f) return fromDb(f);
  const units = [[e.unit, e.g || null]];
  if (e.g && e.unit !== "g") units.push(["g", 1]);
  return { name: e.name, icon: e.icon || iconFor(e.name), units, nUnit: e.n, pair: [] };
}
function scaleN(n, k) { const o = {}; for (const key in n) o[key] = n[key] * k; return o; }
/** nutrients for ONE of the chosen unit */
function nFor(fl, ui_) {
  const [, g] = fl.units[ui_];
  if (fl.per) {
    const base = scaleN(fl.per, g / 100), m = microCache(fl.name);
    return m ? { ...scaleN(m, g / 100), ...base } : base;
  }
  if (ui_ === 0 || !fl.units[0][1]) return fl.nUnit;
  return scaleN(fl.nUnit, g / fl.units[0][1]);
}
const ICON_KW = [["biryani|pulao|fried rice", "shallow-pan-of-food"], ["rice", "cooked-rice"], ["dosa|chilla|pancake|uttapam|pesarattu", "pancakes"], ["idli", "rice-ball"], ["vada|samosa|momo|pakod|bajji|bonda", "dumpling"],
  ["roti|chapati|paratha|naan|puri|phulka|kulcha", "flatbread"], ["bread|toast|pav", "bread"], ["sambar|dal|pappu|rasam|curry|kurma", "pot-of-food"], ["chicken", "poultry-leg"], ["mutton|meat", "meat-on-bone"], ["fish", "fish"], ["prawn|shrimp", "fried-shrimp"],
  ["egg|omelette", "cooking"], ["paneer|cheese", "cheese-wedge"], ["coffee", "hot-beverage"], ["tea|chai", "teacup-without-handle"], ["milk", "glass-of-milk"], ["lassi|shake|smoothie|buttermilk", "cup-with-straw"], ["juice|soda", "tropical-drink"],
  ["banana", "banana"], ["apple", "red-apple"], ["mango", "mango"], ["grape", "grapes"], ["orange", "tangerine"], ["chutney|pickle|podi", "jar"], ["salad", "green-salad"], ["sweet|laddu|jamun|halwa|jalebi", "doughnut"],
  ["chocolate", "chocolate-bar"], ["ice cream", "soft-ice-cream"], ["nut|almond|peanut|cashew", "peanuts"], ["oats|upma|poha|porridge|curd|yogurt", "bowl-with-spoon"], ["pizza", "pizza"], ["burger", "hamburger"], ["noodle|pasta|maggi", "spaghetti"], ["potato|aloo", "potato"], ["ghee|butter", "butter"]];
function iconFor(name) {
  const n = name.toLowerCase(), exact = FOODS.find((f) => f.name.toLowerCase() === n);
  if (exact) return exact.icon;
  for (const [re, slug] of ICON_KW) if (new RegExp(re).test(n)) return slug;
  return "fork-and-knife-with-plate";
}
const plural = (u, q) => (q === 1 || u === "g" || /\(|^\d|s$/.test(u) ? u : u === "katori" ? "katoris" : u + "s");
function unitText(unit, qty, g) { return unit === "g" ? `${fmt(qty)} g` : `${fmt(qty)} ${plural(unit, +qty)}${g ? ` · ${comma(g * qty)} g` : ""}`; }
function searchFoods(q) {
  const t = q.toLowerCase().trim();
  if (!t) return [];
  const score = (f) => {
    const n = f.name.toLowerCase(), al = f.alias || [];
    if (n === t) return 0;
    if (n.startsWith(t)) return 1;
    if (n.split(/[\s(]/).some((w) => w.startsWith(t))) return 2;
    if (al.some((a) => a.startsWith(t))) return 2.5;
    if (n.includes(t)) return 3;
    if (al.some((a) => a.includes(t))) return 4;
    return 9;
  };
  return FOODS.map((f) => [score(f), f]).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0]).map(([, f]) => f).slice(0, 40);
}

// ================= targets =================
const P = () => S.profile;
const bmr = (p = P()) => 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age + (p.male ? 5 : -161);
const kcalTarget = (p = P()) => Math.max(1200, R(bmr(p) * p.activity + ({ lose: -500, gain: 300 }[p.goal] || 0)));
const proteinTarget = (p = P()) => R(p.weightKg * (p.goal === "lose" ? 2 : p.goal === "gain" ? 1.8 : 1.6));
const fatTarget = (p = P()) => R((kcalTarget(p) * 0.25) / 9);
const carbTarget = (p = P()) => Math.max(0, R((kcalTarget(p) - proteinTarget(p) * 4 - fatTarget(p) * 9) / 4));
const macroTarget = (k) => ({ protein: proteinTarget(), carbs: carbTarget(), fat: fatTarget() }[k]);
const nGoal = (n) => (n.goal ? n.goal(P(), kcalTarget()) : n.limit(P(), kcalTarget()));
const MCOL = { protein: "var(--protein)", carbs: "var(--carbs)", fat: "var(--fat)" };
const MICON = { protein: "poultry-leg", carbs: "bread", fat: "avocado" };

function foodsOf(date) { return day(date).foods.map((e) => ({ ...e, meal: normMeal(e.meal) })); }
function totals(list) {
  const t = Object.fromEntries(ALL_KEYS.map((k) => [k, 0]));
  let withMicros = 0;
  list.forEach((e) => { ALL_KEYS.forEach((k) => (t[k] += (e.n[k] || 0) * e.qty)); if (hasMicros(e.n)) withMicros++; });
  return { ...t, count: list.length, withMicros };
}
const dayTotals = (d) => totals(foodsOf(d));
const burned = (d) => day(d).workouts.reduce((a, w) => a + (w.kcal || 0), 0);
function streak() { let s = 0, d = today(); if (!day(d).foods.length) d = addDays(d, -1); while (day(d).foods.length) { s++; d = addDays(d, -1); } return s; }

// ================= ui state & animation =================
const ui = { tab: "home", date: today(), seg: "food", nutrOpen: false, weekOpen: true, ob: null, obStep: 0, obDir: 1, prev: {}, next: {}, last: "", loginErr: "", busy: {}, pages: [], tray: null };
const prevOf = (k, d = 0) => (k in ui.prev ? ui.prev[k] : d);
function aRing(key, frac, C) { const to = C * (1 - Math.max(0, Math.min(1, frac))); ui.next[key] = to; return `stroke-dasharray="${C}" stroke-dashoffset="${prevOf(key, C)}" data-ak="${key}" data-p="ring" data-to="${to}"`; }
function aW(key, pct) { const to = Math.max(0, Math.min(100, pct)); ui.next[key] = to; return `style="width:${prevOf(key, 0)}%" data-ak="${key}" data-p="w" data-to="${to}"`; }
function aN(key, v, dec = 0) { ui.next[key] = v; const from = prevOf(key, 0); return `<span data-ak="${key}" data-p="n" data-from="${from}" data-to="${v}" data-dec="${dec}">${dec ? fmt(from) : comma(from)}</span>`; }
function animate(root = document) {
  const els = root.querySelectorAll("[data-ak]");
  requestAnimationFrame(() => requestAnimationFrame(() => els.forEach((el) => {
    const to = +el.dataset.to, p = el.dataset.p;
    if (p === "ring") el.style.strokeDashoffset = to;
    else if (p === "w") el.style.width = to + "%";
    else countUp(el, +el.dataset.from, to, +el.dataset.dec);
  })));
  Object.assign(ui.prev, ui.next); ui.next = {};
}
function countUp(el, from, to, dec) {
  const show = (v) => (el.textContent = dec ? fmt(Math.round(v * 10) / 10) : comma(v));
  if (from === to || reduced) return show(to);
  const t0 = performance.now(), dur = 950;
  const step = (t) => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4); show(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), 2200); }
function confetti() {
  if (reduced) return;
  const c = $("#confetti"), x = c.getContext("2d"), d = devicePixelRatio;
  const W = (c.width = innerWidth * d), H = (c.height = innerHeight * d);
  const cols = ["#10b46c", "#ff7a59", "#f6b23c", "#5b8def", "#8be04e", "#111311"];
  const ps = Array.from({ length: 150 }, () => ({ x: W / 2, y: H * 0.4, vx: (Math.random() - 0.5) * 24 * d, vy: (Math.random() * -20 - 6) * d, s: (5 + Math.random() * 6) * d, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0] }));
  let f = 0;
  (function loop() { x.clearRect(0, 0, W, H); ps.forEach((p) => { p.vy += 0.6 * d; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); }); if (++f < 160) requestAnimationFrame(loop); else x.clearRect(0, 0, W, H); })();
}

// ================= svg icons =================
const SV = (d, w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  home: SV('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
  diary: SV('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11M9 8h6"/>'),
  chart: SV('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  me: SV('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  search: SV('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', 2.2),
  back: SV('<path d="M15 18 9 12l6-6"/>', 2.4),
  cam: SV('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>'),
  google: '<svg viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>',
};

// ================= root =================
function render(force = false) {
  const app = $("#app"), tb = $("#tabbar");
  if (S.mode === "loading") { app.innerHTML = `<div class="splash">${ic("seedling", 72)}<div class="logo">Healthyfi</div></div>`; tb.hidden = true; return; }
  if (S.mode === "signedout") { app.innerHTML = loginView(); tb.hidden = true; return; }
  if (!P().onboarded) { app.innerHTML = obView(); tb.hidden = true; animate(); return; }
  const key = ui.tab + ui.seg, enter = force || key !== ui.last;
  ui.last = key;
  app.innerHTML = `<main class="screen ${enter ? "enter" : ""}">${{ home: homeView, diary: diaryView, progress: progressView, me: meView }[ui.tab]()}</main>`;
  tb.hidden = false;
  renderTabbar();
  animate(app);
}
function renderTabbar() {
  const tabs = [["home", "Home", I.home], ["diary", "Diary", I.diary], ["progress", "Progress", I.chart], ["me", "Me", I.me]];
  const i = tabs.findIndex(([k]) => k === ui.tab);
  $("#tabbar nav").innerHTML = `<div class="tabs"><span class="ind" style="transform:translateX(${prevOf("tabI", i) * 100}%)"></span>${tabs.map(([k, l, s]) => `<button class="tab ${ui.tab === k ? "on" : ""}" data-a="tab" data-v="${k}" ${ui.tab === k ? 'aria-current="page"' : ""}>${s}<span>${l}</span></button>`).join("")}</div><button class="fab" data-a="fab" aria-label="Log food, water or exercise">+</button>`;
  const ind = $("#tabbar .ind");
  requestAnimationFrame(() => (ind.style.transform = `translateX(${i * 100}%)`));
  ui.prev.tabI = i;
}

// ================= login & onboarding =================
function loginView() {
  const B = [["cooked-rice", 6, 4, 1, -6], ["pancakes", 58, 0, 0, 5], ["poultry-leg", 70, 30, 1, -4], ["green-salad", 2, 38, 0, 6], ["mango", 38, 22, 0, -3], ["cup-with-straw", 34, 58, 0, 4], ["avocado", 76, 64, 0, -5]];
  return `<section class="login">
    <div class="collage">${B.map(([s, l, t, lg, r], i) => `<div class="b ${lg ? "lg" : ""}" style="left:${l}%;top:${t}%;--r:${r}deg;animation-delay:${i * -0.8}s">${ic(s, lg ? 84 : 62)}</div>`).join("")}</div>
    <div><h1>Eat smart.<br>Track <em>everything.</em></h1><p class="sub">Snap a plate or search 260+ Indian foods. See every calorie, protein gram and vitamin.</p></div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${ui.loginErr ? `<div class="err">${esc(ui.loginErr)}</div>` : ""}
      <button class="gbtn" data-a="google">${I.google} Continue with Google</button>
      <button class="guestbtn" data-a="guest">Use without an account</button>
    </div></section>`;
}
function obDraft() { if (!ui.ob) ui.ob = { ...P(), name: P().name || (S.user?.name || "").split(" ")[0] || "" }; return ui.ob; }
function obView() {
  const d = obDraft(), st = ui.obStep, steps = 5;
  const opt = (k, v, icon, t, s) => `<button class="opt ${String(d[k]) === String(v) ? "on" : ""}" data-a="ob-set" data-k="${k}" data-v="${v}">${ic(icon, 44)}<span><b>${t}</b>${s ? `<span>${s}</span>` : ""}</span></button>`;
  const body = [
    () => `<h1>What should we call you?</h1><div class="field"><label for="ob-name">First name</label><input id="ob-name" value="${esc(d.name)}" autocomplete="given-name" placeholder="Your name"></div>
      <div class="opts" style="grid-template-columns:1fr 1fr">${opt("male", true, "flexed-biceps", "Male")}${opt("male", false, "woman-dancing", "Female")}</div>`,
    () => `<h1>Your body today</h1><p class="ink2">We use this to work out how much energy you burn.</p>
      <div class="grid2"><div class="field"><label for="ob-age">Age</label><input id="ob-age" inputmode="numeric" value="${d.age}"></div><div class="field"><label for="ob-h">Height (cm)</label><input id="ob-h" inputmode="decimal" value="${d.heightCm}"></div>
      <div class="field"><label for="ob-w">Weight (kg)</label><input id="ob-w" inputmode="decimal" value="${d.weightKg}"></div><div class="field"><label for="ob-gw">Goal weight (kg)</label><input id="ob-gw" inputmode="decimal" value="${d.goalWeightKg}"></div></div>`,
    () => `<h1>What's your goal?</h1><div class="opts">${opt("goal", "lose", "fire", "Lose fat", "500 kcal below maintenance, high protein")}${opt("goal", "maintain", "balance-scale", "Stay fit", "Eat at maintenance")}${opt("goal", "gain", "flexed-biceps", "Build muscle", "300 kcal surplus, 1.8 g/kg protein")}</div>`,
    () => `<h1>How active are you?</h1><div class="opts">${opt("activity", 1.2, "zzz", "Mostly sitting", "Desk job, little exercise")}${opt("activity", 1.375, "person-walking", "Lightly active", "Walks or workouts 1–3 days a week")}${opt("activity", 1.55, "person-running", "Active", "Workouts 3–5 days a week")}${opt("activity", 1.725, "person-lifting-weights", "Very active", "Hard training most days")}</div>`,
    () => `<h1>Your plan${d.name ? ", " + esc(d.name) : ""}</h1><div class="plan"><div class="row">${ic("bullseye", 40)}<span class="eyebrow" style="color:inherit;opacity:.7">Daily calories</span></div><div class="k">${aN("ob-k", kcalTarget(d))}</div>
      <div class="r3"><div><b>${aN("ob-p", proteinTarget(d))}g</b><span>protein</span></div><div><b>${aN("ob-c", carbTarget(d))}g</b><span>carbs</span></div><div><b>${aN("ob-f", fatTarget(d))}g</b><span>fat</span></div></div>
      <p class="sm" style="opacity:.75">BMR ${comma(bmr(d))} kcal × activity ${d.activity}${d.goal === "lose" ? " − 500 for fat loss" : d.goal === "gain" ? " + 300 for muscle gain" : ""}.</p></div>`,
  ][st]();
  return `<section class="ob"><div class="ob-top">${st ? `<button class="iconbtn" data-a="ob-back" aria-label="Back">${I.back}</button>` : ""}<div class="ob-prog"><i style="width:${((st + 1) / steps) * 100}%"></i></div></div>
    <div class="ob-b ${ui.obDir < 0 ? "back" : ""}">${body}</div><button class="btn lg block" data-a="ob-next">${st === steps - 1 ? "Start tracking" : "Continue"}</button></section>`;
}
function obCollect() {
  const d = obDraft(), v = (id) => $("#" + id)?.value;
  if (ui.obStep === 0) d.name = (v("ob-name") || "").trim();
  if (ui.obStep === 1) { d.age = R(+v("ob-age") || d.age); d.heightCm = +v("ob-h") || d.heightCm; d.weightKg = +v("ob-w") || d.weightKg; d.goalWeightKg = +v("ob-gw") || d.goalWeightKg; }
}

// ================= home =================
function dateTitle(d = ui.date) {
  const t = today();
  if (d === t) return "Today";
  if (d === addDays(t, -1)) return "Yesterday";
  return new Date(d + "T12:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}
function weekStrip() {
  const t = today(), end = ui.date < addDays(t, -3) ? addDays(ui.date, 3) : t;
  return `<div class="week">${[...Array(7)].map((_, i) => addDays(end, i - 6)).map((d) => {
    const fr = Math.min(1, dayTotals(d).kcal / kcalTarget()), C = 2 * Math.PI * 17, dt = new Date(d + "T12:00:00");
    return `<button class="wd ${d === ui.date ? "on" : ""}" data-a="date" data-v="${d}" ${d > t ? "disabled" : ""}><span>${dt.toLocaleDateString("en-IN", { weekday: "narrow" })}</span>
      <span class="dot"><svg viewBox="0 0 38 38"><circle cx="19" cy="19" r="17" fill="none" stroke="var(--surface-3)" stroke-width="2.5" stroke-dasharray="3 3.2"/><circle cx="19" cy="19" r="17" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" class="arc" ${aRing("w" + d, fr, C)}/></svg>${dt.getDate()}</span></button>`;
  }).join("")}</div>`;
}
function homeView() {
  const p = P(), list = foodsOf(ui.date), t = totals(list), b = burned(ui.date), target = kcalTarget(), d = day(ui.date);
  const left = target + b - R(t.kcal), C = 2 * Math.PI * 52;
  return `
  <header class="head"><button class="datebtn" data-a="weektoggle" aria-expanded="${ui.weekOpen}"><h1>${dateTitle()}</h1><span class="chev">▼</span></button><span class="grow"></span>
    <span class="pillstat" title="Days in a row with food logged">${ic("fire", 22)}${streak()}</span>
    <button class="avatar" data-a="tab" data-v="me" aria-label="Profile">${S.user?.photo ? `<img src="${esc(S.user.photo)}" alt="" referrerpolicy="no-referrer">` : esc((p.name || "?")[0].toUpperCase())}</button></header>
  ${ui.weekOpen ? weekStrip() : ""}
  <section class="card hero">
    <div><div class="big">${aN("left", Math.abs(left))}</div><div class="lbl">${left < 0 ? "Calories over" : "Calories left"}</div>
      <div class="split"><div><b>${aN("eat", R(t.kcal))}</b><span>Eaten</span></div><div><b>${aN("brn", b)}</b><span>Burned</span></div><div><b>${comma(target)}</b><span>Goal</span></div></div></div>
    <div class="ring" style="width:124px;height:124px"><svg viewBox="0 0 124 124"><defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent-2)"/><stop offset="1" stop-color="var(--accent)"/></linearGradient></defs>
      <circle cx="62" cy="62" r="52" fill="none" stroke="var(--surface-2)" stroke-width="12"/><circle cx="62" cy="62" r="52" fill="none" stroke="${left < 0 ? "var(--warn)" : "url(#cg)"}" stroke-width="12" stroke-linecap="round" class="arc" ${aRing("cal", t.kcal / (target + b || 1), C)}/></svg>${ic("fire", 48)}</div>
  </section>
  <div class="macros3">${MACROS.map((m) => { const g = macroTarget(m.k), v = t[m.k], l = g - v, Cm = 2 * Math.PI * 24;
    return `<div class="mcard"><div><div class="v">${aN("ml" + m.k, Math.abs(R(l)))}g</div><div class="l">${m.label} ${l < 0 ? "over" : "left"}</div></div>
      <div class="ring" style="width:60px;height:60px"><svg viewBox="0 0 60 60"><circle cx="30" cy="30" r="24" fill="none" stroke="var(--surface-2)" stroke-width="7"/><circle cx="30" cy="30" r="24" fill="none" stroke="${MCOL[m.k]}" stroke-width="7" stroke-linecap="round" class="arc" ${aRing("mr" + m.k, v / g, Cm)}/></svg>${ic(MICON[m.k], 26)}</div></div>`; }).join("")}</div>
  <div class="section-t"><h2>Meals</h2><button class="link" data-a="tab" data-v="diary">Diary ›</button></div>
  ${MEALS.map((m) => { const items = list.filter((e) => e.meal === m.k), k = items.reduce((a, e) => a + e.n.kcal * e.qty, 0), rec = target * m.share;
    return `<div class="meal"><div class="ic">${ic(m.icon, 34)}</div><div class="grow"><b>${m.k}</b>
      <div class="sub ellip">${items.length ? `${comma(k)} of ${comma(rec * 0.9)}–${comma(rec * 1.1)} kcal` : `Recommended ${comma(rec * 0.9)}–${comma(rec * 1.1)} kcal`}</div>
      ${items.length ? `<div class="stack">${items.slice(0, 5).map((e) => `<img src="img/3d/${e.icon || iconFor(e.name)}.webp" alt="">`).join("")}<span class="xs muted ellip" style="margin-left:14px;align-self:center">${esc(items.map((e) => e.name).slice(0, 3).join(", "))}${items.length > 3 ? ` +${items.length - 3}` : ""}</span></div>` : ""}</div>
      <button class="add-o" data-a="add" data-m="${m.k}" aria-label="Add food to ${m.k}">+</button></div>`; }).join("")}
  ${nutrientsCard(t)}
  ${waterCard(d)}
  <div class="tiles">
    <button class="tile" data-a="body">${ic("footprints", 30)}<b>${d.body.steps ? (d.body.steps / 1000).toFixed(1) + "k" : "–"}</b><span>of ${(p.stepsTarget / 1000).toFixed(0)}k steps</span></button>
    <button class="tile" data-a="body">${ic("balance-scale", 30)}<b>${d.body.w ? fmt(d.body.w) : "–"}</b><span>kg weight</span></button>
    <button class="tile" data-a="body">${ic("zzz", 30)}<b>${d.body.sleep ? fmt(d.body.sleep) : "–"}</b><span>h sleep</span></button></div>
  ${p.supplements.length ? `<section class="card"><div class="card-h">${ic("pill", 30)}<h2>Supplements</h2><span class="muted sm">${p.supplements.filter((s) => d.supps.includes(s)).length}/${p.supplements.length}</span></div>
    <div class="pills">${p.supplements.map((s, i) => `<button class="pill ${d.supps.includes(s) ? "on" : ""}" data-a="supp" data-i="${i}"><span class="tk">✓</span>${esc(s)}</button>`).join("")}</div></section>` : ""}
  <section class="card coach">${ic("sparkles", 40)}<div class="grow"><h2 style="font-size:17px;margin-bottom:8px">Coach</h2><ul>${insights().map((x) => `<li>${x}</li>`).join("")}</ul></div></section>`;
}
function pctClass(n, v, g) { return n.limit ? (v > g ? "bad" : v > g * 0.8 ? "warn" : "") : ""; }
function nRow(n, v, key) { const g = nGoal(n); return `<div class="nrow"><span>${n.label}${n.limit ? ' <span class="xs muted">limit</span>' : ""}</span><span class="v">${fmt(R(v * 10) / 10)} <small>/ ${g} ${n.unit}</small></span><div class="mini-bar"><i class="${pctClass(n, v, g)}" ${key ? aW(key, (v / g) * 100) : `style="width:${Math.min(100, (v / g) * 100)}%"`}></i></div></div>`; }
function nutrientsCard(t) {
  const missing = t.count - t.withMicros, top = ["fiber", "iron", "calcium", "vitC"].map((k) => [...DETAIL_MACROS, ...MICROS].find((n) => n.k === k));
  return `<section class="card"><div class="card-h">${ic("dna", 30)}<h2>Nutrients</h2><button class="link" data-a="nutr">${ui.nutrOpen ? "Less ▲" : "All 15 ▼"}</button></div>
    <div class="ngrid">${top.map((n) => nRow(n, t[n.k], "nt" + n.k)).join("")}</div>
    ${missing > 0 ? `<div class="notice">${ic("sparkles", 24)}<span class="grow">${missing} food${missing > 1 ? "s" : ""} need vitamin & mineral data</span><button class="btn small" data-a="enrich-day" ${ui.busy.day ? "disabled" : ""}>${ui.busy.day ? "Fetching…" : "Fetch"}</button></div>` : ""}
    <div class="collapse ${ui.nutrOpen ? "open" : ""}"><div><div class="nlist" style="padding-top:4px">
      <p class="eyebrow">Fats, sugar & fibre</p>${DETAIL_MACROS.filter((n) => n.k !== "fiber").map((n) => nRow(n, t[n.k])).join("")}
      <p class="eyebrow">Minerals</p>${MICROS.filter((n) => n.group === "Minerals" && !["iron", "calcium"].includes(n.k)).map((n) => nRow(n, t[n.k])).join("")}
      <p class="eyebrow">Vitamins</p>${MICROS.filter((n) => n.group === "Vitamins" && n.k !== "vitC").map((n) => nRow(n, t[n.k])).join("")}
      <p class="xs muted">Daily values: ICMR-NIN 2020 RDA for Indian adults; sodium and sugar use WHO limits.</p></div></div></div></section>`;
}
function waterCard(d) {
  const p = P(), n = Math.max(p.waterTarget, d.water);
  const glass = (i) => `<button class="gl ${i < d.water ? "full" : ""}" data-a="water" data-n="${i + 1}" aria-label="${i + 1} glasses"><svg viewBox="0 0 30 40"><path d="M3 3h24l-3 33a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" fill="var(--surface-2)"/><path class="w" style="transition-delay:${i * 30}ms" d="M5 12h20l-2.3 24a2 2 0 0 1-2 1.8H9.3a2 2 0 0 1-2-1.8z" fill="var(--water)"/><path d="M3 3h24l-3 33a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z" fill="none" stroke="var(--surface-3)" stroke-width="1.5"/></svg>${i === d.water ? '<span class="plus">+</span>' : ""}</button>`;
  return `<section class="card"><div class="card-h">${ic("droplet", 30)}<h2>Water</h2><span class="num" style="font-size:18px">${fmt(d.water * 0.25, 2)} <span class="muted sm" style="font-family:var(--body)">/ ${fmt(p.waterTarget * 0.25, 2)} L</span></span></div>
    <div class="glasses" style="grid-template-columns:repeat(${Math.min(n, 10)},1fr)">${Array.from({ length: n }, (_, i) => glass(i)).join("")}</div></section>`;
}
function insights() {
  const p = P(), d = day(ui.date), t = dayTotals(ui.date), out = [];
  const left = kcalTarget() + burned(ui.date) - R(t.kcal), pl = proteinTarget() - R(t.protein);
  if (!d.foods.length) out.push("Nothing logged yet. Tap <b>+</b> next to a meal, or snap a photo of your plate.");
  if (pl > 10) out.push(`<b>${pl} g protein</b> to go. Easy wins: whey scoop 23 g, 100 g chicken breast 31 g, 100 g paneer 18 g, 2 boiled eggs 12.6 g.`);
  else if (d.foods.length) out.push("<b>Protein goal hit.</b> Nice work.");
  if (left < -150) out.push(`<b>${-left} kcal over</b> today. A 30-minute brisk walk burns about 150 kcal.`);
  if (t.withMicros && t.sodium > 2000) out.push(`Sodium is <b>${comma(t.sodium)} mg</b>, above the 2,000 mg limit. Go easy on pickles and papad.`);
  if (t.fiber < 15 && t.count >= 3) out.push(`Only <b>${R(t.fiber)} g fibre</b> so far. Add fruit, sprouts or a salad.`);
  if (d.water < p.waterTarget) out.push(`<b>${p.waterTarget - d.water} more glass${p.waterTarget - d.water > 1 ? "es" : ""}</b> of water to hit your goal.`);
  return out.slice(0, 3);
}

// ================= diary =================
function diaryView() {
  const list = foodsOf(ui.date), t = totals(list);
  return `<header class="head"><h1 class="grow">${dateTitle()}</h1><button class="iconbtn" data-a="day-" aria-label="Previous day">‹</button><button class="iconbtn" data-a="day+" aria-label="Next day" ${ui.date >= today() ? "disabled" : ""}>›</button></header>
  <div class="seg">${["food", "workout"].map((s) => `<button class="${ui.seg === s ? "on" : ""}" data-a="seg" data-v="${s}">${s === "food" ? "Food" : "Exercise"}</button>`).join("")}<span class="ind" style="width:calc(50% - 4px);transform:translateX(${ui.seg === "food" ? 0 : 100}%)"></span></div>
  ${ui.seg === "food" ? `<div class="dsum"><div><b>${aN("dk", R(t.kcal))}</b><span>of ${comma(kcalTarget())} kcal</span></div>${MACROS.map((m) => `<div><b style="color:${m.color}">${aN("d" + m.k, R(t[m.k]))}g</b><span>${m.label}</span></div>`).join("")}</div>
    ${MEALS.map((m) => dMeal(m, list.filter((e) => e.meal === m.k))).join("")}` : workoutView()}`;
}
function dMeal(m, items) {
  const k = items.reduce((a, e) => a + e.n.kcal * e.qty, 0), prev = foodsOf(addDays(ui.date, -1)).filter((e) => e.meal === m.k);
  return `<section class="card dmeal"><div class="card-h"><span class="ic">${ic(m.icon, 28)}</span><div class="grow"><h2>${m.k}</h2><span class="xs muted">${comma(k)} kcal · P ${R(items.reduce((a, e) => a + e.n.protein * e.qty, 0))} g</span></div><button class="add-o" data-a="add" data-m="${m.k}" aria-label="Add to ${m.k}">+</button></div>
    ${items.length ? `<div>${items.map((e) => `<button class="ent" data-a="edit" data-id="${e.id}"><span class="ib">${e.img ? `<img class="ph" src="${e.img}" alt="">` : ic(e.icon || iconFor(e.name), 30)}</span><span class="grow"><span class="nm ellip">${esc(e.name)}${e.src === "ai" || e.src === "photo" ? '<span class="tagai">AI</span>' : ""}</span><span class="meta">${esc(unitText(e.unit, e.qty, e.g))}</span></span><span class="kc">${comma(e.n.kcal * e.qty)}<small>kcal</small></span></button>`).join("")}</div>`
      : prev.length ? `<button class="btn soft small" data-a="repeat" data-m="${m.k}">Repeat yesterday's ${m.k.toLowerCase()}</button>` : ""}</section>`;
}

// ================= workouts =================
const STRENGTH = ["Bench press", "Squat", "Deadlift", "Overhead press", "Barbell row", "Lat pulldown", "Pull-up", "Incline dumbbell press", "Leg press", "Romanian deadlift", "Bicep curl", "Tricep pushdown", "Lateral raise", "Lunges", "Push-up", "Plank"];
const CARDIO = ["Walking", "Running", "Cycling", "Skipping", "Swimming", "Yoga", "Badminton", "Cricket"];
const met = (name, cardio) => { const e = (name || "").toLowerCase(); if (!cardio) return 5; for (const [k, v] of [["run", 9.8], ["skip", 11], ["cycl", 7.5], ["swim", 8], ["walk", 3.5], ["yoga", 3], ["badminton", 5.5], ["cricket", 5]]) if (e.includes(k)) return v; return 6; };
const woKcal = (w) => R((met(w.name, w.cardio) * P().weightKg * (w.cardio ? +w.minutes || 0 : (+w.sets || 0) * 3)) / 60);
const woIcon = (w) => { const e = w.exercise.toLowerCase(); return !w.cardio ? "person-lifting-weights" : e.includes("swim") ? "person-swimming" : e.includes("cycl") ? "bicycle" : e.includes("yoga") ? "person-in-lotus-position" : e.includes("walk") ? "person-walking" : "person-running"; };
function workoutView() {
  const list = day(ui.date).workouts, b = burned(ui.date), vol = list.filter((w) => !w.cardio).reduce((a, w) => a + w.sets * w.reps * w.weightKg, 0);
  const prs = {}; Object.values(S.days).forEach((dd) => dd.workouts.forEach((w) => { if (!w.cardio && w.weightKg > 0) { const k = w.exercise.toLowerCase(); prs[k] = Math.max(prs[k] || 0, w.weightKg); } }));
  return `<div class="tiles"><div class="tile">${ic("fire", 28)}<b>${aN("wb", b)}</b><span>kcal burned</span></div><div class="tile">${ic("flexed-biceps", 28)}<b>${aN("wv", R(vol))}</b><span>kg volume</span></div><div class="tile">${ic("stopwatch", 28)}<b>${list.reduce((a, w) => a + (w.minutes || 0), 0)}</b><span>minutes</span></div></div>
  <button class="btn lg block" data-a="workout">Log exercise</button>
  <section class="card">${list.length ? list.map((w) => { const pr = prs[w.exercise.toLowerCase()];
    return `<div class="wo"><span class="ib">${ic(woIcon(w), 32)}</span><div class="grow"><b>${esc(w.exercise)}</b><div class="xs muted">${w.cardio ? `${w.minutes} min` : `${w.sets} × ${w.reps}${w.weightKg > 0 ? ` @ ${fmt(w.weightKg)} kg` : ""}`} · ${w.kcal} kcal</div>
      ${!w.cardio && pr ? (w.weightKg > 0 && w.weightKg >= pr ? `<div class="pb">Personal best</div>` : `<div class="xs muted">Best ${fmt(pr)} kg</div>`) : ""}</div><button class="x" data-a="wdel" data-id="${w.id}" aria-label="Remove">✕</button></div>`; }).join("")
    : `<div class="empty">${ic("person-running", 64)}<b style="color:var(--ink)">No exercise logged</b><span class="sm">Log a gym session or a walk to see calories burned.</span></div>`}</section>`;
}

// ================= progress =================
function progressView() {
  const p = P(), t = today(), days = [...Array(7)].map((_, i) => addDays(t, i - 6)), tot = days.map(dayTotals);
  const labels = days.map((d) => new Date(d + "T12:00:00").toLocaleDateString("en-IN", { weekday: "narrow" }));
  const logged = tot.filter((x) => x.count), avg = logged.length ? R(logged.reduce((a, x) => a + x.kcal, 0) / logged.length) : 0;
  const weights = Object.keys(S.days).sort().filter((d) => S.days[d].body?.w).slice(-30).map((d) => ({ d, w: +S.days[d].body.w }));
  const md = tot.filter((x) => x.withMicros), bmi = p.weightKg / (p.heightCm / 100) ** 2;
  const bmiL = bmi < 18.5 ? "Underweight" : bmi < 23 ? "Healthy" : bmi < 25 ? "Overweight" : "Obese";
  return `<header class="head"><h1 class="grow">Progress</h1><span class="pillstat">${ic("fire", 22)}${streak()} day streak</span></header>
  <div class="tiles"><div class="tile">${ic("fork-and-knife-with-plate", 28)}<b>${aN("pa", avg)}</b><span>avg kcal</span></div><div class="tile">${ic("trophy", 28)}<b>${days.filter((d) => day(d).workouts.length).length}/7</b><span>workout days</span></div><div class="tile">${ic("balance-scale", 28)}<b>${fmt(R(bmi * 10) / 10)}</b><span>BMI · ${bmiL}</span></div></div>
  <section class="card"><div class="card-h"><h2>Weight</h2><span class="sm" style="color:var(--protein);font-weight:700">Goal ${fmt(p.goalWeightKg)} kg</span></div>
    ${weights.length < 2 ? `<div class="empty">${ic("chart-increasing", 56)}<span class="sm">Log your weight on two or more days to see the trend.</span><button class="btn soft small" data-a="body">Log weight</button></div>` : weightChart(weights, p.goalWeightKg)}</section>
  <section class="card"><div class="card-h"><h2>Calories</h2><span class="muted sm">goal ${comma(kcalTarget())}</span></div>${bars(tot.map((x) => x.kcal), labels, kcalTarget(), "var(--accent)")}</section>
  <section class="card"><div class="card-h"><h2>Protein</h2><span class="muted sm">goal ${proteinTarget()} g</span></div>${bars(tot.map((x) => x.protein), labels, proteinTarget(), "var(--protein)")}</section>
  <section class="card"><div class="card-h">${ic("dna", 28)}<h2>Vitamins & minerals</h2></div>
    ${md.length ? `<div class="nlist">${MICROS.map((n) => { const a = md.reduce((s, x) => s + x[n.k], 0) / md.length, g = nGoal(n), pc = R((a / g) * 100);
      return `<div class="nrow"><span>${n.label}</span><span class="v">${pc}% <small>· ${fmt(R(a * 10) / 10)} ${n.unit}</small></span><div class="mini-bar"><i class="${n.limit ? pctClass(n, a, g) : pc < 50 ? "warn" : ""}" ${aW("pm" + n.k, pc)}></i></div></div>`; }).join("")}</div><p class="xs muted">Average over ${md.length} day${md.length > 1 ? "s" : ""} with full nutrient data.</p>`
    : `<div class="empty">${ic("sparkles", 48)}<span class="sm">Scan a meal or fetch nutrients with AI to see vitamins and minerals.</span></div>`}</section>`;
}
function weightChart(pts, goal) {
  const W = 340, H = 170, L = 30, Rt = 8, T = 10, B = 22, vals = pts.map((p) => p.w).concat(goal);
  const mn = Math.floor(Math.min(...vals) - 1), mx = Math.ceil(Math.max(...vals) + 1);
  const x = (i) => L + ((W - L - Rt) * i) / (pts.length - 1), y = (v) => T + (H - T - B) * (1 - (v - mn) / (mx - mn));
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.w).toFixed(1)}`).join(""), first = pts[0], last = pts[pts.length - 1], diff = last.w - first.w, toGo = goal - last.w;
  return `<div><span class="num" style="font-size:32px">${fmt(last.w)}</span><span class="muted"> kg </span><span class="sm" style="font-weight:800;color:${(diff < 0) === (P().goal !== "gain") ? "var(--accent)" : "var(--protein)"}">${diff >= 0 ? "▲" : "▼"} ${fmt(Math.abs(R(diff * 10) / 10))} kg</span></div>
  <svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend"><defs><linearGradient id="wg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".25"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
    ${[mn, R((mn + mx) / 2), mx].map((v) => `<line x1="${L}" x2="${W - Rt}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join("")}
    <line x1="${L}" x2="${W - Rt}" y1="${y(goal)}" y2="${y(goal)}" stroke="var(--protein)" stroke-width="2" stroke-dasharray="6 5"/>
    <path d="${line}L${x(pts.length - 1)},${H - B}L${L},${H - B}Z" fill="url(#wg)"/><path class="draw" d="${line}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(pts.length - 1)}" cy="${y(last.w)}" r="6" fill="var(--accent)" stroke="var(--surface)" stroke-width="3"/>
    <text x="${L}" y="${H - 4}">${first.d.slice(8)}/${first.d.slice(5, 7)}</text><text x="${W - Rt}" y="${H - 4}" text-anchor="end">${last.d.slice(8)}/${last.d.slice(5, 7)}</text></svg>
  <p class="muted sm">${Math.abs(toGo) < 0.5 ? "You're at your goal weight." : `${fmt(Math.abs(R(toGo * 10) / 10))} kg to ${toGo < 0 ? "lose" : "gain"}`}</p>`;
}
function bars(vals, labels, target, color) {
  const W = 340, H = 150, T = 18, B = 20, mx = Math.max(target, ...vals) * 1.12 || 1, slot = W / vals.length, bw = slot * 0.46, y = (v) => T + (H - T - B) * (1 - v / mx);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Last 7 days">${vals.map((v, i) => { const x = i * slot + (slot - bw) / 2, h = ((H - T - B) * v) / mx;
    return `<rect x="${x}" y="${T}" width="${bw}" height="${H - T - B}" rx="${bw / 2}" fill="var(--surface-2)"/>${h > 0 ? `<rect class="grow-b" style="animation-delay:${i * 0.05}s" x="${x}" y="${y(v)}" width="${bw}" height="${h}" rx="${Math.min(bw / 2, h / 2)}" fill="${v > target * 1.1 ? "var(--warn)" : color}"/>` : ""}
      ${i === vals.length - 1 && v > 0 ? `<text x="${x + bw / 2}" y="${y(v) - 6}" text-anchor="middle" style="fill:var(--ink)">${comma(v)}</text>` : ""}<text x="${x + bw / 2}" y="${H - 4}" text-anchor="middle">${labels[i]}</text>`; }).join("")}
    <line x1="0" x2="${W}" y1="${y(target)}" y2="${y(target)}" stroke="var(--ink)" stroke-opacity=".3" stroke-dasharray="4 5"/></svg>`;
}

// ================= me =================
function meView() {
  const p = P(), cloud = S.mode === "cloud", key = ai.getKey(), theme = localStorage.getItem("healthyfi.theme") || "system", th = ["system", "light", "dark"];
  return `<header class="head"><h1 class="grow">Me</h1></header>
  <section class="card"><div class="row"><div class="avatar" style="width:60px;height:60px;font-size:24px">${S.user?.photo ? `<img src="${esc(S.user.photo)}" alt="" referrerpolicy="no-referrer">` : esc((p.name || "?")[0].toUpperCase())}</div>
    <div class="grow"><b style="font-size:18px">${esc(S.user?.name || p.name || "Guest")}</b><p class="sm muted ellip">${cloud ? esc(S.user.email) : "Not signed in"}</p><p class="xs"><span class="dotok ${cloud ? "ok" : ""}"></span>${cloud ? "Synced to your account" : "Saved on this device only"}</p></div></div></section>
  <section class="plan" style="padding:20px"><div class="row">${ic("bullseye", 34)}<b class="grow">Daily plan</b><span class="sm" style="opacity:.7">${{ lose: "Lose fat", maintain: "Stay fit", gain: "Build muscle" }[p.goal]}</span></div>
    <div class="r3" style="grid-template-columns:repeat(4,1fr)"><div><b>${comma(kcalTarget())}</b><span>kcal</span></div>${MACROS.map((m) => `<div><b>${macroTarget(m.k)}g</b><span>${m.label.toLowerCase()}</span></div>`).join("")}</div></section>
  <div class="list">
    <button class="li" data-a="profile"><span class="ib">${ic("person-running", 26)}</span><span class="grow"><b>Profile & goals</b><span class="s">${p.age} yrs · ${fmt(p.heightCm)} cm · ${fmt(p.weightKg)} → ${fmt(p.goalWeightKg)} kg</span></span><span class="go">›</span></button>
    <button class="li" data-a="ai"><span class="ib">${ic("sparkles", 26)}</span><span class="grow"><b>AI settings</b><span class="s"><span class="dotok ${key ? "ok" : ""}"></span>${key ? "Gemini connected" : "Add a Gemini key for photo scan"}</span></span><span class="go">›</span></button>
    <button class="li" data-a="supps"><span class="ib">${ic("pill", 26)}</span><span class="grow"><b>Supplements</b><span class="s ellip">${p.supplements.length ? esc(p.supplements.join(", ")) : "None"}</span></span><span class="go">›</span></button></div>
  <section class="card" style="gap:10px"><b>Appearance</b><div class="seg">${th.map((t) => `<button class="${theme === t ? "on" : ""}" data-a="theme" data-v="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`).join("")}<span class="ind" style="width:calc((100% - 8px) / 3);transform:translateX(${th.indexOf(theme) * 100}%)"></span></div></section>
  <div class="list">
    <button class="li" data-a="export"><span class="ib">${ic("chart-increasing", 26)}</span><span class="grow"><b>Export my data</b><span class="s">Download everything as JSON</span></span><span class="go">›</span></button>
    <button class="li" data-a="clear"><span class="ib">${ic("gear", 26)}</span><span class="grow"><b>Clear all logs</b><span class="s">Keeps your profile and goals</span></span><span class="go">›</span></button>
    ${cloud ? `<button class="li" data-a="signout"><span class="ib">${ic("crescent-moon", 26)}</span><span class="grow"><b>Sign out</b></span></button>` : `<button class="li" data-a="google"><span class="ib">${ic("rocket", 26)}</span><span class="grow"><b>Sign in with Google</b><span class="s">Back up and sync across devices</span></span><span class="go">›</span></button>`}</div>
  <p class="xs muted" style="text-align:center">Healthyfi 3.0 · Nutrition values are estimates, not medical advice · 3D icons: Microsoft Fluent Emoji (MIT)</p>`;
}

// ================= full-screen pages =================
function pushPage(p) {
  ui.pages.push(p);
  const el = document.createElement("section");
  el.className = "page"; el.id = "pg" + (ui.pages.length - 1); el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
  $("#pages").appendChild(el);
  renderPage(ui.pages.length - 1);
  requestAnimationFrame(() => requestAnimationFrame(() => { el.classList.add("in"); const under = $("#pg" + (ui.pages.length - 2)); if (under) under.classList.add("under"); }));
  document.body.style.overflow = "hidden";
  renderTray();
}
function popPage() {
  const i = ui.pages.length - 1; if (i < 0) return;
  const el = $("#pg" + i), under = $("#pg" + (i - 1));
  ui.pages.pop(); abortCtl?.abort();
  el.classList.remove("in"); el.id = "";
  if (under) { under.classList.remove("under"); renderPage(i - 1); }
  setTimeout(() => el.remove(), 480);
  if (!ui.pages.length) { document.body.style.overflow = ""; ui.tray = null; render(); }
  renderTray();
}
function closeAllPages() { while (ui.pages.length) popPage(); }
const topPage = () => ui.pages[ui.pages.length - 1];
function renderPage(i = ui.pages.length - 1, keepScroll = true) {
  const p = ui.pages[i], el = $("#pg" + i); if (!p || !el) return;
  const prevB = el.querySelector(".page-b"), st = prevB ? prevB.scrollTop : 0;
  el.innerHTML = { add: addPage, detail: detailPage, describe: describePage, scan: scanPage }[p.type](p);
  if (keepScroll) { const b = el.querySelector(".page-b"); if (b) b.scrollTop = st; }
  animate(el);
}
function pageHead(title, right = "") { return `<header class="page-h"><button class="iconbtn" data-a="pop" aria-label="Back">${I.back}</button><div class="t">${title}</div>${right || '<span style="width:42px"></span>'}</header>`; }

// ---------- tray (multi-item logging) ----------
function trayAdd(e, fromRail = false) {
  const t = ui.tray, same = t.items.find((x) => x.fid && x.fid === e.fid && x.unit === e.unit);
  if (same) same.qty = R((same.qty + e.qty) * 100) / 100; else t.items.push(e);
  if (!fromRail && e.fid && FOOD[e.fid]?.pair) t.lastFid = e.fid; // suggestions keep the rail anchored on the main dish
}
function trayItemFor(fid) { const f = FOOD[fid]; return ui.tray?.items.find((x) => x.fid === fid && x.unit === f.units[0][0]); }
function entryFrom(fl, ui_, qty, src = "db") { const [unit, g] = fl.units[ui_]; return { id: uid(), fid: fl.fid, name: fl.name, icon: fl.icon, unit, g: g || null, qty: +qty, n: cleanNutrients(nFor(fl, ui_)), src }; }
function renderTray() {
  const el = $("#tray"), t = ui.tray, show = t && t.items.length && ui.pages.length && topPage().type !== "detail";
  if (!show) { el.innerHTML = ""; el.dataset.sig = ""; return; }
  const k = t.items.reduce((a, e) => a + e.n.kcal * e.qty, 0), p = t.items.reduce((a, e) => a + e.n.protein * e.qty, 0);
  const html = `<div class="stk">${t.items.slice(-4).map((e) => `<img src="img/3d/${e.icon}.webp" alt="">`).join("")}</div>
    <button class="info" data-a="tray-review"><b>${t.items.length} item${t.items.length > 1 ? "s" : ""} · ${comma(k)} kcal</b><span>${R(p)} g protein · tap to review</span></button><button class="done" data-a="tray-done">Done</button>`;
  const inner = el.querySelector(".tray-in");
  if (inner) inner.innerHTML = html; else el.innerHTML = `<div class="tray-in">${html}</div>`;
}
function commitTray() {
  const t = ui.tray; if (!t || !t.items.length) return;
  const d = ui.date, before = dayTotals(d), dd = ensureDay(d);
  t.items.forEach((e) => dd.foods.push({ ...e, id: uid(), meal: t.meal, t: Date.now() }));
  saveDay(d);
  const after = dayTotals(d), n = t.items.length, meal = t.meal;
  closeAllPages();
  if (before.protein < proteinTarget() && after.protein >= proteinTarget()) { confetti(); toast("Protein goal hit!"); }
  else toast(`Logged ${n} item${n > 1 ? "s" : ""} to ${meal.toLowerCase()}`);
}

// ---------- add food page ----------
function frow(f) {
  const it = trayItemFor(f.id), [u, g] = f.units[0];
  return `<div class="fr"><button class="open" data-a="food" data-id="${f.id}"><span class="ib">${ic(f.icon, 36)}</span><span class="grow"><span class="nm ellip" style="display:block">${esc(f.name)}</span><span class="meta">1 ${esc(u)} · ${R((f.per[0] * g) / 100)} kcal</span></span></button>
    ${it ? `<span class="qpill"><button data-a="tq-" data-id="${f.id}" aria-label="Less">−</button><span>${fmt(it.qty)}</span><button data-a="tq+" data-id="${f.id}" aria-label="More">+</button></span>` : `<button class="addc" data-a="quickadd" data-id="${f.id}" aria-label="Add ${esc(f.name)}">+</button>`}</div>`;
}
function pairRail(foods, title) {
  return `<div class="pairs"><div class="t">${title}</div><div class="prail">${foods.map((f) => { const on = !!trayItemFor(f.id), [u, g] = f.units[0];
    return `<button class="pc ${on ? "on" : ""}" data-a="${on ? "tq-" : "quickadd"}" data-id="${f.id}" aria-label="${on ? "Remove" : "Add"} ${esc(f.name)}">${ic(f.icon, 46)}<b>${esc(f.name)}</b><span>1 ${esc(u)} · ${R((f.per[0] * g) / 100)} kcal</span><span class="pp">${on ? "✓" : "+"}</span></button>`; }).join("")}</div></div>`;
}
function addPage(p) {
  const q = p.q || "", t = ui.tray, mealM = mealOf(t.meal);
  let body = "";
  const last = t.lastFid && FOOD[t.lastFid];
  if (last && !q) body += pairRail(last.pair.map((id) => FOOD[id]).filter(Boolean), `${ic(last.icon, 24)}Goes well with ${esc(last.name)}`);
  if (q.trim().length >= 2) {
    body += `<button class="ai-row" data-a="ask-ai">${ic("sparkles", 36)}<span class="grow"><b>${p.ai?.loading ? "Working it out…" : `Ask AI: “${esc(q.trim())}”`}</b><span>Full nutrition for any dish or a whole meal</span></span><span>›</span></button>`;
    if (p.ai?.loading) body += `<div class="shimmer"></div><div class="shimmer" style="opacity:.6"></div>`;
    if (p.ai?.error) body += `<div class="notice">${ic("bell", 24)}<span class="grow">${esc(p.ai.error)}</span>${p.ai.code === "no_key" || p.ai.code === "bad_key" ? `<button class="btn small" data-a="ai">Add key</button>` : ""}</div>`;
    if (p.ai?.items?.length) body += `<div class="fl-t"><h3>AI results</h3><button class="link" data-a="ai-addall">Add all</button></div><div class="flist">${p.ai.items.map((it, i) => `<div class="fr"><button class="open" data-a="ai-open" data-i="${i}"><span class="ib">${ic(iconFor(it.name), 36)}</span><span class="grow"><span class="nm ellip" style="display:block">${esc(it.name)}</span><span class="meta">${esc(unitText(it.unit.replace(/^1\s+/, ""), it.qty, it.grams))} · ${comma(it.n.kcal * it.qty)} kcal</span></span></button><button class="addc" data-a="ai-add" data-i="${i}" aria-label="Add ${esc(it.name)}">+</button></div>`).join("")}</div>`;
    const hits = searchFoods(q);
    body += hits.length ? `<div class="fl-t"><h3>Foods</h3><span class="xs muted">${hits.length} found</span></div><div class="flist">${hits.map(frow).join("")}</div>` : !p.ai ? `<p class="muted sm" style="text-align:center">Not in our list yet. Ask AI above.</p>` : "";
  } else {
    body += `<div class="quick"><button data-a="open-scan">${ic("camera-with-flash", 34)}Scan meal</button><button data-a="open-describe">${ic("sparkles", 34)}Describe</button><button data-a="custom">${ic("fork-and-knife-with-plate", 34)}Custom</button></div>`;
    const recent = recentFoods();
    if (recent.length && p.cat === "All") body += `<div class="fl-t"><h3>Recent</h3></div><div class="flist">${recent.map(frow).join("")}</div>`;
    if (S.customFoods.length && p.cat === "All") body += `<div class="fl-t"><h3>My foods</h3></div><div class="flist">${S.customFoods.map((f, i) => `<div class="fr"><span class="open"><span class="ib">${ic(iconFor(f.name), 36)}</span><span class="grow"><span class="nm ellip" style="display:block">${esc(f.name)}</span><span class="meta">1 ${esc(f.unit)} · ${R(f.n.kcal)} kcal</span></span></span><button class="addc" data-a="custom-add" data-i="${i}" aria-label="Add ${esc(f.name)}">+</button></div>`).join("")}</div>`;
    body += `<div class="chips">${["All", ...CATEGORIES].map((c) => `<button class="chip ${p.cat === c ? "on" : ""}" data-a="cat" data-v="${esc(c)}">${esc(c)}</button>`).join("")}</div>`;
    body += (p.cat === "All" ? CATEGORIES : [p.cat]).map((c) => `<div class="fl-t"><h3>${esc(c)}</h3></div><div class="flist">${FOODS.filter((f) => f.cat === c).map(frow).join("")}</div>`).join("");
  }
  return `${pageHead(`<button class="mealbtn" data-a="mealpick">${ic(mealM.icon, 26)}${esc(t.meal)} ▾</button>`, `<button class="iconbtn" data-a="open-scan" aria-label="Scan a meal photo">${I.cam}</button>`)}
    <div class="page-b"><div class="searchbox">${I.search}<input id="q" placeholder="Search idli, pappu, chicken…" value="${esc(q)}" autocomplete="off" enterkeyhint="search" aria-label="Search foods">${q ? '<button class="clr" data-a="clearq" aria-label="Clear search">✕</button>' : ""}</div>${body}</div>`;
}
function recentFoods() {
  const seen = new Set(), out = [];
  for (const d of Object.keys(S.days).sort().reverse()) for (const e of [...S.days[d].foods].reverse()) if (e.fid && FOOD[e.fid] && !seen.has(e.fid)) { seen.add(e.fid); out.push(FOOD[e.fid]); if (out.length >= 6) return out; }
  return out;
}
async function askAI() {
  const p = topPage(); if (p?.type !== "add") return;
  const q = (p.q || "").trim(); if (q.length < 2) return;
  abortCtl?.abort(); abortCtl = new AbortController();
  p.ai = { loading: true }; renderPage();
  try { const items = await ai.lookupFood(q, { signal: abortCtl.signal }); items.forEach(cacheMicros); p.ai = { items }; if (!items.length) p.ai.error = "AI couldn't identify that. Try describing it differently."; }
  catch (e) { if (e.name === "AbortError") return; p.ai = { error: e.message, code: e.code }; }
  if (topPage() === p) renderPage();
}
function cacheMicros(it) { if (it.grams && hasMicros(it.n)) { const m = {}; for (const k in it.n) if (!NONMICRO.includes(k)) m[k] = (it.n[k] * 100) / it.grams; S.cache["m:" + it.name.toLowerCase()] = m; } }

// ---------- food detail page ----------
function detailPage(p) {
  const fl = p.fl, ui_ = p.unit, qty = +p.qty || 0, n = scaleN(nFor(fl, ui_), qty), [unit, g] = fl.units[ui_];
  const pk = n.protein * 4, ck = n.carbs * 4, fk = n.fat * 9, sum = pk + ck + fk || 1, edit = p.mode === "edit";
  const facts = [["Calories", `${comma(n.kcal)} kcal`], ["Protein", `${fmt(R(n.protein * 10) / 10)} g`], ["Carbohydrates", `${fmt(R(n.carbs * 10) / 10)} g`], ["Fat", `${fmt(R(n.fat * 10) / 10)} g`], ...(n.fiber != null ? [["Fibre", `${fmt(R(n.fiber * 10) / 10)} g`]] : [])];
  const pairs = (fl.pair || []).map((id) => FOOD[id]).filter(Boolean);
  return `${pageHead(`<h2>${edit ? "Edit food" : "Add food"}</h2>`)}
  <div class="page-b" style="padding-bottom:140px">
    <div class="fd-top"><div class="fd-art">${p.img ? `<img src="${p.img}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : ic(fl.icon, 104)}</div><h1>${esc(fl.name)}</h1><div class="fd-kcal">${aN("fdk", R(n.kcal))}<span class="muted" style="font-size:18px;font-family:var(--body);font-weight:600"> kcal</span></div><p class="muted sm">${esc(unitText(unit, qty, g))}</p></div>
    <div class="qty"><button data-a="dq-" aria-label="Less">−</button><div class="v"><input id="dq" inputmode="decimal" value="${esc(p.qty)}" aria-label="Quantity"><span>${esc(unit === "g" ? "grams" : plural(unit, qty))}</span></div><button data-a="dq+" aria-label="More">+</button></div>
    <div class="units" role="group" aria-label="Serving unit">${fl.units.map(([u, gg], i) => `<button class="unit ${i === ui_ ? "on" : ""}" data-a="unit" data-i="${i}">${esc(u === "g" ? "grams" : u)}<small>${u === "g" ? "custom" : gg ? fmt(gg) + " g" : "serving"}</small></button>`).join("")}</div>
    <section class="card"><div class="mbar"><i style="flex-grow:${pk / sum};background:var(--protein)"></i><i style="flex-grow:${ck / sum};background:var(--carbs)"></i><i style="flex-grow:${fk / sum};background:var(--fat)"></i></div>
      <div class="mcols">${MACROS.map((m) => `<div><b>${fmt(R(n[m.k] * 10) / 10)}g</b><span><i style="background:${m.color}"></i>${m.label} ${R(((m.k === "fat" ? n[m.k] * 9 : n[m.k] * 4) / sum) * 100)}%</span></div>`).join("")}</div></section>
    <section class="card facts" style="gap:0"><h2 style="font-size:17px;margin-bottom:6px">Nutrition facts</h2>${facts.map(([a, b]) => `<div class="fx"><span>${a}</span><b>${b}</b></div>`).join("")}</section>
    <section class="card"><div class="card-h">${ic("dna", 28)}<h2>Vitamins & minerals</h2></div>
      ${hasMicros(n) ? `<div class="nlist">${[...DETAIL_MACROS.filter((x) => x.k !== "fiber"), ...MICROS].filter((x) => typeof n[x.k] === "number").map((x) => nRow(x, n[x.k])).join("")}</div>`
      : p.enriching ? `<div class="shimmer" style="height:22px"></div><div class="shimmer" style="height:22px"></div><div class="shimmer" style="height:22px"></div>`
      : `<div class="notice">${ic("sparkles", 24)}<span class="grow">${p.err ? esc(p.err) : ai.getKey() ? "See 15 vitamins, minerals and more" : "Add a free Gemini key to see vitamins & minerals"}</span><button class="btn small" data-a="${ai.getKey() ? "enrich-detail" : "ai"}">${ai.getKey() ? "Get" : "Add key"}</button></div>`}</section>
    ${pairs.length && !edit ? pairRail(pairs, "Goes well with") : ""}
  </div>
  <div class="foot"><div>${edit ? `<button class="btn danger" data-a="del-entry">Delete</button><button class="btn lg grow" data-a="save-entry" ${qty > 0 ? "" : "disabled"}>Save · ${comma(n.kcal)} kcal</button>` : `<button class="btn lg block" data-a="detail-add" ${qty > 0 ? "" : "disabled"}>Add to ${esc(ui.tray.meal)} · ${comma(n.kcal)} kcal</button>`}</div></div>`;
}
function openDetail(fl, extra = {}) {
  const p = { type: "detail", fl, unit: 0, qty: "1", mode: "tray", ...extra };
  pushPage(p);
  if (!hasMicros(nFor(fl, 0)) && ai.getKey()) enrichDetail(p);
}
async function enrichDetail(p) {
  const fl = p.fl; p.enriching = true; p.err = ""; renderPage(ui.pages.indexOf(p));
  try {
    if (fl.per) { const r = await ai.enrichFood(fl.name, "100 g"); if (r) { const m = {}; for (const k in r.n) if (!NONMICRO.includes(k)) m[k] = r.n[k] * (100 / (r.grams || 100)); S.cache["m:" + fl.name.toLowerCase()] = m; saveProfile(); } }
    else { const [u, g] = fl.units[0]; const r = await ai.enrichFood(fl.name, g ? `${u} (${g} g)` : u); if (r) fl.nUnit = { ...pickMicros(r.n), ...fl.nUnit }; }
  } catch (e) { p.err = e.message; }
  p.enriching = false;
  if (ui.pages.includes(p)) renderPage(ui.pages.indexOf(p));
}

// ---------- describe (AI text) page ----------
function resultList(items, pfx) {
  return `<div class="flist">${items.map((it, i) => `<div class="fr"><span class="open"><span class="ib">${ic(iconFor(it.name), 36)}</span><span class="grow"><span class="nm ellip" style="display:block">${esc(it.name)}</span><span class="meta">${esc(unitText(it.unit.replace(/^1\s+/, ""), it.qty, it.grams))} · ${comma(it.n.kcal * it.qty)} kcal · P ${R(it.n.protein * it.qty)} g</span></span></span>
    <span class="qpill"><button data-a="${pfx}q-" data-i="${i}" aria-label="Less">−</button><span>${fmt(it.qty)}</span><button data-a="${pfx}q+" data-i="${i}" aria-label="More">+</button></span></div>`).join("")}</div>`;
}
function describePage(p) {
  const items = p.items;
  return `${pageHead("<h2>Describe your meal</h2>")}<div class="page-b">
    <div class="field"><label for="desc">What did you eat?</label><textarea id="desc" rows="3" placeholder="e.g. 3 idli, a katori of sambar, coconut chutney and a filter coffee">${esc(p.text || "")}</textarea></div>
    <button class="btn lg block" data-a="describe-go" ${p.loading ? "disabled" : ""}>${p.loading ? "Calculating…" : "Calculate with AI"}</button>
    ${p.loading ? `<div class="shimmer"></div><div class="shimmer" style="opacity:.6"></div>` : ""}
    ${p.error ? `<div class="notice">${ic("bell", 24)}<span class="grow">${esc(p.error)}</span>${p.code === "no_key" || p.code === "bad_key" ? `<button class="btn small" data-a="ai">Add key</button>` : ""}</div>` : ""}
    ${items?.length ? resultList(items, "d") + `<button class="btn lg block accent" data-a="d-addall">Add ${items.length} to tray · ${comma(items.reduce((a, it) => a + it.n.kcal * it.qty, 0))} kcal</button>` : ""}
  </div>`;
}

// ---------- scan page ----------
function scanPage(p) {
  if (!ai.getKey()) return `${pageHead("<h2>Scan meal</h2>")}<div class="page-b"><div class="viewfinder"><div class="corners"><i></i><i></i><i></i><i></i></div><div class="hint">${ic("camera-with-flash", 80)}<b style="font-size:18px">Photo scanning uses Google Gemini</b><span style="opacity:.8">Add your free key once to switch it on.</span><button class="btn accent" data-a="ai">Add Gemini key</button></div></div></div>`;
  const r = p.result;
  return `${pageHead("<h2>Scan meal</h2>")}<div class="page-b">
    <label class="viewfinder" for="photo" style="cursor:pointer">${p.img ? `<img class="photo" src="${p.img}" alt="Your meal">` : ""}<div class="corners"><i></i><i></i><i></i><i></i></div>
      ${p.loading ? '<div class="beam"></div><span class="tag">Analysing your plate…</span>' : r ? `<span class="tag">${esc(r.title)}</span>` : `<div class="hint">${ic("camera-with-flash", 72)}<b style="font-size:18px">Point at your plate</b><span style="opacity:.8">I'll find each food and its portion</span></div>`}</label>
    <input id="photo" type="file" accept="image/*" capture="environment" hidden>
    ${!p.img ? `<label for="photo" class="shutter" aria-label="Take or choose a photo"><span></span></label><div class="field"><label for="scan-note">Anything I can't see? (optional)</label><input id="scan-note" placeholder="e.g. cooked in 1 tsp ghee" value="${esc(p.note || "")}"></div>` : ""}
    ${p.error ? `<div class="notice">${ic("bell", 24)}<span class="grow">${esc(p.error)}</span><button class="btn small" data-a="rescan">Retry</button></div>` : ""}
    ${r ? (r.items.length ? `${resultList(r.items, "s")}${r.note ? `<p class="sm muted">${esc(r.note)}${r.confidence === "low" ? " Low confidence: check portions." : ""}</p>` : ""}
      <div class="row"><label for="photo" class="btn soft">Retake</label><button class="btn lg grow accent" data-a="s-addall">Add ${r.items.length} to tray · ${comma(r.items.reduce((a, it) => a + it.n.kcal * it.qty, 0))} kcal</button></div>`
      : `<div class="empty">${ic("magnifying-glass-tilted-right", 56)}<b style="color:var(--ink)">No food found in this photo</b><label for="photo" class="btn soft small">Try another photo</label></div>`) : ""}
  </div>`;
}
async function runScan(file) {
  const p = topPage(); if (p?.type !== "scan") return;
  p.note = $("#scan-note")?.value || p.note || ""; p.error = ""; p.result = null; p.loading = true;
  try { const im = await ai.shrinkImage(file); p.img = im.dataUrl; p.b64 = im.base64; p.mime = im.mime; renderPage(); await doScan(p); }
  catch (e) { p.loading = false; p.error = e.message; renderPage(); }
}
async function doScan(p) {
  abortCtl?.abort(); abortCtl = new AbortController(); p.loading = true; p.error = ""; renderPage();
  try { p.result = await ai.analyzePhoto(p.b64, p.mime, p.note, { signal: abortCtl.signal }); p.result.items.forEach(cacheMicros); p.thumb = await thumb(p.img); }
  catch (e) { if (e.name === "AbortError") return; p.error = e.message; }
  p.loading = false; if (topPage() === p) renderPage();
}
function thumb(src) { return new Promise((res) => { const im = new Image(); im.onload = () => { const c = document.createElement("canvas"), z = 96, s = Math.max(z / im.width, z / im.height); c.width = c.height = z; c.getContext("2d").drawImage(im, (z - im.width * s) / 2, (z - im.height * s) / 2, im.width * s, im.height * s); res(c.toDataURL("image/jpeg", 0.7)); }; im.onerror = () => res(""); im.src = src; }); }
const aiEntry = (it, src, img) => ({ id: uid(), name: it.name, icon: iconFor(it.name), unit: it.unit.replace(/^1\s+/, ""), g: it.grams || null, qty: it.qty, n: cleanNutrients(it.n), src, ...(img ? { img } : {}) });

// ================= sheets (small dialogs) =================
let sheet = null, abortCtl = null;
function openSheet(s) {
  sheet = s;
  const root = $("#sheetRoot");
  root.innerHTML = `<div class="scrim" data-a="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div><div id="sheetIn" style="display:flex;flex-direction:column;min-height:0"></div></div>`;
  renderSheet();
  requestAnimationFrame(() => requestAnimationFrame(() => { root.querySelector(".scrim").classList.add("show"); root.querySelector(".sheet").classList.add("show"); }));
}
function closeSheet() {
  const root = $("#sheetRoot"), sc = root.querySelector(".scrim"), sh = root.querySelector(".sheet");
  sheet = null; if (!sh) return;
  sc.classList.remove("show"); sh.classList.remove("show");
  setTimeout(() => { if (!sheet) root.innerHTML = ""; }, 450);
}
function renderSheet() {
  if (!sheet) return;
  const [t, b] = { fab: fabSheet, mealpick: mealPickSheet, review: reviewSheet, workout: workoutSheet, body: bodySheet, profile: profileSheet, supps: suppSheet, ai: aiSheet, clear: clearSheet, custom: customSheet }[sheet.type]();
  $("#sheetIn").innerHTML = `<div class="sheet-h"><h2>${t}</h2><button class="x" data-a="close-sheet" aria-label="Close">✕</button></div><div class="sheet-b">${b}</div>`;
}
function fabSheet() {
  const m = mealByTime();
  return ["Log", `<div class="qa">
    <button data-a="add" data-m="${m}">${ic("magnifying-glass-tilted-right", 40)}<b>Log food</b><span>Search 260+ foods</span></button>
    <button data-a="add" data-m="${m}" data-go="scan">${ic("camera-with-flash", 40)}<b>Scan meal</b><span>Photo to nutrition</span></button>
    <button data-a="water+" data-close="1">${ic("droplet", 40)}<b>Water</b><span>Add 250 ml</span></button>
    <button data-a="workout">${ic("person-lifting-weights", 40)}<b>Exercise</b><span>Gym or cardio</span></button>
    <button data-a="body">${ic("balance-scale", 40)}<b>Weight & sleep</b><span>Body log</span></button>
    <button data-a="add" data-m="${m}" data-go="describe">${ic("sparkles", 40)}<b>Describe meal</b><span>Type it, AI does the maths</span></button></div>`];
}
function mealPickSheet() { return ["Add to", `<div class="mealpick">${MEALS.map((m) => `<button class="${ui.tray?.meal === m.k ? "on" : ""}" data-a="setmeal" data-v="${m.k}">${ic(m.icon, 34)}${m.k}</button>`).join("")}</div>`]; }
function reviewSheet() {
  const t = ui.tray, k = t.items.reduce((a, e) => a + e.n.kcal * e.qty, 0);
  return [`${t.meal} · ${comma(k)} kcal`, `<div class="flist">${t.items.map((e, i) => `<div class="fr"><span class="open"><span class="ib">${ic(e.icon, 36)}</span><span class="grow"><span class="nm ellip" style="display:block">${esc(e.name)}</span><span class="meta">${esc(unitText(e.unit, e.qty, e.g))} · ${comma(e.n.kcal * e.qty)} kcal</span></span></span>
    <span class="qpill"><button data-a="rq-" data-i="${i}" aria-label="Less">−</button><span>${fmt(e.qty)}</span><button data-a="rq+" data-i="${i}" aria-label="More">+</button></span></div>`).join("")}</div>
    <button class="btn lg block accent" data-a="tray-done">Log ${t.items.length} item${t.items.length > 1 ? "s" : ""}</button>`];
}
function customSheet() {
  const f = (id, l, ph = "", m = "decimal") => `<div class="field"><label for="${id}">${l}</label><input id="${id}" inputmode="${m}" placeholder="${ph}"></div>`;
  return ["Custom food", `${f("c-name", "Food name", "e.g. Amma's ragi dosa", "text")}${f("c-unit", "Serving", "piece", "text")}<div class="grid2">${f("c-k", "Calories (kcal)")}${f("c-p", "Protein (g)")}${f("c-c", "Carbs (g)")}${f("c-f", "Fat (g)")}</div><p class="xs muted">Saved to My foods for next time.</p><button class="btn lg block" data-a="custom-save">Add to tray</button>`];
}
function workoutSheet() {
  const w = sheet.w, past = [...new Set(Object.keys(S.days).sort().reverse().flatMap((d) => S.days[d].workouts.map((x) => x.exercise)))], isC = (n) => CARDIO.some((c) => c.toLowerCase() === n.toLowerCase());
  const sug = [...past.filter((n) => (w.cardio ? isC(n) : !isC(n))), ...(w.cardio ? CARDIO : STRENGTH)].filter((n, i, a) => a.findIndex((m) => m.toLowerCase() === n.toLowerCase()) === i).slice(0, 14);
  const f = (id, l, v, m = "numeric") => `<div class="field"><label for="${id}">${l}</label><input id="${id}" inputmode="${m}" value="${esc(v)}"></div>`;
  return ["Log exercise", `<div class="seg">${["Strength", "Cardio"].map((l, i) => `<button class="${+w.cardio === i ? "on" : ""}" data-a="wkind" data-v="${i}">${l}</button>`).join("")}<span class="ind" style="width:calc(50% - 4px);transform:translateX(${w.cardio ? 100 : 0}%)"></span></div>
    <div class="field"><label for="w-name">Exercise</label><input id="w-name" value="${esc(w.name)}" placeholder="${w.cardio ? "Running" : "Bench press"}"></div>
    <div class="pills">${sug.map((n) => `<button class="chip ${n === w.name ? "on" : ""}" data-a="wsug" data-v="${esc(n)}">${esc(n)}</button>`).join("")}</div>
    ${w.cardio ? `<div class="grid2">${f("w-min", "Minutes", w.minutes)}</div>` : `<div class="grid3">${f("w-sets", "Sets", w.sets)}${f("w-reps", "Reps", w.reps)}${f("w-kg", "Weight kg", w.kg, "decimal")}</div>`}
    <div class="notice">${ic("fire", 28)}<span class="grow"><b id="w-k">${woKcal(w)} kcal</b> estimated</span></div><button class="btn lg block" data-a="save-wo">Add exercise</button>`];
}
function bodySheet() {
  const b = day(ui.date).body, f = (id, l, v, m = "decimal") => `<div class="field"><label for="${id}">${l}</label><input id="${id}" inputmode="${m}" value="${esc(v ?? "")}"></div>`;
  return [`Body · ${dateTitle()}`, `${f("b-w", "Weight (kg)", b.w)}${f("b-s", "Sleep (hours)", b.sleep)}${f("b-st", "Steps", b.steps, "numeric")}<button class="btn lg block" data-a="save-body">Save</button>`];
}
function profileSheet() {
  const p = P(), f = (id, l, v, m = "decimal") => `<div class="field"><label for="${id}">${l}</label><input id="${id}" inputmode="${m}" value="${esc(v)}"></div>`;
  const ch = (k, o) => `<div class="pills">${o.map(([v, l]) => `<button class="chip ${String(sheet.d[k]) === String(v) ? "on" : ""}" data-a="pset" data-k="${k}" data-v="${v}">${l}</button>`).join("")}</div>`;
  return ["Profile & goals", `${f("p-name", "Name", p.name, "text")}<div class="grid2">${f("p-age", "Age", p.age, "numeric")}${f("p-h", "Height (cm)", p.heightCm)}${f("p-w", "Weight (kg)", p.weightKg)}${f("p-gw", "Goal weight (kg)", p.goalWeightKg)}</div>
    <div class="field"><span class="lab">Sex</span>${ch("male", [[true, "Male"], [false, "Female"]])}</div><div class="field"><span class="lab">Goal</span>${ch("goal", [["lose", "Lose fat"], ["maintain", "Stay fit"], ["gain", "Build muscle"]])}</div>
    <div class="field"><span class="lab">Activity</span>${ch("activity", [[1.2, "Mostly sitting"], [1.375, "Light"], [1.55, "Active"], [1.725, "Very active"]])}</div>
    <div class="grid2">${f("p-water", "Water goal (glasses)", p.waterTarget, "numeric")}${f("p-steps", "Steps goal", p.stepsTarget, "numeric")}</div><button class="btn lg block" data-a="save-profile">Save</button>`];
}
function suppSheet() { return ["Supplements", `<div class="field"><label for="s-list">One per line</label><textarea id="s-list" rows="5">${esc(P().supplements.join("\n"))}</textarea></div><button class="btn lg block" data-a="save-supps">Save</button>`]; }
function aiSheet() {
  const s = sheet;
  return ["AI settings", `<p class="sm ink2">Healthyfi uses <b>Google Gemini</b> to read meal photos and fetch full nutrition. Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="color:var(--accent);font-weight:700">aistudio.google.com/apikey</a>, then paste it here.</p>
    <div class="field"><label for="ai-key">Gemini API key</label><input id="ai-key" type="password" autocomplete="off" value="${esc(ai.getKey())}" placeholder="AIza…"></div>
    <div class="field"><label for="ai-model">Model</label><select id="ai-model">${ai.MODELS.map((m) => `<option ${m === ai.getModel() ? "selected" : ""}>${m}</option>`).join("")}</select></div>
    ${S.mode === "cloud" ? `<label class="sm row" style="gap:8px"><input type="checkbox" id="ai-sync" ${S.geminiKey ? "checked" : ""}> Keep the key in my account for my other devices</label>` : `<p class="xs muted">Stored only on this device.</p>`}
    ${s.msg ? `<div class="notice" style="background:${s.ok ? "var(--accent-soft)" : "var(--surface-2)"}">${ic(s.ok ? "glowing-star" : "bell", 24)}<span class="grow">${esc(s.msg)}</span></div>` : ""}
    <div class="row"><button class="btn soft" data-a="test-ai" ${s.testing ? "disabled" : ""}>${s.testing ? "Testing…" : "Test key"}</button><button class="btn lg grow" data-a="save-ai">Save</button></div>`];
}
function clearSheet() { return ["Clear all logs?", `<p>All food, water, exercise and body logs will be deleted${S.mode === "cloud" ? " on every device" : ""}. Your profile stays.</p><div class="row"><button class="btn soft grow" data-a="close-sheet">Cancel</button><button class="btn grow" style="background:var(--bad);color:#fff" data-a="clear-yes">Clear logs</button></div>`]; }

// ================= actions =================
function openAdd(meal, go) {
  ui.tray = { meal: normMeal(meal || mealByTime()), items: [], lastFid: null };
  closeSheet();
  pushPage({ type: "add", q: "", cat: "All" });
  if (go === "scan") pushPage({ type: "scan" });
  else if (go === "describe") pushPage({ type: "describe" });
}
function refreshTop() { renderPage(); renderTray(); }
const qStep = (q, up) => R((up ? q + (q >= 1 ? 1 : 0.5) : Math.max(0, q - (q > 1 ? 1 : 0.5))) * 100) / 100;

const H = {
  async google() {
    ui.loginErr = "";
    if (!store.firebaseConfigured()) { ui.loginErr = "Google sign-in needs a one-time Firebase setup (see README). You can use the app without an account meanwhile."; if (S.mode === "signedout") render(); else toast("Google sign-in isn't set up yet"); return; }
    try { await store.signInWithGoogle(); } catch (e) { ui.loginErr = e.code === "auth/unauthorized-domain" ? "Add this site under Firebase → Authentication → Settings → Authorized domains." : e.code === "auth/popup-closed-by-user" ? "" : "Sign-in didn't finish. Please try again."; render(); }
  },
  guest() { store.continueAsGuest(); },
  async signout() { await store.signOut(); ui.tab = "home"; ui.prev = {}; },
  "ob-set"(b) { obCollect(); const d = obDraft(), k = b.dataset.k, v = b.dataset.v; d[k] = k === "male" ? v === "true" : k === "activity" ? +v : v; render(); },
  "ob-next"() { obCollect(); if (ui.obStep < 4) { ui.obStep++; ui.obDir = 1; render(); scrollTo(0, 0); return; } Object.assign(S.profile, ui.ob, { onboarded: true }); ui.ob = null; ui.obStep = 0; saveProfile(); ui.prev = {}; render(true); confetti(); },
  "ob-back"() { obCollect(); ui.obStep = Math.max(0, ui.obStep - 1); ui.obDir = -1; render(); },
  tab(b) { ui.tab = b.dataset.v; render(); scrollTo({ top: 0 }); },
  weektoggle() { ui.weekOpen = !ui.weekOpen; render(); },
  date(b) { ui.date = b.dataset.v; render(); },
  "day-"() { ui.date = addDays(ui.date, -1); render(); },
  "day+"() { if (ui.date < today()) { ui.date = addDays(ui.date, 1); render(); } },
  seg(b) { ui.seg = b.dataset.v; render(); },
  nutr() { ui.nutrOpen = !ui.nutrOpen; render(); },
  fab() { openSheet({ type: "fab" }); },
  water(b) { const d = ensureDay(ui.date), n = +b.dataset.n; d.water = d.water === n ? n - 1 : n; saveDay(ui.date); if (d.water === P().waterTarget) { confetti(); toast("Water goal reached"); } render(); },
  "water+"(b) { const d = ensureDay(ui.date); d.water++; saveDay(ui.date); if (b.dataset.close) { closeSheet(); toast("+250 ml water"); } if (d.water === P().waterTarget) confetti(); render(); },
  supp(b) { const s = P().supplements[+b.dataset.i], d = ensureDay(ui.date); d.supps = d.supps.includes(s) ? d.supps.filter((x) => x !== s) : d.supps.concat(s); saveDay(ui.date); render(); },
  add(b) { openAdd(b.dataset.m, b.dataset.go); },
  pop() { popPage(); },
  mealpick() { openSheet({ type: "mealpick" }); },
  setmeal(b) { ui.tray.meal = b.dataset.v; closeSheet(); renderPage(0); },
  cat(b) { topPage().cat = b.dataset.v; renderPage(undefined, false); },
  clearq() { const p = topPage(); p.q = ""; p.ai = null; renderPage(); $("#q")?.focus(); },
  "ask-ai"() { askAI(); },
  food(b) { openDetail(fromDb(FOOD[b.dataset.id])); },
  quickadd(b) { trayAdd(entryFrom(fromDb(FOOD[b.dataset.id]), 0, 1), b.classList.contains("pc")); if (navigator.vibrate) navigator.vibrate(8); refreshTop(); },
  "tq+"(b) { const it = trayItemFor(b.dataset.id); if (it) { it.qty = qStep(it.qty, true); refreshTop(); } },
  "tq-"(b) { const t = ui.tray, it = trayItemFor(b.dataset.id); if (!it) return; it.qty = qStep(it.qty, false); if (it.qty <= 0) t.items.splice(t.items.indexOf(it), 1); refreshTop(); },
  "ai-open"(b) { const it = topPage().ai.items[+b.dataset.i]; openDetail(fromAI(it), { qty: fmt(it.qty), src: "ai" }); },
  "ai-add"(b) { const it = topPage().ai.items[+b.dataset.i]; trayAdd(aiEntry(it, "ai")); toast(`${it.name} added`); refreshTop(); },
  "ai-addall"() { topPage().ai.items.forEach((it) => trayAdd(aiEntry(it, "ai"))); toast("Added to tray"); refreshTop(); },
  "dq-"() { const p = topPage(), isG = p.fl.units[p.unit][0] === "g", q = +p.qty || 0; p.qty = fmt(isG ? Math.max(0, q - 10) : qStep(q, false)); renderPage(); },
  "dq+"() { const p = topPage(), isG = p.fl.units[p.unit][0] === "g", q = +p.qty || 0; p.qty = fmt(isG ? q + 10 : qStep(q, true)); renderPage(); },
  unit(b) {
    const p = topPage(), i = +b.dataset.i, [uOld, gOld] = p.fl.units[p.unit], [u, gNew] = p.fl.units[i], q = +p.qty || 0;
    if (u === "g" && gOld) p.qty = fmt(R(q * gOld)); else if (uOld === "g" && gNew) p.qty = fmt(Math.max(0.5, R((q / gNew) * 2) / 2)); else p.qty = "1";
    p.unit = i; renderPage();
  },
  "enrich-detail"() { enrichDetail(topPage()); },
  "detail-add"() { const p = topPage(), e = entryFrom(p.fl, p.unit, +p.qty, p.src || "db"); trayAdd(e); popPage(); toast(`${p.fl.name} added`); },
  "save-entry"() {
    const p = topPage(), d = ensureDay(ui.date), e = d.foods.find((x) => x.id === p.entryId); if (!e) return popPage();
    const ne = entryFrom(p.fl, p.unit, +p.qty, e.src);
    Object.assign(e, { unit: ne.unit, g: ne.g, qty: ne.qty, n: hasMicros(ne.n) ? ne.n : { ...pickMicros(e.n), ...ne.n } });
    saveDay(ui.date); popPage(); toast("Updated");
  },
  "del-entry"() { const p = topPage(), d = ensureDay(ui.date); d.foods = d.foods.filter((x) => x.id !== p.entryId); saveDay(ui.date); popPage(); toast("Removed"); },
  edit(b) {
    const e = day(ui.date).foods.find((x) => x.id === b.dataset.id); if (!e) return;
    ui.tray = { meal: normMeal(e.meal), items: [] };
    const fl = fromEntry(e), ui_ = Math.max(0, fl.units.findIndex(([u]) => u === e.unit));
    pushPage({ type: "detail", fl, unit: ui_, qty: fmt(e.qty), mode: "edit", entryId: e.id, img: e.img });
  },
  "open-scan"() { pushPage({ type: "scan" }); },
  "open-describe"() { pushPage({ type: "describe" }); setTimeout(() => $("#desc")?.focus(), 500); },
  async "describe-go"() {
    const p = topPage(); p.text = $("#desc").value.trim(); if (p.text.length < 2) return toast("Type what you ate");
    abortCtl?.abort(); abortCtl = new AbortController(); p.loading = true; p.error = ""; p.items = null; renderPage();
    try { p.items = await ai.lookupFood(p.text, { signal: abortCtl.signal }); p.items.forEach(cacheMicros); if (!p.items.length) p.error = "AI couldn't identify foods in that description."; }
    catch (e) { if (e.name === "AbortError") return; p.error = e.message; p.code = e.code; }
    p.loading = false; if (topPage() === p) renderPage();
  },
  "d-addall"() { const p = topPage(); p.items.forEach((it) => trayAdd(aiEntry(it, "ai"))); popPage(); toast(`${p.items.length} items added`); },
  "s-addall"() { const p = topPage(); p.result.items.forEach((it, i) => trayAdd(aiEntry(it, "photo", i === 0 ? p.thumb : ""))); popPage(); toast(`${p.result.items.length} items added`); },
  rescan() { doScan(topPage()); },
  "tray-review"() { openSheet({ type: "review" }); },
  "rq+"(b) { const e = ui.tray.items[+b.dataset.i]; e.qty = qStep(e.qty, true); renderSheet(); refreshTop(); },
  "rq-"(b) { const t = ui.tray, e = t.items[+b.dataset.i]; e.qty = qStep(e.qty, false); if (e.qty <= 0) t.items.splice(+b.dataset.i, 1); if (!t.items.length) closeSheet(); else renderSheet(); refreshTop(); },
  "tray-done"() { closeSheet(); commitTray(); },
  custom() { openSheet({ type: "custom" }); },
  "custom-save"() {
    const v = (id) => $("#" + id)?.value.trim(), n = (id) => parseFloat(v(id)), name = v("c-name"), k = n("c-k");
    if (!name || !Number.isFinite(k)) return toast("Add a name and calories");
    const it = { name, unit: v("c-unit") || "serving", n: cleanNutrients({ kcal: k, protein: n("c-p") || 0, carbs: n("c-c") || 0, fat: n("c-f") || 0 }) };
    S.customFoods = S.customFoods.filter((f) => f.name !== name).concat(it); saveProfile();
    trayAdd({ id: uid(), name, icon: iconFor(name), unit: it.unit, g: null, qty: 1, n: it.n, src: "custom" }); closeSheet(); refreshTop();
  },
  "custom-add"(b) { const f = S.customFoods[+b.dataset.i]; trayAdd({ id: uid(), name: f.name, icon: iconFor(f.name), unit: f.unit, g: null, qty: 1, n: f.n, src: "custom" }); refreshTop(); },
  repeat(b) { const m = b.dataset.m, dd = ensureDay(ui.date); foodsOf(addDays(ui.date, -1)).filter((f) => f.meal === m).forEach((f) => dd.foods.push({ ...f, id: uid(), t: Date.now() })); saveDay(ui.date); toast(`Copied yesterday's ${m.toLowerCase()}`); render(); },
  async "enrich-day"() {
    if (!ai.getKey()) return H.ai();
    const d = ui.date, list = day(d).foods.filter((e) => !hasMicros(e.n));
    ui.busy.day = true; render();
    for (const e of list) {
      try {
        const f = e.fid && FOOD[e.fid];
        let m = microCache(e.name);
        if (!m) { const r = await ai.enrichFood(e.name, "100 g"); if (!r) continue; m = {}; for (const k in r.n) if (!NONMICRO.includes(k)) m[k] = r.n[k] * (100 / (r.grams || 100)); S.cache["m:" + e.name.toLowerCase()] = m; }
        const g = e.unit === "g" ? 1 : e.g || (f ? f.units[0][1] : 100);
        e.n = { ...scaleN(m, g / 100), ...e.n };
      } catch (err) { toast(err.message); break; }
    }
    saveDay(d); saveProfile(); delete ui.busy.day; render();
  },
  workout() { openSheet({ type: "workout", w: { cardio: false, name: "", sets: "3", reps: "10", kg: "", minutes: "30" } }); },
  wkind(b) { sheet.w.cardio = b.dataset.v === "1"; sheet.w.name = ""; renderSheet(); },
  wsug(b) { sheet.w.name = b.dataset.v; renderSheet(); },
  "save-wo"() {
    const w = sheet.w;
    if (!w.name.trim() || (w.cardio ? !(+w.minutes > 0) : !(+w.sets > 0 && +w.reps > 0))) return toast(w.cardio ? "Add the exercise and minutes" : "Add the exercise, sets and reps");
    ensureDay(ui.date).workouts.push({ id: uid(), exercise: w.name.trim(), cardio: w.cardio, sets: w.cardio ? 0 : R(+w.sets), reps: w.cardio ? 0 : R(+w.reps), weightKg: w.cardio ? 0 : +w.kg || 0, minutes: w.cardio ? R(+w.minutes) : R(+w.sets) * 3, kcal: woKcal(w) });
    saveDay(ui.date); closeSheet(); toast("Exercise logged"); render();
  },
  wdel(b) { const d = ensureDay(ui.date); d.workouts = d.workouts.filter((x) => x.id !== b.dataset.id); saveDay(ui.date); render(); },
  body() { openSheet({ type: "body" }); },
  "save-body"() {
    const g = (id) => parseFloat($("#" + id).value), d = ensureDay(ui.date), w = g("b-w"), sl = g("b-s"), st = g("b-st");
    d.body = {}; if (w > 0) d.body.w = w; if (sl > 0) d.body.sleep = sl; if (st > 0) d.body.steps = R(st); saveDay(ui.date);
    if (w > 0 && !Object.keys(S.days).some((k) => k > ui.date && S.days[k].body?.w)) { P().weightKg = w; saveProfile(); }
    closeSheet(); toast("Saved"); render();
  },
  profile() { openSheet({ type: "profile", d: { male: P().male, goal: P().goal, activity: P().activity } }); },
  pset(b) { const k = b.dataset.k, v = b.dataset.v, keep = {}; document.querySelectorAll(".sheet input").forEach((i) => (keep[i.id] = i.value)); sheet.d[k] = k === "male" ? v === "true" : k === "activity" ? +v : v; renderSheet(); Object.entries(keep).forEach(([id, val]) => { const el = $("#" + id); if (el) el.value = val; }); },
  "save-profile"() {
    const p = P(), g = (id) => $("#" + id).value, n = (id, d) => (Number.isFinite(parseFloat(g(id))) ? parseFloat(g(id)) : d);
    Object.assign(p, sheet.d, { name: g("p-name").trim(), age: R(n("p-age", p.age)), heightCm: n("p-h", p.heightCm), weightKg: n("p-w", p.weightKg), goalWeightKg: n("p-gw", p.goalWeightKg), waterTarget: Math.min(20, Math.max(1, R(n("p-water", p.waterTarget)))), stepsTarget: R(n("p-steps", p.stepsTarget)) });
    saveProfile(); closeSheet(); toast("Profile saved"); render();
  },
  supps() { openSheet({ type: "supps" }); },
  "save-supps"() { P().supplements = $("#s-list").value.split(/\n|,/).map((s) => s.trim()).filter(Boolean); saveProfile(); closeSheet(); toast("Saved"); render(); },
  ai() { openSheet({ type: "ai" }); },
  async "test-ai"() {
    const key = $("#ai-key").value.trim(), model = $("#ai-model").value, prev = [ai.getKey(), ai.getModel()];
    ai.saveAISettings(key, model); sheet.testing = true; sheet.msg = ""; renderSheet();
    try { await ai.testKey(); sheet.ok = true; sheet.msg = "Key works. You're ready to scan meals."; } catch (e) { sheet.ok = false; sheet.msg = e.message; ai.saveAISettings(prev[0], prev[1]); }
    sheet.testing = false; renderSheet(); $("#ai-key").value = key;
  },
  async "save-ai"() {
    const key = $("#ai-key").value.trim(), model = $("#ai-model").value, sync = $("#ai-sync")?.checked;
    ai.saveAISettings(key, model); if (S.mode === "cloud") await store.saveGeminiKeyToAccount(sync ? key : "").catch(() => {});
    closeSheet(); toast(key ? "AI is on" : "AI key removed");
    if (ui.pages.length) renderPage(); else render();
  },
  theme(b) { try { localStorage.setItem("healthyfi.theme", b.dataset.v); } catch {} applyTheme(); render(); },
  export() { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([store.exportJSON()], { type: "application/json" })); a.download = `healthyfi-${today()}.json`; document.body.appendChild(a); a.click(); a.remove(); toast("Export downloaded"); },
  clear() { openSheet({ type: "clear" }); },
  "clear-yes"() { store.clearLogs(); closeSheet(); toast("Logs cleared"); ui.prev = {}; render(); },
  "close-sheet"() { closeSheet(); },
};
// quantity pills on the describe (d) and scan (s) result lists
for (const pf of ["d", "s"]) {
  const list = (p) => (pf === "d" ? p.items : p.result.items);
  H[pf + "q+"] = (b) => { const it = list(topPage())[+b.dataset.i]; it.qty = qStep(it.qty, true); renderPage(); };
  H[pf + "q-"] = (b) => { const l = list(topPage()), i = +b.dataset.i; l[i].qty = qStep(l[i].qty, false); if (l[i].qty <= 0) l.splice(i, 1); renderPage(); };
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-a]");
  if (!b || b.disabled) return;
  const h = H[b.dataset.a];
  if (h) { e.preventDefault(); h(b); }
});
let qTimer;
document.addEventListener("input", (e) => {
  const id = e.target.id;
  if (id === "q") {
    const p = topPage(); p.q = e.target.value; p.ai = null;
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { const pos = e.target.selectionStart; renderPage(undefined, false); const q = $("#pg" + (ui.pages.length - 1) + " #q"); if (q) { q.focus(); q.setSelectionRange(pos, pos); } }, 120);
  } else if (id === "dq") {
    const p = topPage(); p.qty = e.target.value; const pos = e.target.selectionStart; renderPage(); const el = $("#dq"); el.focus(); el.setSelectionRange(pos, pos);
  } else if (id === "scan-note") topPage().note = e.target.value;
  else if (id === "desc") topPage().text = e.target.value;
  else if (sheet?.type === "workout" && id.startsWith("w-")) { const map = { "w-name": "name", "w-sets": "sets", "w-reps": "reps", "w-kg": "kg", "w-min": "minutes" }; sheet.w[map[id]] = e.target.value; const k = $("#w-k"); if (k) k.textContent = woKcal(sheet.w) + " kcal"; }
});
document.addEventListener("change", (e) => { if (e.target.id === "photo" && e.target.files[0]) runScan(e.target.files[0]); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { if (sheet) closeSheet(); else if (ui.pages.length) popPage(); }
  if (e.key === "Enter" && e.target.id === "q") { e.preventDefault(); askAI(); }
});

function applyTheme() {
  const t = localStorage.getItem("healthyfi.theme") || "system";
  if (t === "system") delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = t;
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  const m = $('meta[name="theme-color"]'); if (m) m.content = dark ? "#0a0a0b" : "#f4f4f0";
}
let lastToday = today();
setInterval(() => { if (today() !== lastToday) { if (ui.date === lastToday) ui.date = today(); lastToday = today(); if (!ui.pages.length) render(); } }, 60000);
applyTheme();
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => { applyTheme(); render(); });
store.onChange(() => { if (!ui.pages.length) render(); });
render();
store.init();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
