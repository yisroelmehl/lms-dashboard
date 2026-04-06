const bidi = require('bidi-js')();
function visualOrder(text) {
  const res = bidi.getEmbeddingLevels(text, 'rtl');
  const segs = bidi.getReorderSegments(text, res);
  let out = "";
  for (let s of segs) { 
    let chunk = text.substring(s[0], s[1]);
    const level = res.levels[s[0]];
    const isRtl = (level % 2) === 1;
    if (isRtl) {
      out += chunk.split('').reverse().map(c => {
        const mirrors = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<' };
        return mirrors[c] || c;
      }).join('');
    } else {
      out += chunk;
    }
  }
  return out;
}
console.log(visualOrder("אני (123) שקראתי"));
