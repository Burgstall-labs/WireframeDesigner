const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference of the window object
let mainWindow;
let isDevMode = process.argv.includes('--dev');

/**
 * Create the main application window
 */
function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'electron-preload.js'),
            webSecurity: true,
            allowRunningInsecureContent: false
        },
        icon: getIconPath(),
        title: 'Wireframe Designer',
        show: false, // Don't show until ready
        titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default'
    });

    // Load the app
    const startUrl = path.join(__dirname, 'index.html');
    mainWindow.loadFile(startUrl);

    // Show window when ready to prevent visual flash
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // Focus on window (optional)
        if (process.platform === 'darwin') {
            app.dock.show();
        }
    });

    // Open DevTools in development mode
    if (isDevMode) {
        mainWindow.webContents.openDevTools();
    }

    // Handle window closed
    mainWindow.on('closed', function () {
        mainWindow = null;
    });

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    // Prevent navigation to external sites
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        if (parsedUrl.origin !== 'file://') {
            event.preventDefault();
        }
    });
}

/**
 * Get appropriate icon path for current platform
 */
function getIconPath() {
    if (process.platform === 'win32') {
        return path.join(__dirname, 'build-resources', 'icon.ico');
    } else if (process.platform === 'darwin') {
        return path.join(__dirname, 'build-resources', 'icon.icns');
    } else {
        return path.join(__dirname, 'build-resources', 'icon.png');
    }
}

/**
 * Create application menu
 */
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Animation',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('menu-new-animation');
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Export Animation...',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => {
                        mainWindow.webContents.send('menu-export-animation');
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: 'Quit',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                { role: 'undo' },
                { role: 'redo' },
                { type: 'separator' },
                { role: 'cut' },
                { role: 'copy' },
                { role: 'paste' }
            ]
        },
        {
            label: 'View',
            submenu: [
                { role: 'reload' },
                { role: 'forceReload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'resetZoom' },
                { role: 'zoomIn' },
                { role: 'zoomOut' },
                { type: 'separator' },
                { role: 'togglefullscreen' }
            ]
        },
        {
            label: 'Window',
            submenu: [
                { role: 'minimize' },
                { role: 'close' }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'About Wireframe Designer',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About Wireframe Designer',
                            message: 'Wireframe Designer',
                            detail: 'Version 1.0.0\n\nA simple tool to create rotating wireframe animations of 3D shapes and export them as animated GIFs or WebM videos.\n\nBuilt with Three.js and Electron.',
                            buttons: ['OK']
                        });
                    }
                },
                {
                    type: 'separator'
                },
                {
                    label: 'View on GitHub',
                    click: () => {
                        shell.openExternal('https://github.com/Burgstall-labs/WireframeDesigner');
                    }
                }
            ]
        }
    ];

    // macOS specific menu adjustments
    if (process.platform === 'darwin') {
        template.unshift({
            label: app.getName(),
            submenu: [
                { role: 'about' },
                { type: 'separator' },
                { role: 'services' },
                { type: 'separator' },
                { role: 'hide' },
                { role: 'hideOthers' },
                { role: 'unhide' },
                { type: 'separator' },
                { role: 'quit' }
            ]
        });

        // Window menu adjustments for macOS
        template[4].submenu = [
            { role: 'close' },
            { role: 'minimize' },
            { role: 'zoom' },
            { type: 'separator' },
            { role: 'front' }
        ];
    }

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

/**
 * Handle save file dialog
 */
async function handleSaveFile(defaultName, filters, buffer) {
    try {
        const result = await dialog.showSaveDialog(mainWindow, {
            defaultPath: defaultName,
            filters: filters || [
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (!result.canceled && result.filePath) {
            await fs.promises.writeFile(result.filePath, buffer);
            return { success: true, filePath: result.filePath };
        }

        return { success: false, cancelled: true };
    } catch (error) {
        console.error('Error saving file:', error);
        return { success: false, error: error.message };
    }
}

/**
 * IPC handlers
 */
function setupIpcHandlers() {
    // Handle file save requests from renderer
    ipcMain.handle('save-file', async (event, { defaultName, filters, buffer }) => {
        return await handleSaveFile(defaultName, filters, Buffer.from(buffer));
    });

    // Handle show error dialog
    ipcMain.handle('show-error', async (event, { title, content }) => {
        return await dialog.showErrorBox(title, content);
    });

    // Handle show info dialog
    ipcMain.handle('show-info', async (event, { title, message, detail }) => {
        return await dialog.showMessageBox(mainWindow, {
            type: 'info',
            title,
            message,
            detail,
            buttons: ['OK']
        });
    });

    // Handle app version request
    ipcMain.handle('get-app-version', () => {
        return app.getVersion();
    });

    // Handle platform request
    ipcMain.handle('get-platform', () => {
        return process.platform;
    });
}

/**
 * App event handlers
 */
app.whenReady().then(() => {
    createWindow();
    createMenu();
    setupIpcHandlers();

    app.on('activate', function () {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, url) => {
        event.preventDefault();
        shell.openExternal(url);
    });
});

// Handle certificate errors
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    if (isDevMode) {
        // In dev mode, ignore certificate errors
        event.preventDefault();
        callback(true);
    } else {
        // In production, use default behavior
        callback(false);
    }
});

// Prevent navigation to external websites
app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        
        // Allow navigation to local files
        if (parsedUrl.protocol !== 'file:') {
            event.preventDefault();
        }
    });
});

// Handle app updates (future feature)
if (!isDevMode) {
    // Auto-updater code would go here
}

// Graceful shutdown
process.on('SIGTERM', () => {
    app.quit();
});

process.on('SIGINT', () => {
    app.quit();
}); 