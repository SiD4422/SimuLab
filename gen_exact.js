const topPins = [['SCL','i2c'],['SDA','i2c'],['AREF','ana'],['GND3','gnd'],['D13','dig'],['D12','dig'],['D11','pwm'],['D10','pwm'],['D9','pwm'],['D8','dig'],['D7','dig'],['D6','pwm'],['D5','pwm'],['D4','dig'],['D3','pwm'],['D2','dig'],['D1','uart'],['D0','uart']];
const topX = [198, 205, 213, 220, 227, 235, 242, 250, 257, 264, 276, 284, 291, 298, 305, 313, 320, 328];

const bottomPins = [['NC','ana'],['IOREF','ana'],['RESET','dig'],['3V3','pwr'],['5V','pwr'],['GND','gnd'],['GND2','gnd'],['VIN','pwr'],['A0','ana'],['A1','ana'],['A2','ana'],['A3','ana'],['A4','i2c'],['A5','i2c']];
const bottomX = [224, 232, 239, 247, 254, 261, 269, 276, 291, 298, 305, 313, 320, 328];

let s = '    pins:[\n      ';
topPins.forEach((p, i) => {
    s += `{id:'${p[0]}',t:'${p[1]}',x:${topX[i]},y:42,l:''},`;
});
s += '\n      ';
bottomPins.forEach((p, i) => {
    s += `{id:'${p[0]}',t:'${p[1]}',x:${bottomX[i]},y:182,l:''},`;
});
s += '\n    ],';
console.log(s);
