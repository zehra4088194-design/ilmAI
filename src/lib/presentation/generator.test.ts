import { describe, expect, it, vi } from 'vitest';
import { ensurePresentationChartSlide, normalizePresentationDeck } from './generator';
vi.mock('./backgrounds', () => ({
  presentationBackgroundNameFromUrl: vi.fn(() => null),
  readPresentationBackground: vi.fn(),
}));
import { exportPresentationToPptx } from './pptx-export';

describe('presentation chart slides', () => {
  it('preserves chart type, labeled numeric data, and the data note', () => {
    const deck = normalizePresentationDeck(
      {
        slides: [
          { type: 'title', title: 'Topic' },
          {
            type: 'chart',
            title: 'Topic composition',
            chartType: 'pie',
            chartData: [
              { label: 'Core', value: 60 },
              { label: 'Applications', value: 40 },
            ],
            chartNote: 'Illustrative values',
          },
          { type: 'closing', title: 'Thank you' },
        ],
      },
      'Topic'
    );

    expect(deck.slides[1]).toMatchObject({
      type: 'chart',
      chartType: 'pie',
      chartData: [
        { label: 'Core', value: 60 },
        { label: 'Applications', value: 40 },
      ],
      chartNote: 'Illustrative values',
    });
  });

  it('adds one clearly illustrative chart when the generated deck has none', () => {
    const deck = normalizePresentationDeck(
      {
        slides: [
          { type: 'title', title: 'Topic' },
          { type: 'bullets', title: 'Key ideas', bullets: ['Idea one', 'Idea two'] },
          { type: 'bullets', title: 'Applications', bullets: ['Application one', 'Application two'] },
          { type: 'closing', title: 'Thank you' },
        ],
      },
      'Topic'
    );

    const result = ensurePresentationChartSlide(deck);
    const charts = result.slides.filter((slide) => slide.type === 'chart');

    expect(charts).toHaveLength(1);
    expect(charts[0]).toMatchObject({
      type: 'chart',
      chartType: 'bar',
      chartData: [
        { label: 'Application one', value: 1 },
        { label: 'Application two', value: 1 },
      ],
    });
    expect(charts[0]?.chartNote).toContain('not measured data');
    expect(result.slides).toHaveLength(4);
  });

  it('keeps only one chart in the generated deck', () => {
    const deck = normalizePresentationDeck(
      {
        slides: [
          { type: 'title', title: 'Topic' },
          {
            type: 'chart',
            title: 'First',
            chartData: [
              { label: 'A', value: 2 },
              { label: 'B', value: 3 },
            ],
          },
          {
            type: 'chart',
            title: 'Second',
            chartData: [
              { label: 'C', value: 4 },
              { label: 'D', value: 5 },
            ],
          },
          { type: 'closing', title: 'Thank you' },
        ],
      },
      'Topic'
    );

    expect(ensurePresentationChartSlide(deck).slides.filter((slide) => slide.type === 'chart')).toHaveLength(1);
  });

  it('exports a chart slide into a PowerPoint file', async () => {
    const pptx = await exportPresentationToPptx({
      topic: 'Topic',
      slides: [
        { type: 'title', title: 'Topic' },
        {
          type: 'chart',
          title: 'Topic categories',
          chartType: 'pie',
          chartData: [
            { label: 'Core', value: 60 },
            { label: 'Applications', value: 40 },
          ],
          chartNote: 'Illustrative values',
        },
        { type: 'closing', title: 'Thank you' },
      ],
    });

    expect(pptx.byteLength).toBeGreaterThan(1000);
  });
});
