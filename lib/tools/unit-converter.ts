import type { Tool } from "@/lib/types";

export const unitConverterTool: Tool = {
  slug: "unit-converter",
  name: "Unit Converter",
  description:
    "Convert length, weight, temperature, area, volume, speed, time, digital storage, pressure, energy, power, angle and fuel economy instantly.",
  category: "developer-tools",
  icon: "trending-up",
  keywords: [
    "unit converter",
    "metric to imperial",
    "length converter",
    "weight converter",
    "temperature converter",
    "celsius to fahrenheit",
    "kg to lbs",
    "km to miles",
    "mpg to l/100km",
    "gb to gib",
    "online unit conversion",
  ],
  seoTitle: "Unit Converter – Length, Weight, Temperature & More",
  seoDescription:
    "Free online unit converter for length, weight, temperature, area, volume, speed, time, data, pressure, energy and more. Fast, accurate and private.",
  related: ["timestamp-converter", "color-converter", "base64-converter"],
  article: [
    {
      heading: "What this unit converter does",
      paragraphs: [
        "Cooking from an American recipe in a metric kitchen, reading a spec sheet written in inches, or checking how many gigabytes a file really is: unit conversion comes up constantly, and getting it wrong is annoying at best and expensive at worst. This free unit converter handles thirteen measurement categories in one place: length, mass, temperature, area, volume, speed, time, digital storage, pressure, energy, power, angle and fuel economy.",
        "Type a number, pick the unit you start with and the unit you want, and the answer appears instantly. Below it you also see the same value in every other unit of that category, so you rarely need a second conversion. Everything runs in your browser. No number you type is sent anywhere.",
      ],
    },
    {
      heading: "How the conversions are calculated",
      paragraphs: [
        "Most units are converted through a base unit. Every length is first turned into metres, then from metres into the target unit. That keeps the maths consistent: the factor between inches and miles comes from two exact definitions rather than a rounded shortcut. The international inch is exactly 25.4 millimetres, the pound is exactly 0.45359237 kilograms, and a US gallon is exactly 3.785411784 litres, so those conversions are exact up to the limits of floating-point arithmetic.",
        "Temperature is different because the scales don't share a zero point. Celsius to Fahrenheit needs a multiplication and an offset, which is why you can't convert it with a single factor. Fuel economy is different again: miles per gallon go up as a car gets more efficient, while litres per 100 kilometres go down, so the conversion is an inversion. The tool handles both properly.",
        "You can choose how many significant digits to show, from 4 to 15. The default of 10 hides the tiny floating-point noise that computers produce, so 1 foot in inches reads 12 instead of 12.000000000000002.",
      ],
    },
    {
      heading: "Common uses",
      paragraphs: [
        "Travel and daily life: kilometres to miles, kilograms to pounds, Celsius to Fahrenheit, litres to US gallons. Cooking: cups, tablespoons, millilitres, ounces and grams. A US cup and a UK imperial pint are different sizes, so the tool labels US and UK units separately to avoid silent mistakes.",
        "Work and study: engineers switch between pascals, bar and psi, joules and kilowatt-hours, or horsepower and kilowatts. Developers and IT staff compare megabytes with mebibytes. A drive sold as 1 TB holds 1,000,000,000,000 bytes, which your operating system may report as about 931 GiB. Both numbers are correct. They use different definitions, and the digital storage category shows decimal (KB, MB, GB) and binary (KiB, MiB, GiB) units side by side.",
      ],
    },
    {
      heading: "Tips for accurate results",
      paragraphs: [
        "Check the unit labels before you copy a result. Gallons, pints and fluid ounces come in US and UK versions. A tonne is 1,000 kg, a short ton is 2,000 lb and a long ton is 2,240 lb. The tool accepts decimals, scientific notation such as 1.5e6, simple fractions such as 3/8 and mixed numbers such as 2 1/2, which is handy for imperial measurements.",
        "Click any row in the all-units table to make it the target unit, or use the swap button to reverse the conversion. Use the copy buttons to grab a clean value without thousands separators, ready to paste into a spreadsheet or code.",
        "Finally, remember that a conversion is only as good as the original number. If a measurement was rounded before you typed it in, the result carries the same uncertainty, however many digits are displayed.",
      ],
    },
  ],
  faqs: [
    {
      question: "How accurate is this unit converter?",
      answer:
        "It uses the exact international definitions wherever they exist: 1 inch is exactly 25.4 mm, 1 pound is exactly 0.45359237 kg and 1 US gallon is exactly 3.785411784 L. Calculations use standard double-precision numbers, which carry about 15 to 16 significant digits, and the display rounds to the number of digits you choose.",
    },
    {
      question: "Are the numbers I type sent to a server?",
      answer:
        "No. All conversions are calculated in your browser with JavaScript. Nothing you enter is uploaded or stored, and the converter keeps working if your connection drops after the page has loaded.",
    },
    {
      question: "Why does 1 TB show as about 931 GiB?",
      answer:
        "Storage makers use decimal units, where 1 TB is 1,000,000,000,000 bytes. Many operating systems report binary units, where 1 GiB is 1,073,741,824 bytes. The same drive is therefore about 931 GiB. The digital storage category lists both families so you can compare them directly.",
    },
    {
      question: "What is the difference between US and UK gallons, pints and ounces?",
      answer:
        "A US gallon is 3.785 litres and a UK (imperial) gallon is 4.546 litres, about 20% larger. US and UK pints and fluid ounces also differ. This converter labels each one clearly, so pick the one that matches your recipe, fuel receipt or product label.",
    },
    {
      question: "Can I enter fractions or scientific notation?",
      answer:
        "Yes. You can type decimals (12.5), numbers with thousands separators (1,234.5), scientific notation (1.5e6), fractions (3/8) and mixed numbers (2 1/2). If the input can't be read, the tool says so instead of guessing.",
    },
    {
      question: "Why are temperature and fuel economy handled differently?",
      answer:
        "Temperature scales have different zero points, so a conversion needs an offset as well as a multiplication. Fuel economy compares distance per volume with volume per distance, so one value rises while the other falls. For these two categories the tool uses dedicated formulas, and the fixed 1-to-X hint is hidden because the ratio isn't constant.",
    },
  ],
};

export default unitConverterTool;
