import type { MetadataRoute } from "next";
import { siteConfig } from "../lib/site-config";

export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/pricing", "/support", "/privacy", "/delete-account", "/terms"].map((p) => ({ url: `${siteConfig.url}${p}`, changeFrequency: "monthly", priority: p ? 0.3 : 1 }));
}
