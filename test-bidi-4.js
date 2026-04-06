const bidiFactory = require('bidi-js');
const bidi = bidiFactory();

function mirrorChar(c) {
  const mirrors = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<' };
  return mirrors[c] || c;
}

function visualOrder(text) {
  const res = bidi.getEmbeddingLevels(text, 'rtl');
  const segs = bidi.getReorderSegments(text, res);
  let out = "";
  for (let s of segs) { 
    let chunk = text.substring(s[0], s[1]);
    const isRtl = (res.levels[s[0]] % 2) === 1;
    if (isRtl) {
      out += chunk.split('').reverse().map(mirrorChar).join('');
    } else {
      out += chunk;
    }
  }
  return out;
}
console.log(visualOrder("שלום (123) עולם"));
console.log(visualOrder("אני 123 מצהיר בזאת שקראתי"));
