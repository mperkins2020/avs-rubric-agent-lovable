export interface MissingInsiderPrompt {
  question: string;
  fieldPaths: string[];
}

export interface SourceEvidence {
  url: string;
  snippet: string;
}

export interface DimensionScore {
  dimension: string;
  score: 0 | 1 | 2;
  confidence: number;
  notObservable: boolean;
  rationale: string;
  observed: string[];
  sourceEvidence?: SourceEvidence[];
  uncertaintyReasons: string[];
  missingInsiderPrompts?: MissingInsiderPrompt[];
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
  band: 'Developing' | 'Credible' | 'Trusted' | 'Exemplary';
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
  model_type_l1: 'access' | 'consumption' | 'outcome' | 'hybrid' | 'gated' | 'unclassified';
  model_type_l2: string;
  model_type_confidence: number;
  classification_evidence: string[];
  category_primary: 'AI Customer Support' | 'AI Agent Platform' | 'AI Coding Assistant' | 'AI Sales Intelligence' | 'AI Revenue Intelligence' | 'AI Legal' | 'AI Dev Infrastructure' | 'AI Speech Platform' | 'AI Healthcare' | 'AI Video & Podcast' | 'unclassified';
  category_confidence: number;
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

export interface ModelClassification {
  model_type: string;
  model_type_l1: 'access' | 'consumption' | 'outcome' | 'hybrid' | 'unclassified' | 'gated';
  model_type_l2: string;
  model_type_confidence: number;
  model_type_source: 'auto' | 'unclassified' | 'gated';
  enterprise_pricing: 'public' | 'gated';
  classification_evidence: string[];
}

export interface CategoryClassification {
  category_primary: 'AI Customer Support' | 'AI Agent Platform' | 'AI Coding Assistant' | 'AI Sales Intelligence' | 'AI Revenue Intelligence' | 'AI Legal' | 'AI Dev Infrastructure' | 'AI Speech Platform' | 'AI Healthcare' | 'AI Video & Podcast' | 'unclassified';
  category_confidence: number;
}

export interface ScanResult {
  id: string;
  url: string;
  status: 'pending' | 'scanning' | 'complete' | 'error';
  companyProfile: CompanyProfile | null;
  rubricScore: RubricScore | null;
  observability: ObservabilityData | null;
  modelClassification: ModelClassification | null;
  categoryClassification: CategoryClassification | null;
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
  'Product north star',
  'ICP and job clarity',
  'Buyer and budget alignment',
  'Value unit',
  'Cost driver mapping',
  'Pools and packaging',
  'Overages and risk allocation',
  'Safety rails and trust surfaces',
] as const;

export type RubricDimension = typeof RUBRIC_DIMENSIONS[number];
