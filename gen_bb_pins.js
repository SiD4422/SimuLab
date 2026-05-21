function generateBreadboardPins() {
  const pins = [];
  const startX = 37.5;
  const pitchX = 10.9;
  
  const yRows = {
    pwrTopPlus: 10,
    pwrTopMinus: 18,
    j: 33.5,
    i: 38.7,
    h: 44,
    g: 49.3,
    f: 54.5,
    e: 70,
    d: 75.3,
    c: 80.6,
    b: 86,
    a: 91.3,
    pwrBotPlus: 107,
    pwrBotMinus: 115
  };

  // Main grid: columns 1 to 30, rows A-J
  const letters = ['a','b','c','d','e','f','g','h','i','j'];
  for (let c = 1; c <= 30; c++) {
    let x = startX + (c - 1) * pitchX;
    letters.forEach(l => {
      pins.push({ id: l + c, t: 'dig', x: Math.round(x), y: Math.round(yRows[l]), l: '' });
    });
  }

  // Power rails (5 groups of 5)
  // Usually, columns align with the main grid, starting at col 2, then skipping col 7, starting col 8, etc.
  // Wait, let's just make them 25 holes spaced by pitchX but grouped? No, the power rail holes usually perfectly align with columns.
  // Let's just output them as a solid line of 25 holes if we aren't sure, or align them exactly with Tinkercad.
  // In Tinkercad, power holes align with cols: 2-6, 8-12, 14-18, 20-24, 26-30. Total = 25 holes.
  let pwrIndex = 1;
  for (let c = 1; c <= 30; c++) {
    if (c % 6 === 1) continue; // skip 1, 7, 13, 19, 25 (the gaps between groups)
    let x = startX + (c - 1) * pitchX;
    pins.push({ id: 'tp' + pwrIndex, t: 'pwr', x: Math.round(x), y: Math.round(yRows.pwrTopPlus), l: '+' });
    pins.push({ id: 'tm' + pwrIndex, t: 'gnd', x: Math.round(x), y: Math.round(yRows.pwrTopMinus), l: '-' });
    pins.push({ id: 'bp' + pwrIndex, t: 'pwr', x: Math.round(x), y: Math.round(yRows.pwrBotPlus), l: '+' });
    pins.push({ id: 'bm' + pwrIndex, t: 'gnd', x: Math.round(x), y: Math.round(yRows.pwrBotMinus), l: '-' });
    pwrIndex++;
  }
  return pins;
}
console.log(generateBreadboardPins().length + ' pins generated');
console.log(generateBreadboardPins()[0]);
