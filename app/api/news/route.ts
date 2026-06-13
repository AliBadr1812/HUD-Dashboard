import { XMLParser } from "fast-xml-parser";

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "JUST NOW";
  if (mins < 60) return `${mins} MIN AGO`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs === 1 ? "1 HR AGO" : `${hrs} HRS AGO`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "1 DAY AGO" : `${days} DAYS AGO`;
}

function guessCategory(title: string, categories: string | string[]): string {
  const text = (
    (Array.isArray(categories) ? categories.join(" ") : categories ?? "") +
    " " +
    title
  ).toLowerCase();
  if (text.includes("sport") || text.includes("football") || text.includes("olympic")) return "SPORT";
  if (text.includes("tech") || text.includes("ai ") || text.includes("cyber") || text.includes("digital")) return "TECH";
  if (text.includes("climat") || text.includes("environment") || text.includes("flood") || text.includes("fire")) return "CLIMATE";
  if (text.includes("econom") || text.includes("market") || text.includes("trade") || text.includes("bank")) return "ECONOMY";
  if (text.includes("science") || text.includes("research") || text.includes("study")) return "SCIENCE";
  if (text.includes("politic") || text.includes("election") || text.includes("parliament") || text.includes("government")) return "POLITICS";
  return "WORLD";
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#\d+;/g, "").trim();
}

function extractImage(item: any): string | null {
  // media:content url attribute
  const mc = item["media:content"];
  if (mc) {
    const arr = Array.isArray(mc) ? mc : [mc];
    for (const m of arr) {
      const url = m?.["@_url"];
      if (url && typeof url === "string") return url;
    }
  }
  // enclosure
  const enc = item["enclosure"];
  if (enc?.["@_url"]) return enc["@_url"];
  // image inside description
  const desc = item.description ?? "";
  const imgMatch = String(desc).match(/src="([^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);
  if (imgMatch) return imgMatch[1];
  return null;
}

export async function GET() {
  const res = await fetch("https://www.aljazeera.com/xml/rss/all.xml", {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; HUDDashboard/1.0)" },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    return Response.json({ error: "Failed to fetch Al Jazeera RSS" }, { status: 502 });
  }

  const xml = await res.text();
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    isArray: (name) => name === "item",
  });
  const result = parser.parse(xml);
  const items = result?.rss?.channel?.item ?? [];

  const headlines = items.slice(0, 12).map((item: any, i: number) => {
    const title = String(item.title ?? "").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
    const rawDesc = String(item.description ?? "");
    const description = stripHtml(rawDesc).slice(0, 400) || null;
    return {
      id: i + 1,
      headline: title,
      category: guessCategory(title, item.category ?? ""),
      time: relativeTime(item.pubDate ?? ""),
      pubDate: item.pubDate ?? null,
      link: item.link ?? null,
      description,
      image: extractImage(item),
    };
  });

  return Response.json({ headlines });
}
