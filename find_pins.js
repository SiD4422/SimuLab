const fs = require('fs');
const PNG = require('pngjs').PNG;

const data = fs.readFileSync('assets/tinkercad/uno.png');
const png = PNG.sync.read(data);

const width = png.width;
const height = png.height;
console.log('Image dimensions:', width, 'x', height);

// Target scaling for workspace
const targetW = 360;
const scale = targetW / width;
const targetH = Math.round(height * scale);
console.log(`Target Dimensions: w:${targetW}, h:${targetH}`);

// Helper to check if a pixel is very dark (a hole)
function isHole(x, y) {
    const idx = (width * y + x) << 2;
    const r = png.data[idx];
    const g = png.data[idx+1];
    const b = png.data[idx+2];
    const a = png.data[idx+3];
    return a > 200 && r < 40 && g < 40 && b < 40;
}

// Find horizontal lines of holes
function findHoles(startY, endY) {
    const holes = [];
    for (let x = 0; x < width; x++) {
        let holePixels = 0;
        let sumX = 0;
        let sumY = 0;
        for (let y = startY; y <= endY; y++) {
            if (isHole(x, y)) {
                holePixels++;
                sumX += x;
                sumY += y;
            }
        }
        if (holePixels > 20) {
            holes.push({ x: sumX / holePixels, y: sumY / holePixels });
        }
    }
    
    // Group adjacent x coordinates
    const grouped = [];
    if (holes.length === 0) return grouped;
    
    let currentGroup = [holes[0]];
    for (let i = 1; i < holes.length; i++) {
        if (holes[i].x - holes[i-1].x < 10) { // within 10 pixels in original image
            currentGroup.push(holes[i]);
        } else {
            const avgX = currentGroup.reduce((s, h) => s + h.x, 0) / currentGroup.length;
            const avgY = currentGroup.reduce((s, h) => s + h.y, 0) / currentGroup.length;
            grouped.push({ x: avgX, y: avgY });
            currentGroup = [holes[i]];
        }
    }
    const avgX = currentGroup.reduce((s, h) => s + h.x, 0) / currentGroup.length;
    const avgY = currentGroup.reduce((s, h) => s + h.y, 0) / currentGroup.length;
    grouped.push({ x: avgX, y: avgY });
    
    return grouped;
}

const topHoles = findHoles(0, height / 3);
const bottomHoles = findHoles((height / 3) * 2, height);

console.log(`Found ${topHoles.length} top holes`);
topHoles.forEach((h, i) => {
    console.log(`Top ${i}: orig(x:${Math.round(h.x)}, y:${Math.round(h.y)}) -> target(x:${Math.round(h.x * scale)}, y:${Math.round(h.y * scale)})`);
});

console.log(`Found ${bottomHoles.length} bottom holes`);
bottomHoles.forEach((h, i) => {
    console.log(`Bottom ${i}: orig(x:${Math.round(h.x)}, y:${Math.round(h.y)}) -> target(x:${Math.round(h.x * scale)}, y:${Math.round(h.y * scale)})`);
});
