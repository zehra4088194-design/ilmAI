// Same server-side jsPDF approach as src/lib/school-erp/report-card-pdf.ts — Node runtime, no DOM,
// callable straight from an API route. Landscape "Certificate of Achievement / Participation".

export type CompetitionCertificateInput = {
  studentName: string;
  competitionTitle: string;
  competitionTypeLabel: string;
  rank: number;
  percentile: number | null;
  totalParticipants: number;
  score: number | null;
  dateLabel: string;
};

export async function generateCompetitionCertificatePdf(input: CompetitionCertificateInput): Promise<Buffer> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const centerX = pageWidth / 2;

  // Border
  doc.setDrawColor(124, 58, 237); // violet-600, matches the app's accent color
  doc.setLineWidth(3);
  doc.rect(24, 24, pageWidth - 48, pageHeight - 48);
  doc.setLineWidth(0.75);
  doc.rect(32, 32, pageWidth - 64, pageHeight - 64);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(124, 58, 237);
  doc.text('ILM AI · COMPETITION PORTAL', centerX, 78, { align: 'center' });

  doc.setFontSize(30);
  doc.setTextColor(20, 20, 20);
  const medal = input.rank === 1 ? 'Certificate of Achievement' : input.rank <= 3 ? 'Certificate of Achievement' : 'Certificate of Participation';
  doc.text(medal, centerX, 118, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.text('This certifies that', centerX, 158, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(76, 29, 149);
  doc.text(input.studentName, centerX, 194, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  const rankLabel = input.rank === 1 ? 'placed 1st' : input.rank === 2 ? 'placed 2nd' : input.rank === 3 ? 'placed 3rd' : `finished (rank ${input.rank} of ${input.totalParticipants})`;
  doc.text(`${rankLabel} in ${input.competitionTypeLabel.toLowerCase()}`, centerX, 224, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`"${input.competitionTitle}"`, centerX, 246, { align: 'center' });

  if (input.percentile != null) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Scoring better than ${input.percentile}% of participants`, centerX, 270, { align: 'center' });
  }

  doc.setFontSize(10);
  doc.setTextColor(90, 90, 90);
  doc.text(input.dateLabel, 80, pageHeight - 60);
  doc.text('ilmai.study', pageWidth - 80, pageHeight - 60, { align: 'right' });

  return Buffer.from(doc.output('arraybuffer'));
}
