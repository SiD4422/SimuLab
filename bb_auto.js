const fs = require('fs');
const PNG = require('pngjs').PNG;
const data = fs.readFileSync('assets/tinkercad/breadboard.png');
const png = PNG.sync.read(data);

const targetW = 400;
const targetH = 130;
const scaleX = png.width / targetW;
const scaleY = png.height / targetH;

const colProj = new Array(targetW).fill(0);
for (let y = 30; y < 75; y++) { 
    for (let x = 0; x < targetW; x++) {
        let origX = Math.floor(x * scaleX);
        let origY = Math.floor(y * scaleY);
        let idx = (png.width * origY + origX) << 2;
        let brightness = (png.data[idx] + png.data[idx+1] + png.data[idx+2]) / 3;
        if (brightness < 100) {
            colProj[x]++;
        }
    }
}

const cols = [];
for (let x = 1; x < targetW - 1; x++) {
    if (colProj[x] > 5 && colProj[x] > colProj[x-1] && colProj[x] >= colProj[x+1]) {
        cols.push(x);
    }
}
console.log('Detected Columns X:', cols.join(', '));

const rowProj = new Array(targetH).fill(0);
for (let x = 30; x < 370; x++) {
    for (let y = 0; y < targetH; y++) {
        let origX = Math.floor(x * scaleX);
        let origY = Math.floor(y * scaleY);
        let idx = (png.width * origY + origX) << 2;
        let brightness = (png.data[idx] + png.data[idx+1] + png.data[idx+2]) / 3;
        if (brightness < 100) {
            rowProj[y]++;
        }
    }
}

const rows = [];
for (let y = 1; y < targetH - 1; y++) {
    if (rowProj[y] > 10 && rowProj[y] > rowProj[y-1] && rowProj[y] >= rowProj[y+1]) {
        rows.push(y);
    }
}
console.log('Detected Rows Y:', rows.join(', '));
