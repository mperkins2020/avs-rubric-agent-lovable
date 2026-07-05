import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_scan_result",
  title: "Get scan result",
  description:
    "Fetch the full AVS Rubric scan result (company profile, dimension scores, strengths, weaknesses) for a given URL domain. Returns the most recent non-expired scan for that domain.",
  inputSchema: {
    url_domain: z
      .string()
      .trim()
      .min(1)
      .describe("The URL domain of the scan to retrieve (e.g. 'example.com')."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ url_domain }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("scan_results")
      .select("id, url_domain, created_at, expires_at, result_json")
      .eq("url_domain", url_domain)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!data) {
      return { content: [{ type: "text", text: `No scan found for domain ${url_domain}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { scan: data },
    };
  },
});
