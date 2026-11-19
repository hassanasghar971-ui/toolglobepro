import type { Tool } from "@/lib/types";

export const timestampConverterTool: Tool = {
  slug: "timestamp-converter",
  name: "Timestamp Converter",
  description:
    "Convert Unix timestamps to readable dates and dates back to Unix time, with time zones, a live clock and batch conversion.",
  category: "developer-tools",
  icon: "clock",
  keywords: [
    "unix timestamp converter",
    "epoch converter",
    "timestamp to date",
    "date to timestamp",
    "unix time",
    "epoch time",
    "milliseconds to date",
    "iso 8601 converter",
    "time zone converter",
    "current unix time",
  ],
  seoTitle: "Timestamp Converter – Unix Time to Date & Back",
  seoDescription:
    "Free Unix timestamp converter. Turn epoch seconds or milliseconds into dates in any time zone, convert dates to timestamps and batch convert lists.",
  related: ["unit-converter", "json-formatter", "base64-converter"],
  article: [
    {
      heading: "What is a Unix timestamp?",
      paragraphs: [
        "A Unix timestamp counts the seconds that have passed since 00:00:00 UTC on 1 January 1970, a moment known as the Unix epoch. It is the simplest way for computers to store a point in time: one number, no time zone, no daylight saving, no month lengths. Databases, log files, APIs, JWT tokens and cookies all use it, which is why developers keep running into values like 1700000000 and wondering what day that is.",
        "This timestamp converter turns those numbers into readable dates and back again. Paste a timestamp and you instantly see it as an ISO 8601 string, an RFC 2822 date, a clock time in any time zone you choose, and a relative phrase such as \"3 hours ago\". Type a date and you get the Unix seconds and milliseconds. A batch box handles whole lists at once. All of it runs in your browser.",
      ],
    },
    {
      heading: "Seconds, milliseconds, microseconds and nanoseconds",
      paragraphs: [
        "Different systems count at different precision. Classic Unix tools and many APIs use seconds, giving ten digits today. JavaScript, Java and many web APIs use milliseconds, giving thirteen digits. Some databases and Python tooling use microseconds with sixteen digits, and Go or high-resolution tracing systems often use nanoseconds with nineteen. The auto-detect mode looks at the number of digits and picks the right unit, and you can override it whenever a value is ambiguous.",
        "Whole-number timestamps are processed as text before they are converted, so long values keep their exact millisecond instead of being rounded by floating-point maths.",
      ],
    },
    {
      heading: "Time zones without the headaches",
      paragraphs: [
        "A timestamp has no time zone. The zone only matters when you display it. Pick any of the 40-plus zones in the list, or leave it on your browser's zone, and the converter applies the correct offset and daylight saving rules for that exact moment, using your browser's built-in time zone database. When you type a date without an offset, it is read in the zone you selected. If you include Z or an offset like +05:00 in the text, that offset wins.",
        "Remember that the same timestamp shows different clock times in London and Karachi, but it is still one instant. Store and exchange UTC timestamps, and convert to local time only when you show it to people.",
      ],
    },
    {
      heading: "Practical tips",
      paragraphs: [
        "Debugging a log? Paste the timestamps into the batch box, one per line, and copy the converted list. Checking token expiry? Convert the exp claim and compare it with the live clock at the top of the page. Scheduling an event for another region? Convert your local date into UTC seconds, then check it again in the destination zone.",
        "The supported range is year 0001 to 9999. Negative timestamps are valid and represent dates before 1970. Be aware of the Year 2038 problem: systems that store seconds in a signed 32-bit integer overflow on 19 January 2038 at 03:14:07 UTC. This tool doesn't have that limit, so it shows dates well beyond 2038 correctly.",
      ],
    },
  ],
  faqs: [
    {
      question: "What is the Unix epoch?",
      answer:
        "The Unix epoch is 00:00:00 UTC on 1 January 1970. A Unix timestamp is the number of seconds since that moment, so timestamp 0 is the epoch itself and negative numbers are dates before it.",
    },
    {
      question: "How do I know if my timestamp is in seconds or milliseconds?",
      answer:
        "Count the digits. Today's timestamps have 10 digits in seconds, 13 in milliseconds, 16 in microseconds and 19 in nanoseconds. Auto-detect uses exactly this rule. If your value is from an unusual date, choose the unit manually.",
    },
    {
      question: "Does a Unix timestamp contain a time zone?",
      answer:
        "No. A timestamp always refers to a single instant counted from the UTC epoch. A time zone only changes how that instant is written as a calendar date and clock time, which is why this tool lets you pick the display zone.",
    },
    {
      question: "What happens in 2038?",
      answer:
        "Software that stores Unix seconds in a signed 32-bit integer overflows on 19 January 2038 at 03:14:07 UTC. Modern systems use 64-bit values and aren't affected. This converter handles dates far beyond 2038, up to the year 9999.",
    },
    {
      question: "Can I convert many timestamps at once?",
      answer:
        "Yes. Paste up to 100,000 timestamps, one per line, into the batch box, choose ISO 8601, RFC 2822 or your chosen time zone, and press Convert. You can copy the result or download it as a tab-separated text file. Lines that can't be read are marked instead of being skipped.",
    },
    {
      question: "Is my data uploaded anywhere?",
      answer:
        "No. Every conversion runs in your browser using built-in JavaScript date and Intl features. Nothing you type is sent to a server or stored.",
    },
  ],
};

export default timestampConverterTool;
