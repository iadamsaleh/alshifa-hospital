const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs/promises");

const CLIENT_DEV_URL = "http://localhost:5173";

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Al-Shifa Diagnostic Centre",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    mainWindow.loadURL(CLIENT_DEV_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../client/dist/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

ipcMain.handle("open-external", async (_event, url) => {
  await shell.openExternal(url);
});

ipcMain.handle("export-pdf", async (event, suggestedName) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: "Save as PDF",
    defaultPath: suggestedName || "document.pdf",
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  if (canceled || !filePath) return { success: false };

  const pdfBuffer = await win.webContents.printToPDF({ printBackground: true });
  await fs.writeFile(filePath, pdfBuffer);
  return { success: true, filePath };
});

app.whenReady().then(() => {
  if (app.isPackaged) {
    // In production the app must run fully offline as a single package,
    // so the API server is started in-process instead of via a separate dev script.
    const { startServer } = require("../server/src/index.js");
    startServer();
  }
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
