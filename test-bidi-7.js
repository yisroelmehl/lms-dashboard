const bidi = require('bidi-js')();
const levels = bidi.getEmbeddingLevels("אני 123 מצהיר", 'rtl');
const v = bidi.getReorderSegments("אני 123 מצהיר", levels);
console.log(v);
