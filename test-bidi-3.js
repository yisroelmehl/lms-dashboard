const bidi = require('bidi-js')();
const text = "שלום 123 עולם";
const res = bidi.getEmbeddingLevels(text, 'rtl');
const segs = bidi.getReorderSegments(text, res, null);
let out = "";
for (let s of segs) { out += text.substring(s[0], s[1]).split('').reverse().join(''); }
console.log(out);
