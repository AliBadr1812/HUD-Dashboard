// NewsAPI types (https://newsapi.org)
// Used by the ARIA agent's news_headlines tool.

export interface NewsAPISource {
  id: string | null;
  name: string;
}

export interface NewsAPIArticle {
  source: NewsAPISource;
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

export interface NewsAPIResponse {
  status: "ok" | "error";
  totalResults: number;
  articles: NewsAPIArticle[];
  // present on error responses
  code?: string;
  message?: string;
}
