/**
 * SimuLab — Unified Server
 * - Auth (session-based, file-backed)
 * - Serves frontend with route guards
 * - POST /compile → avr-gcc → Intel HEX
 * - Teacher API: assignments, submissions, users
 */

const express    = require('express');
const cors       = require('cors');
const fs         = require('fs');
const path       = require('path');
const os         = require('os');
const { spawnSync }  = require('child_process');
const { v4: uuidv4 } = require('uuid');
const helmet         = require('helmet');
const session        = require('express-session');

const auth = require('./auth');
auth.ensureDataDir();

const app  = express();
const PORT = process.env.PORT || 3080;
const ROOT = __dirname;
const STUBS = path.join(ROOT, 'simulab_stubs.h');

// ── Middleware ─────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: false }));
app.use(express.json({ limit: '2mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'simulab-dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 8 * 60 * 60 * 1000,  // 8 hours
  },
}));

// ── Static (public assets only — CSS, JS, fonts) ──────────────
app.use('/css',    express.static(path.join(ROOT, 'css')));
app.use('/js',     express.static(path.join(ROOT, 'js')));
app.use('/assets', express.static(path.join(ROOT, 'assets')));

// ── Public routes ──────────────────────────────────────────────
app.get('/login',  (_, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(ROOT, 'login.html'));
});
app.get('/',       (_, res) => res.redirect('/simulator'));

// ── Auth API ───────────────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

  const user = await auth.verifyPassword(username, password);
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  req.session.user = user;
  res.json({ role: user.role, name: user.name });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/me', auth.requireAuth, (req, res) => {
  res.json(req.session.user);
});

// ── Protected page routes ──────────────────────────────────────
app.get('/simulator', auth.requireAuth, (_, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(ROOT, 'index.html'));
});
app.get('/gallery',   auth.requireAuth, (_, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(ROOT, 'gallery.html'));
});
app.get('/teacher',   auth.requireAuth, auth.requireTeacher, (_, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.sendFile(path.join(ROOT, 'teacher.html'));
});

// ── Student API ────────────────────────────────────────────────

// GET /api/assignments — list all assignments (student view)
app.get('/api/assignments', auth.requireAuth, (req, res) => {
  const assignments = auth.getAssignments();
  const subs = auth.getSubmissionsForUser(req.session.user.id);
  const result = assignments.map(a => ({
    ...a,
    submitted: subs.some(s => s.assignmentId === a.id),
    status: subs.find(s => s.assignmentId === a.id)?.status || null,
  }));
  res.json(result);
});

// POST /api/submit — student submits circuit + code
app.post('/api/submit', auth.requireAuth, (req, res) => {
  const { assignmentId, notes, circuit } = req.body || {};
  if (!assignmentId) return res.status(400).json({ error: 'assignmentId required' });

  const user = req.session.user;
  const sub = {
    id:           'sub_' + Date.now(),
    userId:       user.id,
    studentName:  user.name,
    assignmentId,
    notes:        (notes || '').slice(0, 500),
    submittedAt:  new Date().toISOString(),
    status:       'pending',
    circuit: {
      components: circuit?.components || [],
      wires:      circuit?.wires      || [],
      code:       (circuit?.code || '').slice(0, 50000),
    },
  };
  auth.addSubmission(sub);
  res.json({ ok: true, id: sub.id });
});

// ── Teacher API ────────────────────────────────────────────────

// GET /api/teacher/submissions
app.get('/api/teacher/submissions', auth.requireAuth, auth.requireTeacher, (req, res) => {
  res.json(auth.getSubmissions());
});

// POST /api/teacher/submissions/:id/complete
app.post('/api/teacher/submissions/:id/complete', auth.requireAuth, auth.requireTeacher, (req, res) => {
  const ok = auth.markSubmissionComplete(req.params.id);
  ok ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
});

// GET /api/teacher/users
app.get('/api/teacher/users', auth.requireAuth, auth.requireTeacher, (req, res) => {
  res.json(auth.listUsers());
});

// POST /api/teacher/users
app.post('/api/teacher/users', auth.requireAuth, auth.requireTeacher, async (req, res) => {
  const { username, password, role, name } = req.body || {};
  if (!username || !password || password.length < 6)
    return res.status(400).json({ error: 'Username and password (min 6 chars) required' });
  const result = await auth.createUser(username, password, role || 'student', name || username);
  if (result.error) return res.status(409).json(result);
  res.json(result);
});

// DELETE /api/teacher/users/:id
app.delete('/api/teacher/users/:id', auth.requireAuth, auth.requireTeacher, (req, res) => {
  if (req.params.id === req.session.user.id) return res.status(400).json({ error: "Can't delete yourself" });
  auth.deleteUser(req.params.id);
  res.json({ ok: true });
});

// POST /api/teacher/assignments
app.post('/api/teacher/assignments', auth.requireAuth, auth.requireTeacher, (req, res) => {
  const { title, description, dueDate } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Title required' });
  const a = auth.createAssignment(title, description || '', dueDate || null);
  res.json(a);
});

// DELETE /api/teacher/assignments/:id
app.delete('/api/teacher/assignments/:id', auth.requireAuth, auth.requireTeacher, (req, res) => {
  auth.deleteAssignment(req.params.id);
  res.json({ ok: true });
});

// ── Compiler ───────────────────────────────────────────────────
const STUB_LIBS = [
  'Wire.h','Adafruit_SSD1306.h','Adafruit_GFX.h','DHT.h',
  'LiquidCrystal_I2C.h','LiquidCrystal.h','Servo.h','SPI.h','EEPROM.h',
];

function prepareCode(userCode) {
  STUB_LIBS.forEach(lib => {
    const re = new RegExp(String.raw`#include\s*[<"]` + lib.replace('.', '\\.') + String.raw`[>"]`, 'g');
    userCode = userCode.replace(re, `// ${lib} — provided by SimuLab`);
  });
  return `#include "${STUBS}"\n\n${userCode}`;
}

const rateMap = new Map();

app.post('/compile', auth.requireAuth, (req, res) => {
  const ip  = req.ip;
  const now = Date.now();
  const last = rateMap.get(ip) || [];
  const recent = last.filter(t => now - t < 60000);
  if (recent.length >= 10) return res.status(429).json({ error: 'Rate limit: 10/min' });
  rateMap.set(ip, [...recent, now]);

  const userCode = (req.body.code || req.body.sketch || '').replace(/\0/g, '');
  if (!userCode.trim())      return res.status(400).json({ error: 'No code' });
  if (userCode.length > 50000) return res.status(400).json({ error: 'Code too large' });

  const board = req.body.board || 'atmega328p';
  const dir   = path.join(os.tmpdir(), `simulab_${uuidv4()}`);
  const cpp   = path.join(dir, 'sketch.cpp');
  const elf   = path.join(dir, 'sketch.elf');
  const hex   = path.join(dir, 'sketch.hex');

  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(cpp, prepareCode(userCode));

    let hexData = tryAvrgcc(board, cpp, elf, hex);
    if (!hexData.ok) hexData = tryArduinoCli(board, dir, userCode, hex);
    fs.rmSync(dir, { recursive: true, force: true });

    if (!hexData.ok) return res.status(422).json({ error: 'Compile error', stderr: hexData.stderr });
    return res.json({ hex: hexData.hex, warnings: hexData.warnings || '' });
  } catch (e) {
    fs.rmSync(dir, { recursive: true, force: true });
    return res.status(500).json({ error: e.message });
  }
});

function tryAvrgcc(board, cpp, elf, hex) {
  const r = spawnSync('avr-gcc', [
    `-mmcu=${board}`, '-DF_CPU=16000000UL', '-Os', '-std=c++11',
    '-fno-exceptions', '-x', 'c++', cpp, '-o', elf, '-lm',
  ], { timeout: 20000 });

  if (r.status !== 0) {
    const stderr = (r.stderr||'').toString().split('\n')
      .map(l => l.replace(/\/tmp\/simulab_[^/]+\//g,''))
      .filter(l => l.trim()).join('\n');
    return { ok: false, stderr };
  }
  spawnSync('avr-objcopy', ['-O','ihex','-R','.eeprom', elf, hex]);
  if (!fs.existsSync(hex)) return { ok: false, stderr: 'HEX not generated' };
  return { ok: true, hex: fs.readFileSync(hex, 'utf8'), warnings: r.stderr?.toString() };
}

function tryArduinoCli(board, dir, userCode, hex) {
  const sketchDir  = path.join(dir, 'sketch');
  const buildDir   = path.join(dir, 'build');
  fs.mkdirSync(sketchDir, { recursive: true });
  fs.mkdirSync(buildDir,  { recursive: true });
  fs.writeFileSync(path.join(sketchDir, 'sketch.ino'), prepareCode(userCode));
  const r = spawnSync('arduino-cli', [
    'compile','--fqbn','arduino:avr:uno','--build-path',buildDir,sketchDir,
  ], { timeout: 30000 });
  const hexFile = path.join(buildDir, 'sketch.ino.hex');
  if (r.status !== 0 || !fs.existsSync(hexFile)) return { ok: false, stderr: (r.stderr||'').toString() };
  return { ok: true, hex: fs.readFileSync(hexFile, 'utf8') };
}

// ── Health ─────────────────────────────────────────────────────
app.get('/health', (_, res) => {
  const gcc = spawnSync('avr-gcc',    ['--version'], { encoding: 'utf8' });
  const cli = spawnSync('arduino-cli',['version'],   { encoding: 'utf8' });
  res.json({
    status: 'ok',
    avr_gcc:     gcc.status === 0 ? gcc.stdout.split('\n')[0] : 'not found',
    arduino_cli: cli.status === 0 ? cli.stdout.trim()         : 'not found',
    node: process.version,
    uptime: Math.round(process.uptime()) + 's',
  });
});

// ── Start ──────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n⚡ SimuLab Server`);
  console.log(`   http://localhost:${PORT}           — landing`);
  console.log(`   http://localhost:${PORT}/login      — login`);
  console.log(`   http://localhost:${PORT}/simulator  — workspace (auth required)`);
  console.log(`   http://localhost:${PORT}/teacher    — teacher dashboard (teacher only)`);
  console.log(`   Ctrl+C to stop\n`);
});
