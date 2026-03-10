import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage?: string;
  publishedDate: string;
  modifiedDate?: string;
  authorName?: string;
  tags?: string[];
}

export function SEOHead({
  title,
  description,
  canonicalUrl,
  ogImage = "https://valuetempo.lovable.app/ValueTempo_Logo.png",
  publishedDate,
  modifiedDate,
  authorName = "ValueTempo",
  tags = [],
}: SEOHeadProps) {
  useEffect(() => {
    // Title
    document.title = `${title} | ValueTempo`;

    // Helper to set or create a meta tag
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    // Meta description
    setMeta("name", "description", description);

    // Open Graph
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", "article");
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:image", ogImage);
    setMeta("property", "og:site_name", "ValueTempo");
    setMeta("property", "article:published_time", publishedDate);
    if (modifiedDate) {
      setMeta("property", "article:modified_time", modifiedDate);
    }
    setMeta("property", "article:author", authorName);
    tags.forEach((tag, i) => {
      setMeta("property", `article:tag:${i}`, tag);
    });

    // Twitter Card
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

    // JSON-LD Article structured data
    const jsonLdId = "seo-json-ld-article";
    let script = document.getElementById(jsonLdId) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = jsonLdId;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description,
      image: ogImage,
      datePublished: publishedDate,
      ...(modifiedDate && { dateModified: modifiedDate }),
      author: {
        "@type": "Organization",
        name: authorName,
        url: "https://valuetempo.lovable.app",
      },
      publisher: {
        "@type": "Organization",
        name: "ValueTempo",
        url: "https://valuetempo.lovable.app",
        logo: {
          "@type": "ImageObject",
          url: "https://valuetempo.lovable.app/lovable-uploads/87678626-e604-46ee-90b6-9ab9b6380322.png",
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonicalUrl,
      },
      keywords: tags.join(", "),
    });

    // Cleanup
    return () => {
      const scriptEl = document.getElementById(jsonLdId);
      if (scriptEl) scriptEl.remove();
    };
  }, [title, description, canonicalUrl, ogImage, publishedDate, modifiedDate, authorName, tags]);

  return null;
}
