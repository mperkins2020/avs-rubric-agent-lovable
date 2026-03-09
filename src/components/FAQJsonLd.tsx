import { useEffect } from "react";

interface FAQJsonLdItem {
  question: string;
  answer: string;
}

interface FAQJsonLdProps {
  faqs: FAQJsonLdItem[];
}

/**
 * Injects FAQPage JSON-LD structured data into the document head.
 * Pass plain-text question/answer pairs (strip JSX before passing).
 */
export function FAQJsonLd({ faqs }: FAQJsonLdProps) {
  useEffect(() => {
    const id = "seo-json-ld-faqpage";
    let script = document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = id;
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }

    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    });

    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, [faqs]);

  return null;
}
