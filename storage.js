const LS_USERS = 'ur_users';
const LS_DEPOSITS = 'ur_deposits';
const LS_SESSION = 'ur_session';
const LS_QR = 'ur_qr';

function getUsers() {
  try { return JSON.parse(localStorage.getItem(LS_USERS) || '[]'); } catch { return []; }
}
function setUsers(users) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}
function getDeposits() {
  try { return JSON.parse(localStorage.getItem(LS_DEPOSITS) || '[]'); } catch { return []; }
}
function setDeposits(deposits) {
  localStorage.setItem(LS_DEPOSITS, JSON.stringify(deposits));
}
function getSession() {
  try { return JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); } catch { return null; }
}
function setSession(user) {
  if (user) localStorage.setItem(LS_SESSION, JSON.stringify(user));
  else localStorage.removeItem(LS_SESSION);
}
function getQR() {
  return localStorage.getItem(LS_QR) || null;
}
function setQR(dataUrl) {
  if (dataUrl) localStorage.setItem(LS_QR, dataUrl);
}

function seedOwner() {
  const users = getUsers();
  const exists = users.find(u => u.mobile === '7379035467');
  if (!exists) {
    users.push({ name: 'Owner', mobile: '7379035467', password: '88888888', role: 'owner' });
    setUsers(users);
  }
}
seedOwner();

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
