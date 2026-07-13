const { contextBridge, ipcRenderer } = require('electron');

/**
 * Electron API exposed to the renderer process
 */
const electronAPI = {
    // File operations
    saveFile: async (defaultName, filters, buffer) => {
        return await ipcRenderer.invoke('save-file', { defaultName, filters, buffer });
    },

    // Dialog operations
    showError: async (title, content) => {
        return await ipcRenderer.invoke('show-error', { title, content });
    },

    showInfo: async (title, message, detail) => {
        return await ipcRenderer.invoke('show-info', { title, message, detail });
    },

    // App information
    getAppVersion: async () => {
        return await ipcRenderer.invoke('get-app-version');
    },

    getPlatform: async () => {
        return await ipcRenderer.invoke('get-platform');
    },

    // Menu event listeners
    onMenuNewAnimation: (callback) => {
        ipcRenderer.on('menu-new-animation', callback);
    },

    onMenuExportAnimation: (callback) => {
        ipcRenderer.on('menu-export-animation', callback);
    },

    // Remove listeners (for cleanup)
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel);
    }
};

/**
 * Utility functions for the desktop app
 */
const desktopUtils = {
    // Check if running in Electron
    isElectron: () => {
        return typeof process !== 'undefined' && process.versions && process.versions.electron;
    },

    // Get environment info
    getEnvironment: () => {
        if (typeof process !== 'undefined' && process.versions) {
            return {
                electron: process.versions.electron,
                chrome: process.versions.chrome,
                node: process.versions.node,
                platform: process.platform,
                arch: process.arch
            };
        }
        return null;
    },

    // Performance helpers
    getPerformanceInfo: () => {
        if (typeof process !== 'undefined' && process.getSystemMemoryInfo) {
            return {
                memory: process.getSystemMemoryInfo(),
                cpu: process.getCPUUsage()
            };
        }
        return null;
    }
};

/**
 * Enhanced download functionality for desktop
 */
const desktopDownload = {
    // Save animation with native file dialog
    saveAnimation: async (blob, defaultName, format) => {
        try {
            // Convert blob to array buffer
            const arrayBuffer = await blob.arrayBuffer();
            const buffer = new Uint8Array(arrayBuffer);

            // Determine file filters based on format
            const filters = [];
            if (format === 'gif') {
                filters.push({ name: 'GIF Images', extensions: ['gif'] });
            } else if (format === 'webm') {
                filters.push({ name: 'WebM Videos', extensions: ['webm'] });
            }
            filters.push({ name: 'All Files', extensions: ['*'] });

            // Show save dialog and save file
            const result = await electronAPI.saveFile(defaultName, filters, buffer);
            return result;

        } catch (error) {
            console.error('Error saving animation:', error);
            return { success: false, error: error.message };
        }
    },

    // Get suggested filename
    getSuggestedFilename: (settings) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const shape = settings.shape || 'shape';
        const format = settings.format || 'gif';
        return `wireframe-${shape}-${timestamp}.${format}`;
    }
};

/**
 * Native notifications (if supported)
 */
const desktopNotifications = {
    // Show desktop notification
    showNotification: (title, body, options = {}) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            return new Notification(title, { body, ...options });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    return new Notification(title, { body, ...options });
                }
            });
        }
        return null;
    },

    // Request notification permission
    requestPermission: () => {
        if ('Notification' in window) {
            return Notification.requestPermission();
        }
        return Promise.resolve('denied');
    }
};

/**
 * Application state management for desktop
 */
const desktopState = {
    // Save app state to file (future feature)
    saveState: async (state) => {
        // Could be implemented to save app state to a JSON file
        console.log('State saving not yet implemented');
        return false;
    },

    // Load app state from file (future feature)
    loadState: async () => {
        // Could be implemented to load app state from a JSON file
        console.log('State loading not yet implemented');
        return null;
    }
};

// Expose APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
contextBridge.exposeInMainWorld('desktopUtils', desktopUtils);
contextBridge.exposeInMainWorld('desktopDownload', desktopDownload);
contextBridge.exposeInMainWorld('desktopNotifications', desktopNotifications);
contextBridge.exposeInMainWorld('desktopState', desktopState);

// Log successful preload
console.log('Electron preload script loaded successfully');

// Debug information (only in development)
if (process.argv.includes('--dev')) {
    console.log('Running in development mode');
    console.log('Environment:', desktopUtils.getEnvironment());
} 