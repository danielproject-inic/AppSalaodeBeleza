const { app, BrowserWindow, shell, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// CORREÇÃO CRÍTICA: Desabilitar GPU para evitar crash do processo GPU
// O sub-processo GPU do Chromium crasha com STATUS_DLL_NOT_FOUND (-1073741515).
// Estas flags forçam renderização por software e evitam o crash fatal.
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('no-sandbox');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 600,
    title: 'Salon Suite Pro',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // Configuração do Auto-Updater
  autoUpdater.autoDownload = true; // Baixa automaticamente quando encontra
  autoUpdater.autoInstallOnAppQuit = true; // Instala quando o app fecha, caso o usuário não clique em atualizar agora

  // Quando uma atualização for baixada
  autoUpdater.on('update-downloaded', (info) => {
    const dialogOpts = {
      type: 'info',
      buttons: ['Atualizar Agora', 'Cancelar'],
      title: 'Atualização Disponível',
      message: 'Uma nova versão do Salon Suite Pro está disponível!',
      detail: 'A atualização foi baixada e está pronta para ser instalada. Deseja reiniciar e instalar agora?'
    };

    dialog.showMessageBox(dialogOpts).then((returnValue) => {
      if (returnValue.response === 0) {
        // Usuário clicou em "Atualizar Agora"
        autoUpdater.quitAndInstall();
      }
    });
  });

  // Apenas tentar verificar se não for ambiente de desenvolvimento
  if (app.isPackaged) {
    autoUpdater.checkForUpdates().catch(err => {
      console.log('Não foi possível verificar atualizações:', err);
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
