import type { ScrapedPage } from "@/lib/api/scraper";
import type { CompanyProfile, ModelClassification, ObservabilityData, RubricScore } from "@/types/rubric";

export interface LastReportState {
  companyProfile: CompanyProfile;
  rubricScore: RubricScore;
  observability: ObservabilityData;
  modelClassification?: ModelClassification | null;
  pages: ScrapedPage[];
  autoDownloadPdf?: boolean;
}

const LAST_REPORT_KEY = "lastReport";

const compactPages = (pages: ScrapedPage[] = []): ScrapedPage[] =>
  pages.map((page) => ({
    url: page.url,
    title: page.title,
    markdown: "",
    metadata: page.metadata,
  }));

export function saveLastReport(report: LastReportState) {
  try {
    sessionStorage.setItem(
      LAST_REPORT_KEY,
      JSON.stringify({
        ...report,
        pages: compactPages(report.pages),
      }),
    );
  } catch {
    // sessionStorage unavailable or quota exceeded — non-fatal
  }
}

export function getLastReport(): LastReportState | null {
  try {
    const stored = sessionStorage.getItem(LAST_REPORT_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as Partial<LastReportState>;
    if (!parsed.companyProfile || !parsed.rubricScore || !parsed.observability) {
      return null;
    }

    return {
      companyProfile: parsed.companyProfile,
      rubricScore: parsed.rubricScore,
      observability: parsed.observability,
      modelClassification: parsed.modelClassification ?? null,
      pages: Array.isArray(parsed.pages) ? parsed.pages : [],
      autoDownloadPdf: parsed.autoDownloadPdf,
    };
  } catch {
    return null;
  }
}