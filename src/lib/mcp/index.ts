import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyScansTool from "./tools/list-my-scans";
import getScanResultTool from "./tools/get-scan-result";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "valuetempo-avs-rubric-mcp",
  title: "ValueTempo AVS Rubric",
  version: "0.1.0",
  instructions:
    "Tools for the ValueTempo AVS Rubric app. Use `list_my_scans` to see the signed-in user's recent scans, and `get_scan_result` to retrieve the full rubric result (company profile, dimension scores, strengths, weaknesses) for a given URL domain.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMyScansTool, getScanResultTool],
});
