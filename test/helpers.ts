import { readFileSync, readdirSync } from "node:fs";
import type { Report } from "../src/types.ts";

export const REPORT_DIR = "vendor/upgradelab-runner/reports";

export function load(name: string): Report {
  return JSON.parse(readFileSync(`${REPORT_DIR}/${name}.report.json`, "utf8")) as Report;
}

export function allReportFiles(): string[] {
  return readdirSync(REPORT_DIR).filter((f) => f.endsWith(".report.json"));
}

export const flush = () => new Promise((r) => setTimeout(r, 0));
export async function settle(): Promise<void> {
  for (let i = 0; i < 6; i++) await flush();
}

/** Waits (polling) until a selector matches; the app loads recorded reports asynchronously. */
export async function waitFor(selector: string, tries = 200): Promise<Element> {
  for (let i = 0; i < tries; i++) {
    const el = document.querySelector(selector);
    if (el) return el;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error(`timed out waiting for ${selector}`);
}
