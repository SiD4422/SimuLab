/**
 * SimuLab — auth.js
 * Simple file-based auth: users.json on disk
 * Roles: 'teacher' | 'student'
 *
 * Users file lives at DATA_DIR/users.json
 * Submissions at DATA_DIR/submissions.json
 * Assignments at DATA_DIR/assignments.json
 */

const fs    = require('fs');
const path  = require('path');
const bcrypt = require('bcrypt');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE       = path.join(DATA_DIR, 'users.json');
const SUBMISSIONS_FILE = path.join(DATA_DIR, 'submissions.json');
const ASSIGNMENTS_FILE = path.join(DATA_DIR, 'assignments.json');

// ── Init data dir ─────────────────────────────────────────────
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(USERS_FILE)) {
    // Seed: one teacher + one demo student
    const teacher_hash = bcrypt.hashSync('teacher123', 10);
    const student_hash = bcrypt.hashSync('student123', 10);
    writeJSON(USERS_FILE, [
      { id: 'u1', username: 'teacher', password: teacher_hash, role: 'teacher', name: 'Prof. Admin' },
      { id: 'u2', username: 'student1', password: student_hash, role: 'student', name: 'Demo Student' },
    ]);
    console.log('[Auth] Created default users — teacher:teacher123 / student1:student123');
  }

  if (!fs.existsSync(SUBMISSIONS_FILE)) writeJSON(SUBMISSIONS_FILE, []);
  if (!fs.existsSync(ASSIGNMENTS_FILE)) {
    writeJSON(ASSIGNMENTS_FILE, [
      {
        id: 'a1',
        title: 'LAB01 — Blink LED',
        description: 'Connect an LED to pin D13 with a 220Ω resistor. Write code to blink it every 500ms.',
        createdAt: new Date().toISOString(),
        dueDate: null,
      },
      {
        id: 'a2',
        title: 'LAB02 — Push Button',
        description: 'Connect a push button to D2. LED on D13 should light up only when button is pressed.',
        createdAt: new Date().toISOString(),
        dueDate: null,
      },
    ]);
  }
}

// ── JSON helpers ──────────────────────────────────────────────
function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch { return []; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// ── User API ──────────────────────────────────────────────────
function getUsers()  { return readJSON(USERS_FILE); }
function saveUsers(u){ writeJSON(USERS_FILE, u); }

function findUser(username) {
  return getUsers().find(u => u.username === username.toLowerCase().trim());
}

async function verifyPassword(username, password) {
  const user = findUser(username);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password);
  return ok ? { id: user.id, username: user.username, role: user.role, name: user.name } : null;
}

async function createUser(username, password, role, name) {
  const users = getUsers();
  if (users.find(u => u.username === username.toLowerCase().trim())) {
    return { error: 'Username already exists' };
  }
  const hash = await bcrypt.hash(password, 10);
  const user = {
    id: 'u' + Date.now(),
    username: username.toLowerCase().trim(),
    password: hash,
    role: role || 'student',
    name: name || username,
  };
  users.push(user);
  saveUsers(users);
  return { id: user.id, username: user.username, role: user.role, name: user.name };
}

function deleteUser(userId) {
  const users = getUsers().filter(u => u.id !== userId);
  saveUsers(users);
}

function listUsers() {
  return getUsers().map(u => ({ id: u.id, username: u.username, role: u.role, name: u.name }));
}

// ── Assignment API ────────────────────────────────────────────
function getAssignments() { return readJSON(ASSIGNMENTS_FILE); }
function saveAssignments(a){ writeJSON(ASSIGNMENTS_FILE, a); }

function createAssignment(title, description, dueDate) {
  const assignments = getAssignments();
  const a = { id: 'a' + Date.now(), title, description, dueDate: dueDate || null, createdAt: new Date().toISOString() };
  assignments.push(a);
  saveAssignments(assignments);
  return a;
}

function deleteAssignment(id) {
  saveAssignments(getAssignments().filter(a => a.id !== id));
}

// ── Submission API ────────────────────────────────────────────
function getSubmissions() { return readJSON(SUBMISSIONS_FILE); }
function saveSubmissions(s){ writeJSON(SUBMISSIONS_FILE, s); }

function addSubmission(sub) {
  const subs = getSubmissions();
  subs.push(sub);
  saveSubmissions(subs);
}

function markSubmissionComplete(id) {
  const subs = getSubmissions();
  const s = subs.find(x => x.id === id);
  if (s) { s.status = 'complete'; s.completedAt = new Date().toISOString(); }
  saveSubmissions(subs);
  return !!s;
}

function getSubmissionsForAssignment(assignmentId) {
  return getSubmissions().filter(s => s.assignmentId === assignmentId);
}

function getSubmissionsForUser(userId) {
  return getSubmissions().filter(s => s.userId === userId);
}

// ── Express middleware ────────────────────────────────────────
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Not authenticated' });
  return res.redirect('/login');
}

function requireTeacher(req, res, next) {
  if (req.session && req.session.user && req.session.user.role === 'teacher') return next();
  if (req.path.startsWith('/api/')) return res.status(403).json({ error: 'Teacher only' });
  return res.status(403).send('Forbidden');
}

module.exports = {
  ensureDataDir,
  verifyPassword, createUser, deleteUser, listUsers, findUser,
  getAssignments, createAssignment, deleteAssignment,
  getSubmissions, addSubmission, markSubmissionComplete,
  getSubmissionsForAssignment, getSubmissionsForUser,
  requireAuth, requireTeacher,
};
