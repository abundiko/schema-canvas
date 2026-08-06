import { create } from "zustand";

export type DialogKind = "none" | "import" | "importDbml" | "export" | "share";

export type ThemeMode = "light" | "dark" | "system";

const THEME_STORAGE_KEY = "schemacanvas-theme";

function loadTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return "system";
}

interface UiState {
  dialog: DialogKind;
  aiOpen: boolean;
  notice: string | null;
  zoom: number;
  gridVisible: boolean;
  theme: ThemeMode;
  commandPaletteOpen: boolean;
  shortcutsOpen: boolean;
  openDialog: (dialog: DialogKind) => void;
  closeDialog: () => void;
  setAiOpen: (open: boolean) => void;
  showNotice: (message: string) => void;
  setZoom: (zoom: number) => void;
  setGridVisible: (visible: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
}

let noticeTimer: ReturnType<typeof setTimeout> | null = null;

export const useUiStore = create<UiState>()((set) => ({
  dialog: "none",
  aiOpen: false,
  notice: null,
  zoom: 1,
  gridVisible: true,
  theme: loadTheme(),
  commandPaletteOpen: false,
  shortcutsOpen: false,
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: "none" }),
  setAiOpen: (aiOpen) => set({ aiOpen }),
  showNotice: (message) => {
    if (noticeTimer) clearTimeout(noticeTimer);
    set({ notice: message });
    noticeTimer = setTimeout(() => set({ notice: null }), 3000);
  },
  setZoom: (zoom) => set({ zoom }),
  setGridVisible: (gridVisible) => set({ gridVisible }),
  setTheme: (theme) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
    set({ theme });
  },
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
  setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
}));

export function resolveTheme(mode: ThemeMode): "light" | "dark" {
  if (mode === "dark") return "dark";
  if (mode === "light") return "light";
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}
