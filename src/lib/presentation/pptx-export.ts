import pptxgen from 'pptxgenjs';
import { normalizePresentationDeck } from './generator';
import type { PresentationDeck } from './types';

const THEMES = {
  'modern-blue': { bg: '0F2C59', accent: '5FD4D0', accent2: 'FFC857', text: 'F5F9FF', subtext: 'BFD7F5', card: '1B4B8F' },
  'warm-academic': { bg: '3A2418', accent: 'E8B15C', accent2: 'C1442E', text: 'FBF3E7', subtext: 'E3C9A8', card: '6B4226' },
  'dark-tech': { bg: '08090D', accent: '00E5A0', accent2: '7B5CFF', text: 'E9F1F0', subtext: '8FA3A0', card: '12141C' },
  'nature-green': { bg: '0F2E1D', accent: 'B7E778', accent2: 'FFB86B', text: 'F2FBF3', subtext: 'C7E6CC', card: '1E5631' },
  'vibrant-purple': { bg: '2B0B4E', accent: 'FFD166', accent2: '4CE0D2', text: 'FBF3FF', subtext: 'E2C6F5', card: '6B1FA0' },
  'minimal-mono': { bg: 'FAFAFA', accent: '111111', accent2: '8A8A8A', text: '111111', subtext: '555555', card: 'EDEDED' },
} as const;

function themeFor(deck: PresentationDeck) {
  return THEMES[deck.theme] || THEMES['modern-blue'];
}

function addNotes(slide: pptxgen.Slide, notes?: string) {
  if (notes && typeof slide.addNotes === 'function') {
    slide.addNotes(notes);
  }
}

export async function exportPresentationToPptx(input: unknown): Promise<ArrayBuffer> {
  const deck = normalizePresentationDeck(input, 'ilm AI Presentation');
  const theme = themeFor(deck);
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_WIDE';
  pres.author = 'ilm AI';
  pres.subject = deck.topic;
  pres.title = deck.topic;
  pres.company = 'ilm AI';
  pres.theme = {
    headFontFace: 'Aptos Display',
    bodyFontFace: 'Aptos',
  };

  const width = 13.333;

  deck.slides.forEach((item, index) => {
    const slide = pres.addSlide();
    slide.background = { color: theme.bg };
    slide.addText(String(index + 1).padStart(2, '0'), {
      x: width - 1.2,
      y: 0.25,
      w: 0.7,
      h: 0.3,
      fontSize: 9,
      color: theme.subtext,
      align: 'right',
    });

    switch (item.type) {
      case 'title':
        slide.addShape(pres.ShapeType.rect, { x: width / 2 - 0.5, y: 2.1, w: 1, h: 0.06, fill: { color: theme.accent }, line: { color: theme.accent } });
        slide.addText(item.title || deck.topic, { x: 0.9, y: 2.5, w: width - 1.8, h: 1.25, fontFace: 'Aptos Display', fontSize: 38, bold: true, color: theme.text, align: 'center', fit: 'shrink' });
        if (item.subtitle) slide.addText(item.subtitle, { x: 1.2, y: 3.85, w: width - 2.4, h: 0.65, fontSize: 17, color: theme.subtext, align: 'center', fit: 'shrink' });
        break;
      case 'two-column': {
        slide.addText(item.title || 'Comparison', { x: 0.65, y: 0.65, w: width - 1.3, h: 0.65, fontFace: 'Aptos Display', fontSize: 26, bold: true, color: theme.text, fit: 'shrink' });
        const columnWidth = 5.75;
        [
          { col: item.left, x: 0.75 },
          { col: item.right, x: 6.85 },
        ].forEach(({ col, x }) => {
          slide.addShape(pres.ShapeType.roundRect, { x, y: 1.65, w: columnWidth, h: 4.75, fill: { color: theme.card, transparency: 5 }, line: { color: theme.card } });
          slide.addText(col?.heading || 'Key points', { x: x + 0.3, y: 1.95, w: columnWidth - 0.6, h: 0.45, fontSize: 18, bold: true, color: theme.accent, fit: 'shrink' });
          slide.addText((col?.bullets || []).map((text) => ({ text, options: { bullet: { indent: 14 }, breakLine: true } })), {
            x: x + 0.35,
            y: 2.6,
            w: columnWidth - 0.7,
            h: 3.35,
            fontSize: 13.5,
            color: theme.text,
            breakLine: false,
            fit: 'shrink',
          });
        });
        break;
      }
      case 'quote':
        slide.addText(`"${item.quote || item.title || deck.topic}"`, { x: 1.15, y: 2.25, w: width - 2.3, h: 1.8, fontFace: 'Georgia', fontSize: 25, italic: true, color: theme.text, align: 'center', fit: 'shrink' });
        if (item.author) slide.addText(`- ${item.author}`, { x: 1.2, y: 4.25, w: width - 2.4, h: 0.35, fontSize: 14, color: theme.subtext, align: 'center' });
        break;
      case 'stats': {
        slide.addText(item.title || 'Key insights', { x: 0.7, y: 0.7, w: width - 1.4, h: 0.65, fontFace: 'Aptos Display', fontSize: 25, bold: true, color: theme.text, align: 'center', fit: 'shrink' });
        const stats = (item.stats || []).slice(0, 4);
        const gap = 0.35;
        const cardWidth = Math.min(2.7, (width - 1.4 - gap * Math.max(stats.length - 1, 0)) / Math.max(stats.length, 1));
        let x = (width - (cardWidth * stats.length + gap * Math.max(stats.length - 1, 0))) / 2;
        stats.forEach((stat) => {
          slide.addShape(pres.ShapeType.roundRect, { x, y: 2.45, w: cardWidth, h: 2, fill: { color: theme.card, transparency: 5 }, line: { color: theme.card } });
          slide.addText(stat.value, { x: x + 0.15, y: 2.75, w: cardWidth - 0.3, h: 0.65, fontSize: 26, bold: true, color: theme.accent, align: 'center', fit: 'shrink' });
          slide.addText(stat.label, { x: x + 0.2, y: 3.55, w: cardWidth - 0.4, h: 0.55, fontSize: 12, color: theme.subtext, align: 'center', fit: 'shrink' });
          x += cardWidth + gap;
        });
        break;
      }
      case 'section-break':
        slide.addShape(pres.ShapeType.roundRect, { x: width / 2 - 0.95, y: 2.4, w: 1.9, h: 0.42, fill: { color: theme.accent }, line: { color: theme.accent } });
        slide.addText('SECTION', { x: width / 2 - 0.95, y: 2.47, w: 1.9, h: 0.18, fontSize: 10, bold: true, color: '101010', align: 'center', charSpacing: 2 });
        slide.addText(item.title || 'Next section', { x: 1, y: 3.15, w: width - 2, h: 1, fontFace: 'Aptos Display', fontSize: 31, bold: true, color: theme.text, align: 'center', fit: 'shrink' });
        break;
      case 'closing':
        slide.addText(item.title || 'Thank You', { x: 0.9, y: 2.8, w: width - 1.8, h: 0.95, fontFace: 'Aptos Display', fontSize: 36, bold: true, color: theme.text, align: 'center', fit: 'shrink' });
        if (item.subtitle) slide.addText(item.subtitle, { x: 1.1, y: 3.85, w: width - 2.2, h: 0.5, fontSize: 15, color: theme.subtext, align: 'center', fit: 'shrink' });
        break;
      default:
        slide.addText(item.title || 'Slide', { x: 0.7, y: 0.7, w: width - 1.4, h: 0.65, fontFace: 'Aptos Display', fontSize: 25, bold: true, color: theme.text, fit: 'shrink' });
        slide.addText((item.bullets || []).map((text) => ({ text, options: { bullet: { indent: 18 }, breakLine: true } })), {
          x: 1,
          y: 1.8,
          w: width - 2,
          h: 4.8,
          fontSize: 17,
          color: theme.text,
          fit: 'shrink',
        });
        break;
    }

    addNotes(slide, item.speakerNotes);
  });

  return await pres.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
}
