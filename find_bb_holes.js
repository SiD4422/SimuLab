const fs = require('fs');
const PNG = require('pngjs').PNG;

const data = fs.readFileSync('assets/tinkercad/breadboard.png');
const png = PNG.sync.read(data);

// find all dark pixels (the holes)
// hole color is around #2a2a2a, let's say R<50, G<50, B<50
let holes = [];

// A breadboard hole is around 3x3 or 4x4 pixels.
// Let's find contiguous dark regions and compute their centroid.

let visited = new Uint8Array(png.width * png.height);

function isDark(x, y) {
  if (x < 0 || x >= png.width || y < 0 || y >= png.height) return false;
  let idx = (png.width * y + x) << 2;
  return png.data[idx] < 60 && png.data[idx+1] < 60 && png.data[idx+2] < 60;
}

for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    if (visited[y * png.width + x]) continue;
    if (isDark(x, y)) {
      // flood fill
      let q = [[x, y]];
      visited[y * png.width + x] = 1;
      let sumX = 0, sumY = 0, count = 0;
      
      while(q.length > 0) {
        let [cx, cy] = q.pop();
        sumX += cx;
        sumY += cy;
        count++;
        
        let neighbors = [[cx+1,cy], [cx-1,cy], [cx,cy+1], [cx,cy-1]];
        for(let [nx, ny] of neighbors) {
          if (nx >= 0 && nx < png.width && ny >= 0 && ny < png.height) {
            if (!visited[ny * png.width + nx] && isDark(nx, ny)) {
              visited[ny * png.width + nx] = 1;
              q.push([nx, ny]);
            }
          }
        }
      }
      
      if (count > 2 && count < 60) { // filter out too small or too large artifacts
        holes.push({ x: sumX / count, y: sumY / count });
      }
    }
  }
}

console.log(`Found ${holes.length} potential holes.`);

// cluster by Y
let rows = {};
for (let h of holes) {
  let matched = false;
  for (let ry in rows) {
    if (Math.abs(Number(ry) - h.y) < 2) {
      rows[ry].push(h.x);
      matched = true;
      break;
    }
  }
  if (!matched) {
    rows[h.y.toFixed(2)] = [h.x];
  }
}

for (let ry in rows) {
  rows[ry].sort((a,b)=>a-b);
  let avgY = ry;
  let xs = rows[ry];
  // Calculate average pitch
  let pitchSum = 0;
  for(let i=1; i<xs.length; i++){
    pitchSum += (xs[i] - xs[i-1]);
  }
  let avgPitch = xs.length > 1 ? pitchSum / (xs.length-1) : 0;
  console.log(`Row Y: ${Number(avgY).toFixed(2)}, Holes: ${xs.length}, startX: ${xs[0].toFixed(2)}, endX: ${xs[xs.length-1].toFixed(2)}, avgPitch: ${avgPitch.toFixed(2)}`);
}
