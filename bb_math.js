const fs = require('fs');
const PNG = require('pngjs').PNG;
const data = fs.readFileSync('assets/tinkercad/breadboard.png');
const png = PNG.sync.read(data);

const targetW = 400;
const targetH = 130;
const scaleX = png.width / targetW;
const scaleY = png.height / targetH;

// We'll write an SVG file overlaying a grid on the image to CWD
let svg = `<svg width="400" height="130" xmlns="http://www.w3.org/2000/svg">
  <image href="assets/tinkercad/breadboard.png" width="400" height="130" />
`;

let startX = 39.5; // Guessing
let pitchX = 10.66;
let startY = 32; // Guessing
let pitchY = 10.66;

for (let c = 0; c < 30; c++) {
    for (let r = 0; r < 5; r++) {
        let x = startX + c * pitchX;
        let y = startY + r * pitchY;
        svg += `<circle cx="${x}" cy="${y}" r="2" fill="red" />\n`;
    }
}

svg += `</svg>`;
fs.writeFileSync('bb_test.svg', svg);
console.log('Created bb_test.svg');
