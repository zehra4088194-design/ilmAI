/**
 * exportToPptx.js
 * ---------------------------------------------------------
 * Backend (Node.js) function — Groq se aaya hua JSON leke
 * asli, colorful .pptx file banata hai (download ke liye).
 *
 * Install: npm install pptxgenjs
 *
 * USAGE (e.g. in an Express route):
 *   const { exportToPptx } = require('./exportToPptx');
 *   const filePath = await exportToPptx(groqJSON, './output/deck.pptx');
 *   res.download(filePath);
 * ---------------------------------------------------------
 */

const pptxgen = require("pptxgenjs");

// Same theme tokens as SlideRenderer.jsx, converted to hex (no '#') for pptxgenjs
const THEMES = {
  "modern-blue": {
    bgFrom: "0F2C59", bgTo: "2E7BC4",
    accent: "5FD4D0", accent2: "FFC857",
    text: "F5F9FF", subtext: "BFD7F5", card: "1B4B8F",
  },
  "warm-academic": {
    bgFrom: "3A2418", bgTo: "9C6B3F",
    accent: "E8B15C", accent2: "C1442E",
    text: "FBF3E7", subtext: "E3C9A8", card: "6B4226",
  },
  "dark-tech": {
    bgFrom: "08090D", bgTo: "1B1E2B",
    accent: "00E5A0", accent2: "7B5CFF",
    text: "E9F1F0", subtext: "8FA3A0", card: "12141C",
  },
  "nature-green": {
    bgFrom: "0F2E1D", bgTo: "3E8E56",
    accent: "B7E778", accent2: "FFB86B",
    text: "F2FBF3", subtext: "C7E6CC", card: "1E5631",
  },
  "vibrant-purple": {
    bgFrom: "2B0B4E", bgTo: "B23BD9",
    accent: "FFD166", accent2: "4CE0D2",
    text: "FBF3FF", subtext: "E2C6F5", card: "6B1FA0",
  },
  "minimal-mono": {
    bgFrom: "FAFAFA", bgTo: "F0F0F0",
    accent: "111111", accent2: "8A8A8A",
    text: "111111", subtext: "555555", card: "EDEDED",
  },
};

function getTheme(name) {
  return THEMES[name] || THEMES["modern-blue"];
}

async function exportToPptx(data, outputPath = "./presentation.pptx") {
  const theme = getTheme(data.theme);
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE"; // 13.3" x 7.5" — widescreen, matches web ratio

  const W = 13.3;

  for (const slide of data.slides) {
    const s = pres.addSlide();
    s.background = { color: theme.bgFrom }; // pptxgenjs doesn't support gradients directly

    switch (slide.type) {
      case "title": {
        s.addText(slide.title, {
          x: 0.8, y: 2.6, w: W - 1.6, h: 1.4,
          fontFace: "Poppins", fontSize: 40, bold: true,
          color: theme.text, align: "center",
        });
        if (slide.subtitle) {
          s.addText(slide.subtitle, {
            x: 0.8, y: 4.0, w: W - 1.6, h: 0.8,
            fontFace: "Arial", fontSize: 18,
            color: theme.subtext, align: "center",
          });
        }
        s.addShape(pres.ShapeType.rect, {
          x: W / 2 - 0.5, y: 2.2, w: 1, h: 0.05,
          fill: { color: theme.accent }, line: { type: "none" },
        });
        break;
      }

      case "bullets": {
        s.addText(slide.title, {
          x: 0.7, y: 0.5, w: W - 1.4, h: 0.9,
          fontFace: "Poppins", fontSize: 28, bold: true, color: theme.text,
        });
        const items = (slide.bullets || []).map((b, i) => ({
          text: b,
          options: {
            bullet: { code: "25CF", indent: 20 },
            color: theme.text,
            fontSize: 18,
            fontFace: "Arial",
            breakLine: i !== slide.bullets.length - 1,
            paraSpaceAfter: 14,
          },
        }));
        s.addText(items, { x: 0.9, y: 1.7, w: W - 1.8, h: 5 });
        break;
      }

      case "two-column": {
        s.addText(slide.title, {
          x: 0.7, y: 0.5, w: W - 1.4, h: 0.8,
          fontFace: "Poppins", fontSize: 26, bold: true, color: theme.text,
        });
        const colW = (W - 2.2) / 2;
        [
          { col: slide.left, x: 0.7 },
          { col: slide.right, x: 0.7 + colW + 0.6 },
        ].forEach(({ col, x }) => {
          if (!col) return;
          s.addShape(pres.ShapeType.roundRect, {
            x, y: 1.6, w: colW, h: 5, fill: { color: theme.card }, line: { type: "none" },
            rectRadius: 0.12,
          });
          s.addText(col.heading || "", {
            x: x + 0.3, y: 1.85, w: colW - 0.6, h: 0.6,
            fontFace: "Poppins", fontSize: 20, bold: true, color: theme.accent,
          });
          const items = (col.bullets || []).map((b, i) => ({
            text: b,
            options: {
              bullet: { code: "25CF", indent: 14 },
              color: theme.text, fontSize: 14, fontFace: "Arial",
              breakLine: i !== col.bullets.length - 1, paraSpaceAfter: 10,
            },
          }));
          s.addText(items, { x: x + 0.3, y: 2.5, w: colW - 0.6, h: 3.9 });
        });
        break;
      }

      case "quote": {
        s.addText(`"${slide.quote}"`, {
          x: 1.2, y: 2.4, w: W - 2.4, h: 2,
          fontFace: "Georgia", fontSize: 26, italic: true,
          color: theme.text, align: "center",
        });
        if (slide.author) {
          s.addText(`— ${slide.author}`, {
            x: 1.2, y: 4.5, w: W - 2.4, h: 0.6,
            fontFace: "Arial", fontSize: 16, color: theme.subtext, align: "center",
          });
        }
        break;
      }

      case "stats": {
        s.addText(slide.title, {
          x: 0.7, y: 0.5, w: W - 1.4, h: 0.8,
          fontFace: "Poppins", fontSize: 26, bold: true, color: theme.text, align: "center",
        });
        const stats = slide.stats || [];
        const gap = 0.4;
        const cardW = Math.min(2.8, (W - 1.4 - gap * (stats.length - 1)) / Math.max(stats.length, 1));
        const totalW = cardW * stats.length + gap * (stats.length - 1);
        let x = (W - totalW) / 2;
        stats.forEach((st) => {
          s.addShape(pres.ShapeType.roundRect, {
            x, y: 2.2, w: cardW, h: 2.2, fill: { color: theme.card }, line: { type: "none" },
            rectRadius: 0.12,
          });
          s.addText(st.value, {
            x, y: 2.5, w: cardW, h: 1, fontFace: "Poppins", fontSize: 30, bold: true,
            color: theme.accent, align: "center",
          });
          s.addText(st.label, {
            x: x + 0.15, y: 3.5, w: cardW - 0.3, h: 0.8,
            fontFace: "Arial", fontSize: 13, color: theme.subtext, align: "center",
          });
          x += cardW + gap;
        });
        break;
      }

      case "section-break": {
        s.addShape(pres.ShapeType.roundRect, {
          x: W / 2 - 1, y: 2.5, w: 2, h: 0.5,
          fill: { color: theme.accent }, line: { type: "none" }, rectRadius: 0.25,
        });
        s.addText("SECTION", {
          x: W / 2 - 1, y: 2.5, w: 2, h: 0.5,
          fontFace: "Arial", fontSize: 12, bold: true, color: "101010", align: "center",
          valign: "middle", charSpacing: 2,
        });
        s.addText(slide.title, {
          x: 1, y: 3.2, w: W - 2, h: 1.2,
          fontFace: "Poppins", fontSize: 32, bold: true, color: theme.text, align: "center",
        });
        break;
      }

      case "closing": {
        s.addText(slide.title, {
          x: 0.8, y: 2.8, w: W - 1.6, h: 1.2,
          fontFace: "Poppins", fontSize: 38, bold: true, color: theme.text, align: "center",
        });
        if (slide.subtitle) {
          s.addText(slide.subtitle, {
            x: 0.8, y: 4.0, w: W - 1.6, h: 0.6,
            fontFace: "Arial", fontSize: 16, color: theme.subtext, align: "center",
          });
        }
        break;
      }

      default: {
        // fallback: treat unknown type as simple bullets/title
        s.addText(slide.title || "Slide", {
          x: 0.7, y: 0.6, w: W - 1.4, h: 1,
          fontFace: "Poppins", fontSize: 26, bold: true, color: theme.text,
        });
      }
    }
  }

  await pres.writeFile({ fileName: outputPath });
  return outputPath;
}

module.exports = { exportToPptx };
