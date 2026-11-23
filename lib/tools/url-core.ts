/**
 * Pure URL encoding / decoding helpers (no DOM dependencies except the
 * standard URL / URLSearchParams / TextEncoder / TextDecoder globals).
 */
export const MAX_URL_INPUT_BYTES = 50 * 1024 * 1024;
export type Direction = "encode" | "decode";
/*
 * "all" is encode-only (percent-encodes every byte).
 */
export type CodecMode = "component" | "uri" | "form" | "all";
export interface CodecOptions {
  direction: Direction;
  mode: CodecMode;
  /*
   * Also encode ! ' ( ) * (RFC 3986 strict). Component and form modes.
   */
  strict: boolean;
  /*
   * Leave existing %XX sequences untouched when encoding.
   */
  keepEscapes: boolean;
  /*
   * Process each line independently, preserving line endings.
   */
  perLine: boolean;
  /*
   * Decode repeatedly (up to 5 passes) for double-encoded text.
   */
  repeat: boolean;
}
export interface CodecResult {
  output: string;
  invalidSequences: number;
  passes: number;
}
const hex = (byte: number): string =>
  `%${byte < 16 ? "0" : ""}${byte.toString(16).toUpperCase()}`;
function sanitizeSurrogates(text: string): string {
  return text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDFFF]/g, (match) =>
    match.length === 2 ? match : "\uFFFD",
  );
}
function applyStrict(value: string, strict: boolean): string {
  return strict ? value.replace(/[!'()*]/g, (ch) => hex(ch.charCodeAt(0))) : value;
}
