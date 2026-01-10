export interface DimensionScore {
  dimension: string;
  score: 0 | 1 | 2;
  confidence: number;
  notObservable: boolean;
  rationale: string;
  observed: string[];
  uncertaintyReasons: string[];
}

export interface Evidence {
  url: string;
  quote: string;
}

export interface Strength {
  dimension: string;
  whyItIsStrong: string;
  whatItEnables: string;
  evidence: Evidence[];
}

export interface Weakness {
  dimension: string;
  whatIsMissingOrUnclear: string;
  whyItMatters: string;
  whatToVerifyNext: string;
  evidence: Evidence[];
}

export interface TrustBreakpoint {
  area: string;
  description: string;
}

export interface RecommendedFocus {
  focusArea: string;
  why: string;
  firstTwoActions: string[];
  whatToMeasure: string;
}

export interface RubricScore {
  totalScore: number;
  maxScore: number;
  band: 'Nascent' | 'Emerging' | 'Established' | 'Advanced';
  dimensionScores: DimensionScore[];
  strengths: Strength[];
  weaknesses: Weakness[];
  trustBreakpoints: TrustBreakpoint[];
  recommendedFocus: RecommendedFocus;
}

export interface CompanyProfile {
  companyName: string;
  oneLineDescription: string;
  missionOrPositioning: string;
  primaryUsers: string;
  economicBuyerGuess: string;
  icpGuess: string[];
  keyWorkflows: string[];
  productSurface: 'api' | 'app' | 'both';
  pricingModelGuess: 'seat' | 'usage' | 'hybrid' | 'outcome' | 'unknown';
  valueUnitGuess: string;
  packagingNotes: string;
  trustControlsSeen: string[];
  indicatorsSeen: string[];
}

export interface ObservabilityData {
  level: 'Strong' | 'Partial' | 'Sparse';
  confidenceScore: number;
  pagesUsed: string[];
  mostUncertainDimensions: {
    dimension: string;
    confidence: number | null;
    notObservable: boolean;
  }[];
}

export interface ScanResult {
  id: string;
  url: string;
  status: 'pending' | 'scanning' | 'complete' | 'error';
  companyProfile: CompanyProfile | null;
  rubricScore: RubricScore | null;
  observability: ObservabilityData | null;
  createdAt: Date;
}

export type ChatMessageRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  citations?: Evidence[];
  timestamp: Date;
}

export const RUBRIC_DIMENSIONS = [
  '90-day north star',
  'ICP and job clarity',
  'Buyer and budget alignment',
  'Value units',
  'Cost driver mapping',
  'Pools and packaging',
  'Overages and risk allocation',
  'Safety rails and trust surfaces',
  'Rating agility and governance',
  'Measurement and cadence',
] as const;

export type RubricDimension = typeof RUBRIC_DIMENSIONS[number];
