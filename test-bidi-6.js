const bidi = require('bidi-js')();
console.log(bidi.getReorderSegments("אני (123) שקראתי", bidi.getEmbeddingLevels("אני (123) שקראתי", 'rtl')));
