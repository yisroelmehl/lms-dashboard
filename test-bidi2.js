const bidi = require('bidi-js')();
const text = "שלום 123 עולם";
const { levels, paragraphs } = bidi.getEmbeddingLevels(text, 'rtr'); // RTL 
const v = bidi.getReorderSegments(text, levels, paragraphs);
console.log(v);
