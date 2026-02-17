const { contextBridge, ipcRenderer } = require('electron');

// BUG FIX: All IPC calls now pass the session token so main.cjs can verify
// permissions server-side. Previously the preload only exposed 4 handlers
// with no auth — any renderer code could call them regardless of user role.
//
// The token is retrieved from sessionStorage (set on login) and passed with
// every request. The main process validates it against its in-memory session
// store before executing any operation.

function getToken() {
  // Token is stored in sessionStorage by the React app on login.
  // sessionStorage is cleared when the Electron window closes.
  return sessionStorage.getItem('electrobill_session_token') || '';
}

contextBridge.exposeInMainWorld('api', {

  // ── AUTH ────────────────────────────────────────────────────────────────
  login: (username, password) =>
    ipcRenderer.invoke('auth-login', { username, password }),

  logout: () =>
    ipcRenderer.invoke('auth-logout', { token: getToken() }),

  changePassword: (currentPassword, newPassword) =>
    ipcRenderer.invoke('auth-change-password', { token: getToken(), currentPassword, newPassword }),

  createUser: (user) =>
    ipcRenderer.invoke('auth-create-user', { token: getToken(), ...user }),

  initDefaultAdmin: () =>
    ipcRenderer.invoke('auth-init-default-admin'),

  // ── ITEMS ────────────────────────────────────────────────────────────────
  getItems: () =>
    ipcRenderer.invoke('get-items', { token: getToken() }),

  addItem: (item) =>
    ipcRenderer.invoke('add-item', { token: getToken(), item }),

  updateItem: (item) =>
    ipcRenderer.invoke('update-item', { token: getToken(), item }),

  deleteItem: (id) =>
    ipcRenderer.invoke('delete-item', { token: getToken(), id }),

  // ── BACKUP ───────────────────────────────────────────────────────────────
  backupDb: () =>
    ipcRenderer.invoke('backup-db', { token: getToken() }),

  // ── AUDIT LOG ────────────────────────────────────────────────────────────
  getAuditLog: (limit) =>
    ipcRenderer.invoke('get-audit-log', { token: getToken(), limit }),
});
