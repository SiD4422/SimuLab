const fs = require('fs');
const PNG = require('pngjs').PNG;

function findHoles(imageFile, targetW, targetH, numHoles) {
    if (!fs.existsSync(imageFile)) return null;
    const data = fs.readFileSync(imageFile);
    const png = PNG.sync.read(data);
    const scaleX = png.width / targetW;
    const scaleY = png.height / targetH;
    
    // Find all dark pixels
    let darkPixels = [];
    for (let y = 0; y < targetH; y++) {
        for (let x = 0; x < targetW; x++) {
            let origX = Math.floor(x * scaleX);
            let origY = Math.floor(y * scaleY);
            let idx = (png.width * origY + origX) << 2;
            let brightness = (png.data[idx] + png.data[idx+1] + png.data[idx+2]) / 3;
            // The holes/legs are usually black/dark grey
            if (png.data[idx+3] > 200 && brightness < 80) {
                darkPixels.push({x, y});
            }
        }
    }
    
    if (darkPixels.length === 0) {
        // relax threshold for silver pins?
        for (let y = 0; y < targetH; y++) {
            for (let x = 0; x < targetW; x++) {
                let origX = Math.floor(x * scaleX);
                let origY = Math.floor(y * scaleY);
                let idx = (png.width * origY + origX) << 2;
                let brightness = (png.data[idx] + png.data[idx+1] + png.data[idx+2]) / 3;
                if (png.data[idx+3] > 200 && brightness < 150) {
                    darkPixels.push({x, y});
                }
            }
        }
    }

    if (darkPixels.length === 0) return null;

    // K-means clustering to find `numHoles` centers
    let centers = [];
    // Initialize random centers
    for(let i=0; i<numHoles; i++) {
        centers.push({...darkPixels[Math.floor(Math.random()*darkPixels.length)]});
    }

    let iterations = 0;
    while(iterations < 50) {
        let clusters = Array(numHoles).fill(null).map(() => []);
        for (let p of darkPixels) {
            let minDist = Infinity;
            let bestC = 0;
            for(let i=0; i<numHoles; i++) {
                let dist = Math.pow(p.x - centers[i].x, 2) + Math.pow(p.y - centers[i].y, 2);
                if (dist < minDist) { minDist = dist; bestC = i; }
            }
            clusters[bestC].push(p);
        }
        
        let changed = false;
        for(let i=0; i<numHoles; i++) {
            if (clusters[i].length === 0) continue;
            let sumX = 0, sumY = 0;
            for (let p of clusters[i]) { sumX += p.x; sumY += p.y; }
            let newX = Math.round(sumX / clusters[i].length);
            let newY = Math.round(sumY / clusters[i].length);
            if (newX !== centers[i].x || newY !== centers[i].y) changed = true;
            centers[i].x = newX;
            centers[i].y = newY;
        }
        if (!changed) break;
        iterations++;
    }
    
    // Sort centers by X coordinate (left to right)
    centers.sort((a,b) => a.x - b.x);
    return centers;
}

const components = [
    { name: 'btn', file: 'button.png', w: 32, h: 32, pins: 4 },
    { name: 'pot', file: 'pot.png', w: 38, h: 46, pins: 3 },
    { name: 'hcsr04', file: 'ultrasonic.png', w: 70, h: 42, pins: 4 },
    { name: 'pir', file: 'pir.png', w: 50, h: 48, pins: 3 },
    { name: 'buzzer', file: 'buzzer.png', w: 32, h: 32, pins: 2 },
    { name: 'servo', file: 'servo.png', w: 60, h: 56, pins: 3 },
    { name: 'led', file: 'led.png', w: 26, h: 56, pins: 2 },
    { name: 'ldr', file: 'ldr.png', w: 26, h: 46, pins: 2 },
    { name: 'battery', file: 'battery.png', w: 120, h: 70, pins: 2 }
];

components.forEach(c => {
    const centers = findHoles('assets/tinkercad/' + c.file, c.w, c.h, c.pins);
    if (centers) {
        console.log(`\n${c.name}:`);
        centers.forEach((center, i) => console.log(`  Pin ${i+1}: { x: ${center.x}, y: ${center.y} }`));
    }
});
