export const dynamic = "force-static";

export function GET() {
  const raw = process.env.ADS_TXT_CONTENT?.replace(/\\n/g, "\n").trim();
  const body = raw ? `${raw}\n` : "# ads.txt: set ADS_TXT_CONTENT in your environment with the line(s) from your Adsterra dashboard.\n";
  
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
