import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage?: string;
  publishedDate?: string;
  modifiedDate?: string;
  authorName?: string;
  tags?: string[];
  /** Page type. 'website' avoids Article schema (use for home, FAQ, etc.). Default 'article'. */
  type?: "article" | "website";
}

const SITE_URL = "https://app.valuetempo.com";

export function SEOHead({
  title,
  description,
  canonicalUrl,
  ogImage = `${SITE_URL}/og-image.png`,
  publishedDate,
  modifiedDate,
  authorName = "ValueTempo",
  tags = [],
  type = "article",
}: SEOHeadProps) {
  useEffect(() => {
    // Title — no suffix; pages own their full title
    document.title = title;

    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", description);

    // Open Graph
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", type);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:image", ogImage);
    setMeta("property", "og:site_name", "ValueTempo");

    // Article-only tags
    const removeMeta = (attr: string, key: string) => {
      const el = document.querySelector(`meta[${attr}="${key}"]`);
      if (el) el.remove();
    };

    if (type === "article") {
      if (publishedDate) setMeta("property", "article:published_time", publishedDate);
      if (modifiedDate) setMeta("property", "article:modified_time", modifiedDate);
      setMeta("property", "article:author", authorName);
      tags.forEach((tag, i) => setMeta("property", `article:tag:${i}`, tag));
    } else {
      removeMeta("property", "article:published_time");
      removeMeta("property", "article:modified_time");
      removeMeta("property", "article:author");
    }

    // Twitter
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", ogImage);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    // JSON-LD — Article for posts; WebSite for non-article pages
    const jsonLdId = "seo-json-ld-article";
    let script = document.getElementById(jsonLdId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = jsonLdId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }

    if (type === "article") {
      script.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description,
        image: ogImage,
        ...(publishedDate && { datePublished: publishedDate }),
        ...(modifiedDate && { dateModified: modifiedDate }),
        author: { "@type": "Organization", name: authorName, url: SITE_URL },
        publisher: {
          "@type": "Organization",
          name: "ValueTempo",
          url: SITE_URL,
          logo: { "@type": "ImageObject", url: `${SITE_URL}/ValueTempo_Logo.png` },
        },
        mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
        keywords: tags.join(", "),
      });
    } else {
      script.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "ValueTempo",
        url: SITE_URL,
        description,
      });
    }

    return () => {
      const scriptEl = document.getElementById(jsonLdId);
      if (scriptEl) scriptEl.remove();
    };
  }, [title, description, canonicalUrl, ogImage, publishedDate, modifiedDate, authorName, tags, type]);

  return null;
}
