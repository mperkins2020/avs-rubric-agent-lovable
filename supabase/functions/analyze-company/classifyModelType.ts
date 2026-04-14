// Model-Type Classifier
// Deterministic regex + keyword scoring — no LLM calls.
// Runs post-evidence-ingestion, pre-scoring.

export interface ModelClassificationInput {
  pricingPageContent: string;
  billingPageContent?: string;
  faqContent?: string;
  caseStudyContent?: string[];
  pricingPageExists: boolean;
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

// ── Pattern definitions ──

interface PatternDef {
  regex: RegExp;
  weight: number;
  label: string;
}

const ACCESS_PATTERNS: PatternDef[] = [
  // High signal (+0.30)
  { regex: /per\s+user/gi, weight: 0.30, label: 'per user' },
  { regex: /per\s+seat/gi, weight: 0.30, label: 'per seat' },
  { regex: /per\s+license/gi, weight: 0.30, label: 'per license' },
  { regex: /per\s+member/gi, weight: 0.30, label: 'per member' },
  { regex: /\$\s*\d+[\s/]*(?:per\s+)?(?:user|seat|member|license)\s*[/]\s*(?:mo|month|yr|year)/gi, weight: 0.30, label: '$X/user/mo format' },
  { regex: /(?:1[-–]\d+|up\s+to\s+\d+)\s+(?:users?|seats?|members?)/gi, weight: 0.30, label: 'user-count range' },
  // Medium signal (+0.15)
  { regex: /per\s+workspace/gi, weight: 0.15, label: 'per workspace' },
  { regex: /per\s+team/gi, weight: 0.15, label: 'per team' },
  // Medium signal (+0.20) — flat monthly price tiers (e.g., "$5/mo", "$22/month") indicate fixed access pricing
  { regex: /\$\s*\d+\s*\/\s*(?:mo|month)\b/gi, weight: 0.20, label: 'flat monthly price tier' },
];

const ACCESS_NEGATIVE: PatternDef[] = [
  { regex: /(?:credit|token|api\s+call|resolution)/gi, weight: -0.20, label: 'consumption/outcome language co-occurring' },
];

const CONSUMPTION_PATTERNS: PatternDef[] = [
  // High signal (+0.30)
  { regex: /\$\s*[\d.]+\s*per\s+(?:api\s+call|request|query|transaction)/gi, weight: 0.30, label: '$X per API call' },
  { regex: /\$\s*[\d.]+\s*per\s+(?:\d+[kK]?\s+)?(?:tokens?|characters?|words?)/gi, weight: 0.30, label: '$X per tokens' },
  { regex: /\$\s*[\d.]+\s*per\s+(?:GB|TB|MB|minutes?|hours?)/gi, weight: 0.30, label: '$X per unit' },
  { regex: /\d+\s*credits?\s*(?:\/|\s*per)\s*(?:mo|month)/gi, weight: 0.30, label: 'credits per month' },
  { regex: /credit\s*(?:pack|bundle|block)s?/gi, weight: 0.30, label: 'credit packs' },
  { regex: /pay\s+(?:for\s+)?(?:only\s+)?what\s+you\s+use/gi, weight: 0.30, label: 'pay for what you use' },
  { regex: /usage[-\s]based\s+(?:pricing|billing)/gi, weight: 0.30, label: 'usage-based pricing' },
  { regex: /metered\s+(?:pricing|billing|usage)/gi, weight: 0.30, label: 'metered billing' },
  { regex: /overage\s+(?:rate|fee|charge|pricing|cost)s?/gi, weight: 0.30, label: 'overage rates' },
  // Medium signal (+0.15)
  { regex: /credits?\b/gi, weight: 0.15, label: 'credit language' },
  { regex: /usage[-\s]based/gi, weight: 0.15, label: 'usage-based mention' },
  { regex: /(?:first|free)\s+\d+[kK]?\s+(?:calls?|requests?|tokens?|credits?).*?(?:then|after)\s+\$[\d.]+/gi, weight: 0.15, label: 'tiered volume pricing' },
];

const CONSUMPTION_NEGATIVE: PatternDef[] = [
  { regex: /per\s+(?:seat|user)\b/gi, weight: -0.20, label: 'per-seat as only pricing unit' },
];

const OUTCOME_PATTERNS: PatternDef[] = [
  // High signal (+0.30)
  { regex: /per\s+resolution/gi, weight: 0.30, label: 'per resolution' },
  { regex: /per\s+resolved\s+ticket/gi, weight: 0.30, label: 'per resolved ticket' },
  { regex: /per\s+successful\b/gi, weight: 0.30, label: 'per successful action' },
  { regex: /per\s+conversation/gi, weight: 0.30, label: 'per conversation' },
  { regex: /per\s+interaction\s+completed/gi, weight: 0.30, label: 'per interaction completed' },
  { regex: /\d+\s*%\s*(?:of\s+)?(?:recovered|savings|revenue)/gi, weight: 0.30, label: 'percentage of value' },
  { regex: /no\s+charge\s+if\s+(?:escalated|unresolved)/gi, weight: 0.30, label: 'no-charge condition' },
  { regex: /only\s+pay\s+(?:for\s+)?results/gi, weight: 0.30, label: 'only pay for results' },
  // Medium signal (+0.15)
  { regex: /roi\s+guarantee/gi, weight: 0.15, label: 'ROI guarantee' },
  { regex: /pay\s+for\s+performance/gi, weight: 0.15, label: 'pay for performance' },
  { regex: /results[-\s]based/gi, weight: 0.15, label: 'results-based' },
  // Low signal (+0.05) — only in case studies
  { regex: /value[-\s]based\s+pricing/gi, weight: 0.05, label: 'value-based pricing descriptor' },
];

const CONTACT_SALES_PATTERNS = [
  /contact\s+sales/gi,
  /contact\s+us\s+for\s+pricing/gi,
  /get\s+a\s+quote/gi,
  /request\s+(?:a\s+)?(?:pricing|quote|demo)/gi,
  /talk\s+to\s+sales/gi,
  /custom\s+pricing/gi,
];

// ── Helpers ──

function extractEvidence(text: string, regex: RegExp, contextChars = 50): string[] {
  const evidence: string[] = [];
  // Reset regex state
  const re = new RegExp(regex.source, regex.flags);
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const start = Math.max(0, match.index - contextChars);
    const end = Math.min(text.length, match.index + match[0].length + contextChars);
    const snippet = text.slice(start, end).replace(/\n+/g, ' ').trim();
    evidence.push(`...${snippet}...`);
    if (evidence.length >= 5) break; // cap per pattern
  }
  return evidence;
}

function scorePatterns(
  text: string,
  patterns: PatternDef[],
  negativePatterns: PatternDef[],
  allEvidence: string[],
): number {
  let score = 0;
  const seenLabels = new Set<string>();

  for (const p of patterns) {
    const re = new RegExp(p.regex.source, p.regex.flags);
    if (re.test(text)) {
      if (!seenLabels.has(p.label)) {
        score += p.weight;
        seenLabels.add(p.label);
        const ev = extractEvidence(text, p.regex);
        allEvidence.push(...ev);
      }
    }
  }

  for (const p of negativePatterns) {
    const re = new RegExp(p.regex.source, p.regex.flags);
    if (re.test(text)) {
      if (!seenLabels.has(p.label)) {
        score += p.weight; // negative
        seenLabels.add(p.label);
      }
    }
  }

  return score;
}

// ── Level 2 variant detection ──

function detectAccessVariant(text: string): string {
  if (/per[-\s]+seat|per[-\s]+user|per[-\s]+member|per[-\s]+agent/i.test(text)) return 'per-seat';
  // Also match $X/user/mo format as per-seat
  if (/\$\s*\d+\s*\/\s*(?:user|seat|member)\s*\/\s*(?:mo|month|yr|year)/i.test(text)) return 'per-seat';
  if (/per[-\s]+license|named\s+user|concurrent\s+user/i.test(text)) return 'per-license';
  // Flat-rate: fixed prices with feature differentiation, no per-unit language
  if (/\$\s*\d+/i.test(text) && !/per\s+(?:seat|user|member|license|unit|call|token|credit)/i.test(text) && !/\$\s*\d+\s*\/\s*(?:user|seat|member)/i.test(text)) return 'flat-rate-tiered';
  return 'unspecified';
}

function detectConsumptionVariant(text: string): string {
  if (/per[-\s]+(?:api[-\s]*call|request|token|event|character|word|query|minute|hour|GB|TB|MB)/i.test(text)) return 'per-unit-metered';
  if (/credit\s*(?:pack|bundle|block|pool|balance|reset)|credits?\s*(?:\/|\s*per)\s*(?:mo|month)/i.test(text)) return 'credit-pool';
  if (/prepaid|committed\s+use|reserved\s+capacity/i.test(text)) return 'prepaid-block';
  if (/credits?\b/i.test(text)) return 'credit-pool';
  return 'unspecified';
}

function detectOutcomeVariant(text: string): string {
  if (/per\s+resolution|resolved\s+ticket|successful\s+completion/i.test(text)) return 'event:resolution';
  if (/per\s+conversation|per\s+interaction|per\s+session/i.test(text)) return 'event:conversation';
  if (/checkpoint|milestone|deliverable|artifact/i.test(text)) return 'event:checkpoint';
  if (/(?:\d+\s*)?%\s*(?:of\s+)?(?:revenue|recovered|savings)|revenue\s+share|success\s+fee|recovery\s+fee/i.test(text)) return 'share:revenue';
  if (/patient\s+outcome|clinical\s+improvement|treatment\s+result/i.test(text)) return 'share:clinical';
  return 'unspecified';
}

// ── Contact Sales detection ──

function detectContactSales(text: string): { hasPublicTiers: boolean; allGated: boolean } {
  let gatedCount = 0;
  for (const pattern of CONTACT_SALES_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    if (re.test(text)) gatedCount++;
  }

  const hasGating = gatedCount > 0;
  // Check if there are visible prices (public tiers)
  const hasPublicPrices = /\$\s*\d+/i.test(text) || /free\s+(?:plan|tier|forever)/i.test(text) || /\$0/i.test(text);

  return {
    hasPublicTiers: hasPublicPrices,
    allGated: hasGating && !hasPublicPrices,
  };
}

// ── Main classifier ──

export function classifyModelType(input: ModelClassificationInput): ModelClassification {
  const {
    pricingPageContent,
    billingPageContent,
    faqContent,
    caseStudyContent,
    pricingPageExists,
  } = input;

  // Edge case: no pricing page
  if (!pricingPageExists || !pricingPageContent || pricingPageContent.trim().length === 0) {
    return {
      model_type: 'unclassified',
      model_type_l1: 'unclassified',
      model_type_l2: 'unspecified',
      model_type_confidence: 0.00,
      model_type_source: 'unclassified',
      enterprise_pricing: 'public',
      classification_evidence: [],
    };
  }

  // Combine all available text for scoring
  const primaryText = pricingPageContent;
  const supplementaryText = [
    billingPageContent || '',
    faqContent || '',
    ...(caseStudyContent || []),
  ].join('\n');
  const allText = `${primaryText}\n${supplementaryText}`;

  // Edge case: pricing page is 100% "Contact Sales"
  const contactSales = detectContactSales(primaryText);
  if (contactSales.allGated) {
    return {
      model_type: 'gated',
      model_type_l1: 'gated',
      model_type_l2: 'unspecified',
      model_type_confidence: 0.00,
      model_type_source: 'gated',
      enterprise_pricing: 'gated',
      classification_evidence: ['Pricing page contains only "Contact Sales" / gated pricing language'],
    };
  }

  const enterprisePricing = contactSales.hasPublicTiers && !contactSales.allGated
    ? (CONTACT_SALES_PATTERNS.some(p => new RegExp(p.source, p.flags).test(primaryText)) ? 'gated' as const : 'public' as const)
    : 'public' as const;

  // Score all four Level 1 types independently.
  // First pass: score WITHOUT negative signals (for hybrid detection).
  // Cross-type co-occurrence is expected in hybrids, so negatives would suppress valid signals.
  const accessEvidence: string[] = [];
  const consumptionEvidence: string[] = [];
  const outcomeEvidence: string[] = [];

  const accessScoreRaw = scorePatterns(allText, ACCESS_PATTERNS, [], accessEvidence);
  const consumptionScoreRaw = scorePatterns(allText, CONSUMPTION_PATTERNS, [], consumptionEvidence);
  const outcomeScoreRaw = scorePatterns(allText, OUTCOME_PATTERNS, [], outcomeEvidence);

  const rawScores: Array<{ type: 'access' | 'consumption' | 'outcome'; score: number; evidence: string[] }> = [
    { type: 'access', score: accessScoreRaw, evidence: accessEvidence },
    { type: 'consumption', score: consumptionScoreRaw, evidence: consumptionEvidence },
    { type: 'outcome', score: outcomeScoreRaw, evidence: outcomeEvidence },
  ];

  // Sort descending by score
  rawScores.sort((a, b) => b.score - a.score);

  // Hybrid detection: if TWO OR MORE Level 1 types score ≥ 0.30 each (before negatives)
  const aboveThreshold = rawScores.filter(s => s.score >= 0.30);

  let l1: ModelClassification['model_type_l1'];
  let l2: string;
  let confidence: number;
  let allClassificationEvidence: string[];

  // Canonical order for hybrid L2 variants
  const CANONICAL_ORDER = ['access', 'consumption', 'outcome'];

  if (aboveThreshold.length >= 2) {
    // Hybrid
    l1 = 'hybrid';
    const top2 = aboveThreshold.slice(0, 2);
    // Sort hybrid components in canonical order (access+consumption, not consumption+access)
    const sortedTypes = top2.map(s => s.type).sort((a, b) => CANONICAL_ORDER.indexOf(a) - CANONICAL_ORDER.indexOf(b));
    l2 = sortedTypes.join('+');
    confidence = Math.min(1.0, (top2[0].score + top2[1].score) / 2);
    allClassificationEvidence = [...top2[0].evidence, ...top2[1].evidence];
  } else {
    // Single type — apply negative signals for sharper single-type classification
    const accessScoreNet = scorePatterns(allText, ACCESS_PATTERNS, ACCESS_NEGATIVE, []);
    const consumptionScoreNet = scorePatterns(allText, CONSUMPTION_PATTERNS, CONSUMPTION_NEGATIVE, []);
    const outcomeScoreNet = outcomeScoreRaw; // outcome has no negative patterns

    const scores: Array<{ type: 'access' | 'consumption' | 'outcome'; score: number; evidence: string[] }> = [
      { type: 'access', score: accessScoreNet, evidence: accessEvidence },
      { type: 'consumption', score: consumptionScoreNet, evidence: consumptionEvidence },
      { type: 'outcome', score: outcomeScoreNet, evidence: outcomeEvidence },
    ];
    scores.sort((a, b) => b.score - a.score);

    const winner = scores[0];
    l1 = winner.score >= 0.50 ? winner.type : (winner.score > 0 ? winner.type : 'unclassified');

    if (winner.score < 0.50) {
      // Low confidence — check if truly unclassifiable
      if (winner.score <= 0) {
        return {
          model_type: 'unclassified',
          model_type_l1: 'unclassified',
          model_type_l2: 'unspecified',
          model_type_confidence: 0.00,
          model_type_source: 'unclassified',
          enterprise_pricing: enterprisePricing,
          classification_evidence: [],
        };
      }
      // Between 0 and 0.50 — classify but with low confidence
      l1 = winner.type;
    }

    confidence = Math.min(1.0, winner.score);
    allClassificationEvidence = winner.evidence;

    // Detect Level 2 variant
    switch (l1) {
      case 'access':
        l2 = detectAccessVariant(allText);
        break;
      case 'consumption':
        l2 = detectConsumptionVariant(allText);
        break;
      case 'outcome':
        l2 = detectOutcomeVariant(allText);
        break;
      default:
        l2 = 'unspecified';
    }
  }

  const modelType = l2 !== 'unspecified' ? `${l1}:${l2}` : l1;
  const source: ModelClassification['model_type_source'] = confidence >= 0.50 ? 'auto' : 'unclassified';

  return {
    model_type: modelType,
    model_type_l1: l1,
    model_type_l2: l2,
    model_type_confidence: Math.round(confidence * 100) / 100,
    model_type_source: source,
    enterprise_pricing: enterprisePricing,
    classification_evidence: allClassificationEvidence.slice(0, 10), // cap at 10
  };
}
