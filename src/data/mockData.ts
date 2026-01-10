import type { ScanResult, CompanyProfile, RubricScore, ObservabilityData, ChatMessage } from "@/types/rubric";

// Mock company profile
export const mockCompanyProfile: CompanyProfile = {
  companyName: "Acme SaaS",
  oneLineDescription: "AI-powered workflow automation platform for enterprise teams",
  missionOrPositioning: "Helping teams work smarter with intelligent automation",
  primaryUsers: "Operations teams, IT administrators, Business analysts",
  economicBuyerGuess: "VP of Operations or CTO",
  icpGuess: ["Mid-market enterprises (500-5000 employees)", "Tech-forward companies"],
  keyWorkflows: [
    "Workflow automation",
    "Data integration",
    "Process monitoring",
    "Team collaboration",
    "Analytics & reporting",
  ],
  productSurface: "both",
  pricingModelGuess: "hybrid",
  valueUnitGuess: "workflow runs",
  packagingNotes: "Three tiers: Starter, Pro, Enterprise with usage-based overages",
  trustControlsSeen: ["Usage dashboards", "Admin controls"],
  indicatorsSeen: ["Analytics dashboard", "SLA documentation"],
};

// Mock rubric scores
export const mockRubricScore: RubricScore = {
  totalScore: 12,
  maxScore: 20,
  band: "Emerging",
  dimensionScores: [
    {
      dimension: "90-day north star",
      score: 1,
      confidence: 0.6,
      notObservable: false,
      rationale: "Company shows general growth focus but specific 90-day goals are not publicly documented.",
      observed: ["Blog posts mention quarterly OKRs", "Product roadmap page exists"],
      uncertaintyReasons: ["No public commitment to specific metrics"],
    },
    {
      dimension: "ICP and job clarity",
      score: 2,
      confidence: 0.85,
      notObservable: false,
      rationale: "Clear targeting of mid-market enterprises with specific use cases documented.",
      observed: [
        "Dedicated solutions pages for Operations and IT",
        "Case studies with specific company profiles",
        "Clear buyer journey documentation",
      ],
      uncertaintyReasons: [],
    },
    {
      dimension: "Buyer and budget alignment",
      score: 1,
      confidence: 0.55,
      notObservable: false,
      rationale: "Pricing page exists but budget alignment and ROI tools are limited.",
      observed: ["Pricing page with tier comparison", "ROI calculator mentioned in sales materials"],
      uncertaintyReasons: [
        "ROI calculator not publicly accessible",
        "No clear budget guidance for different company sizes",
      ],
    },
    {
      dimension: "Value units",
      score: 2,
      confidence: 0.8,
      notObservable: false,
      rationale: "Clear value unit (workflow runs) tied to customer outcomes.",
      observed: [
        "Pricing based on workflow runs",
        "Documentation explains what counts as a workflow run",
        "Usage shown in real-time",
      ],
      uncertaintyReasons: [],
    },
    {
      dimension: "Cost driver mapping",
      score: 1,
      confidence: 0.4,
      notObservable: false,
      rationale: "Some cost information available but detailed cost driver mapping is sparse.",
      observed: ["General infrastructure costs mentioned in docs"],
      uncertaintyReasons: [
        "No public cost breakdown per workflow type",
        "Pricing page not found publicly",
      ],
    },
    {
      dimension: "Pools and packaging",
      score: 1,
      confidence: 0.65,
      notObservable: false,
      rationale: "Basic tiered packaging exists but pool/credit mechanics are unclear.",
      observed: ["Three-tier pricing model", "Enterprise custom plans mentioned"],
      uncertaintyReasons: ["Credit rollover policy not documented", "Pool sharing mechanics unclear"],
    },
    {
      dimension: "Overages and risk allocation",
      score: 0,
      confidence: 0.3,
      notObservable: false,
      rationale: "No clear documentation on overage handling or risk allocation.",
      observed: ["Terms of service mentions overages"],
      uncertaintyReasons: [
        "Overage rates not publicly listed",
        "Risk allocation between vendor and customer unclear",
        "No public SLA with financial guarantees",
      ],
    },
    {
      dimension: "Safety rails and trust surfaces",
      score: 1,
      confidence: 0.5,
      notObservable: false,
      rationale: "Basic usage controls exist but comprehensive safety rails are not visible.",
      observed: ["Admin dashboard with usage limits", "Alert notifications mentioned"],
      uncertaintyReasons: [
        "Budget caps not clearly documented",
        "Real-time spend controls not visible",
        "Trust/security documentation not found publicly",
      ],
    },
    {
      dimension: "Rating agility and governance",
      score: 1,
      confidence: 0.2,
      notObservable: true,
      rationale: "Unable to observe pricing governance or change processes publicly.",
      observed: [],
      uncertaintyReasons: [
        "This dimension is rarely observable publicly without technical or billing docs",
        "No public pricing change policy",
      ],
    },
    {
      dimension: "Measurement and cadence",
      score: 2,
      confidence: 0.75,
      notObservable: false,
      rationale: "Good measurement infrastructure visible with clear reporting cadence.",
      observed: [
        "Real-time analytics dashboard",
        "Monthly usage reports mentioned",
        "API for programmatic access to metrics",
      ],
      uncertaintyReasons: ["Historical trend analysis capabilities unclear"],
    },
  ],
  strengths: [
    {
      dimension: "ICP and job clarity",
      whyItIsStrong: "Clear segmentation and targeting of mid-market enterprises with dedicated solution pages",
      whatItEnables: "Focused sales motion and relevant messaging that resonates with target buyers",
      evidence: [
        { url: "https://acme.com/solutions/operations", quote: "Purpose-built for operations teams at growing companies" },
      ],
    },
    {
      dimension: "Value units",
      whyItIsStrong: "Workflow runs are well-defined and directly tied to customer value delivery",
      whatItEnables: "Transparent pricing that scales with actual usage and customer success",
      evidence: [
        { url: "https://acme.com/pricing", quote: "Pay only for completed workflow runs" },
      ],
    },
    {
      dimension: "Measurement and cadence",
      whyItIsStrong: "Robust analytics infrastructure with real-time visibility",
      whatItEnables: "Customers can track ROI and optimize usage proactively",
      evidence: [
        { url: "https://acme.com/docs/analytics", quote: "Access real-time metrics via dashboard or API" },
      ],
    },
  ],
  weaknesses: [
    {
      dimension: "Overages and risk allocation",
      whatIsMissingOrUnclear: "No visible documentation on how overages are handled or priced",
      whyItMatters: "Creates billing anxiety and unpredictable costs for customers",
      whatToVerifyNext: "Check if overage policies exist in customer contracts or billing portal",
      evidence: [],
    },
    {
      dimension: "Safety rails and trust surfaces",
      whatIsMissingOrUnclear: "Budget caps and spend alerts are mentioned but not clearly documented",
      whyItMatters: "Customers need confidence they won't face surprise bills",
      whatToVerifyNext: "Document budget control features and make them visible on the website",
      evidence: [],
    },
    {
      dimension: "Rating agility and governance",
      whatIsMissingOrUnclear: "No public information on how pricing changes are communicated or governed",
      whyItMatters: "Lack of governance transparency can erode trust with enterprise buyers",
      whatToVerifyNext: "Consider publishing a pricing change policy or SLA",
      evidence: [],
    },
  ],
  trustBreakpoints: [
    {
      area: "Overage billing",
      description: "Customers may experience anxiety about unexpected charges when usage spikes",
    },
    {
      area: "Budget predictability",
      description: "Lack of visible caps and alerts creates uncertainty in financial planning",
    },
    {
      area: "Pricing changes",
      description: "No governance framework visible for how price changes are handled",
    },
  ],
  recommendedFocus: {
    focusArea: "Safety Rails and Trust Surfaces",
    why: "This is your most impactful opportunity. Strong safety rails directly reduce billing anxiety and accelerate enterprise sales cycles.",
    firstTwoActions: [
      "Implement and document budget caps with real-time alerts when customers approach 80% of their limit",
      "Create a public trust center page showing all available spend controls and their configuration options",
    ],
    whatToMeasure: "Track reduction in billing-related support tickets and increase in enterprise deal close rates",
  },
};

// Mock observability data
export const mockObservability: ObservabilityData = {
  level: "Partial",
  confidenceScore: 58,
  pagesUsed: ["Homepage", "Pricing", "Product", "Docs", "Blog", "About"],
  mostUncertainDimensions: [
    { dimension: "Rating agility and governance", confidence: null, notObservable: true },
    { dimension: "Overages and risk allocation", confidence: 0.3, notObservable: false },
  ],
};

// Create mock scan result
export const mockScanResult: ScanResult = {
  id: "scan_123",
  url: "https://acme.com",
  status: "complete",
  companyProfile: mockCompanyProfile,
  rubricScore: mockRubricScore,
  observability: mockObservability,
  createdAt: new Date(),
};

// Mock chat messages
export const mockChatMessages: ChatMessage[] = [];
