import type { Diagram } from "#/types/diagram";

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportJson(diagram: Diagram) {
  const json = JSON.stringify(diagram, null, 2);
  download(new Blob([json], { type: "application/json" }), `${diagram.name}.json`);
}
