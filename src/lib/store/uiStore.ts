import { create } from "zustand";

export type DialogKind = "none" | "import" | "export" | "share";

interface UiState {
  dialog: DialogKind;
  aiOpen: boolean;
  notice: string | null;
  zoom: number;
  gridVisible: boolean;
  openDialog: (dialog: DialogKind) => void;
  closeDialog: () => void;
  setAiOpen: (open: boolean) => void;
  showNotice: (message: string) => void;
  setZoom: (zoom: number) => void;
  setGridVisible: (visible: boolean) => void;
}

let noticeTimer: ReturnType<typeof setTimeout> | null = null;

export const useUiStore = create<UiState>()((set) => ({
  dialog: "none",
  aiOpen: false,
  notice: null,
  zoom: 1,
  gridVisible: true,
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
}));
