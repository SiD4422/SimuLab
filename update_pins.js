const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const updates = {
  'btn': "    pins:[\\n      {id:'L1',t:'dig',x:2,y:6,l:''},{id:'L2',t:'dig',x:2,y:26,l:''},\\n      {id:'R1',t:'dig',x:30,y:6,l:''},{id:'R2',t:'dig',x:30,y:26,l:''}\\n    ],",
  'pot': "    pins:[{id:'VCC',t:'pwr',x:9,y:5,l:''},{id:'OUT',t:'ana',x:19,y:5,l:''},{id:'GND',t:'gnd',x:29,y:5,l:''}],",
  'hcsr04': "    pins:[{id:'VCC',t:'pwr',x:19,y:40,l:''},{id:'TRIG',t:'dig',x:29,y:40,l:''},\\n          {id:'ECHO',t:'dig',x:40,y:40,l:''},{id:'GND',t:'gnd',x:51,y:40,l:''}],",
  'pir': "    pins:[{id:'GND',t:'gnd',x:15,y:46,l:''},{id:'OUT',t:'dig',x:25,y:46,l:''},{id:'VCC',t:'pwr',x:35,y:46,l:''}],",
  'buzzer': "    pins:[{id:'P',t:'dig',x:11,y:28,l:''},{id:'N',t:'gnd',x:21,y:28,l:''}],",
  'servo': "    pins:[{id:'GND',t:'gnd',x:10,y:52,l:''},{id:'VCC',t:'pwr',x:15,y:52,l:''},{id:'SIG',t:'pwm',x:20,y:52,l:''}],",
  'led-r': "    pins:[{id:'A',t:'dig',x:17,y:52,l:''},{id:'K',t:'gnd',x:9,y:52,l:''}],",
  'led-g': "    pins:[{id:'A',t:'dig',x:17,y:52,l:''},{id:'K',t:'gnd',x:9,y:52,l:''}],",
  'led-b': "    pins:[{id:'A',t:'dig',x:17,y:52,l:''},{id:'K',t:'gnd',x:9,y:52,l:''}],",
  'led-y': "    pins:[{id:'A',t:'dig',x:17,y:52,l:''},{id:'K',t:'gnd',x:9,y:52,l:''}],",
  'ldr': "    pins:[{id:'P1',t:'dig',x:8,y:42,l:''},{id:'P2',t:'dig',x:18,y:42,l:''}],",
  'battery': "    pins:[{id:'VCC',t:'pwr',x:5,y:22,l:''},{id:'GND',t:'gnd',x:5,y:48,l:''}],",
};

for (const [comp, newPins] of Object.entries(updates)) {
  const regex = new RegExp(`(${comp}:\\{.*?(?:\\n.*?)*?)pins:\\[.*?(?:\\n.*?)*?\\],`, 'g');
  content = content.replace(regex, `$1${newPins}`);
}

fs.writeFileSync('index.html', content);
console.log('Updated index.html pins');
