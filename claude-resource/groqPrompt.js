/**
 * groqPrompt.js
 * ---------------------------------------------------------
 * Ye file Groq API ko bhejne wala SYSTEM PROMPT banati hai.
 * Groq se sirf CLEAN STRUCTURED JSON wapis aayega — koi
 * design/formatting nahi — design hum khud (SlideRenderer +
 * exportToPptx) mein control karte hain. Isi liye result
 * hamesha consistent aur "beautiful" nazar aata hai, chahay
 * Groq ka model chota/tez hi kyun na ho.
 * ---------------------------------------------------------
 */

// Groq ko bhejne wala system prompt
function buildSystemPrompt() {
  return `Tum ek expert university-level presentation content writer ho.
Tumhara kaam sirf CONTENT plan karna hai — design tum nahi banao ge.

STRICT RULES:
1. Sirf JSON return karo. Koi markdown fences (\`\`\`), koi extra text, koi preamble nahi.
2. JSON isi schema ke mutabiq ho:

{
  "topic": "string - presentation ka title",
  "theme": "one of: modern-blue | warm-academic | dark-tech | nature-green | vibrant-purple | minimal-mono",
  "slides": [
    {
      "type": "title",
      "title": "string",
      "subtitle": "string (optional)"
    },
    {
      "type": "bullets",
      "title": "string",
      "bullets": ["point 1", "point 2", "point 3"]
    },
    {
      "type": "two-column",
      "title": "string",
      "left": { "heading": "string", "bullets": ["..."] },
      "right": { "heading": "string", "bullets": ["..."] }
    },
    {
      "type": "quote",
      "quote": "string",
      "author": "string (optional)"
    },
    {
      "type": "stats",
      "title": "string",
      "stats": [ { "value": "92%", "label": "short label" } ]
    },
    {
      "type": "section-break",
      "title": "string (e.g. 'Chapter 2: Methodology')"
    },
    {
      "type": "closing",
      "title": "string (e.g. 'Shukriya' or 'Thank You')",
      "subtitle": "string (optional, e.g. contact/QA info)"
    }
  ]
}

3. Slide types ko MIX karo — sirf "bullets" type repeat mat karo. Kam az kam 6-10 slides
   university presentation ke liye, jisme 1 title slide, 1-2 section-break, kuch bullets,
   1 two-column (comparison ho to), 1 stats (agar numbers/data available hon), aur 1 closing
   slide zaroor ho.
4. Har bullet chhota aur clear ho (max ~12-15 words), lecture-note jaisa, essay jaisa nahi.
5. "theme" ka intekhaab topic ki nature dekh kar karo (e.g. science/tech -> dark-tech ya modern-blue,
   history/literature -> warm-academic, environment -> nature-green).
6. Poora content Roman Urdu/Urdu-English mix mein likha ja sakta hai agar user ne wahi zaban
   istemal ki ho apne prompt mein, warna English mein likho.

Ab user ke diye gaye topic/prompt par ye JSON banao.`;
}

/**
 * Groq API ko call karne wala function.
 * @param {string} apiKey - Groq API key
 * @param {string} userTopic - Student ka topic/prompt, e.g. "Photosynthesis par 8 slides bana do"
 * @param {number} slideCount - Optional, kitni slides chahiye (default: model khud decide karega)
 */
async function generatePresentationJSON(apiKey, userTopic, slideCount = null) {
  const userPrompt = slideCount
    ? `Topic: ${userTopic}\nTotal slides: approx ${slideCount}`
    : `Topic: ${userTopic}`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile", // Groq ka fast + capable free-tier model
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }, // Groq ko force karta hai valid JSON dene ke liye
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const rawContent = data.choices?.[0]?.message?.content || "";

  // Safety: agar model ne kabhi ```json fences daal diye to unhe hata do
  const cleaned = rawContent.replace(/```json|```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error("Groq se invalid JSON aaya. Raw response: " + rawContent);
  }

  return parsed; // { topic, theme, slides: [...] }
}

module.exports = { buildSystemPrompt, generatePresentationJSON };
