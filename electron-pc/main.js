const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    title: 'Netfilmes',
    backgroundColor: '#141414',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Maximiza a janela na inicialização
  win.maximize();

  // Carrega a URL do Netfilmes na Vercel (ou arquivo local se preferir)
  win.loadURL('https://netflimespp.vercel.app');

  // Remove menu padrão do Electron para estilo Netflix 100% limpo
  Menu.setApplicationMenu(null);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
