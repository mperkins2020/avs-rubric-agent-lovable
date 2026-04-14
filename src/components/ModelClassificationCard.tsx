import { motion } from "framer-motion";
import type { ModelClassification } from "@/types/rubric";

interface ModelClassificationCardProps {
  classification: ModelClassification;
}

const L1_LABELS: Record<string, string> = {
  access: "Access-Based",
  consumption: "Consumption-Based",
  outcome: "Outcome-Based",
  hybrid: "Hybrid",
  unclassified: "Unclassified",
  gated: "Gated",
};

const L1_COLORS: Record<string, string> = {
  access: "bg-blue-100 text-blue-800 border-blue-200",
  consumption: "bg-purple-100 text-purple-800 border-purple-200",
  outcome: "bg-green-100 text-green-800 border-green-200",
  hybrid: "bg-amber-100 text-amber-800 border-amber-200",
  unclassified: "bg-gray-100 text-gray-600 border-gray-200",
  gated: "bg-gray-100 text-gray-600 border-gray-200",
};

function confidenceLabel(confidence: number): { text: string; color: string } {
  if (confidence >= 0.80) return { text: "High", color: "text-green-600" };
  if (confidence >= 0.50) return { text: "Medium", color: "text-amber-600" };
  return { text: "Low", color: "text-red-500" };
}

export function ModelClassificationCard({ classification }: ModelClassificationCardProps) {
  const l1Label = L1_LABELS[classification.model_type_l1] || classification.model_type_l1;
  const l1Color = L1_COLORS[classification.model_type_l1] || L1_COLORS.unclassified;
  const conf = confidenceLabel(classification.model_type_confidence);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15 }}
      className="rounded-xl border border-border/50 bg-card p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Pricing Model
        </h3>
        <div className="flex items-center gap-2 text-xs">
          <span className={`font-medium ${conf.color}`}>{conf.text} confidence</span>
          <span className="text-muted-foreground">({Math.round(classification.model_type_confidence * 100)}%)</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border ${l1Color}`}>
          {l1Label}
        </span>
        {classification.model_type_l2 && classification.model_type_l2 !== "unspecified" && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
            {classification.model_type_l2}
          </span>
        )}
        {classification.enterprise_pricing === "gated" && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
            Enterprise: Contact Sales
          </span>
        )}
      </div>

      {classification.classification_evidence.length > 0 && (
        <details className="group">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            View classification evidence ({classification.classification_evidence.length} signals)
          </summary>
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
            {classification.classification_evidence.map((ev, i) => (
              <li key={i} className="pl-3 border-l-2 border-border py-0.5 font-mono break-all">
                {ev}
              </li>
            ))}
          </ul>
        </details>
      )}
    </motion.div>
  );
}
