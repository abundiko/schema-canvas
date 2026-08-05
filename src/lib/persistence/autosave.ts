import { get, set } from "idb-keyval";

import type { Diagram } from "#/types/diagram";

const STORAGE_KEY = "schemacanvas:diagram:v1";

export async function saveDiagram(diagram: Diagram): Promise<void> {
  try {
    await set(STORAGE_KEY, diagram);
    return;
  } catch {
    // IndexedDB unavailable → fall through to localStorage
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(diagram));
  } catch {
    // storage full / unavailable; swallow
  }
}

export async function loadDiagram(): Promise<Diagram | null> {
  try {
    const value = await get<Diagram>(STORAGE_KEY);
    if (value) return value;
  } catch {
    // fall through
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Diagram;
  } catch {
    // corrupted draft — ignore
  }
  return null;
}

export async function clearDiagram(): Promise<void> {
  try {
    await set(STORAGE_KEY, undefined);
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
