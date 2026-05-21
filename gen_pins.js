const topPins = [['SCL','i2c'],['SDA','i2c'],['AREF','ana'],['GND','gnd'],['D13','dig'],['D12','dig'],['D11','pwm'],['D10','pwm'],['D9','pwm'],['D8','dig'],null,['D7','dig'],['D6','pwm'],['D5','pwm'],['D4','dig'],['D3','pwm'],['D2','dig'],['D1','uart'],['D0','uart']];
const bottomPins = [['NC','ana'],['IOREF','ana'],['RESET','dig'],['3V3','pwr'],['5V','pwr'],['GND','gnd'],['GND2','gnd'],['VIN','pwr'],null,['A0','ana'],['A1','ana'],['A2','ana'],['A3','ana'],['A4','i2c'],['A5','i2c']];

let s = '    pins:[\n      ';
let x = 169;
let y = 28;
topPins.forEach(p => {
    if (p) {
        s += `{id:'${p[0]}',t:'${p[1]}',x:${x},y:${y},l:''},`;
        x += 9;
    } else {
        x += 6;
    }
});
s += '\n      ';
x = 192;
y = 197;
bottomPins.forEach(p => {
    if (p) {
        s += `{id:'${p[0]}',t:'${p[1]}',x:${x},y:${y},l:''},`;
        x += 9;
    } else {
        x += 6;
    }
});
s += '\n    ],';
console.log(s);
