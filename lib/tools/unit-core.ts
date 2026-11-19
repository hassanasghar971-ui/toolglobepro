/**
 * unit-core.ts
 * Unit definitions and conversion helpers. Pure functions, no DOM access.
 * Most units convert through a base unit using a single factor. Temperature
 * and fuel economy use custom functions because they are not simple ratios.
 */

export type UnitCategoryId =
  | "length"
  | "mass"
  | "temperature"
  | "area"
  | "volume"
  | "speed"
  | "time"
  | "digital"
  | "pressure"
  | "energy"
  | "power"
  | "angle"
  | "fuel";

export interface UnitDef {
  id: string;
  label: string;
  symbol: string;
  toBase: (value: number) => number;
  fromBase: (base: number) => number;
}

export interface UnitCategory {
  id: UnitCategoryId;
  name: string;
  defaultFrom: string;
  defaultTo: string;
  /** True when "1 unit = X other units" is not a constant ratio. */
  nonLinear?: boolean;
  units: UnitDef[];
}

function lin(id: string, label: string, symbol: string, factor: number): UnitDef {
  return {
    id,
    label,
    symbol,
    toBase: (v) => v * factor,
    fromBase: (b) => b / factor,
  };
}

function inv(id: string, label: string, symbol: string, k: number): UnitDef {
  return {
    id,
    label,
    symbol,
    toBase: (v) => k / v,
    fromBase: (b) => k / b,
  };
}

const LITRES_PER_US_GALLON = 3.785411784;
const LITRES_PER_UK_GALLON = 4.54609;
const KM_PER_MILE = 1.609344;

export const UNIT_CATEGORIES: UnitCategory[] = [
  {
    id: "length",
    name: "Length",
    defaultFrom: "m",
    defaultTo: "ft",
    units: [
      lin("nm", "Nanometre", "nm", 1e-9),
      lin("um", "Micrometre", "µm", 1e-6),
      lin("mm", "Millimetre", "mm", 0.001),
      lin("cm", "Centimetre", "cm", 0.01),
      lin("m", "Metre", "m", 1),
      lin("km", "Kilometre", "km", 1000),
      lin("in", "Inch", "in", 0.0254),
      lin("ft", "Foot", "ft", 0.3048),
      lin("yd", "Yard", "yd", 0.9144),
      lin("mi", "Mile", "mi", 1609.344),
      lin("nmi", "Nautical mile", "nmi", 1852),
      lin("ly", "Light year", "ly", 9460730472580800),
    ],
  },
  {
    id: "mass",
    name: "Mass & weight",
    defaultFrom: "kg",
    defaultTo: "lb",
    units: [
      lin("ug", "Microgram", "µg", 1e-9),
      lin("mg", "Milligram", "mg", 1e-6),
      lin("g", "Gram", "g", 0.001),
      lin("kg", "Kilogram", "kg", 1),
      lin("t", "Metric tonne", "t", 1000),
      lin("oz", "Ounce", "oz", 0.028349523125),
      lin("lb", "Pound", "lb", 0.45359237),
      lin("st", "Stone", "st", 6.35029318),
      lin("ston", "Short ton (US)", "short ton", 907.18474),
      lin("lton", "Long ton (UK)", "long ton", 1016.0469088),
      lin("ct", "Carat", "ct", 0.0002),
    ],
  },
  {
    id: "temperature",
    name: "Temperature",
    defaultFrom: "c",
    defaultTo: "f",
    nonLinear: true,
    units: [
      {
        id: "c",
        label: "Celsius",
        symbol: "°C",
        toBase: (v) => v,
        fromBase: (b) => b,
      },
      {
        id: "f",
        label: "Fahrenheit",
        symbol: "°F",
        toBase: (v) => ((v - 32) * 5) / 9,
        fromBase: (b) => (b * 9) / 5 + 32,
      },
      {
        id: "k",
        label: "Kelvin",
        symbol: "K",
        toBase: (v) => v - 273.15,
        fromBase: (b) => b + 273.15,
      },
      {
        id: "r",
        label: "Rankine",
        symbol: "°R",
        toBase: (v) => ((v - 491.67) * 5) / 9,
        fromBase: (b) => ((b + 273.15) * 9) / 5,
      },
    ],
  },
  {
    id: "area",
    name: "Area",
    defaultFrom: "m2",
    defaultTo: "ft2",
    units: [
      lin("mm2", "Square millimetre", "mm²", 1e-6),
      lin("cm2", "Square centimetre", "cm²", 1e-4),
      lin("m2", "Square metre", "m²", 1),
      lin("ha", "Hectare", "ha", 10000),
      lin("km2", "Square kilometre", "km²", 1e6),
      lin("in2", "Square inch", "in²", 0.00064516),
      lin("ft2", "Square foot", "ft²", 0.09290304),
      lin("yd2", "Square yard", "yd²", 0.83612736),
      lin("ac", "Acre", "ac", 4046.8564224),
      lin("mi2", "Square mile", "mi²", 2589988.110336),
    ],
  },
  {
    id: "volume",
    name: "Volume",
    defaultFrom: "l",
    defaultTo: "galus",
    units: [
      lin("ml", "Millilitre", "mL", 0.001),
      lin("l", "Litre", "L", 1),
      lin("m3", "Cubic metre", "m³", 1000),
      lin("tsp", "Teaspoon (US)", "tsp", 0.00492892159375),
      lin("tbsp", "Tablespoon (US)", "tbsp", 0.01478676478125),
      lin("floz", "Fluid ounce (US)", "fl oz", 0.0295735295625),
      lin("cup", "Cup (US)", "cup", 0.2365882365),
      lin("ptus", "Pint (US)", "pt US", 0.473176473),
      lin("qtus", "Quart (US)", "qt US", 0.946352946),
      lin("galus", "Gallon (US)", "gal US", LITRES_PER_US_GALLON),
      lin("flozuk", "Fluid ounce (UK)", "fl oz UK", 0.0284130625),
      lin("ptuk", "Pint (UK)", "pt UK", 0.56826125),
      lin("galuk", "Gallon (UK)", "gal UK", LITRES_PER_UK_GALLON),
      lin("in3", "Cubic inch", "in³", 0.016387064),
      lin("ft3", "Cubic foot", "ft³", 28.316846592),
    ],
  },
  {
    id: "speed",
    name: "Speed",
    defaultFrom: "kmh",
    defaultTo: "mph",
    units: [
      lin("ms", "Metre per second", "m/s", 1),
      lin("kmh", "Kilometre per hour", "km/h", 1000 / 3600),
      lin("mph", "Mile per hour", "mph", 0.44704),
      lin("kn", "Knot", "kn", 1852 / 3600),
      lin("fts", "Foot per second", "ft/s", 0.3048),
      lin("mach", "Mach (sea level, 15 °C)", "Mach", 340.29),
      lin("c", "Speed of light", "c", 299792458),
    ],
  },
  {
    id: "time",
    name: "Time",
    defaultFrom: "h",
    defaultTo: "min",
    units: [
      lin("ns", "Nanosecond", "ns", 1e-9),
      lin("us", "Microsecond", "µs", 1e-6),
      lin("ms", "Millisecond", "ms", 0.001),
      lin("s", "Second", "s", 1),
      lin("min", "Minute", "min", 60),
      lin("h", "Hour", "h", 3600),
      lin("d", "Day", "d", 86400),
      lin("wk", "Week", "wk", 604800),
      lin("mo", "Month (average)", "mo", 2629800),
      lin("yr", "Year (365.25 days)", "yr", 31557600),
    ],
  },
  {
    id: "digital",
    name: "Digital storage",
    defaultFrom: "gb",
    defaultTo: "gib",
    units: [
      lin("bit", "Bit", "bit", 0.125),
      lin("kbit", "Kilobit", "kbit", 125),
      lin("mbit", "Megabit", "Mbit", 125000),
      lin("gbit", "Gigabit", "Gbit", 125000000),
      lin("b", "Byte", "B", 1),
      lin("kb", "Kilobyte (1,000 B)", "KB", 1e3),
      lin("mb", "Megabyte", "MB", 1e6),
      lin("gb", "Gigabyte", "GB", 1e9),
      lin("tb", "Terabyte", "TB", 1e12),
      lin("pb", "Petabyte", "PB", 1e15),
      lin("kib", "Kibibyte (1,024 B)", "KiB", 1024),
      lin("mib", "Mebibyte", "MiB", 1048576),
      lin("gib", "Gibibyte", "GiB", 1073741824),
      lin("tib", "Tebibyte", "TiB", 1099511627776),
      lin("pib", "Pebibyte", "PiB", 1125899906842624),
    ],
  },
  {
    id: "pressure",
    name: "Pressure",
    defaultFrom: "bar",
    defaultTo: "psi",
    units: [
      lin("pa", "Pascal", "Pa", 1),
      lin("kpa", "Kilopascal", "kPa", 1000),
      lin("mpa", "Megapascal", "MPa", 1e6),
      lin("bar", "Bar", "bar", 1e5),
      lin("mbar", "Millibar", "mbar", 100),
      lin("atm", "Atmosphere", "atm", 101325),
      lin("psi", "Pound per square inch", "psi", 6894.757293168),
      lin("mmhg", "Millimetre of mercury", "mmHg", 133.322387415),
      lin("inhg", "Inch of mercury", "inHg", 3386.389),
      lin("torr", "Torr", "Torr", 101325 / 760),
    ],
  },
  {
    id: "energy",
    name: "Energy",
    defaultFrom: "kwh",
    defaultTo: "mj",
    units: [
      lin("j", "Joule", "J", 1),
      lin("kj", "Kilojoule", "kJ", 1000),
      lin("mj", "Megajoule", "MJ", 1e6),
      lin("cal", "Calorie (thermochemical)", "cal", 4.184),
      lin("kcal", "Kilocalorie (food Calorie)", "kcal", 4184),
      lin("wh", "Watt hour", "Wh", 3600),
      lin("kwh", "Kilowatt hour", "kWh", 3.6e6),
      lin("btu", "British thermal unit (IT)", "BTU", 1055.05585262),
      lin("ftlbf", "Foot-pound force", "ft·lbf", 1.3558179483314004),
      lin("ev", "Electronvolt", "eV", 1.602176634e-19),
    ],
  },
  {
    id: "power",
    name: "Power",
    defaultFrom: "kw",
    defaultTo: "hp",
    units: [
      lin("w", "Watt", "W", 1),
      lin("kw", "Kilowatt", "kW", 1000),
      lin("mw", "Megawatt", "MW", 1e6),
      lin("hp", "Horsepower (mechanical)", "hp", 745.69987158227),
      lin("ps", "Horsepower (metric)", "PS", 735.49875),
      lin("btuh", "BTU per hour", "BTU/h", 0.29307107017),
      lin("ftlbfs", "Foot-pound per second", "ft·lbf/s", 1.3558179483314004),
    ],
  },
  {
    id: "angle",
    name: "Angle",
    defaultFrom: "deg",
    defaultTo: "rad",
    units: [
      lin("deg", "Degree", "°", 1),
      lin("rad", "Radian", "rad", 180 / Math.PI),
      lin("grad", "Gradian", "grad", 0.9),
      lin("arcmin", "Arcminute", "′", 1 / 60),
      lin("arcsec", "Arcsecond", "″", 1 / 3600),
      lin("turn", "Turn", "turn", 360),
    ],
  },
  {
    id: "fuel",
    name: "Fuel economy",
    defaultFrom: "mpgus",
    defaultTo: "l100",
    nonLinear: true,
    units: [
      lin("l100", "Litres per 100 km", "L/100km", 1),
      inv("kml", "Kilometres per litre", "km/L", 100),
      inv(
        "mpgus",
        "Miles per gallon (US)",
        "mpg US",
        (100 * LITRES_PER_US_GALLON) / KM_PER_MILE,
      ),
      inv(
        "mpguk",
        "Miles per gallon (UK)",
        "mpg UK",
        (100 * LITRES_PER_UK_GALLON) / KM_PER_MILE,
      ),
    ],
  },
];

export function getUnitCategory(id: string): UnitCategory {
  return UNIT_CATEGORIES.find((c) => c.id === id) ?? UNIT_CATEGORIES[0];
}

export function convertValue(from: UnitDef, to: UnitDef, value: number): number {
  const result = to.fromBase(from.toBase(value));
  return Object.is(result, -0) ? 0 : result;
}

/**
 * Parses what people actually type: 12.5, 1,234.5, 1e6, 3/8, 2 1/2, -4.
 * Returns null when the text is not a usable number.
 */
export function parseQuantity(raw: string): number | null {
  let s = raw.trim().replace(/[\u2212\u2012\u2013\u2014]/g, "-");
  if (!s) return null;

  const mixed = /^([+-]?)(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(s);
  if (mixed) {
    const denominator = Number(mixed[4]);
    if (denominator === 0) return null;
    const value = Number(mixed[2]) + Number(mixed[3]) / denominator;
    return mixed[1] === "-" ? -value : value;
  }

  const fraction = /^([+-]?\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/.exec(s);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    return Number(fraction[1]) / denominator;
  }

  s = s.replace(/[\s_]/g, "");
  if (/^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    s = s.replace(/,/g, "");
  } else if (/^[+-]?\d+,\d+$/.test(s)) {
    s = s.replace(",", ".");
  }
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Formats a number with the given significant digits.
 * Very large and very small values use exponent notation.
 */
export function formatNumber(n: number, significant: number, group: boolean): string {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "0";
  const sig = Math.min(21, Math.max(1, Math.round(significant)));
  const abs = Math.abs(n);

  if (abs >= 1e15 || abs < 1e-6) {
    const [mantissa, exponent] = n.toExponential(sig - 1).split("e");
    const cleaned = mantissa.includes(".")
      ? mantissa.replace(/0+$/, "").replace(/\.$/, "")
      : mantissa;
    const exp = Number(exponent);
    return `${cleaned}e${exp > 0 ? "+" : ""}${exp}`;
  }

  let text = Number(n.toPrecision(sig)).toString();
  if (/e/i.test(text)) {
    text = Number(n.toPrecision(sig)).toFixed(0);
  }
  if (group) {
    const negative = text.startsWith("-");
    const [integer, decimals] = text.replace("-", "").split(".");
    const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    text = `${negative ? "-" : ""}${grouped}${decimals ? `.${decimals}` : ""}`;
  }
  return text;
}
