const fs = require('fs');
const PNG = require('pngjs').PNG;

const data = fs.readFileSync('assets/tinkercad/uno.png');
const png = PNG.sync.read(data);

const targetW = 360;
const targetH = 225;

const scaleX = png.width / targetW;
const scaleY = png.height / targetH;

// Let's print out X values for dark pixels in the top row (Y = 30 to 45)
console.log('Top row scan:');
for (let y = 35; y <= 45; y++) {
    let row = y.toString().padStart(3, '0') + ' ';
    for (let x = 140; x <= 340; x++) {
        let origX = Math.floor(x * scaleX);
        let origY = Math.floor(y * scaleY);
        let idx = (png.width * origY + origX) << 2;
        let r = png.data[idx];
        let g = png.data[idx+1];
        let b = png.data[idx+2];
        let a = png.data[idx+3];
        
        let brightness = (r + g + b) / 3;
        // The holes are black pixels with full alpha
        if (a > 200 && brightness < 30) {
            row += 'X';
        } else {
            row += ' ';
        }
    }
    if (row.includes('X')) console.log(row);
}

console.log('Bottom row scan:');
for (let y = 175; y <= 190; y++) {
    let row = y.toString().padStart(3, '0') + ' ';
    for (let x = 140; x <= 340; x++) {
        let origX = Math.floor(x * scaleX);
        let origY = Math.floor(y * scaleY);
        let idx = (png.width * origY + origX) << 2;
        let r = png.data[idx];
        let g = png.data[idx+1];
        let b = png.data[idx+2];
        let a = png.data[idx+3];
        
        let brightness = (r + g + b) / 3;
        if (a > 200 && brightness < 30) {
            row += 'X';
        } else {
            row += ' ';
        }
    }
    if (row.includes('X')) console.log(row);
}

