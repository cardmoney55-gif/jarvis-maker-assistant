/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JARVIS Skills System — an extensible registry of capabilities the AI can
 * invoke autonomously via Gemini function-calling. Add a new ability by adding
 * one entry to SKILLS (declaration + handler). The model decides when to use it.
 */

import { Type, GoogleGenAI } from "@google/genai";
import * as memory from "./memory";

export interface SkillContext {
  ai: GoogleGenAI;
}

export interface SkillResult {
  // Data returned to the model so it can phrase the final answer.
  result: any;
  // Optional action the frontend (UI) should perform, e.g. show a 3D hologram.
  clientAction?: { type: string; payload: any };
}

export interface Skill {
  name: string;
  description: string;
  parameters: any; // Gemini function-declaration schema
  ui: { label: string; icon: string; hint: string };
  handler: (args: any, ctx: SkillContext) => Promise<SkillResult>;
}

// ---- helpers ----------------------------------------------------------------

const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];

function nearestE12(value: number): number {
  if (value <= 0) return 0;
  const decade = Math.pow(10, Math.floor(Math.log10(value)));
  const norm = value / decade;
  let best = E12[0];
  for (const e of E12) if (Math.abs(e - norm) < Math.abs(best - norm)) best = e;
  return +(best * decade).toPrecision(3);
}

function fmtOhms(r: number): string {
  if (r >= 1e6) return +(r / 1e6).toPrecision(3) + " МОм";
  if (r >= 1e3) return +(r / 1e3).toPrecision(3) + " кОм";
  return +r.toPrecision(3) + " Ом";
}

const DIGIT_COLORS = [
  "чорний", "коричневий", "червоний", "помаранчевий", "жовтий",
  "зелений", "синій", "фіолетовий", "сірий", "білий",
];

function resistorBands(ohms: number): string[] {
  if (ohms <= 0) return [];
  const exp = Math.floor(Math.log10(ohms)) - 1;
  const sig = Math.round(ohms / Math.pow(10, exp));
  const d1 = Math.floor(sig / 10);
  const d2 = sig % 10;
  const mult = exp;
  return [
    `${DIGIT_COLORS[d1] || "?"} (${d1})`,
    `${DIGIT_COLORS[d2] || "?"} (${d2})`,
    `множник ×10^${mult} (${DIGIT_COLORS[((mult % 10) + 10) % 10] || "?"})`,
    "золотий (допуск ±5%)",
  ];
}

// ---- the skills ------------------------------------------------------------

export const SKILLS: Skill[] = [
  {
    name: "ohms_law",
    description:
      "Розрахунок за законом Ома та потужності. Передай будь-які ДВА з параметрів: voltage (В), current (А), resistance (Ом), power (Вт) — поверне решту.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        voltage: { type: Type.NUMBER, description: "Напруга, вольти" },
        current: { type: Type.NUMBER, description: "Струм, ампери" },
        resistance: { type: Type.NUMBER, description: "Опір, Ом" },
        power: { type: Type.NUMBER, description: "Потужність, Вати" },
      },
    },
    ui: { label: "Закон Ома", icon: "⚡", hint: "V · I · R · P" },
    handler: async (a) => {
      let { voltage: V, current: I, resistance: R, power: P } = a;
      if (V != null && I != null) { R = V / I; P = V * I; }
      else if (V != null && R != null) { I = V / R; P = (V * V) / R; }
      else if (V != null && P != null) { I = P / V; R = (V * V) / P; }
      else if (I != null && R != null) { V = I * R; P = I * I * R; }
      else if (I != null && P != null) { V = P / I; R = P / (I * I); }
      else if (R != null && P != null) { V = Math.sqrt(P * R); I = Math.sqrt(P / R); }
      else return { result: { error: "Потрібно задати рівно два параметри." } };
      return {
        result: {
          voltage_V: +V.toPrecision(4),
          current_A: +I.toPrecision(4),
          resistance_Ohm: +R.toPrecision(4),
          power_W: +P.toPrecision(4),
        },
      };
    },
  },
  {
    name: "led_resistor",
    description:
      "Розрахувати гасівний (послідовний) резистор для світлодіода: за напругою живлення, прямою напругою LED та струмом.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        supplyVoltage: { type: Type.NUMBER, description: "Напруга живлення, В" },
        ledVoltage: { type: Type.NUMBER, description: "Пряма напруга LED, В (типово 2.0)" },
        ledCurrentMa: { type: Type.NUMBER, description: "Струм LED, мА (типово 20)" },
      },
      required: ["supplyVoltage"],
    },
    ui: { label: "Резистор для LED", icon: "💡", hint: "гасівний опір" },
    handler: async (a) => {
      const Vs = a.supplyVoltage;
      const Vled = a.ledVoltage ?? 2.0;
      const I = (a.ledCurrentMa ?? 20) / 1000;
      if (Vs <= Vled) return { result: { error: "Напруга живлення має бути більшою за напругу LED." } };
      const R = (Vs - Vled) / I;
      const P = (Vs - Vled) * I;
      return {
        result: {
          resistance_exact: fmtOhms(R),
          resistance_nearest_E12: fmtOhms(nearestE12(R)),
          power_dissipated_W: +P.toPrecision(3),
          recommended_power_rating: P > 0.25 ? "0.5 Вт або вище" : "0.25 Вт достатньо",
        },
      };
    },
  },
  {
    name: "resistor_color_code",
    description: "Перетворити номінал опору (в Омах) у кольорові смужки резистора (4 смужки).",
    parameters: {
      type: Type.OBJECT,
      properties: {
        ohms: { type: Type.NUMBER, description: "Опір в Омах, напр. 220, 4700, 10000" },
      },
      required: ["ohms"],
    },
    ui: { label: "Кольори резистора", icon: "🎨", hint: "Ом → смужки" },
    handler: async (a) => {
      return { result: { ohms: a.ohms, label: fmtOhms(a.ohms), bands: resistorBands(a.ohms) } };
    },
  },
  {
    name: "visualize_3d",
    description:
      "Показати користувачу обертову 3D-голограму електронного компонента. Використовуй, коли користувач просить показати/намалювати/візуалізувати деталь.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        component: { type: Type.STRING, description: "Назва компонента, напр. 'діод 1N4007', 'резистор', 'ESP32'" },
      },
      required: ["component"],
    },
    ui: { label: "3D-голограма", icon: "🔮", hint: "показати модель" },
    handler: async (a) => {
      return {
        result: { shown: true, component: a.component },
        clientAction: { type: "visualize", payload: { query: a.component } },
      };
    },
  },
  {
    name: "remember_fact",
    description:
      "Запам'ятати важливий факт, налаштування чи досвід користувача у довготривалу пам'ять JARVIS для майбутніх відповідей.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        fact: { type: Type.STRING, description: "Що саме запам'ятати (одне-два речення)" },
      },
      required: ["fact"],
    },
    ui: { label: "Запам'ятати", icon: "📌", hint: "у пам'ять" },
    handler: async (a, ctx) => {
      try {
        await memory.addKnowledge(ctx.ai, "Вказівка користувача", a.fact, []);
        return { result: { remembered: true, fact: a.fact } };
      } catch (e) {
        return { result: { remembered: false, error: "Памʼять недоступна (потрібен ключ)." } };
      }
    },
  },
];

/** Function declarations to pass to Gemini. */
export function declarations() {
  return SKILLS.map((s) => ({
    name: s.name,
    description: s.description,
    parameters: s.parameters,
  }));
}

/** Lightweight catalogue for the UI skills panel. */
export function catalogue() {
  return SKILLS.map((s) => ({ name: s.name, ...s.ui }));
}

/** Execute a skill by name. */
export async function run(name: string, args: any, ctx: SkillContext): Promise<SkillResult> {
  const skill = SKILLS.find((s) => s.name === name);
  if (!skill) return { result: { error: `Невідома навичка: ${name}` } };
  return skill.handler(args || {}, ctx);
}
