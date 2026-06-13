"use client";

import { useEffect, useRef, useState } from "react";
import { Newspaper, ArrowUpRight, ExternalLink } from "lucide-react";
import HudPanel from "./HudPanel";
import HudModal from "./HudModal";

type Headline = {
  id: number;
  headline: string;
  category: string;
  time: string;
  pubDate: string | null;
  link: string | null;
  description: string | null;
  image: string | null;
};

type OpenArticle = {
  key: number;
  article: Headline;
  isOpen: boolean;
};

const MOCK: Headline[] = [
  { id: 1, category: "WORLD", headline: "UN Security Council convenes emergency session on escalating Middle East tensions", time: "2 MIN AGO", pubDate: null, link: null, description: null, image: null },
  { id: 2, category: "POLITICS", headline: "European Parliament adopts sweeping AI regulation framework ahead of 2027 implementation", time: "14 MIN AGO", pubDate: null, link: null, description: null, image: null },
  { id: 3, category: "CLIMATE", headline: "Record ocean temperatures reported across three continents as scientists warn of accelerating feedback loops", time: "31 MIN AGO", pubDate: null, link: null, description: null, image: null },
  { id: 4, category: "ECONOMY", headline: "Global markets stabilize after volatile week; energy sector leads recovery amid supply concerns", time: "45 MIN AGO", pubDate: null, link: null, description: null, image: null },
  { id: 5, category: "TECH", headline: "Major data breach affects 80 million users across financial platforms in Southeast Asia", time: "1 HR AGO", pubDate: null, link: null, description: null, image: null },
  { id: 6, category: "SCIENCE", headline: "Researchers announce breakthrough in room-temperature superconductor research at 30°C", time: "2 HRS AGO", pubDate: null, link: null, description: null, image: null },
];

const categoryColor: Record<string, string> = {
  WORLD: "text-cyan-300",
  POLITICS: "text-cyan-400",
  CLIMATE: "text-emerald-400",
  ECONOMY: "text-cyan-300",
  TECH: "text-sky-400",
  SCIENCE: "text-cyan-400",
  SPORT: "text-cyan-300",
};

function ArticleContent({ article }: { article: Headline }) {
  return (
    <div className="space-y-3">
      {article.image && (
        <div className="w-full overflow-hidden border border-cyan-500/15" style={{ maxHeight: "200px" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={article.image} alt={article.headline} className="w-full object-cover" style={{ maxHeight: "200px" }} />
        </div>
      )}
      <div className="flex items-center gap-2">
        <span className={`text-[8px] tracking-[0.25em] font-bold uppercase ${categoryColor[article.category] ?? "text-cyan-400"}`}>
          {article.category}
        </span>
        <span className="text-[8px] text-cyan-400/25 tracking-widest">{article.time}</span>
      </div>
      <p className="text-[11px] text-white/90 leading-relaxed font-medium">{article.headline}</p>
      {article.description ? (
        <p className="text-[10px] text-cyan-400/50 leading-relaxed border-t border-cyan-500/10 pt-3">{article.description}</p>
      ) : (
        <p className="text-[9px] text-cyan-400/25 tracking-wider border-t border-cyan-500/10 pt-3">
          Full article text not available in RSS feed.
        </p>
      )}
      {article.link && (
        <a
          href={article.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[9px] text-cyan-400/50 hover:text-cyan-300 tracking-widest uppercase transition-colors pt-1"
        >
          <ExternalLink size={10} />
          Read full article on Al Jazeera
        </a>
      )}
    </div>
  );
}

export default function News() {
  const [headlines, setHeadlines] = useState<Headline[]>(MOCK);
  const [live, setLive] = useState(false);
  const [expandOpen, setExpandOpen] = useState(false);
  const [feedFilter, setFeedFilter] = useState("ALL");
  const [openArticles, setOpenArticles] = useState<OpenArticle[]>([]);
  const keyRef = useRef(0);

  useEffect(() => {
    const load = () => {
      fetch("/api/news")
        .then((r) => r.json())
        .then((json) => {
          if (json.headlines?.length) {
            setHeadlines(json.headlines);
            setLive(true);
          }
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  const openArticle = (article: Headline) => {
    const key = keyRef.current++;
    setOpenArticles((prev) => [...prev, { key, article, isOpen: true }]);
  };

  const closeArticle = (key: number) => {
    // Set isOpen=false so HudModal animates out and decrements _openCount
    setOpenArticles((prev) => prev.map((a) => a.key === key ? { ...a, isOpen: false } : a));
    // Remove from list after animation completes
    setTimeout(() => {
      setOpenArticles((prev) => prev.filter((a) => a.key !== key));
    }, 250);
  };

  const actions = (
    <button onClick={() => setExpandOpen(true)} className="text-cyan-400/30 hover:text-cyan-300 transition-colors p-0.5">
      <ArrowUpRight size={11} />
    </button>
  );

  return (
    <>
      {openArticles.map(({ key, article, isOpen }) => (
        <HudModal
          key={key}
          isOpen={isOpen}
          onClose={() => closeArticle(key)}
          title={`${article.category} // AL JAZEERA`}
          width="480px"
        >
          <ArticleContent article={article} />
        </HudModal>
      ))}

      <HudModal isOpen={expandOpen} onClose={() => setExpandOpen(false)} title="AL JAZEERA — FULL FEED" width="520px">
        <div className="-m-4">
          {/* Category filter */}
          <div className="flex flex-wrap gap-1 px-4 py-2.5 border-b border-cyan-500/10">
            {["ALL", ...Array.from(new Set(headlines.map(h => h.category)))].map(cat => (
              <button
                key={cat}
                onClick={() => setFeedFilter(cat)}
                className={`text-[7px] px-2 py-0.5 tracking-widest uppercase transition-colors border ${
                  feedFilter === cat
                    ? "border-cyan-400/50 text-cyan-300 bg-cyan-500/10"
                    : "border-cyan-500/15 text-cyan-400/30 hover:text-cyan-400/60"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="overflow-y-auto divide-y divide-cyan-500/10" style={{ maxHeight: "60vh" }}>
            {headlines
              .filter(h => feedFilter === "ALL" || h.category === feedFilter)
              .map(item => (
                <button
                  key={item.id}
                  onClick={() => { setExpandOpen(false); openArticle(item); }}
                  className="w-full text-left px-4 py-3 hover:bg-cyan-500/5 transition-colors group"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[8px] tracking-[0.2em] font-bold ${categoryColor[item.category] ?? "text-cyan-400"}`}>{item.category}</span>
                    <span className="text-[8px] text-cyan-400/25 tracking-widest">{item.time}</span>
                  </div>
                  <p className="text-[11px] text-white/70 leading-relaxed group-hover:text-white/90 transition-colors">{item.headline}</p>
                  {item.description && (
                    <p className="text-[9px] text-cyan-400/35 mt-1 leading-relaxed line-clamp-2">{item.description}</p>
                  )}
                </button>
              ))}
          </div>
        </div>
      </HudModal>

      <HudPanel title="AL JAZEERA // LIVE FEED" icon={<Newspaper size={10} />} className="h-full" actions={actions}>
        <div className="flex justify-between items-center mb-3 -mt-1">
          <span />
          {live && <span className="text-[8px] text-cyan-400/30 tracking-widest uppercase">LIVE</span>}
        </div>
        <div className="divide-y divide-cyan-500/10">
          {headlines.map((item) => (
            <button
              key={item.id}
              onClick={() => openArticle(item)}
              className="w-full text-left py-3 first:pt-0 hover:bg-cyan-500/5 -mx-1 px-1 transition-colors group"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[9px] tracking-[0.2em] font-bold ${categoryColor[item.category] ?? "text-cyan-400"}`}>
                  {item.category}
                </span>
                <span className="text-[9px] text-cyan-400/25 tracking-widest">{item.time}</span>
              </div>
              <p className="text-xs text-white/75 leading-relaxed group-hover:text-white/90 transition-colors">
                {item.headline}
              </p>
            </button>
          ))}
        </div>
      </HudPanel>
    </>
  );
}
