import { describe, expect, it } from 'vitest';
import { shouldUseLocalSmallTalk } from './request-routing';

describe('shouldUseLocalSmallTalk', () => {
  it.each(['hi', 'Hyyyy!!', 'hello 👋', 'AOA', 'Assalam o Alaikum', 'thanks', '🙂✨', '???'])('%s stays local', (message) => {
    expect(shouldUseLocalSmallTalk(message)).toBe(true);
  });

  it.each(['force?', 'hi, explain gravity', 'what is photosynthesis', '2+2', 'presentation bana do'])('%s uses cloud AI', (message) => {
    expect(shouldUseLocalSmallTalk(message)).toBe(false);
  });
});
