import { Noto_Nastaliq_Urdu } from 'next/font/google';

// Scoped to the bilingual kids-zone mini-games only (NumberWordMatchGame, UrduAddSubtractGame,
// ShapeColorMatchGame) — there's no app-wide Urdu-script/RTL support elsewhere, so this stays a
// small opt-in font rather than a global layout change. Apply `notoNastaliqUrdu.className` on the
// individual Urdu `<span dir="rtl" lang="ur">` text, not on page/layout wrappers.
export const notoNastaliqUrdu = Noto_Nastaliq_Urdu({
  subsets: ['arabic'],
  weight: ['400', '700'],
  display: 'swap',
});
