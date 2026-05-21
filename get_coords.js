const fs = require('fs');
const PNG = require('pngjs').PNG;
const data = fs.readFileSync('assets/tinkercad/uno.png');
const png = PNG.sync.read(data);
const targetW = 360, targetH = 225;
const scaleX = png.width / targetW;
const scaleY = png.height / targetH;

function getHoleCenters(y) {
    let holes = [];
    let currentHole = [];
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
            currentHole.push(x);
        } else if (currentHole.length > 0) {
            holes.push(Math.round(currentHole.reduce((a,b)=>a+b,0)/currentHole.length));
            currentHole = [];
        }
    }
    if (currentHole.length > 0) {
        holes.push(Math.round(currentHole.reduce((a,b)=>a+b,0)/currentHole.length));
    }
    return holes;
}

console.log("Top holes X:", getHoleCenters(42).join(', '));
console.log("Bottom holes X:", getHoleCenters(182).join(', '));
