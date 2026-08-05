import { toPng } from "html-to-image";

function download(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

let exportRoot: HTMLElement | null = null;

export function registerExportRoot(el: HTMLElement | null): void {
  exportRoot = el;
}

export function getExportRoot(): HTMLElement | null {
  return exportRoot;
}

/** Snap the whole diagram canvas (including off-viewport nodes) to a PNG. */
export async function exportDiagramPng(viewport: HTMLElement, filename: string) {
  const dataUrl = await toPng(viewport, {
    pixelRatio: 2,
    backgroundColor: "#fafafa",
    filter: (node) => {
      if (!(node instanceof HTMLElement)) return true;
      const cls = node.classList;
      if (
        cls.contains("react-flow__controls") ||
        cls.contains("react-flow__minimap") ||
        cls.contains("react-flow__attribution") ||
        node.dataset?.rfIgnore === "true"
      ) {
        return false;
      }
      return true;
    },
  });
  download(dataUrl, filename);
}

export async function exportViewportPng(viewport: HTMLElement, filename: string) {
  await exportDiagramPng(viewport, filename);
}
