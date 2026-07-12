export function printElementById(elementId: string, title = 'ilm AI Export') {
  const element = document.getElementById(elementId);
  if (!element) return false;

  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);

  const doc = frame.contentWindow?.document;
  if (!doc) {
    frame.remove();
    return false;
  }

  const printable = element.cloneNode(true) as HTMLElement;
  const sourceTextareas = Array.from(element.querySelectorAll('textarea'));
  const clonedTextareas = Array.from(printable.querySelectorAll('textarea'));
  clonedTextareas.forEach((textarea, index) => {
    textarea.textContent = sourceTextareas[index]?.value || textarea.textContent || '';
  });

  doc.open();
  doc.write(`
    <!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 28px; color: #111827; background: #ffffff; font-family: Arial, sans-serif; }
          h1, h2, h3 { color: #111827; page-break-after: avoid; }
          p, li { line-height: 1.6; }
          section, article, .card, textarea { page-break-inside: avoid; }
          .rounded-xl, .rounded-lg, .rounded-2xl { border-radius: 10px; }
          .border { border: 1px solid #d1d5db; }
          .bg-background, .bg-card, .bg-muted\\/20, .bg-muted\\/25, .bg-muted\\/30 { background: #ffffff; }
          .text-muted-foreground { color: #4b5563; }
          button, [data-no-print="true"] { display: none !important; }
          textarea { width: 100%; min-height: 220px; border: 1px solid #d1d5db; padding: 12px; white-space: pre-wrap; font: inherit; color: #111827; }
        </style>
      </head>
      <body>${printable.outerHTML}</body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  }, 150);

  return true;
}
