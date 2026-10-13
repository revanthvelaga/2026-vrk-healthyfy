// Gemini nutrition AI: text lookup and photo analysis.
import { cleanNutrients } from "./nutrients.js";

export const MODELS = ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash"];
const ENDPOINT = (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`;

const NUTRIENT_SPEC = `"n": {
  "kcal": number, "protein": g, "carbs": g, "fat": g,
  "fiber": g, "sugar": g, "satFat": g, "cholesterol": mg,
  "sodium": mg, "potassium": mg, "calcium": mg, "iron": mg, "magnesium": mg, "zinc": mg,
  "vitA": µg RAE, "vitC": mg, "vitD": IU, "vitB12": µg, "folate": µg DFE
}`;

const ITEM_SPEC = `{
  "name": short food name in English (keep Indian names, e.g. "Pesarattu"),
  "qty": number of units eaten,
  "unit": serving unit, e.g. "1 pc", "1 bowl (150 g)", "1 cup", "100 g",
  "grams": grams in ONE unit,
  ${NUTRIENT_SPEC}  (values for ONE unit, not for qty)
}`;

const RULES = `You are a precise Indian nutritionist. Use IFCT 2017 (Indian Food Composition Tables) values where they exist,
otherwise USDA FoodData Central. Assume typical South/North Indian home-style preparation with usual oil unless told otherwise.
Every nutrient field must be a number (use 0 when truly absent, never null). Reply with JSON only.`;

export class AIError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function settings() {
  try {
    return JSON.parse(localStorage.getItem("healthyfi.ai") || "{}");
  } catch {
    return {};
  }
}
export function getKey() {
  return settings().key || "";
}
export function getModel() {
  return settings().model || MODELS[0];
}
export function saveAISettings(key, model) {
  try {
    localStorage.setItem("healthyfi.ai", JSON.stringify({ key: key.trim(), model }));
  } catch {}
}

async function call(parts, { signal } = {}) {
  const key = getKey();
  if (!key) throw new AIError("no_key", "Add your Gemini API key in Me → AI settings to use AI.");
  const first = getModel();
  const order = [first, ...MODELS.filter((m) => m !== first)];
  let lastErr;
  for (const model of order) {
    let res;
    try {
      res = await fetch(ENDPOINT(model), {
        method: "POST",
        signal,
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { response_mime_type: "application/json", temperature: 0.2 },
        }),
      });
    } catch (e) {
      if (e.name === "AbortError") throw e;
      throw new AIError("network", "Couldn't reach Gemini. Check your internet connection.");
    }
    if (res.ok) {
      const data = await res.json();
      const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
      if (!text) throw new AIError("empty", "Gemini returned no answer. Try again or rephrase.");
      return parseJSON(text);
    }
    let msg = "";
    try {
      msg = (await res.json()).error?.message || "";
    } catch {}
    if (res.status === 400 && /api key/i.test(msg)) throw new AIError("bad_key", "That Gemini API key isn't valid. Check it in Me → AI settings.");
    if (res.status === 403) throw new AIError("bad_key", "This key isn't allowed to use the Gemini API. Create a key in Google AI Studio.");
    // model unavailable or quota for this model: try the next one
    if (res.status === 404 || res.status === 429 || (res.status === 400 && /model/i.test(msg))) {
      lastErr = new AIError(res.status === 429 ? "quota" : "model", msg || "Model unavailable");
      continue;
    }
    throw new AIError("api", msg || `Gemini error ${res.status}`);
  }
  if (lastErr?.code === "quota") throw new AIError("quota", "Gemini's free limit is used up for now. Try again in a minute.");
  throw lastErr || new AIError("api", "No Gemini model answered.");
}

function parseJSON(text) {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(t);
  } catch {
    const m = t.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
    throw new AIError("parse", "Couldn't read the AI's answer. Try again.");
  }
}

function normItems(obj) {
  const items = Array.isArray(obj?.items) ? obj.items : [];
  return items
    .filter((i) => i && i.name)
    .map((i) => ({
      name: String(i.name).slice(0, 60),
      qty: Math.max(0.25, Math.round((Number(i.qty) || 1) * 4) / 4),
      unit: String(i.unit || "1 serving").slice(0, 40),
      grams: Number(i.grams) || null,
      n: cleanNutrients(i.n || {}),
    }));
}

/** "2 idli with sambar and a filter coffee" → itemised nutrition */
export async function lookupFood(query, opts) {
  const out = await call(
    [
      {
        text: `${RULES}
The person typed what they ate: "${query.replace(/"/g, "'")}".
Split it into individual foods. If no quantity is given assume 1 typical serving.
Return {"items": [ ${ITEM_SPEC} ]}`,
      },
    ],
    opts,
  );
  return normItems(out);
}

/** Full nutrients for one known food/serving, e.g. to add micronutrients to a database item. */
export async function enrichFood(name, unit, opts) {
  const out = await call(
    [{ text: `${RULES}\nGive the nutrition for exactly one serving of "${name}" where one serving is "${unit}".\nReturn {"items": [ ${ITEM_SPEC} ]} with qty 1 and that unit.` }],
    opts,
  );
  return normItems(out)[0] || null;
}

/** Photo of a plate → detected foods with estimated portions. */
export async function analyzePhoto(base64, mime, note, opts) {
  const out = await call(
    [
      {
        text: `${RULES}
Look at this meal photo. Identify every distinct food or drink and estimate the portion from plate/bowl size and visual cues.
${note ? `The person adds: "${note.replace(/"/g, "'")}".` : ""}
Return {"title": a 2-5 word name for the meal, "confidence": "high"|"medium"|"low", "note": one short sentence about assumptions,
"items": [ ${ITEM_SPEC} ]}
If the photo has no food, return {"items": [], "note": "No food found"}.`,
      },
      { inline_data: { mime_type: mime, data: base64 } },
    ],
    opts,
  );
  return { title: out?.title || "Scanned meal", confidence: out?.confidence || "medium", note: out?.note || "", items: normItems(out) };
}

export async function testKey() {
  const out = await call([{ text: 'Reply with {"ok": true}' }]);
  return !!out?.ok;
}

/** Resize a photo to keep uploads small (max 1280px JPEG). */
export function shrinkImage(file, max = 1280) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const s = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * s);
      c.height = Math.round(img.height * s);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const dataUrl = c.toDataURL("image/jpeg", 0.82);
      resolve({ dataUrl, base64: dataUrl.split(",")[1], mime: "image/jpeg" });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new AIError("image", "Couldn't open that image. Try a JPG or PNG photo."));
    };
    img.src = url;
  });
}
