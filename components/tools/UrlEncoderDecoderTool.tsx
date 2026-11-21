"use client";

import { useCallback, useMemo, useState } from "react";
import { METHOD_INFO, parseUrl, transformUrlText } from "@/lib/tools/url-core";
import type { EncodeMethod, UrlMode } from "@/lib/tools/url-core";

const SAMPLE_ENCODE = "https://example.com/search?q=hello world&lang=en&note=100% café ☕";
const SAMPLE_DECODE =
  "https%3A%2F%2Fexample.com%2Fsearch%3Fq%3Dhello%2520world%26lang%3Den%26note%3D100%2525%2520caf%C3%A9";
const SAMPLE_PARSE = "https://user@example.com:8080/docs/getting%20started?q=hello+world&tag=a%26b&empty=#install";

function Ico({ d, size = 16 }: { d: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

const ICON_COPY = "M9 9h11v11H9z M5 15V4h11";
const ICON_SWAP = "M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7";
const ICON_TRASH = "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // use the legacy fallback below
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost inline-flex items-center gap-1 text-xs"
      onClick={async () => {
        if (await copyText(value)) {
          setDone(true);
          window.setTimeout(() => setDone(false), 1200);
        }
      }}
      aria-label={"Copy " + (label || "value")}
      disabled={value === ""}
    >
      <Ico d={ICON_COPY} size={14} /> {done ? "Copied" : "Copy"}
    </button>
  );
}

export default function UrlEncoderDecoderTool() {
  const [tab, setTab] = useState<"convert" | "parse">("convert");
  const [mode, setMode] = useState<UrlMode>("encode");
  const [method, setMethod] = useState<EncodeMethod>("component");
  const [plusAsSpace, setPlusAsSpace] = useState(true);
  const [repeatDecode, setRepeatDecode] = useState(false);
  const [perLine, setPerLine] = useState(false);
  const [input, setInput] = useState<string>(SAMPLE_ENCODE);
  const [urlInput, setUrlInput] = useState<string>(SAMPLE_PARSE);
  const [copied, setCopied] = useState(false);

  const result = useMemo(
    () => transformUrlText(input, { mode, method, plusAsSpace, repeatDecode, perLine }),
    [input, mode, method, plusAsSpace, repeatDecode, perLine]
  );
  const parsed = useMemo(() => parseUrl(urlInput), [urlInput]);

  const looksEncoded = mode === "encode" && /%[0-9a-fA-F]{2}/.test(input);
  const looksPlain = mode === "decode" && input.length > 0 && !/%[0-9a-fA-F]{2}|\+/.test(input);

  const switchMode = useCallback((next: UrlMode) => {
    setMode(next);
    setInput((current) =>
      current === SAMPLE_ENCODE || current === SAMPLE_DECODE
        ? next === "encode"
          ? SAMPLE_ENCODE
          : SAMPLE_DECODE
        : current
    );
  }, []);

  const swap = useCallback(() => {
    setInput(result.output);
    setMode((m) => (m === "encode" ? "decode" : "encode"));
  }, [result.output]);

  const copyOutput = useCallback(async () => {
    if (await copyText(result.output)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }
  }, [result.output]);

  const partRows: { label: string; value: string }[] = parsed.ok
    ? [
        { label: "Full URL", value: parsed.url.href },
        { label: "Protocol", value: parsed.url.protocol },
        { label: "Username", value: parsed.url.username },
        { label: "Password", value: parsed.url.password },
        { label: "Host", value: parsed.url.host },
        { label: "Hostname", value: parsed.url.hostname },
        { label: "Port", value: parsed.url.port },
        { label: "Path", value: parsed.url.pathname },
        { label: "Query string", value: parsed.url.search },
        { label: "Fragment", value: parsed.url.hash },
        { label: "Origin", value: parsed.url.origin },
      ]
    : [];

  return (
    <div className="space-y-4">
      <div className="card p-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={tab === "convert" ? "btn-primary" : "btn-secondary"}
          aria-pressed={tab === "convert"}
          onClick={() => setTab("convert")}
        >
          Encode / Decode
        </button>
        <button
          type="button"
          className={tab === "parse" ? "btn-primary" : "btn-secondary"}
          aria-pressed={tab === "parse"}
          onClick={() => setTab("parse")}
        >
          URL Parser
        </button>
      </div>

      {tab === "convert" ? (
        <>
          <div className="card p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={mode === "encode" ? "btn-primary" : "btn-secondary"}
                aria-pressed={mode === "encode"}
                onClick={() => switchMode("encode")}
              >
                Encode
              </button>
              <button
                type="button"
                className={mode === "decode" ? "btn-primary" : "btn-secondary"}
                aria-pressed={mode === "decode"}
                onClick={() => switchMode("decode")}
              >
                Decode
              </button>
              <button type="button" className="btn-ghost inline-flex items-center gap-2" onClick={swap}>
                <Ico d={ICON_SWAP} /> Use output as input
              </button>
            </div>

            {mode === "encode" ? (
              <div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Encoding method">
                  {(Object.keys(METHOD_INFO) as EncodeMethod[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={method === key ? "btn-primary" : "btn-secondary"}
                      aria-pressed={method === key}
                      onClick={() => setMethod(key)}
                    >
                      {METHOD_INFO[key].label}
                    </button>
                  ))}
                </div>
                <p className="text-sm opacity-80 mt-2">{METHOD_INFO[method].hint}</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={plusAsSpace}
                    onChange={(e) => setPlusAsSpace(e.target.checked)}
                  />
                  Treat + as a space
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={repeatDecode}
                    onChange={(e) => setRepeatDecode(e.target.checked)}
                  />
                  Decode repeatedly (fixes double encoding)
                </label>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={perLine} onChange={(e) => setPerLine(e.target.checked)} />
              Process each line separately
            </label>
          </div>

          {looksEncoded && (
            <div className="card p-3 text-sm flex flex-wrap items-center gap-2" role="note">
              <span>This text already contains percent sequences. Did you mean to decode it?</span>
              <button type="button" className="btn-secondary" onClick={() => setMode("decode")}>
                Switch to Decode
              </button>
            </div>
          )}

          {looksPlain && (
            <div className="card p-3 text-sm" role="note">
              No percent sequences were found in this text, so decoding changes nothing.
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card p-3 space-y-2" aria-label="Input">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Input</h2>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="btn-ghost text-xs"
                    onClick={() => setInput(mode === "encode" ? SAMPLE_ENCODE : SAMPLE_DECODE)}
                  >
                    Sample
                  </button>
                  <button type="button" className="btn-ghost inline-flex items-center gap-1 text-xs" onClick={() => setInput("")}>
                    <Ico d={ICON_TRASH} size={14} /> Clear
                  </button>
                </div>
              </div>
              <textarea
                className="input font-mono text-sm w-full"
                style={{ minHeight: 260, resize: "vertical" }}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                spellCheck={false}
                placeholder={mode === "encode" ? "Text or URL to encode..." : "Percent-encoded text to decode..."}
                aria-label="Input text"
              />
              <span className="chip">{input.length.toLocaleString()} characters</span>
            </section>

            <section className="card p-3 space-y-2" aria-label="Output">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Output</h2>
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center gap-2 text-sm"
                  onClick={() => void copyOutput()}
                >
                  <Ico d={ICON_COPY} /> {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <textarea
                className="input font-mono text-sm w-full"
                style={{ minHeight: 260, resize: "vertical" }}
                value={result.output}
                readOnly
                spellCheck={false}
                aria-label="Output text"
              />
              <div className="flex flex-wrap gap-2">
                <span className="chip">{result.output.length.toLocaleString()} characters</span>
                {mode === "decode" && repeatDecode && <span className="chip">{result.passes} decode pass(es)</span>}
                {result.errors > 0 && (
                  <span className="chip">
                    {result.errors} problem{result.errors === 1 ? "" : "s"} skipped or repaired
                  </span>
                )}
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className="space-y-4">
          <section className="card p-3 space-y-2" aria-label="URL to parse">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">URL</h2>
              <button type="button" className="btn-ghost text-xs" onClick={() => setUrlInput(SAMPLE_PARSE)}>
                Sample
              </button>
            </div>
            <input
              type="text"
              className="input font-mono text-sm w-full"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              spellCheck={false}
              placeholder="https://example.com/path?query=value#fragment"
              aria-label="URL to parse"
            />
            {parsed.ok && parsed.assumedScheme && (
              <p className="text-sm opacity-80">No scheme was given, so https:// was assumed.</p>
            )}
            {!parsed.ok && (
              <p className="text-sm" role="alert">
                {parsed.error}
              </p>
            )}
          </section>

          {parsed.ok && (
            <>
              <section className="card p-3" aria-label="URL parts">
                <h2 className="text-sm font-semibold mb-2">Parts</h2>
                <div style={{ overflowX: "auto" }}>
                  <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                    <tbody>
                      {partRows.map((row) => (
                        <tr key={row.label} style={{ borderTop: "1px solid rgba(127,127,127,.25)" }}>
                          <th scope="row" className="text-left font-medium py-2 pr-4 whitespace-nowrap">
                            {row.label}
                          </th>
                          <td className="py-2 pr-2 font-mono break-all">
                            {row.value || <span className="opacity-50">(empty)</span>}
                          </td>
                          <td className="py-2 text-right">
                            <CopyButton value={row.value} label={row.label} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {parsed.url.pathSegments.length > 0 && (
                <section className="card p-3" aria-label="Path segments">
                  <h2 className="text-sm font-semibold mb-2">Path segments (decoded)</h2>
                  <div className="flex flex-wrap gap-2">
                    {parsed.url.pathSegments.map((seg, i) => (
                      <span key={i} className="chip">
                        {seg}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              <section className="card p-3" aria-label="Query parameters">
                <h2 className="text-sm font-semibold mb-2">Query parameters ({parsed.url.params.length})</h2>
                {parsed.url.params.length === 0 ? (
                  <p className="text-sm opacity-70">This URL has no query string.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                      <thead>
                        <tr className="text-left">
                          <th className="py-2 pr-4">Key</th>
                          <th className="py-2 pr-4">Decoded value</th>
                          <th className="py-2 pr-4">Raw value</th>
                          <th className="py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {parsed.url.params.map((p, i) => (
                          <tr key={i} style={{ borderTop: "1px solid rgba(127,127,127,.25)" }}>
                            <td className="py-2 pr-4 font-mono break-all">{p.key}</td>
                            <td className="py-2 pr-4 font-mono break-all">
                              {p.value || <span className="opacity-50">(empty)</span>}
                            </td>
                            <td className="py-2 pr-4 font-mono break-all opacity-80">
                              {p.rawValue || <span className="opacity-50">(empty)</span>}
                            </td>
                            <td className="py-2 text-right">
                              <CopyButton value={p.value} label={p.key} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
