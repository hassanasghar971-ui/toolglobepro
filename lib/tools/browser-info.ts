export const browserInfoTool = {
  slug: "browser-info",
  name: "Browser Info",
  h1: "What Is My Browser? Browser, Screen and Device Info",
  tagline:
    "See your browser, operating system, screen size, language, time zone and supported features in one page. Copy or download the result. Free and private.",
  metaTitle: "What Is My Browser - Browser, Screen & Device Info",
  metaDescription:
    "Free browser info checker. See your browser and version, OS, screen resolution, window size, language, time zone and supported features. Runs in your browser.",
  category: "web-utility-tools",
  icon: "globe",
  keywords: [
    "what is my browser",
    "browser info",
    "check browser version",
    "what is my screen resolution",
    "screen size checker",
    "user agent checker",
    "browser feature test",
    "my device info",
  ],
  intro:
    "When you ask a developer for help, or fill in a bug report, the first questions are always the same: which browser, which version, which device, which screen size? This page answers all of them in one click. It reads the information your browser already shares with every website and shows it in plain language: browser and operating system, screen and window size, pixel ratio, language, time zone, connection details and a list of modern features your browser supports. You can copy everything as text or JSON and paste it straight into an email or a support ticket.",
  howTo: [
    "Open the page. The results appear at once, with a short summary at the top.",
    "Read the sections below the summary for screen and window size, device details, graphics and supported features.",
    "Resize your browser window or rotate your phone and watch the window size update live.",
    "Use Copy as text or Copy as JSON to paste the details into a bug report, or Download JSON to keep a file.",
    "Press Refresh if you changed a setting, such as switching on dark mode or going offline, and want to read the values again.",
  ],
  sections: [
    {
      heading: "What this page can and cannot tell you",
      paragraphs: [
        "Everything shown here comes from standard browser features that every website is allowed to read, such as the user agent string, the screen object, the language settings and a few media queries. Nothing is uploaded. The page collects the values on your device and displays them to you.",
        "It does not show your IP address, because a browser cannot know its own public IP without asking a server. If you need that, use the IP Lookup tool on this site. It also cannot see your name, your files or your browsing history.",
      ],
    },
    {
      heading: "Why some values look rounded or generic",
      paragraphs: [
        "Browsers have been reducing the detail they share to protect privacy. Chrome and Safari freeze the version numbers inside the user agent, so Windows 10 and Windows 11 both appear as Windows 10 or 11, and every Mac reports the same macOS version. Device memory is rounded and capped, and some browsers hide the exact graphics card name. Privacy extensions and the browser built-in protections can change the results further.",
        "This is why the tool says estimate where a value is not exact. If a developer asks for your precise operating system version, check the settings of your device rather than relying only on what a web page can read.",
      ],
    },
    {
      heading: "Screen size, window size and pixel ratio",
      paragraphs: [
        "Screen size is the full size of your display in CSS pixels. Window size, also called the viewport, is the area that a web page can actually use, and it changes when you resize the window or rotate a phone. The pixel ratio tells you how many physical pixels are used for each CSS pixel, which is why a phone with a 390 pixel wide viewport can still have a very sharp picture.",
        "Web designers use these numbers to test layouts at different breakpoints, and support teams use them to reproduce a layout problem that only appears on one screen size.",
      ],
    },
    {
      heading: "The feature list",
      paragraphs: [
        "The feature section checks whether your browser supports technologies such as Web Workers, WebAssembly, OffscreenCanvas, the Clipboard API, WebGPU and the File System Access API. Many tools on this site rely on Web Workers and streams to process large files in your browser, so this list is also a quick way to see why a tool behaves differently on an older browser.",
      ],
    },
  ],
  faqs: [
    {
      q: "How do I find out which browser and version I am using?",
      a: "Open this page. The summary at the top shows your browser name and version, your operating system and your device type. For a precise version number you can also check the About page in your browser menu.",
    },
    {
      q: "Why does it say Windows 10 or 11 instead of one version?",
      a: "Modern browsers send the same version token for both systems, so a web page cannot tell them apart. The same is true for the macOS version, which browsers report as a frozen number.",
    },
    {
      q: "What is my screen resolution?",
      a: "The Screen size row shows your display in CSS pixels, and the Physical pixels row multiplies it by the pixel ratio for an estimate of the real resolution. The window size row shows the space available to the page right now.",
    },
    {
      q: "Does this page show my IP address or location?",
      a: "No. A browser cannot read its public IP address without contacting a server, and this page does not ask for your location. Use the IP Lookup tool if you need your IP details.",
    },
    {
      q: "Why are some rows marked Not available or Not supported?",
      a: "Different browsers support different features. For example, the connection speed estimate and the device memory value only exist in Chromium based browsers. Not available means your browser does not share that value.",
    },
    {
      q: "Is any of this information sent to a server?",
      a: "No. The values are read in your browser and shown on the page. Copy and download buttons work locally, and nothing is stored or uploaded.",
    },
  ],
  features: [
    "Browser, version, operating system and device type",
    "Screen size, live window size and pixel ratio",
    "Language, time zone and UTC offset",
    "Connection and storage estimates where supported",
    "Graphics renderer through WebGL",
    "Support check for 16 modern browser features",
    "Copy as text or JSON, or download a JSON file",
    "Private: values are read on your device only",
  ],
  schemaType: "WebApplication",
  related: ["ip-lookup", "timestamp-converter"],
  datePublished: "2026-11-27",
  dateModified: "2026-11-27",
};

export default browserInfoTool;
