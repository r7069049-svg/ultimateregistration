const express = require('express');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const multer = require('multer');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const DEPOSITS_FILE = path.join(DATA_DIR, 'deposits.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw || '[]');
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

let users = readJson(USERS_FILE, []);
let deposits = readJson(DEPOSITS_FILE, []);

const OWNER_MOBILE = '7379035467';
const OWNER_PASSWORD = '88888888';

function ensureOwnerUser() {
  const exists = users.find(u => u.mobile === OWNER_MOBILE);
  if (!exists) {
    const passwordHash = bcrypt.hashSync(OWNER_PASSWORD, 10);
    const owner = { name: 'Owner', mobile: OWNER_MOBILE, passwordHash, role: 'owner' };
    users.push(owner);
    writeJson(USERS_FILE, users);
  }
}
ensureOwnerUser();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'ultimate-registration-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' }
}));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename: function (req, file, cb) {
    const ts = Date.now();
    const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}-${safeOriginal}`);
  }
});
const upload = multer({ storage });

app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/register', (req, res) => {
  const { name, mobile, password } = req.body;
  if (!name || !mobile || !password) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  if (String(mobile).length < 7) {
    return res.status(400).json({ error: 'Invalid mobile number' });
  }
  if (users.find(u => u.mobile === String(mobile))) {
    return res.status(409).json({ error: 'Mobile already registered' });
  }
  const passwordHash = bcrypt.hashSync(password, 10);
  const user = { name, mobile: String(mobile), passwordHash, role: 'user' };
  users.push(user);
  writeJson(USERS_FILE, users);
  res.json({ ok: true });
});

app.post('/api/login', (req, res) => {
  const { mobile, password } = req.body;
  if (!mobile || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }
  const user = users.find(u => u.mobile === String(mobile));
  if (!user) {
    return res.status(401).json({ error: 'Invalid mobile or password' });
  }
  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid mobile or password' });
  }
  req.session.user = { name: user.name, mobile: user.mobile, role: user.role };
  res.json({ ok: true, user: req.session.user });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get('/api/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

app.post('/api/deposit', upload.single('screenshot'), (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== 'user') {
    return res.status(401).json({ error: 'Not authorized' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Screenshot required' });
  }
  const record = {
    id: Date.now().toString(),
    userMobile: user.mobile,
    userName: user.name,
    uploadedAt: new Date().toISOString(),
    fileName: req.file.filename,
    fileUrl: `/uploads/${req.file.filename}`
  };
  deposits.push(record);
  writeJson(DEPOSITS_FILE, deposits);
  res.json({ ok: true, deposit: record });
});

app.get('/api/admin/deposits', (req, res) => {
  const user = req.session.user;
  if (!user || user.role !== 'owner') {
    return res.status(401).json({ error: 'Not authorized' });
  }
  res.json({ count: deposits.length, deposits });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
