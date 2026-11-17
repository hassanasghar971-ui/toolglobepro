import type { Tool } from "@/lib/types";

export const ipLookupTool: Tool = {
  slug: "ip-lookup",
  name: "My IP Address & Location Finder",
  description:
    "See your public IPv4 or IPv6 address, ISP, city, country and time zone instantly, or look up any IP address. Free, no sign-up.",
  category: "developer",
  icon: "globe",
  keywords: [
    "what is my ip address",
    "my ip",
    "ip lookup",
    "ip location finder",
    "ip address checker",
    "check my ip",
    "ipv4 ipv6 checker",
    "find isp",
    "vpn ip check",
    "geolocation by ip",
  ],
  seoTitle: "What Is My IP Address? Free IP Lookup & Location Finder",
  seoDescription:
    "Find your public IP address, ISP, city, country and time zone in one click. Look up any IPv4 or IPv6 address and check whether your VPN is working. Free and private.",
  article: [
    {
      heading: "What your IP address actually tells people",
      paragraphs: [
        "Every device that talks to the internet needs an address, so replies know where to go. Your IP address is the label your internet provider hands to your connection. It isn't your name and it isn't your street address, but it isn't nothing either. It points to a provider and to a rough area, and websites see it every time you load a page.",
        "This tool shows you exactly what the rest of the internet sees. Open the page and it detects your public IP, then fills in the details a lookup service can work out: the network owner (your ISP), the city and region, the postal area, the country, the time zone and the approximate coordinates.",
      ],
    },
    {
      heading: "How to read the results",
      paragraphs: [
        "The big number at the top is your public IP. If it contains dots, like 203.0.113.42, it's IPv4. If it contains colons and letters, it's IPv6. Many connections now have both, and the tool shows whichever your browser prefers.",
        "The ISP or organization line tells you who owns the network block. At home that's usually your broadband provider. At the office it might be your company, and on a phone it's your mobile carrier. The ASN is the number that network is registered under, which is handy when you're debugging routing problems or reading a firewall log.",
        "Location is the part people misread most. IP geolocation is built from registry data and measurements, so it's good at the country level, usually decent for the region, and often off by tens of miles at the city level. Mobile carriers and some providers route traffic through hubs far from you, so a result in the next state over is normal. Nobody can find your house from an IP alone.",
      ],
    },
    {
      heading: "Quick ways to use it",
      paragraphs: [
        "Checking a VPN is the most popular use. Run the tool before you connect and again afterwards. The IP, ISP and country should all change. If the location still shows your real city, the VPN isn't covering that traffic. The tool also compares the time zone of the IP with the one your browser reports and flags a mismatch, which is a common sign that a VPN or proxy is active.",
        "Developers and IT admins use it to find the address to allowlist for a server, a database or a staging environment. Remote workers use it to confirm which office or home connection they're on. Gamers use it to see which region their traffic appears to come from.",
        "You can also type any public IPv4 or IPv6 address into the lookup box, for example one you found in an email header or a server log, and see who owns it and where it roughly sits. Private addresses such as 192.168.x.x or 10.x.x.x have no public location, so the tool tells you that instead of returning nonsense.",
      ],
    },
    {
      heading: "A note on privacy",
      paragraphs: [
        "Looking up an IP requires asking a geolocation service, and that service necessarily sees the address it's asked about. This page makes the request straight from your browser to the provider, with no cookies sent and no referrer. We don't run a server that stores your address, and nothing is logged on our side. If you'd rather not show your IP on screen while recording or sharing, use the hide button to blur it.",
        "If the primary provider is busy, the tool automatically tries a backup, and as a last resort it can still show just your IP address. Results are copied or downloaded on demand, and nothing is saved unless you save it.",
      ],
    },
  ],
  faqs: [
    {
      question: "What is my IP address?",
      answer:
        "It's the public address your internet provider assigns to your connection. The number at the top of this page is the one websites see when you visit them. It can change when you restart your router, switch networks or turn a VPN on.",
    },
    {
      question: "How accurate is IP location?",
      answer:
        "Country is usually right, the region is often right, and the city can be off by many miles. Mobile networks and some providers route traffic through distant hubs. IP lookup can't reveal your exact street address.",
    },
    {
      question: "What is the difference between IPv4 and IPv6?",
      answer:
        "IPv4 addresses look like 198.51.100.7 and the world is running out of them. IPv6 addresses are much longer, like 2001:db8::1, and were created to provide a practically unlimited supply. Many connections use both.",
    },
    {
      question: "Why does my IP address show a different city from where I live?",
      answer:
        "Providers register address blocks to regional hubs, and geolocation databases guess from that data. If you're on mobile data, a VPN or a corporate network, the gap can be larger still.",
    },
    {
      question: "How can I tell if my VPN is working?",
      answer:
        "Check your IP before connecting and again after. The IP, ISP and country should all change. If they stay the same, or the tool warns about a time zone mismatch in the wrong direction, review your VPN settings and look for DNS or IPv6 leaks.",
    },
    {
      question: "Can I look up someone else's IP address?",
      answer:
        "Yes. Type any public IPv4 or IPv6 address into the lookup box to see its network owner and approximate location. Private ranges like 192.168.x.x have no public location.",
    },
    {
      question: "Does this tool store or sell my IP address?",
      answer:
        "No. We don't operate a server that receives your address, and nothing is stored on our side. Your browser contacts the lookup provider directly, and that provider necessarily sees the address it is asked about. Use the hide button if you're sharing your screen.",
    },
    {
      question: "Why is the lookup not loading?",
      answer:
        "Some ad blockers, privacy extensions and corporate firewalls block geolocation services. Try pausing the blocker for this page, using another network, or press Retry. The tool falls back to backup providers automatically.",
    },
  ],
};

export default ipLookupTool;
