'use client';

// Real PDF export for the Presentation Builder: renders each slide (the
// off-screen `[data-page-break="true"]` sections already produced by
// PresentationSlideRenderer) to a canvas and stitches them into a landscape
// PDF, returned as a Blob. Unlike printPresentationDeck (window.print in a
// popup, where the user has to manually choose "Save as PDF"), this produces
// an actual file the caller can download the same way as the PPTX/DOCX
// exports — no extra browser tab or print dialog involved.
export async function exportPresentationDeckToPdf(elementId: string): Promise<Blob | null> {
  const container = document.getElementById(elementId);
  if (!container) return null;

  const slides = Array.from(container.querySelectorAll<HTMLElement>('[data-page-break="true"]'));
  if (!slides.length) return null;

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  let pdf: InstanceType<typeof jsPDF> | null = null;

  for (const slideElement of slides) {
    const canvas = await html2canvas(slideElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: null,
    });
    const imageData = canvas.toDataURL('image/jpeg', 0.92);
    const pageWidth = canvas.width;
    const pageHeight = canvas.height;

    if (!pdf) {
      pdf = new jsPDF({
        orientation: pageWidth >= pageHeight ? 'landscape' : 'portrait',
        unit: 'px',
        format: [pageWidth, pageHeight],
      });
    } else {
      pdf.addPage([pageWidth, pageHeight], pageWidth >= pageHeight ? 'landscape' : 'portrait');
    }
    pdf.addImage(imageData, 'JPEG', 0, 0, pageWidth, pageHeight);
  }

  return pdf ? pdf.output('blob') : null;
}
