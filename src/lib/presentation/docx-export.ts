import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import { normalizePresentationDeck } from './generator';
import type { PresentationDeck, PresentationSlide } from './types';

function safeText(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function slideTitle(slide: PresentationSlide, index: number) {
  return safeText(slide.title || slide.quote, `Slide ${index + 1}`);
}

function bulletParagraph(text: string) {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { after: 90 },
  });
}

function slideParagraphs(slide: PresentationSlide, index: number) {
  const children: Paragraph[] = [
    new Paragraph({
      text: `Slide ${index + 1}: ${slideTitle(slide, index)}`,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 260, after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `Type: ${slide.type}`, bold: true })],
      spacing: { after: 120 },
    }),
  ];

  if (slide.subtitle) children.push(new Paragraph({ text: slide.subtitle, spacing: { after: 160 } }));

  if (slide.bullets?.length) {
    children.push(new Paragraph({ text: 'Key points', heading: HeadingLevel.HEADING_3, spacing: { after: 80 } }));
    children.push(...slide.bullets.map(bulletParagraph));
  }

  if (slide.left || slide.right) {
    [slide.left, slide.right].filter(Boolean).forEach((column) => {
      children.push(new Paragraph({ text: safeText(column?.heading, 'Column'), heading: HeadingLevel.HEADING_3, spacing: { after: 80 } }));
      children.push(...(column?.bullets || []).map(bulletParagraph));
    });
  }

  if (slide.stats?.length) {
    children.push(new Paragraph({ text: 'Stats / highlights', heading: HeadingLevel.HEADING_3, spacing: { after: 80 } }));
    children.push(...slide.stats.map((stat) => bulletParagraph(`${stat.value}: ${stat.label}`)));
  }

  if (slide.quote) {
    children.push(new Paragraph({ text: `"${slide.quote}"${slide.author ? ` - ${slide.author}` : ''}`, spacing: { after: 160 } }));
  }

  if (slide.speakerNotes) {
    children.push(new Paragraph({ text: 'Speaker notes', heading: HeadingLevel.HEADING_3, spacing: { before: 120, after: 80 } }));
    children.push(new Paragraph({ text: slide.speakerNotes, spacing: { after: 160 } }));
  }

  return children;
}

export async function exportPresentationToDocx(input: unknown): Promise<Buffer> {
  const deck: PresentationDeck = normalizePresentationDeck(input, 'ilm AI Presentation');

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: deck.topic,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 220 },
          }),
          new Paragraph({
            text: 'Generated slide outline with speaker notes',
            alignment: AlignmentType.CENTER,
            spacing: { after: 420 },
          }),
          ...deck.slides.flatMap((slide, index) => slideParagraphs(slide, index)),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
