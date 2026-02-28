import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const authSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await authSupabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log('Authenticated user:', claimsData.claims.sub);

    const { company_name, rating, feedback, email } = await req.json();

    if (!company_name || !rating || rating < 1 || rating > 5) {
      return new Response(
        JSON.stringify({ error: "company_name and rating (1-5) are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Input length validation
    if (String(company_name).length > 200) {
      return new Response(
        JSON.stringify({ error: "Company name too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (feedback && String(feedback).length > 2000) {
      return new Response(
        JSON.stringify({ error: "Feedback too long (max 2000 chars)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (email && String(email).length > 255) {
      return new Response(
        JSON.stringify({ error: "Email too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Store in database using the authenticated user's client (respects RLS)
    const { error: dbError } = await authSupabase.from("report_feedback").insert({
      company_name: String(company_name).substring(0, 200),
      rating,
      feedback: feedback ? String(feedback).substring(0, 2000) : null,
      email: email ? String(email).substring(0, 255) : null,
    });

    if (dbError) {
      console.error("DB insert error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to store feedback" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email via Resend-compatible approach using the built-in SMTP
    const timestamp = new Date().toISOString();
    const safeCompany = escapeHtml(String(company_name));
    const safeFeedback = escapeHtml(String(feedback || "—"));
    const safeEmail = escapeHtml(String(email || "—"));
    const csvRow = `"${timestamp}","${String(company_name).replace(/"/g, '""')}","${rating}","${(feedback || "").replace(/"/g, '""')}","${email || ""}"`;
    const csvContent = `"Timestamp","Company","Rating","Feedback","Email"\n${csvRow}`;

    // Use Supabase's built-in email or a simple fetch to a mail API
    // We'll use Resend if available, otherwise log
    const resendKey = Deno.env.get("RESEND_API_KEY");
    
    if (resendKey) {
      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "ValueTempo <onboarding@resend.dev>",
          to: ["mlhperkins@gmail.com"],
          subject: `New Feedback: ${safeCompany} - ${rating}★`,
          html: `
            <h2>New Report Feedback</h2>
            <table style="border-collapse:collapse;border:1px solid #ccc;">
              <tr><td style="padding:8px;border:1px solid #ccc;font-weight:bold;">Company</td><td style="padding:8px;border:1px solid #ccc;">${safeCompany}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ccc;font-weight:bold;">Rating</td><td style="padding:8px;border:1px solid #ccc;">${"★".repeat(rating)}${"☆".repeat(5 - rating)}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ccc;font-weight:bold;">Feedback</td><td style="padding:8px;border:1px solid #ccc;">${safeFeedback}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ccc;font-weight:bold;">Email</td><td style="padding:8px;border:1px solid #ccc;">${safeEmail}</td></tr>
              <tr><td style="padding:8px;border:1px solid #ccc;font-weight:bold;">Time</td><td style="padding:8px;border:1px solid #ccc;">${timestamp}</td></tr>
            </table>
            <br/>
            <p><strong>CSV attachment content:</strong></p>
            <pre>${escapeHtml(csvContent)}</pre>
          `,
        }),
      });

      if (!emailRes.ok) {
        const emailError = await emailRes.text();
        console.error("Email send error:", emailError);
      }
    } else {
      console.log("No RESEND_API_KEY configured. Feedback stored in DB only.");
      console.log("CSV:", csvContent);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
