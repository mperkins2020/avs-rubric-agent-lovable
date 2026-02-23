import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { CompanyProfile, RubricScore, ObservabilityData } from '@/types/rubric';

// ── Mock jsPDF ──────────────────────────────────────────────────────────────
const mockSave = vi.fn();
const mockDocInstance = {
  internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
  setFontSize: vi.fn(),
  setTextColor: vi.fn(),
  setFillColor: vi.fn(),
  text: vi.fn(),
  roundedRect: vi.fn(),
  splitTextToSize: vi.fn((text: string) => [text]),
  addPage: vi.fn(),
  setPage: vi.fn(),
  getNumberOfPages: vi.fn(() => 1),
  save: mockSave,
  lastAutoTable: { finalY: 50 },
};

vi.mock('jspdf', () => {
  // Must use a regular function (not arrow) so `new jsPDF()` works as a constructor
  const MockjsPDF = function () { return mockDocInstance; };
  return { default: MockjsPDF, jsPDF: MockjsPDF };
});

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────
const mockCompanyProfile: CompanyProfile = {
  companyName: 'Acme Corp',
  oneLineDescription: 'AI workflow automation',
  missionOrPositioning: 'Work smarter',
  primaryUsers: 'Operations teams',
  economicBuyerGuess: 'VP Ops',
  icpGuess: ['Mid-market'],
  keyWorkflows: ['Automation'],
  productSurface: 'both',
  pricingModelGuess: 'usage',
  valueUnitGuess: 'workflow runs',
  packagingNotes: 'Three tiers',
  trustControlsSeen: ['Admin dashboard'],
  indicatorsSeen: ['Analytics'],
};

const mockRubricScore: RubricScore = {
  totalScore: 10,
  maxScore: 16,
  band: 'Emerging',
  dimensionScores: [
    {
      dimension: 'Product north star',
      score: 1,
      confidence: 0.7,
      notObservable: false,
      rationale: 'Some evidence found.',
      observed: ['Blog mentions OKRs'],
      uncertaintyReasons: [],
    },
  ],
  strengths: [
    {
      dimension: 'Value unit',
      whyItIsStrong: 'Clear pricing unit',
      whatItEnables: 'Transparent billing',
      evidence: [],
    },
  ],
  weaknesses: [
    {
      dimension: 'Safety rails',
      whatIsMissingOrUnclear: 'No spend caps visible',
      whyItMatters: 'Billing anxiety',
      whatToVerifyNext: 'Check billing portal',
      evidence: [],
    },
  ],
  trustBreakpoints: [],
  recommendedFocus: {
    focusArea: 'Safety rails',
    why: 'Biggest gap',
    firstTwoActions: ['Add budget caps', 'Document controls'],
    whatToMeasure: 'Support tickets reduction',
  },
};

const mockObservability: ObservabilityData = {
  level: 'Partial',
  confidenceScore: 60,
  pagesUsed: ['Home', 'Pricing'],
  mostUncertainDimensions: [],
};

// ── Tests ────────────────────────────────────────────────────────────────────
describe('exportToPDF()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not throw with valid ExportData', async () => {
    const { exportToPDF } = await import('./pdfExport');
    expect(() =>
      exportToPDF({
        companyProfile: mockCompanyProfile,
        rubricScore: mockRubricScore,
        observability: mockObservability,
      })
    ).not.toThrow();
  });

  it('calls doc.save() exactly once', async () => {
    const { exportToPDF } = await import('./pdfExport');
    exportToPDF({
      companyProfile: mockCompanyProfile,
      rubricScore: mockRubricScore,
      observability: mockObservability,
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  it('saves with a filename derived from the company name', async () => {
    const { exportToPDF } = await import('./pdfExport');
    exportToPDF({
      companyProfile: mockCompanyProfile,
      rubricScore: mockRubricScore,
      observability: mockObservability,
    });
    const filename: string = mockSave.mock.calls[0][0];
    expect(filename).toMatch(/acme_corp/);
    expect(filename).toMatch(/\.pdf$/);
  });

  it('sanitizes company name — spaces become underscores, lowercase', async () => {
    const { exportToPDF } = await import('./pdfExport');
    exportToPDF({
      companyProfile: { ...mockCompanyProfile, companyName: 'My Big Company' },
      rubricScore: mockRubricScore,
      observability: mockObservability,
    });
    const filename: string = mockSave.mock.calls[0][0];
    expect(filename).toContain('my_big_company');
  });

  it('sanitizes company name — special characters replaced with underscores', async () => {
    const { exportToPDF } = await import('./pdfExport');
    exportToPDF({
      companyProfile: { ...mockCompanyProfile, companyName: 'Acme & Co.' },
      rubricScore: mockRubricScore,
      observability: mockObservability,
    });
    const filename: string = mockSave.mock.calls[0][0];
    // Extract just the name stem before .pdf and verify no special chars remain
    const stem = filename.replace(/_avs_rubric_report\.pdf$/, '');
    expect(stem).not.toMatch(/[&.]/);
    expect(stem).toMatch(/^[a-z0-9_]+$/);
  });
});
