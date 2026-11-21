"use client";

import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { MAX_URL_INPUT_BYTES, buildQuery, parseUrl, processText } from "./url-codec";
import type { CodecMode, Direction } from "./url-codec";

type Tab = "convert" | "parse" | "query";

const LIVE_LIMIT = 400_000;
const DISPLAY_LIMIT = 1_000_000;
const SWAP_LIMIT = 5_000_000;

const SAMPLE_ENCODE = "[https://example.com/search?q=hello](https://example.com/search?q=hello) world&lang=en&tag=café & crème brûlée";
const SAMPLE_DECODE = "https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%20world%26tag%3Dcaf%C3%A9";
const SAMPLE_PARSE =
  "https://user:pa%24%24@www.example.com:8080/path/to%20file.html?q=hello+world&tag=caf%C3%A9&tag=tea#section%201";
const SAMPLE_QUERY = "q=hello world\nlang=en\ncity=São Paulo\nredirect=[https://example.com/a?b=c&d=e](https://example.com/a?b=c&d=e)";

const ENCODE_MODES: { value: CodecMode; label: string; hint: string }[] = [
  { value: "component", label: "Component", hint: "encodeURIComponent: for parameter values" },
  { value: "uri", label: "Full URI", hint: "encodeURI: keeps : / ? # & = intact" },
  { value: "form", label: "Form (+)", hint: "application/x-www-form-urlencoded: space becomes +" },
  { value: "all", label: "Encode all", hint: "Percent-encode every byte" },
];

const DECODE_MODES: { value: CodecMode; label: string; hint: string }[] = [
  { value: "component", label: "Component", hint: "decodeURIComponent: decodes every %XX" },
  { value: "uri", label: "Full URI", hint: "decodeURI: keeps reserved characters like %2F encoded" },
  { value: "form", label: "Form (+)", hint: "Treat + as space, then decode" },
];

function Svg({ paths, size = 16 }: { paths: readonly string[]; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

const ICON_UPLOAD = ["M12 16V4", "M7 9l5-5 5 5", "M4 20h16"];
const ICON_DOWNLOAD = ["M12 4v12", "M7 11l5 5 5-5", "M4 20h16"];
const ICON_COPY = ["M9 9h11v11H9z", "M5 15V5a1 1 0 0 1 1-1h10"];
const ICON_SWAP = ["M7 4v14", "M3 14l4 4 4-4", "M17 20V6", "M13 10l4-4 4 4"];

function Check({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center gap-2 text-sm ${disabled ? "opacity-50" : ""}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      {label}
    </label>
  );
}

function downloadText(text: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UrlEncoderDecoderTool() {
  const [tab, setTab] = useState<Tab>("convert");

  // Convert tab
  const [direction, setDirection] = useState<Direction>("encode");
  const [input, setInput] = useState(SAMPLE_ENCODE);
  const [encodeMode, setEncodeMode] = useState<CodecMode>("component");
  const [decodeMode, setDecodeMode] = useState<CodecMode>("component");
  const [strict, setStrict] = useState(false);
  const [keepEscapes, setKeepEscapes] = useState(false);
  const [perLine, setPerLine] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [committed, setCommitted] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Parse tab
  const [parseInput, setParseInput] = useState(SAMPLE_PARSE);

  // Query tab
  const [queryInput, setQueryInput] = useState(SAMPLE_QUERY);
  const [plus, setPlus] = useState(false);

  const mode = direction === "encode" ? encodeMode : decodeMode;
  const large = input.length > LIVE_LIMIT;
  const source = large ? committed : input;
  const stale = large && committed !== input;

  const result = useMemo(() => {
    if (source === null) return null;
    return processText(source, { direction, mode, strict, keepEscapes, perLine, repeat });
  }, [source, direction, mode, strict, keepEscapes, perLine, repeat]);

  const parsed = useMemo(() => parseUrl(parseInput), [parseInput]);
  const built = useMemo(() => buildQuery(queryInput, plus), [queryInput, plus]);

  const output = result?.output ?? "";
  const shownOutput = output.length > DISPLAY_LIMIT ? output.slice(0, DISPLAY_LIMIT) : output;
  const looksEncoded = direction === "encode" && /%[0-9A-Fa-f]{2}/.test(input.slice(0, 5000));

  function flash(key: string) {
    setCopied(key);
    window.setTimeout(() => setCopied((current) => (current === key ? null : current)), 1600);
  }

  async function copy(key: string, value: string) {
    if (await copyText(value)) flash(key);
    else setNotice("Copying was blocked by the browser. Select the text and copy manually.");
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_URL_INPUT_BYTES) {
      setNotice(`"${file.name}" is ${formatBytes(file.size)}. The limit is ${formatBytes(MAX_URL_INPUT_BYTES)}.`);
      return;
    }
    try {
      const content = await file.text();
      setInput(content);
      setCommitted(null);
      setNotice(null);
    } catch {
      setNotice("That file could not be read.");
    }
  }

  function swap() {
    if (!result) return;
    if (result.output.length > SWAP_LIMIT) {
      setNotice("The result is too large to move into the input box. Use Download instead.");
      return;
    }
    setInput(result.output);
    setCommitted(null);
    setDirection((current) => (current === "encode" ? "decode" : "encode"));
  }

  const modes = direction === "encode" ? ENCODE_MODES : DECODE_MODES;
  const activeHint = modes.find((m) => m.value === mode)?.hint ?? "";

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tool sections">
          {(
            [
              ["convert", "Encode / Decode"],
              ["parse", "Parse URL"],
              ["query", "Query builder"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              className={tab === value ? "btn-primary" : "btn-secondary"}
              onClick={() => setTab(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "convert" && (
        <div className="space-y-4">
          <div className="card space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1" role="group" aria-label="Direction">
                <button
                  type="button"
                  className={direction === "encode" ? "btn-primary" : "btn-secondary"}
                  aria-pressed={direction === "encode"}
                  onClick={() => setDirection("encode")}
                >
                  Encode
                </button>
                <button
                  type="button"
                  className={direction === "decode" ? "btn-primary" : "btn-secondary"}
                  aria-pressed={direction === "decode"}
                  onClick={() => setDirection("decode")}
                >
                  Decode
                </button>
              </div>

              <div className="flex flex-wrap gap-1" role="group" aria-label="Mode">
                {modes.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    className={mode === m.value ? "btn-primary" : "btn-secondary"}
                    aria-pressed={mode === m.value}
                    title={m.hint}
                    onClick={() => (direction === "encode" ? setEncodeMode(m.value) : setDecodeMode(m.value))}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs opacity-70">{activeHint}</p>

            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <Check label="Process line by line" checked={perLine} onChange={setPerLine} />
              {direction === "encode" ? (
                <>
                  <Check
                    label="Strict RFC 3986 (also encode ! ' ( ) *)"
                    checked={strict}
                    onChange={setStrict}
                    disabled={mode === "uri" || mode === "all"}
                  />
                  <Check
                    label="Keep existing %XX sequences"
                    checked={keepEscapes}
                    onChange={setKeepEscapes}
                    disabled={mode === "all"}
                  />
                </>
              ) : (
                <Check label="Decode repeatedly (double-encoded text)" checked={repeat} onChange={setRepeat} />
              )}
            </div>

            {looksEncoded && (
              <p className="text-sm">
                This input already contains %XX sequences.{" "}
                <button type="button" className="btn-ghost underline" onClick={() => setDirection("decode")}>
                  Switch to Decode
                </button>
              </p>
            )}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="url-input" className="text-sm font-semibold">
                  Input
                </label>
                <span className="chip">{input.length.toLocaleString()} chars</span>
                <div className="ml-auto flex gap-2">
                  <input ref={fileRef} type="file" accept=".txt,.csv,.log,.json,text/plain" className="hidden" onChange={onFile} />
                  <button type="button" className="btn-ghost inline-flex items-center gap-2" onClick={() => fileRef.current?.click()}>
                    <Svg paths={ICON_UPLOAD} /> Open file
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setInput(direction === "encode" ? SAMPLE_ENCODE : SAMPLE_DECODE);
                      setCommitted(null);
                    }}
                  >
                    Sample
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => {
                      setInput("");
                      setCommitted(null);
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <textarea
                id="url-input"
                className="input min-h-[260px] w-full resize-y font-mono text-sm"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                spellCheck={false}
                placeholder={direction === "encode" ? "Text or URL to encode…" : "Percent-encoded text to decode…"}
              />
              {large && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="opacity-80">Large input: automatic conversion is paused.</span>
                  <button type="button" className="btn-primary" onClick={() => setCommitted(input)}>
                    Convert
                  </button>
                </div>
              )}
            </div>

            <div className="card flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <label htmlFor="url-output" className="text-sm font-semibold">
                  Result
                </label>
                <span className="chip">{output.length.toLocaleString()} chars</span>
                {stale && <span className="text-xs text-amber-700 dark:text-amber-400">outdated; press Convert</span>}
                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost inline-flex items-center gap-2"
                    onClick={swap}
                    disabled={!result || stale}
                    title="Move result to input and flip direction"
                  >
                    <Svg paths={ICON_SWAP} /> Swap
                  </button>
                </div>
              </div>
              <textarea
                id="url-output"
                className="input min-h-[260px] w-full resize-y font-mono text-sm"
                value={shownOutput}
                readOnly
                spellCheck={false}
                placeholder="Result appears here…"
              />
              {output.length > DISPLAY_LIMIT && (
                <p className="text-xs opacity-70">
                  Showing the first {DISPLAY_LIMIT.toLocaleString()} characters. Copy and Download include everything.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary inline-flex items-center gap-2"
                  onClick={() => copy("out", output)}
                  disabled={!result || output.length === 0}
                >
                  <Svg paths={ICON_COPY} /> {copied === "out" ? "Copied!" : "Copy result"}
                </button>
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center gap-2"
                  onClick={() => downloadText(output, direction === "encode" ? "encoded.txt" : "decoded.txt")}
                  disabled={!result || output.length === 0}
                >
                  <Svg paths={ICON_DOWNLOAD} /> Download
                </button>
              </div>
              {result && result.invalidSequences > 0 && (
                <p role="status" className="text-sm text-amber-700 dark:text-amber-400">
                  {result.invalidSequences.toLocaleString()} byte(s) were not valid UTF-8 and were replaced with .
                </p>
              )}
              {result && direction === "decode" && result.passes > 1 && (
                <p className="text-xs opacity-70">Decoded in {result.passes} passes.</p>
              )}
            </div>
          </div>

          {notice && (
            <p role="alert" className="text-sm text-red-600">
              {notice}
            </p>
          )}
        </div>
      )}

      {tab === "parse" && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="parse-input" className="text-sm font-semibold">
              URL to inspect
            </label>
            <button type="button" className="btn-ghost ml-auto" onClick={() => setParseInput(SAMPLE_PARSE)}>
              Sample
            </button>
          </div>
          <input
            id="parse-input"
            className="input w-full font-mono text-sm"
            value={parseInput}
            onChange={(event) => setParseInput(event.target.value)}
            spellCheck={false}
            placeholder="[https://example.com/path?query=value#hash](https://example.com/path?query=value#hash)"
          />

          {parseInput.trim() === "" ? (
            <p className="text-sm opacity-70">Enter a URL to see its parts.</p>
          ) : !parsed ? (
            <p role="alert" className="text-sm text-red-600">
              That does not look like a valid URL.
            </p>
          ) : (
            <div className="space-y-4">
              {parsed.assumedScheme && (
                <p className="text-xs opacity-70">No scheme was given, so https:// was assumed.</p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <tbody>
                    {(
                      [
                        ["Protocol", parsed.protocol],
                        ["Username", parsed.username],
                        ["Password", parsed.password],
                        ["Host", parsed.host],
                        ["Hostname", parsed.hostname],
                        ["Port", parsed.port],
                        ["Origin", parsed.origin],
                        ["Path", parsed.pathname],
                        ["Path (decoded)", parsed.decodedPathname],
                        ["Query string", parsed.search],
                        ["Fragment", parsed.hash],
                        ["Fragment (decoded)", parsed.decodedHash],
                        ["Normalized URL", parsed.href],
                      ] as const
                    ).map(([label, value]) => (
                      <tr key={label} className="border-b border-black/10 dark:border-white/10">
                        <th scope="row" className="w-44 whitespace-nowrap py-2 pr-4 font-semibold">
                          {label}
                        </th>
                        <td className="break-all py-2 font-mono">
                          {value === "" ? <span className="opacity-40">(none)</span> : value}
                        </td>
                        <td className="w-20 py-2 text-right">
                          {value !== "" && (
                            <button type="button" className="btn-ghost" onClick={() => copy(`p-${label}`, value)}>
                              {copied === `p-${label}` ? "Copied" : "Copy"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold">Query parameters ({parsed.params.length})</h3>
                {parsed.params.length === 0 ? (
                  <p className="text-sm opacity-70">No query parameters.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-black/20 dark:border-white/20">
                          <th className="py-2 pr-4">#</th>
                          <th className="py-2 pr-4">Key (decoded)</th>
                          <th className="py-2">Value (decoded)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.params.map((pair, index) => (
                          <tr key={`${pair.key}-${index}`} className="border-b border-black/10 dark:border-white/10">
                            <td className="py-2 pr-4 opacity-60">{index + 1}</td>
                            <td className="break-all py-2 pr-4 font-mono">{pair.key}</td>
                            <td className="break-all py-2 font-mono">
                              {pair.value === "" ? <span className="opacity-40">(empty)</span> : pair.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "query" && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="query-input" className="text-sm font-semibold">
              One <code>key=value</code> per line
            </label>
            <Check label="Use + for spaces" checked={plus} onChange={setPlus} />
            <button type="button" className="btn-ghost ml-auto" onClick={() => setQueryInput(SAMPLE_QUERY)}>
              Sample
            </button>
          </div>
          <textarea
            id="query-input"
            className="input min-h-[160px] w-full resize-y font-mono text-sm"
            value={queryInput}
            onChange={(event) => setQueryInput(event.target.value)}
            spellCheck={false}
            placeholder={"q=hello world\nlang=en"}
          />
          <div>
            <h3 className="mb-1 text-sm font-semibold">Encoded query string</h3>
            <textarea
              className="input min-h-[100px] w-full resize-y font-mono text-sm"
              value={built}
              readOnly
              aria-label="Encoded query string"
              placeholder="Result appears here…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2"
              onClick={() => copy("q", built)}
              disabled={built === ""}
            >
              <Svg paths={ICON_COPY} /> {copied === "q" ? "Copied!" : "Copy query string"}
            </button>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-2"
              onClick={() => copy("q?", built === "" ? "" : `?${built}`)}
              disabled={built === ""}
            >
              <Svg paths={ICON_COPY} /> {copied === "q?" ? "Copied!" : "Copy with ?"}
            </button>
          </div>
        </div>
      )}

      <p className="px-1 text-xs opacity-70">
        100% client-side: nothing you type or open here is uploaded. Files up to {formatBytes(MAX_URL_INPUT_BYTES)}{" "}
        are supported.
      </p>
    </div>
  );
}

export default UrlEncoderDecoderTool;
