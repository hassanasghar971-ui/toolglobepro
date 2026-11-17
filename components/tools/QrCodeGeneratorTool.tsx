"use client";

import { useMemo, useState } from "react";
import {
  QR_TYPES,
  buildPayload,
  contrastRatio,
  encodeQr,
  isDarker,
  qrPathData,
  qrToSvg,
  type EccLevel,
  type FieldDef,
  type QrContentType,
  type QrMatrix,
} from "@/lib/tools/qr-core";
import {
  Checkbox,
  Segmented,
  buttonClass,
  cardClass,
  downloadBlob,
  primaryButtonClass,
  textareaClass,
} from "@/components/tools/shared";

const inputClass =
  "w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const ECC_OPTIONS: { value: EccLevel; label: string }[] = [
  { value: "L", label: "L · 7%" },
  { value: "M", label: "M · 15%" },
  { value: "Q", label: "Q · 25%" },
  { value: "H", label: "H · 30%" },
];

const SIZES = [256, 512, 1024, 2048];

type QrResult = { matrix: QrMatrix } | { error: string };

function renderPng(matrix: QrMatrix, border: number, px: number, fg: string, bg: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const total = matrix.size + border * 2;
    const scale = Math.max(1, Math.floor(px / total));
    const canvas = document.createElement("canvas");
    canvas.width = total * scale;
    canvas.height = total * scale;
    const c = canvas.getContext("2d");
    if (!c) {
      reject(new Error("Canvas is not available in this browser."));
      return;
    }
    c.fillStyle = bg;
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = fg;
    for (let y = 0; y < matrix.size; y++) {
      let x = 0;
      while (x < matrix.size) {
        if (!matrix.modules[y][x]) {
          x++;
          continue;
        }
        let e = x;
        while (e < matrix.size && matrix.modules[y][e]) e++;
        c.fillRect((x + border) * scale, (y + border) * scale, (e - x) * scale, scale);
        x = e;
      }
    }
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create the PNG."))), "image/png");
  });
}

function Field({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = `qr-${field.key}`;
  if (field.kind === "checkbox") {
    return (
      <Checkbox checked={value === "1"} onChange={(c) => onChange(c ? "1" : "")}>
        {field.label}
      </Checkbox>
    );
  }
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-800 dark:text-slate-200">
        {field.label}
      </label>
      {field.kind === "textarea" ? (
        <textarea
          id={id}
          value={value}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${textareaClass} h-28 resize-y font-sans`}
        />
      ) : field.kind === "select" ? (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputClass}>
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={field.kind === "password" ? "text" : (field.inputType ?? "text")}
          value={value}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
    </div>
  );
}

export function QrCodeGeneratorTool() {
  const [type, setType] = useState<QrContentType>("url");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [ecl, setEcl] = useState<EccLevel>("M");
  const [px, setPx] = useState(512);
  const [border, setBorder] = useState(4);
  const [fg, setFg] = useState("#000000");
  const [bg, setBg] = useState("#ffffff");
  const [notice, setNotice] = useState<string | null>(null);

  const def = QR_TYPES.find((t) => t.value === type) ?? QR_TYPES[0];
  const payload = useMemo(() => buildPayload(type, fields), [type, fields]);

  const qr = useMemo<QrResult | null>(() => {
    if (!payload.ok) return null;
    try {
      return { matrix: encodeQr(payload.text, ecl) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Could not create the QR code." };
    }
  }, [payload, ecl]);

  const matrix = qr && "matrix" in qr ? qr.matrix : null;
  const total = matrix ? matrix.size + border * 2 : 0;
  const pathData = useMemo(() => (matrix ? qrPathData(matrix, border) : ""), [matrix, border]);

  const contrast = contrastRatio(fg, bg);
  const pngScale = matrix ? Math.max(1, Math.floor(px / total)) : 1;
  const pngSize = matrix ? total * pngScale : px;

  const setField = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    setNotice(null);
  };

  const downloadPng = async () => {
    if (!matrix) return;
    try {
      downloadBlob(await renderPng(matrix, border, px, fg, bg), "qrcode.png");
      setNotice(null);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not create the PNG.");
    }
  };

  const downloadSvg = () => {
    if (!matrix) return;
    downloadBlob(new Blob([qrToSvg(matrix, border, px, fg, bg)], { type: "image/svg+xml" }), "qrcode.svg");
    setNotice(null);
  };

  const copyImage = async () => {
    if (!matrix) return;
    try {
      if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) throw new Error("unsupported");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": renderPng(matrix, border, px, fg, bg) })]);
      setNotice("Image copied to the clipboard.");
    } catch {
      setNotice("Your browser did not allow copying the image. Use “Download PNG” instead.");
    }
  };

  return (
    <div className="space-y-6">
      <section className={cardClass} aria-label="QR content type">
        <div role="radiogroup" aria-label="Content type" className="flex flex-wrap gap-2">
          {QR_TYPES.map((t) => {
            const on = t.value === type;
            return (
              <button
                key={t.value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setType(t.value);
                  setNotice(null);
                }}
                className={`rounded-xl border px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 ${
                  on
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">{def.hint}</p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="QR code builder">
        <div className="space-y-4">
          <div className={`${cardClass} space-y-4`}>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Content</h2>
            {def.fields.map((field) => (
              <Field
                key={field.key}
                field={field}
                value={fields[field.key] ?? field.defaultValue ?? ""}
                onChange={(v) => setField(field.key, v)}
              />
            ))}
            {!payload.ok && payload.message && (
              <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                {payload.message}
              </p>
            )}
            {qr && "error" in qr && (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {qr.error}
              </p>
            )}
          </div>

          <div className={`${cardClass} space-y-4`}>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Appearance</h2>
            <div>
              <p className="mb-1 text-sm font-medium text-slate-800 dark:text-slate-200">Error correction</p>
              <Segmented label="Error correction level" value={ecl} onChange={setEcl} options={ECC_OPTIONS} />
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                Code colour
                <input
                  type="color"
                  value={fg}
                  onChange={(e) => setFg(e.target.value)}
                  aria-label="Foreground colour"
                  className="h-8 w-12 cursor-pointer rounded border border-slate-300 bg-transparent dark:border-slate-700"
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                Background
                <input
                  type="color"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  aria-label="Background colour"
                  className="h-8 w-12 cursor-pointer rounded border border-slate-300 bg-transparent dark:border-slate-700"
                />
              </label>
              <button
                type="button"
                className={buttonClass}
                onClick={() => {
                  setFg("#000000");
                  setBg("#ffffff");
                }}
              >
                Reset colours
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                PNG size
                <select
                  value={px}
                  onChange={(e) => setPx(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  {SIZES.map((s) => (
                    <option key={s} value={s}>
                      {s} px
                    </option>
                  ))}
                </select>
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                Quiet zone
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={border}
                  onChange={(e) => setBorder(Number(e.target.value))}
                  aria-label="Quiet zone width in modules"
                  className="w-28 accent-indigo-600"
                />
                <span className="w-6 text-right tabular-nums">{border}</span>
              </label>
            </div>
            {!isDarker(fg, bg) && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                The code is lighter than its background. Inverted codes are not read by many scanners, so a dark code
                on a light background is safer.
              </p>
            )}
            {contrast < 3 && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Low contrast ({contrast.toFixed(1)}:1). This code may not scan reliably. Aim for at least 4:1.
              </p>
            )}
            {border < 4 && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                A quiet zone of 4 modules or more is recommended for reliable scanning.
              </p>
            )}
          </div>
        </div>

        <div className={`${cardClass} space-y-4`}>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Preview</h2>
          {matrix ? (
            <>
              <div className="flex justify-center rounded-xl border border-slate-200 bg-slate-100 p-4 dark:border-slate-700 dark:bg-slate-800">
                <svg
                  viewBox={`0 0 ${total} ${total}`}
                  role="img"
                  aria-label="Generated QR code"
                  shapeRendering="crispEdges"
                  className="h-auto w-full max-w-xs rounded-md"
                >
                  <rect width={total} height={total} fill={bg} />
                  <path d={pathData} fill={fg} />
                </svg>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Version {matrix.version} · {matrix.size}×{matrix.size} modules · {matrix.dataBytes.toLocaleString()}{" "}
                {matrix.dataBytes === 1 ? "character" : "characters"} encoded · PNG will be {pngSize}×{pngSize} px
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={primaryButtonClass} onClick={() => void downloadPng()}>
                  Download PNG
                </button>
                <button type="button" className={buttonClass} onClick={downloadSvg}>
                  Download SVG
                </button>
                <button type="button" className={buttonClass} onClick={() => void copyImage()}>
                  Copy image
                </button>
              </div>
              {notice && (
                <p role="status" className="text-sm text-slate-600 dark:text-slate-400">
                  {notice}
                </p>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Always test a printed code with two or three phones before publishing it.
              </p>
            </>
          ) : (
            <div className="flex min-h-[16rem] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Fill in the content and your QR code appears here instantly.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default QrCodeGeneratorTool;
