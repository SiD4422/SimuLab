const fs = require('fs');
const PNG = require('pngjs').PNG;
const data = fs.readFileSync('assets/tinkercad/breadboard.png');
const png = PNG.sync.read(data);
const targetW = 400;
const targetH = 130;
const scaleX = png.width / targetW;
const scaleY = png.height / targetH;

console.log('Breadboard scan:');
for (let y = 5; y <= 125; y+=4) {
    let row = y.toString().padStart(3, '0') + ' ';
    for (let x = 10; x <= 390; x+=2) {
        let origX = Math.floor(x * scaleX);
        let origY = Math.floor(y * scaleY);
        let idx = (png.width * origY + origX) << 2;
        let r = png.data[idx];
        let g = png.data[idx+1];
        let b = png.data[idx+2];
        let a = png.data[idx+3];
        
        let brightness = (r + g + b) / 3;
        if (a > 200 && brightness < 40) {
            row += 'X';
        } else {
            row += ' ';
        }
    }
    console.log(row);
}
