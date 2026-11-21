interface ContentSection {
  heading: string;
  paragraphs: string[];
}

interface Tool {
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  keywords: string[];
  seoTitle: string;
  seoDescription: string;
  article: ContentSection[];
  faqs: { question: string; answer: string }[];
  maxFileMB?: number;
  related?: string[];
}

export const csvToJson: Tool = {
  slug: "csv-to-json",
  name: "CSV to JSON Converter",
  description:
    "Convert CSV files up to 600 MB into JSON, arrays or NDJSON. Streams in a background worker, detects delimiters and never uploads your data.",
  category: "developer-tools",
  icon: "braces",
  keywords: [
    "csv to json",
    "csv to json converter",
    "convert csv to json online",
    "large csv to json",
    "csv to ndjson",
    "csv to jsonl",
    "csv parser online",
    "excel csv to json",
  ],
  seoTitle: "CSV to JSON Converter – Large Files Up to 600 MB",
  seoDescription:
    "Convert CSV to JSON, arrays or NDJSON in your browser. Streams files up to 600 MB, auto-detects delimiters, handles quotes and types. No upload.",
  article: [
    {
      heading: "Why CSV to JSON is such a common chore",
      paragraphs: [
        "CSV is the language of spreadsheets, database exports and analytics dashboards. JSON is what APIs, JavaScript apps and document databases want to read. Moving data from one to the other is a job that shows up constantly, whether you are seeding a test database, feeding a chart library or cleaning up an export a colleague emailed you.",
        "Doing it by hand or with a quick script works fine until the file contains a comma inside a quoted name, a line break inside a cell or a few million rows. That is the point where most online converters either mangle the output or freeze the tab.",
      ],
    },
    {
      heading: "Built to handle large files",
      paragraphs: [
        "This converter reads your file in slices of a few megabytes inside a background Web Worker, parses it as a stream and writes the JSON out in pieces. The full file is never held in memory as one giant string, and the page stays responsive while a progress bar shows how far along it is. You can cancel at any moment.",
        "The limit is 600 MB. The practical ceiling depends on your device, since the converted result still has to live somewhere until you download it, but modern laptops cope well with files that make spreadsheet programs give up. Nothing is uploaded at any point. The file is read directly from your disk by your own browser.",
      ],
    },
    {
      heading: "Delimiters, quotes and line breaks",
      paragraphs: [
        "Despite the name, not every CSV uses commas. Excel in many European locales writes semicolons, database tools love tabs and pipes. The default Auto setting inspects the first lines of your data and picks the delimiter that appears most consistently, and you can override it from the menu whenever the guess is wrong.",
        "Quoting follows the common RFC 4180 conventions. A field wrapped in double quotes may contain delimiters and line breaks, and two double quotes in a row stand for one literal quote. A leading byte-order mark is stripped, and Windows, Unix and classic Mac line endings are all understood.",
      ],
    },
    {
      heading: "Choosing the output shape",
      paragraphs: [
        "Array of objects is the default and usually what you want: each row becomes an object whose keys come from the header row. Array of arrays keeps the raw grid, including the header as the first entry, which is handy for table components and matrix-style processing.",
        "NDJSON, also called JSON Lines, writes one JSON value per line without an enclosing array. It is the better choice for very large exports and for tools such as MongoDB imports, BigQuery loads and log pipelines, because a consumer can read it line by line. Layout options let you choose pretty-printed output, one row per line, or fully minified text.",
      ],
    },
    {
      heading: "Type detection without nasty surprises",
      paragraphs: [
        "With type detection switched on, numbers become numbers, true and false become booleans and the word null becomes null. The rules are deliberately cautious. Values with leading zeros, such as 007 or the ZIP code 02134, stay as text so you do not lose the zero. Numbers longer than 15 digits stay as text as well, because JavaScript would silently round them. Anything that was wrapped in quotes in the CSV is always kept as a string.",
        "Empty cells can optionally become null instead of empty strings. If you need every value exactly as written, turn type detection off and you will get strings throughout.",
      ],
    },
    {
      heading: "Cleaning up messy files",
      paragraphs: [
        "Real-world CSV files are rarely tidy. When a row has fewer fields than the header, the missing keys are filled with null. When it has more, the extra values are stored under keys like column_5, and the tool lists the first few offending record numbers so you can find them in the source.",
        "Blank or duplicated header names are renamed automatically, for example name and name_2, so no data is overwritten. If your whole row ends up in a single column, the delimiter is almost certainly wrong. And if a warning mentions an unclosed quote, look for a stray double quote in the last record. Exporting from Excel as CSV UTF-8 avoids most character encoding problems.",
      ],
    },
  ],
  faqs: [
    {
      question: "How big a CSV file can I convert?",
      answer:
        "Up to 600 MB. The file is read in slices and processed as a stream, so memory use stays low. Very large results depend on your device, but the page itself stays responsive and you can cancel at any time.",
    },
    {
      question: "Is my data uploaded to a server?",
      answer:
        "No. The conversion runs in a background worker inside your own browser. Your CSV is read locally, and the JSON is created locally and downloaded from memory.",
    },
    {
      question: "Why did my ZIP code 01234 stay as text?",
      answer:
        "Numbers with leading zeros are kept as strings on purpose, because converting them would drop the zero. The same applies to numbers longer than 15 digits, which JavaScript cannot store precisely.",
    },
    {
      question: "Which output format is best for importing into a database?",
      answer:
        "NDJSON (one object per line) is the safest for large imports into tools like MongoDB or BigQuery. For small data sets and API payloads, an array of objects is usually more convenient.",
    },
    {
      question: "The delimiter was detected wrongly. What should I do?",
      answer:
        "Pick the delimiter manually from the Delimiter menu: comma, semicolon, tab or pipe. Auto detection looks at the first lines only, so unusual files can fool it.",
    },
    {
      question: "What happens when rows have different numbers of columns?",
      answer:
        "Missing values become null, and extra values are stored under generated keys such as column_5. A warning lists the first few affected record numbers so you can fix them at the source.",
    },
  ],
  maxFileMB: 600,
  related: ["json-formatter", "base64-converter", "text-diff-checker", "timestamp-converter"],
};

export default csvToJson;
