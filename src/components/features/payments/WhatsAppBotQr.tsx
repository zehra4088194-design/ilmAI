import { MessageCircle } from 'lucide-react';

/**
 * "Scan to open WhatsApp" QR for the JazzCash auto-verify bot (whatsapp-worker/) — shown next to
 * every checkout screen's plan/claim code so a payer doesn't have to save the number manually.
 * Scanning opens a chat with the bot's linked number directly; the payer still types their
 * transaction ID + the code shown alongside this QR (see src/lib/payments/jazzcash.ts).
 */
export function WhatsAppBotQr({ className }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-1 ${className || ''}`}>
      <div className="rounded-lg bg-white p-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element -- small static public asset, no need for next/image here */}
        <img src="/whatsapp/bot-qr.jpg" alt="Scan to message the ilm AI WhatsApp bot" width={84} height={84} />
      </div>
      <p className="text-muted-foreground flex items-center gap-1 text-[11px] font-medium">
        <MessageCircle className="h-3 w-3" /> Scan to open WhatsApp
      </p>
    </div>
  );
}
