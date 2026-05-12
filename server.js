/**
 * SimuLab — Unified Server
 * - Serves frontend (index.html, workspace.html, assets)
 * - POST /compile → avr-gcc → Intel HEX
 * - GET  /health  → status check
 *
 * Deploy on Railway / Render / any Node host with avr-gcc
 */

const express    = require('express');
const cors       = require('cors');
const fs         = require('fs');
const path       = require('path');
const os         = require('os');
const { spawnSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');

const app  = express();
const PORT = process.env.PORT || 3001;
const ROOT = __dirname;
const STUBS = path.join(ROOT, 'simulab_stubs.h');

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ── Serve frontend files ───────────────────────────────────────
app.use(express.static(ROOT, {
  extensions: ['html'],
  index: 'index.html',
}));

// Explicit routes for clean URLs
app.get('/',          (_, res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('/simulator', (_, res) => res.sendFile(path.join(ROOT, 'workspace.html')));
app.get('/workspace', (_, res) => res.sendFile(path.join(ROOT, 'workspace.html')));

// ── Includes to strip (already in stubs) ──────────────────────
const STUB_LIBS = [
  'Wire.h', 'Adafruit_SSD1306.h', 'Adafruit_GFX.h',
  'DHT.h', 'LiquidCrystal_I2C.h', 'LiquidCrystal.h',
  'Servo.h', 'SPI.h', 'EEPROM.h',
];

function prepareCode(userCode) {
  STUB_LIBS.forEach(lib => {
    const re = new RegExp(
      String.raw`#include\s*[<"]` + lib.replace('.', '\\.') + String.raw`[>"]`, 'g'
    );
    userCode = userCode.replace(re, `// ${lib} — provided by SimuLab`);
  });
  return `#include "${STUBS}"\n\n${userCode}`;
}

// ── POST /compile ─────────────────────────────────────────────
app.post('/compile', (req, res) => {
  const userCode = req.body.code || req.body.sketch || '';
  const board    = req.body.board || 'atmega328p';

  if (!userCode.trim()) {
    return res.status(400).json({ error: 'No code provided' });
  }

  const dir = path.join(os.tmpdir(), `simulab_${uuidv4()}`);
  const cpp = path.join(dir, 'sketch.cpp');
  const elf = path.join(dir, 'sketch.elf');
  const hex = path.join(dir, 'sketch.hex');

  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cpp, prepareCode(userCode));

    // Try avr-gcc first, fallback to arduino-cli
    let hexData = tryAvrgcc(board, cpp, elf, hex);
    if (!hexData.ok) {
      hexData = tryArduinoCli(board, dir, userCode, hex);
    }

    fs.rmSync(dir, { recursive: true, force: true });

    if (!hexData.ok) {
      return res.status(422).json({
        error: 'Compile error',
        stderr: hexData.stderr,
      });
    }

    return res.json({ hex: hexData.hex });

  } catch (e) {
    fs.rmSync(dir, { recursive: true, force: true });
    return res.status(500).json({ error: e.message });
  }
});

function tryAvrgcc(board, cpp, elf, hex) {
  const r = spawnSync('avr-gcc', [
    `-mmcu=${board}`, '-DF_CPU=16000000UL', '-Os',
    '-std=c++11', '-fno-exceptions', '-x', 'c++',
    cpp, '-o', elf, '-lm',
  ], { timeout: 20000 });

  if (r.status !== 0) {
    const stderr = (r.stderr || '').toString()
      .split('\n')
      .map(l => l.replace(/\/tmp\/simulab_[^/]+\//g, ''))
      .filter(l => l.trim())
      .join('\n');
    return { ok: false, stderr };
  }

  spawnSync('avr-objcopy', ['-O', 'ihex', '-R', '.eeprom', elf, hex]);

  if (!fs.existsSync(hex)) return { ok: false, stderr: 'HEX not generated' };
  return { ok: true, hex: fs.readFileSync(hex, 'utf8') };
}

function tryArduinoCli(board, dir, userCode, hex) {
  // Fallback: arduino-cli (if installed)
  const sketchDir  = path.join(dir, 'sketch');
  const sketchFile = path.join(sketchDir, 'sketch.ino');
  const buildDir   = path.join(dir, 'build');
  fs.mkdirSync(sketchDir, { recursive: true });
  fs.mkdirSync(buildDir,  { recursive: true });
  fs.writeFileSync(sketchFile, userCode);

  const r = spawnSync('arduino-cli', [
    'compile', '--fqbn', 'arduino:avr:uno',
    '--build-path', buildDir, sketchDir,
  ], { timeout: 30000 });

  const hexFile = path.join(buildDir, 'sketch.ino.hex');
  if (r.status !== 0 || !fs.existsSync(hexFile)) {
    return { ok: false, stderr: (r.stderr || '').toString() };
  }
  return { ok: true, hex: fs.readFileSync(hexFile, 'utf8') };
}

// ── GET /health ────────────────────────────────────────────────
app.get('/health', (_, res) => {
  const gcc = spawnSync('avr-gcc', ['--version'], { encoding: 'utf8' });
  const cli = spawnSync('arduino-cli', ['version'],  { encoding: 'utf8' });
  res.json({
    status:      'ok',
    avr_gcc:     gcc.status === 0 ? gcc.stdout.split('\n')[0] : 'not found',
    arduino_cli: cli.status === 0 ? cli.stdout.trim()         : 'not found',
    node:        process.version,
    uptime:      Math.round(process.uptime()) + 's',
  });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n⚡ SimuLab Server`);
  console.log(`   http://localhost:${PORT}`);
  console.log(`   http://localhost:${PORT}/simulator`);
  console.log(`   POST http://localhost:${PORT}/compile`);
  console.log(`   Ctrl+C to stop\n`);
});
