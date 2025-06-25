import { UIManager } from './ui.js';
import { SceneManager } from './scene.js';
import { AnimationEngine } from './animation.js';
import { ExportManager } from './export.js';

/**
 * Main application class that coordinates all components
 */
class WireframeDesigner {
    constructor() {
        this.sceneManager = null;
        this.uiManager = null;
        this.animationEngine = null;
        this.exportManager = null;
        
        this.isInitialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('Initializing Wireframe Designer...');
            
            // Initialize scene manager first
            this.sceneManager = new SceneManager();
            await this.sceneManager.init();
            
            // Initialize animation engine
            this.animationEngine = new AnimationEngine(this.sceneManager);
            
            // Initialize export manager
            this.exportManager = new ExportManager(this.sceneManager, this.animationEngine);
            
            // Initialize UI manager last (it connects to other components)
            this.uiManager = new UIManager(this.sceneManager, this.animationEngine, this.exportManager);
            this.uiManager.init();
            
            // Setup global error handling
            this.setupErrorHandling();
            
            this.isInitialized = true;
            console.log('Wireframe Designer initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize Wireframe Designer:', error);
            this.showErrorMessage('Failed to initialize application. Please refresh the page.');
        }
    }

    /**
     * Setup global error handling
     */
    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.showErrorMessage('An unexpected error occurred. Check the console for details.');
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showErrorMessage('An unexpected error occurred. Check the console for details.');
        });
    }

    /**
     * Show error message to user
     */
    showErrorMessage(message) {
        const progressInfo = document.getElementById('progressInfo');
        if (progressInfo) {
            progressInfo.textContent = `Error: ${message}`;
            progressInfo.style.color = '#d32f2f';
        }
    }

    /**
     * Cleanup resources when page unloads
     */
    cleanup() {
        if (this.sceneManager) {
            this.sceneManager.cleanup();
        }
        if (this.uiManager) {
            this.uiManager.cleanup();
        }
        if (this.exportManager) {
            this.exportManager.cleanup();
        }
    }
}

/**
 * Global function for collapsible sections
 */
window.toggleSection = function(header) {
    const section = header.parentElement;
    section.classList.toggle('collapsed');
    
    // Save section state to localStorage
    const sectionId = header.textContent.trim();
    const isCollapsed = section.classList.contains('collapsed');
    localStorage.setItem(`section_${sectionId}`, isCollapsed);
};

/**
 * Restore section states from localStorage
 */
function restoreSectionStates() {
    document.querySelectorAll('.section').forEach(section => {
        const header = section.querySelector('.section-header');
        const sectionId = header.textContent.trim();
        const isCollapsed = localStorage.getItem(`section_${sectionId}`) === 'true';
        
        if (isCollapsed) {
            section.classList.add('collapsed');
        }
    });
}

/**
 * Initialize application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Restore UI state
    restoreSectionStates();
    
    // Initialize application
    const app = new WireframeDesigner();
    await app.init();
    
    // Setup cleanup on page unload
    window.addEventListener('beforeunload', () => {
        app.cleanup();
    });
    
    // Make app globally accessible for debugging
    window.wireframeApp = app;
});

export { WireframeDesigner }; 