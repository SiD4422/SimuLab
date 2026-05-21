const fs = require('fs');
const PNG = require('pngjs').PNG;
const data = fs.readFileSync('assets/tinkercad/breadboard.png');
const png = PNG.sync.read(data);
const targetW = 400;
const targetH = 130;
const scaleX = png.width / targetW;
const scaleY = png.height / targetH;

// The holes on the breadboard are slightly darker grey than the board.
// We can just find the darkest pixel in each column.
let rowStr = '';
for (let y = 10; y <= 120; y+=2) {
    let row = y.toString().padStart(3, '0') + ' ';
    for (let x = 30; x <= 370; x+=2) {
        let origX = Math.floor(x * scaleX);
        let origY = Math.floor(y * scaleY);
        let idx = (png.width * origY + origX) << 2;
        let brightness = (png.data[idx] + png.data[idx+1] + png.data[idx+2]) / 3;
        
        // Dark threshold for breadboard holes
        if (png.data[idx+3] > 200 && brightness < 120) {
            row += 'X';
        } else {
            row += ' ';
        }
    }
    if (row.includes('X')) console.log(row);
}
