import { useEffect } from "react";

import { resolveTheme, useUiStore } from "#/lib/store/uiStore";

export function ThemeManager() {
  const theme = useUiStore((s) => s.theme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = resolveTheme(theme) === "dark";
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    if (theme === "system") {
      media.addEventListener("change", apply);
      return () => media.removeEventListener("change", apply);
    }
  }, [theme]);

  return null;
}
