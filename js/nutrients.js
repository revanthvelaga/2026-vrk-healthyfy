// Nutrient catalogue. Daily values follow ICMR-NIN 2020 RDAs for Indian adults (sedentary),
// with WHO limits for sodium and added sugar.
export const MACROS = [
  { k: "protein", label: "Protein", unit: "g", color: "var(--protein)" },
  { k: "carbs", label: "Carbs", unit: "g", color: "var(--carbs)" },
  { k: "fat", label: "Fat", unit: "g", color: "var(--fat)" },
];

export const DETAIL_MACROS = [
  { k: "fiber", label: "Fibre", unit: "g", goal: (p) => (p.male ? 30 : 25) },
  { k: "sugar", label: "Sugar", unit: "g", limit: () => 25 },
  { k: "satFat", label: "Saturated fat", unit: "g", limit: (p, kcal) => Math.round((kcal * 0.1) / 9) },
  { k: "cholesterol", label: "Cholesterol", unit: "mg", limit: () => 300 },
];

export const MICROS = [
  { k: "sodium", label: "Sodium", unit: "mg", limit: () => 2000, group: "Minerals" },
  { k: "potassium", label: "Potassium", unit: "mg", goal: () => 3500, group: "Minerals" },
  { k: "calcium", label: "Calcium", unit: "mg", goal: () => 1000, group: "Minerals" },
  { k: "iron", label: "Iron", unit: "mg", goal: (p) => (p.male ? 19 : 29), group: "Minerals" },
  { k: "magnesium", label: "Magnesium", unit: "mg", goal: (p) => (p.male ? 440 : 370), group: "Minerals" },
  { k: "zinc", label: "Zinc", unit: "mg", goal: (p) => (p.male ? 17 : 13), group: "Minerals" },
  { k: "vitA", label: "Vitamin A", unit: "µg", goal: (p) => (p.male ? 1000 : 840), group: "Vitamins" },
  { k: "vitC", label: "Vitamin C", unit: "mg", goal: (p) => (p.male ? 80 : 65), group: "Vitamins" },
  { k: "vitD", label: "Vitamin D", unit: "IU", goal: () => 600, group: "Vitamins" },
  { k: "vitB12", label: "Vitamin B12", unit: "µg", goal: () => 2.5, group: "Vitamins" },
  { k: "folate", label: "Folate", unit: "µg", goal: (p) => (p.male ? 300 : 220), group: "Vitamins" },
];

export const ALL_KEYS = ["kcal", "protein", "carbs", "fat", ...DETAIL_MACROS.map((n) => n.k), ...MICROS.map((n) => n.k)];
export const MICRO_KEYS = [...DETAIL_MACROS.map((n) => n.k), ...MICROS.map((n) => n.k)];

export function hasMicros(n) {
  return n && MICROS.some((m) => typeof n[m.k] === "number");
}

export function cleanNutrients(raw = {}) {
  const out = {};
  for (const k of ALL_KEYS) {
    const v = Number(raw[k]);
    if (Number.isFinite(v) && v >= 0) out[k] = Math.round(v * 100) / 100;
  }
  for (const k of ["kcal", "protein", "carbs", "fat"]) if (out[k] == null) out[k] = 0;
  return out;
}
