import type { ReferentialAction } from "#/types/diagram";

export const REFERENTIAL_ACTIONS: Array<{
  value: ReferentialAction | "none";
  label: string;
}> = [
  { value: "none", label: "No action (default)" },
  { value: "cascade", label: "CASCADE" },
  { value: "restrict", label: "RESTRICT" },
  { value: "set null", label: "SET NULL" },
  { value: "no action", label: "NO ACTION" },
  { value: "set default", label: "SET DEFAULT" },
];

export const REFERENTIAL_ACTION_LABEL: Record<string, string> = {
  cascade: "CASCADE",
  restrict: "RESTRICT",
  "set null": "SET NULL",
  "no action": "NO ACTION",
  "set default": "SET DEFAULT",
};
