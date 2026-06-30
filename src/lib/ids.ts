// src/lib/ids.ts
// Lightweight unique id generator for things like invite codes,
// where we don't need a full cuid library — just URL-safe uniqueness.

export function createId(): string {
  // 24 chars, base36, time + random — short enough for a clean /join/<code> URL
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 12)
  ).slice(0, 24);
}
