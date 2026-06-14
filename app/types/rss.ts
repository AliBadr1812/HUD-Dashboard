// RSS feed item shape after fast-xml-parser parses it
// Covers standard RSS 2.0 fields plus media:content and enclosure extensions.

export interface RssMediaContent {
  "@_url"?: string;
  "@_type"?: string;
  "@_width"?: string;
  "@_height"?: string;
}

export interface RssEnclosure {
  "@_url": string;
  "@_type"?: string;
  "@_length"?: string;
}

export interface RssItem {
  title?: string;
  link?: string;
  description?: string;
  pubDate?: string;
  category?: string | string[];
  guid?: string | { "#text"?: string };
  "media:content"?: RssMediaContent | RssMediaContent[];
  enclosure?: RssEnclosure;
}

// CalDAV XML component element shape after fast-xml-parser
export interface XmlCalendarComponent {
  "@_name"?: string;
}
