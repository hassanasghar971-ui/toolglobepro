export const textFileSplitterTool = {
  slug: "text-file-splitter",
  name: "Text File Splitter",
  h1: "Text and CSV File Splitter: Split Large Files by Lines or Size",
  tagline:
    "Split a large TXT, CSV or log file into smaller files by number of lines, by size or into equal parts. Lines are never cut in half. Free and private, up to 600 MB.",
  metaTitle: "Text File Splitter - Split Large CSV, TXT & Log Files",
  metaDescription:
    "Free online file splitter for large TXT, CSV and log files. Split by lines, by size or into equal parts, keep the CSV header in every file. Runs in your browser.",
  category: "file-tools",
  icon: "file-text",
  maxFileMB: 600,
  keywords: [
    "text file splitter",
    "split large text file",
    "csv splitter",
    "split csv file online",
    "split txt file by lines",
    "split log file",
    "split file by size online",
    "large csv file splitter",
  ],
  intro:
    "Some files are simply too big to work with. A spreadsheet program refuses to open a CSV with millions of rows, an upload form rejects a log file over a size limit, and a text editor freezes on a huge export. The usual fix is to cut the file into smaller pieces. This text file splitter does that in your browser. Choose how many lines or how many megabytes each piece should have, or ask for a number of equal parts, and download the results. The file is read in small chunks, so it is not loaded into memory all at once, and nothing is uploaded to a server.",
  howTo: [
    "Drop a text file onto the box or tap it to choose a file. Files up to 600 MB are accepted.",
    "Pick a method: by lines, by size or into equal parts, and enter the number.",
    "If the file is a CSV with column names in the first row, tick the header option so every piece starts with that row.",
    "Press Split file and watch the progress bar. You can cancel at any time.",
    "Download the pieces one by one or use Download all. Compare the total size shown with your original file if you want to double-check.",
  ],
  sections: [
    {
      heading: "Why the file is cut at line breaks",
      paragraphs: [
        "A simple byte-for-byte cut would break a line in the middle, and with modern text it can even cut a single character in half, because characters outside basic English can take up to four bytes. That would leave the end of one piece and the start of the next unreadable. This tool always cuts at the end of a line, so every row stays whole and every piece can be opened on its own.",
        "In size mode the limit you enter is a maximum. Each file is filled with complete lines until the next line would no longer fit, so files are usually slightly smaller than the limit.",
      ],
    },
    {
      heading: "Splitting CSV files with a header row",
      paragraphs: [
        "Most CSV files start with a row of column names. If you split the file and only the first piece has that row, the other pieces are hard to import. Turn on the header option and the first line is copied to the top of every piece. In lines mode the number you enter counts data rows, so 1000 means 1000 rows of data plus the header in each file.",
        "One limit to know about: the tool splits at line breaks and does not understand CSV quoting. If a cell contains a line break inside quotes, a cut can fall inside that cell. For ordinary exports, logs and plain text this does not matter, but check the result if your data has multi-line cells.",
      ],
    },
    {
      heading: "Large files and your device",
      paragraphs: [
        "The file is read as a stream, and each piece is built from small parts that the browser can keep outside the main page memory. Even so, the pieces together are about as big as the original, so you need free space for them. On a phone with little memory, a very large file may fail where a laptop succeeds. If that happens, try a smaller file or close other tabs.",
        "The tool expects text in UTF-8, which is the standard for almost all modern files. If the file uses an older encoding, or is not text at all, you will see a clear message instead of a damaged result.",
      ],
    },
    {
      heading: "Common uses",
      paragraphs: [
        "People use a file splitter to break a customer export into batches for an import tool, to cut a server log into daily or hourly chunks, to share a big data set by email in smaller attachments, or to make a huge file small enough to open in a spreadsheet. Because the work happens in your browser, private data such as customer lists and logs never leaves your device.",
      ],
    },
  ],
  faqs: [
    {
      q: "How big a file can I split?",
      a: "The limit is 600 MB per file. How well a very large file works also depends on the free memory and storage on your device, so a phone may manage less than a computer.",
    },
    {
      q: "Does the tool upload my file?",
      a: "No. The file is read and split inside your browser and the pieces are created on your device. Nothing is sent to a server.",
    },
    {
      q: "Can I split a CSV and keep the column names in every file?",
      a: "Yes. Tick the option that says the first line is a header and it is repeated at the top of every piece. In lines mode the number you enter counts the data rows only.",
    },
    {
      q: "Will it cut a line or a word in half?",
      a: "No. Cuts only happen at the end of a line. The one exception is a CSV cell with a line break inside quotes, because the tool does not read CSV quoting.",
    },
    {
      q: "Why do I get a message about UTF-8?",
      a: "The tool reads text as UTF-8 and stops if it finds bytes that are not valid, so it never silently damages your data. Re-save the file as UTF-8 in a text editor or spreadsheet program and try again.",
    },
    {
      q: "Why did I get one part more or less than I asked for?",
      a: "In equal parts mode the size is an estimate, and lines are never cut, so the real number can differ by one. Use the lines mode if you need an exact number of rows per file.",
    },
  ],
  features: [
    "Split by number of lines, by size or into equal parts",
    "Lines are never cut in half",
    "Optional CSV header repeated in every file",
    "Files up to 600 MB, read in chunks",
    "Progress bar and a cancel button",
    "Download pieces one by one or all at once",
    "Clear message for files that are not UTF-8",
    "Private: nothing leaves your browser",
  ],
  schemaType: "WebApplication",
  related: ["csv-to-json", "word-counter"],
  datePublished: "2026-11-27",
  dateModified: "2026-11-27",
};

export default textFileSplitterTool;
