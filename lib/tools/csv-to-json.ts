import type { ToolDefinition } from "../types";

const csvToJsonTool: ToolDefinition = {
  slug: "csv-to-json",
  name: "CSV to JSON Converter",
  h1: "CSV to JSON Converter Online",
  tagline: "Turn CSV, TSV and Excel exports into clean JSON, arrays or NDJSON privately in your browser.",
  metaTitle: "CSV to JSON Converter: Large Files & Private",
  metaDescription:
    "Convert CSV to JSON in your browser. Handles quoted fields, delimiters, Excel encodings and files up to 600 MB. Nothing is uploaded.",
  category: "developer-tools",
  icon: "code",
  keywords: [
    "csv to json",
    "csv to json converter online",
    "convert csv to json",
    "csv to json large file",
    "tsv to json",
    "csv to ndjson",
    "excel csv to json",
    "csv parser online",
    "csv to json array of objects",
    "private csv converter",
  ],
  intro:
    "Paste a CSV, or drop a file, and get valid JSON in a moment. This converter runs entirely in your browser, so customer lists, exports and internal data never leave your device. It understands quoted fields, embedded commas and line breaks, any common delimiter and the encodings Excel produces, and it can stream files up to 600 MB without freezing the page.",
  sections: [
    {
      heading: "A CSV to JSON converter that keeps your data private",
      paragraphs: [
        "Many online converters upload your file to a server, where it may be stored, logged or scanned. That is a poor fit for payroll exports, customer lists, analytics dumps or anything covered by GDPR or similar rules. This tool parses the file locally using your own processor. There is no upload step, no account and no size quota tied to a server. You can disconnect from the internet after the page loads and the conversion still works, which is the simplest proof that your data stays with you.",
      ],
    },
    {
      heading: "Proper CSV parsing, not a simple split on commas",
      paragraphs: [
        "Real CSV files are messier than they look. A field can contain a comma, a quote or even a line break as long as it is wrapped in double quotes, and two quotes in a row stand for one literal quote. This converter follows those rules, so an address such as Springfield, IL or a note that spans two lines ends up in a single JSON value instead of breaking the row. It also removes the byte order mark that Excel adds, accepts both Windows and Unix line endings, and detects whether your file uses commas, semicolons, tabs or pipes. European exports that use semicolons work without any manual setup.",
      ],
    },
    {
      heading: "Choose the JSON shape you need",
      paragraphs: [
        "Use an array of objects when your first row holds column names and you want each record as a keyed object, which is the usual shape for APIs, databases and JavaScript code. Use an array of arrays when you want a compact table that keeps the header as the first row. Use JSON Lines, also called NDJSON, when you plan to load the data into tools that read one record per line, such as log processors, BigQuery imports or streaming pipelines. Optional type conversion turns numbers, true and false into real JSON types and empty cells into null, while IDs with leading zeros and very large integers stay as strings so no digits are lost.",
      ],
    },
    {
      heading: "Built for very large files",
      paragraphs: [
        "A 300 MB export would normally crash a browser tab if it were loaded into a text box. Here the file is read in small chunks by a background worker, converted row by row and assembled into a downloadable file piece by piece. A progress bar shows how far along it is, you can cancel at any time, and the page stays responsive. Pasted text of up to a few hundred thousand characters converts live as you type, while bigger inputs run in the background with the same progress display. If the converter finds uneven rows, duplicate headers or a quote that never closes, it tells you instead of silently producing wrong data.",
      ],
    },
  ],
  howTo: [
    "Paste your CSV into the input box, or click Open CSV file, or drag a file onto the tool.",
    "Leave the delimiter on Auto-detect, or pick comma, semicolon, tab or pipe if you know it.",
    "Choose the output format: array of objects, array of arrays or JSON Lines.",
    "Set the options: first row as header, trimming, number and boolean conversion, empty line handling and pretty printing.",
    "If your file came from older Excel or a Western European system and accents look wrong, change the file encoding to Windows-1252.",
    "For large files, click Convert and watch the progress bar. Use Cancel if you need to stop.",
    "Review the preview and any warnings, then click Copy JSON or Download.",
  ],
  features: [
    "Converts CSV and TSV to JSON in the browser",
    "RFC 4180 quoted fields with embedded commas and line breaks",
    "Auto-detects comma, semicolon, tab and pipe delimiters",
    "Array of objects, array of arrays or NDJSON output",
    "Streams files up to 600 MB in a background worker",
    "Progress bar with cancel",
    "Encoding choices for Excel and Latin-1 files",
    "Optional number, boolean and null conversion",
    "Warnings for uneven rows and duplicate headers",
    "Copy and download with no server upload",
  ],
  faqs: [
    {
      q: "Is my CSV file uploaded anywhere?",
      a: "No. The file is read and converted inside your browser, and large files are processed by a background worker on your device. Nothing is sent to a server.",
    },
    {
      q: "How large a CSV can I convert?",
      a: "Up to 600 MB. Large files are streamed in chunks, so memory use stays low while the JSON is built. Very large results are offered as a download, and the screen shows a preview of the first rows.",
    },
    {
      q: "Why do my accented letters look wrong?",
      a: "The file probably uses a legacy encoding such as Windows-1252. Change the file encoding option and the preview updates. UTF-8 files, including those with a byte order mark, work by default.",
    },
    {
      q: "What happens to numbers like 007 or very long IDs?",
      a: "When type conversion is on, values with leading zeros and integers too large to store exactly are kept as strings, so postal codes, phone numbers and long IDs are not damaged. Turn type conversion off to keep every value as a string.",
    },
    {
      q: "What if some rows have more or fewer columns?",
      a: "Missing values become null, and extra values get names like column_5. The tool shows a warning with the number of affected rows so you can check the source.",
    },
    {
      q: "Which output should I choose for a database import?",
      a: "Use JSON Lines if the importer reads one record per line, as many bulk loaders do. Use an array of objects for REST APIs and JavaScript code.",
    },
  ],
  schemaType: "WebApplication",
  maxFileMB: 600,
  related: ["json-formatter", "url-encoder-decoder", "markdown-previewer"],
  datePublished: "2026-11-26",
  dateModified: "2026-11-26",
};

export default csvToJsonTool;
