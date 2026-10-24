export interface Env {
  ASSETS: Fetcher;
  RESEND_API_KEY: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/send" && request.method === "POST") {
      let body: { email?: string; message?: string };
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: "invalid JSON body" }, { status: 400 });
      }

      const email = (body.email || "").trim();
      const message = (body.message || "").trim();

      if (!email || !message) {
        return Response.json({ error: "email and message are required" }, { status: 400 });
      }

      if (!env.RESEND_API_KEY) {
        return Response.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
      }

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Puzzle 9 Mailer <noreply@aiology.live>",
          to: [email],
          subject: "You sent yourself a test message",
          html: `<p>Hi,</p><p>You submitted this message through the Puzzle 9 mailer form:</p><blockquote>${escapeHtml(message)}</blockquote><p>Sent via the Resend API from a verified custom domain (aiology.live).</p>`,
        }),
      });

      const resendData: any = await resendRes.json();

      if (!resendRes.ok) {
        return Response.json(
          { error: resendData?.message || "Resend send failed", detail: resendData },
          { status: resendRes.status },
        );
      }

      return Response.json({ id: resendData.id });
    }

    // Static assets (the form page)
    return env.ASSETS.fetch(request);
  },
};
