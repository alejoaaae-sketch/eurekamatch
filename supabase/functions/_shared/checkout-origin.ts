// Exact project-owned origins only; never authorize an entire hosting suffix.
const CHECKOUT_ORIGINS = new Set([
  "https://eurekamatch.com",
  "https://www.eurekamatch.com",
  "https://eurekamatch.eus",
  "https://www.eurekamatch.eus",
  "https://eurekamatch.lovable.app",
  "https://id-preview--526040e8-463d-4fae-a27c-09e5d731ee62.lovable.app",
]);

export function getCheckoutOrigin(origin: string | null): string {
  if (origin === null) return "https://eurekamatch.com";
  if (!CHECKOUT_ORIGINS.has(origin)) throw new Error("Invalid checkout origin");
  return origin;
}