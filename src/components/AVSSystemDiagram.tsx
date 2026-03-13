import { motion } from "framer-motion";
import {
  Globe, FileText, Shield, Monitor, Settings, Wallet, ClipboardList, HelpCircle,
  Cog, Link2, Search, BookOpen, BarChart3, ShieldCheck,
  Vote, Calculator, ArrowDownCircle, Activity,
  TrendingUp, Handshake, ShieldAlert, BadgeCheck, Zap, Repeat,
  ChevronDown,
} from "lucide-react";

const GlowArrow = () => (
  <div className="flex justify-center py-3">
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <ChevronDown className="w-8 h-8 text-primary/60 drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
    </motion.div>
  </div>
);

const signalItems = [
  { icon: Globe, label: "Pricing pages" },
  { icon: Shield, label: "Trust & security" },
  { icon: Monitor, label: "Product UI" },
  { icon: FileText, label: "Terms of service" },
  { icon: Settings, label: "Admin controls" },
  { icon: Wallet, label: "Spend limits" },
  { icon: ClipboardList, label: "Audit logs" },
  { icon: HelpCircle, label: "Help docs" },
];

const evidenceItems = [
  { icon: Link2, label: "Link prioritization" },
  { icon: Search, label: "Evidence extraction" },
  { icon: BookOpen, label: "Facts ledger" },
  { icon: BarChart3, label: "Dimension scoring" },
  { icon: ShieldCheck, label: "Confidence evaluation" },
];

const guardrailItems = [
  { icon: Vote, label: "3-pass voting" },
  { icon: Calculator, label: "Median aggregation" },
  { icon: ArrowDownCircle, label: "Score floor logic" },
  { icon: Activity, label: "Confidence bands" },
];

const outcomeItems = [
  { icon: TrendingUp, label: "Cost predictability" },
  { icon: ShieldAlert, label: "Spend control" },
  { icon: Shield, label: "Operational safety" },
  { icon: BadgeCheck, label: "Procurement confidence" },
  { icon: Zap, label: "Faster enterprise evaluations" },
  { icon: Repeat, label: "Compounding trust" },
];

const layers = [
  {
    num: 4,
    title: "Enterprise Readiness",
    items: ["Buyer & Budget Alignment"],
    gradient: "from-amber-500/20 to-amber-600/10",
    border: "border-amber-500/30",
    accent: "text-amber-500",
    accentBg: "text-amber-500/80",
  },
  {
    num: 3,
    title: "Operational Controls",
    items: ["Safety Rails", "Overages & Risk Allocation", "Pools & Packaging"],
    gradient: "from-violet-500/20 to-violet-600/10",
    border: "border-violet-500/30",
    accent: "text-violet-500",
    accentBg: "text-violet-500/80",
  },
  {
    num: 2,
    title: "Economic Architecture",
    items: ["Value Unit", "Cost Driver Mapping"],
    gradient: "from-sky-500/20 to-sky-600/10",
    border: "border-sky-500/30",
    accent: "text-sky-500",
    accentBg: "text-sky-500/80",
  },
  {
    num: 1,
    title: "Product Clarity",
    items: ["Product North Star", "ICP & Job Clarity"],
    gradient: "from-emerald-500/20 to-emerald-600/10",
    border: "border-emerald-500/30",
    accent: "text-emerald-500",
    accentBg: "text-emerald-500/80",
  },
];

const IconBullet = ({ icon: Icon, label }: { icon: React.ElementType; label: string }) => (
  <div className="flex items-center gap-2 text-sm text-muted-foreground">
    <Icon className="w-3.5 h-3.5 shrink-0 text-foreground/60" />
    <span>{label}</span>
  </div>
);

export function AVSSystemDiagram() {
  return (
    <div className="my-10 max-w-2xl mx-auto">
      {/* Section 1: Observable Signals */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5"
      >
        <p className="text-xs font-bold uppercase tracking-widest text-primary/80 mb-1">Observable Signals</p>
        <p className="text-[11px] text-muted-foreground mb-3">(public evidence)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1.5">
          {signalItems.map((s) => (
            <IconBullet key={s.label} icon={s.icon} label={s.label} />
          ))}
        </div>
      </motion.div>

      <GlowArrow />

      {/* Section 2: AVS Rubric Engine */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-xl border border-primary/30 bg-card/80 backdrop-blur-sm p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Cog className="w-5 h-5 text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-primary">AVS Rubric Engine</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70 mb-2">Evidence Processing</p>
            <div className="space-y-1.5">
              {evidenceItems.map((e) => (
                <IconBullet key={e.label} icon={e.icon} label={e.label} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground/70 mb-2">Reliability Guardrails</p>
            <div className="space-y-1.5">
              {guardrailItems.map((g) => (
                <IconBullet key={g.label} icon={g.icon} label={g.label} />
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <GlowArrow />

      {/* Section 3: Trust Infrastructure Stack */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 text-center">Trust Infrastructure Layers</p>
        <div className="flex flex-col gap-0">
          {layers.map((layer, i) => (
            <div
              key={layer.num}
              className={`bg-gradient-to-r ${layer.gradient} border ${layer.border} px-5 py-4 text-center ${
                i === 0 ? "rounded-t-xl" : ""
              } ${i === layers.length - 1 ? "rounded-b-xl" : "border-t-0"}`}
            >
              <span className={`text-[10px] font-bold uppercase tracking-widest ${layer.accentBg}`}>
                Layer {layer.num}
              </span>
              <p className="font-bold text-foreground text-base mt-0.5">{layer.title}</p>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-0.5 mt-1">
                {layer.items.map((item) => (
                  <span key={item} className="text-sm text-muted-foreground">{item}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <GlowArrow />

      {/* Section 4: Buyer Trust Outcomes */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-xl border border-border/50 bg-card/80 backdrop-blur-sm p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <Handshake className="w-5 h-5 text-primary" />
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Buyer Trust Outcomes</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5">
          {outcomeItems.map((o) => (
            <IconBullet key={o.label} icon={o.icon} label={o.label} />
          ))}
        </div>
      </motion.div>

      {/* Caption */}
      <p className="text-center text-xs text-muted-foreground mt-4 italic">
        The AVS Rubric Engine evaluates observable signals across four layers of trust infrastructure to predict buyer trust outcomes.
      </p>
    </div>
  );
}
