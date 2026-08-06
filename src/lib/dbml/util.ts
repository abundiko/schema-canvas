export function quoteValue(v: string): string {
  if (/^[0-9.]+$/.test(v)) return v;
  return `'${v.replace(/'/g, "\\'")}'`;
}
