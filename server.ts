import express from "express";
import path from "path";
import { Resend } from "resend";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/send-email", async (req, res) => {
    try {
      const { customerName, customerEmail, orderId, items, totalAmount } = req.body;
      const resendApiKey = process.env.RESEND_API_KEY;

      if (!resendApiKey) {
        console.warn("No RESEND_API_KEY found, skipping email send");
        return res.status(200).json({ status: "skipped", message: "RESEND_API_KEY not configured." });
      }

      if (!customerEmail) {
        return res.status(400).json({ error: "Customer email is required" });
      }

      const orderItemsHtml = items.map((item: any) => `
        <tr>
          <td>${item.quantity}x ${item.name}</td>
          <td style="text-align: right;">${(item.price * item.quantity).toLocaleString()} YER</td>
        </tr>
      `).join('');

      // Send email using Resend via their REST API
      try {
        const resend = new Resend(resendApiKey);
        
        const trackingUrl = `https://${req.get('host')}/track-order?id=${orderId}`;

        const data = await resend.emails.send({
          from: 'WhatsAppStore <orders@resend.dev>', // usually needs a verified domain for prod
          to: [customerEmail],
          subject: `Order Confirmation - #${orderId}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Thank you for your order, ${customerName}!</h2>
              <p>Your order <strong>#${orderId}</strong> has been successfully placed.</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <thead>
                  <tr style="border-bottom: 1px solid #eee;">
                    <th style="text-align: left; padding-bottom: 8px;">Item</th>
                    <th style="text-align: right; padding-bottom: 8px;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderItemsHtml}
                </tbody>
                <tfoot>
                  <tr style="border-top: 2px solid #333; font-weight: bold;">
                    <td style="padding-top: 8px;">Order Total</td>
                    <td style="text-align: right; padding-top: 8px;">${totalAmount.toLocaleString()} YER</td>
                  </tr>
                </tfoot>
              </table>

              <div style="margin-top: 30px; padding: 20px; background-color: #f9f9f9; border-radius: 8px; text-align: center;">
                <p style="margin-top: 0;">You can track your order status here:</p>
                <a href="${trackingUrl}" style="display: inline-block; padding: 10px 20px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px; font-weight: bold;">Track Order</a>
              </div>
            </div>
          `
        });
        
        console.log("Email sent successfully", data);
      } catch (err) {
        console.error("Failed to send email via Resend:", err);
      }

      res.status(200).json({ status: "success" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
