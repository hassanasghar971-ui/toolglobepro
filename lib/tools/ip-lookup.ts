import type { ToolDefinition } from "../types";

export const ipLookup: ToolDefinition = {
  slug: "ip-lookup",
  name: "My IP Address & Location Finder",
  h1: "What Is My IP Address & Location Finder",
  tagline: "Instantly check your public IPv4/IPv6 address, ISP, region and coordinates",
  metaTitle: "What Is My IP Address? Free IP & Location Finder",
  metaDescription: "Check your public IP address, location, ISP, city, region and country instantly. Free, fast and private tool running directly in your browser.",
  category: "network-tools",
  icon: "globe",
  keywords: [
    "what is my ip",
    "ip address lookup",
    "ip location finder",
    "my ip details",
    "find my ip address",
    "geolocation lookup",
  ],
  schemaType: "WebApplication",
  datePublished: "2025-11-01",
  dateModified: "2025-11-01",
  related: ["password-generator", "base64-converter"],
  features: [
    "Detects public IPv4 and IPv6 addresses",
    "Shows approximate geographic location (country, region, city)",
    "Identifies Internet Service Provider (ISP) and ASN",
    "One-click copy for IP and details",
  ],
  intro: "Whenever you connect to the internet, your device is assigned an IP address—a unique string of numbers that acts like a digital return address. Whether you are troubleshooting network issues, checking whether your VPN is active, or just curious what data your browser exposes, this tool shows your public IP and connection details in a clean, readable format.",
  howTo: [
    "Open the tool page. It will automatically query a secure network endpoint to retrieve your public IP details.",
    "View your IPv4 or IPv6 address, country, region, city, and ISP name.",
    "Click the copy button to save your IP address to your clipboard instantly.",
  ],
  sections: [
    {
      heading: "What does your IP address reveal?",
      paragraphs: [
        "An IP address itself does not reveal your home address or personal identity, but it does show your approximate geographic location down to the city level, as well as the company providing your internet connection (your ISP).",
        "Websites use this information to serve localized content, show relevant currencies, or enforce regional restrictions. If you use a VPN or a proxy, the IP address shown will belong to the VPN server rather than your physical location.",
      ],
    },
    {
      heading: "IPv4 vs. IPv6",
      paragraphs: [
        "IPv4 addresses are the familiar four-part numbers separated by dots, while IPv6 uses hexadecimal notation separated by colons to accommodate the massive growth of connected devices worldwide.",
        "Both versions work seamlessly with this tool, depending on what your network provider assigns to your current session.",
      ],
    },
  ],
  faqs: [
    {
      q: "Is my IP address logged or stored?",
      a: "No. The lookup request goes directly to a secure provider to fetch your connection details for you, and we do not store, log, or track your IP address on any server.",
    },
    {
      q: "Why is the location showing a different city?",
      a: "IP geolocation is based on databases maintained by ISPs and registries. It points to the nearest regional routing hub, which can sometimes be a few miles away from your exact physical spot.",
    },
  ],
};
