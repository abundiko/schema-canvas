import { get, set } from "idb-keyval";

import type { Diagram } from "#/types/diagram";

export interface SavedSession {
  tabs: Diagram[];
  files: Diagram[];
  activeTabId: string;
}

const SESSION_KEY = "schemacanvas:diagram:v2";
const LEGACY_KEY = "schemacanvas:diagram:v1";

async function write(key: string, value: unknown): Promise<void> {
  try {
    await set(key, value);
    return;
  } catch {
    // IndexedDB unavailable → fall through to localStorage
  }
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / unavailable; swallow
  }
}

async function read<T>(key: string): Promise<T | null> {
  try {
    const value = await get<T>(key);
    if (value) return value;
  } catch {
    // fall through
  }
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch {
    // corrupted draft — ignore
  }
  return null;
}

export async function saveSession(session: SavedSession): Promise<void> {
  await write(SESSION_KEY, session);
}

export async function loadSession(): Promise<SavedSession | null> {
  const current = await read<SavedSession>(SESSION_KEY);
  if (current && Array.isArray(current.tabs) && current.tabs.length > 0) {
    // Older saves predate the file library; seed it from the open tabs.
    if (!Array.isArray(current.files) || current.files.length === 0) {
      current.files = current.tabs;
    }
    return current;
  }
  // Migrate the pre-tabs single-diagram autosave into a tab.
  const legacy = await read<Diagram>(LEGACY_KEY);
  if (legacy) {
    const tab = { ...legacy, name: "Untitled file" };
    return { tabs: [tab], files: [tab], activeTabId: legacy.id };
  }
  return null;
}

export async function clearSession(): Promise<void> {
  try {
    await set(SESSION_KEY, undefined);
    await set(LEGACY_KEY, undefined);
  } catch {
    // ignore
  }
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    // ignore
  }
}