const fs = require('fs');
const path = require('path');
const Module = require('module');

const target = path.resolve(__dirname, 'index.js');
const snippet = fs.readFileSync(path.resolve(__dirname, 'media-guard-snippet.js'), 'utf8');
const originalCompile = Module.prototype._compile;

Module.prototype._compile = function patchedCompile(content, filename) {
  if (path.resolve(filename) !== target) return originalCompile.call(this, content, filename);
  let next = content;
  const marker = 'async function processOneMessage(from, digits, msg) {';
  if (next.includes(marker)) {
    next = next.replace(marker, `${snippet}\n\n${marker}\n  if (await handleIncomingMediaPolicy(from, digits, msg)) return;`);
  }
  const textMarker = '  const reply = await getAiReply(digits, text, profile?.full_name || null);';
  if (next.includes(textMarker)) next = next.replace(textMarker, '  await maybeEscalateCEORequest(from, digits, text);\n\n' + textMarker);
  return originalCompile.call(this, next, filename);
};
