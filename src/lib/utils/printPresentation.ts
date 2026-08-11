// Dedicated print/export path for the Presentation Builder. The generic
// `printElementById` (src/lib/utils/printElement.ts) is built for document-style
// content (resumes, essays, reports) — it forces a narrow portrait page, a white
// background, and strips borders/shadows, which mangles a fixed 16:9 slide deck
// with photo/gradient backgrounds. This function preserves the deck's own layout
// instead of fighting it with document-oriented print rules.
export function printPresentationDeck(elementId: string, title = 'ilm AI Presentation') {
  const element = document.getElementById(elementId);
  if (!element) return false;

  const printWindow = window.open('', '_blank', 'width=1200,height=820');
  if (!printWindow) return false;

  const printable = element.cloneNode(true) as HTMLElement;
  // The live container is visually hidden (fixed off-screen, height 0) so the
  // deck can render off-canvas for export without disturbing the on-page
  // preview — undo exactly that positioning on the clone, nothing else.
  printable.removeAttribute('aria-hidden');
  printable.removeAttribute('data-print-root');
  printable.style.position = 'static';
  printable.style.left = 'auto';
  printable.style.top = 'auto';
  printable.style.width = '100%';
  printable.style.height = 'auto';
  printable.style.minHeight = '0';
  printable.style.overflow = 'visible';

  const doc = printWindow.document;
  const safeTitle = escapeHtml(title);

  doc.open();
  doc.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${safeTitle}</title>
        <style>
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            color-adjust: exact;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #0b0d12;
          }
          body {
            font-family: Inter, Arial, Helvetica, sans-serif;
          }
          #print-deck {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          /* Each slide keeps the exact size/background/gradient PrintableSlide
             already renders it with (1080px wide, 16:9-ish) — we only strip the
             preview-only shadow/margin so slides fill their own printed page. */
          #print-deck section[data-page-break="true"] {
            margin: 0 auto !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 1080px !important;
          }
          [data-page-break="true"] {
            page-break-after: always;
            break-after: page;
            page-break-inside: avoid;
            break-inside: avoid;
          }
          [data-page-break="true"]:last-child {
            page-break-after: auto;
            break-after: auto;
          }
          img, svg { max-width: 100%; }
          /* Slides are authored as fixed-aspect 16:9 boxes, not A4 portrait text —
             landscape with no margin lets each one fill its printed page. */
          @page {
            size: landscape;
            margin: 0;
          }
          @media print {
            html, body { width: 100%; height: 100%; }
            #print-deck { padding: 24px 0; }
          }
        </style>
      </head>
      <body>
        <div id="print-deck">${printable.outerHTML}</div>
        <script>
          window.onload = function () {
            setTimeout(function () { window.print(); }, 600);
          };
        </script>
      </body>
    </html>
  `);
  doc.close();

  return true;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
