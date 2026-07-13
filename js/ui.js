/**
 * UI Manager - Handles all user interface interactions and coordinates with other modules
 */
export class UIManager {
    constructor(sceneManager, animationEngine, exportManager) {
        this.sceneManager = sceneManager;
        this.animationEngine = animationEngine;
        this.exportManager = exportManager;
        
        // UI state
        this.isPreviewPlaying = false;
        this.isExporting = false;
        
        // UI Elements
        this.elements = {};
        
        // Settings cache
        this.currentSettings = {
            shape: 'cube',
            cameraType: 'perspective',
            dimensions: { width: 4, height: 2, depth: 2 },
            colors: { bg: '#000000', wire: '#808080', face: '#4444ff', faceOpacity: 0.5 },
            appearance: { edgesOnly: true, showFaces: false },
            animation: {
                startPosition: { x: 0, y: 0, z: 0 },
                endPosition: { x: 0, y: 0, z: 0 },
                startRotation: { x: -10, y: -10, z: 0 },
                endRotation: { x: 10, y: 10, z: 0 },
                easingType: 'linear',
                loopMode: 'normal'
            },
            output: {
                width: 832,
                height: 480,
                frameCount: 81,
                frameDelay: 100,
                format: 'gif'
            }
        };
    }

    /**
     * Initialize UI event listeners and setup
     */
    init() {
        this.cacheUIElements();
        this.setupEventListeners();
        this.updateDynamicLabels();
        this.updateExportFormatOptions();
        this.restoreSettings();
        
        console.log('UI Manager initialized');
    }

    /**
     * Cache all UI elements for performance
     */
    cacheUIElements() {
        this.elements = {
            // Shape & Camera
            shape: document.getElementById('shape'),
            cameraType: document.getElementById('cameraType'),
            
            // Dimensions
            width: document.getElementById('width'),
            height: document.getElementById('height'),
            depth: document.getElementById('depth'),
            depthLabel: document.getElementById('depthLabel'),
            
            // Appearance
            bgColor: document.getElementById('bgColor'),
            wireColor: document.getElementById('wireColor'),
            faceColor: document.getElementById('faceColor'),
            faceOpacity: document.getElementById('faceOpacity'),
            edgesOnly: document.getElementById('edgesOnly'),
            showFaces: document.getElementById('showFaces'),
            
            // Position Animation
            posX: document.getElementById('posX'),
            posY: document.getElementById('posY'),
            posZ: document.getElementById('posZ'),
            endPosX: document.getElementById('endPosX'),
            endPosY: document.getElementById('endPosY'),
            endPosZ: document.getElementById('endPosZ'),
            
            // Rotation Animation
            startAngleX: document.getElementById('startAngleX'),
            startAngleY: document.getElementById('startAngleY'),
            endAngleX: document.getElementById('endAngleX'),
            endAngleY: document.getElementById('endAngleY'),
            easingType: document.getElementById('easingType'),
            loopMode: document.getElementById('loopMode'),
            
            // Output
            outputWidth: document.getElementById('outputWidth'),
            outputHeight: document.getElementById('outputHeight'),
            frameCount: document.getElementById('frameCount'),
            frameDelay: document.getElementById('frameDelay'),
            outputFormat: document.getElementById('outputFormat'),
            
            // Actions
            previewBtn: document.getElementById('previewBtn'),
            renderBtn: document.getElementById('renderBtn'),
            progressInfo: document.getElementById('progressInfo'),
            progressFill: document.getElementById('progressFill'),
            
            // Preview Panel
            preview: document.getElementById('preview'),
            previewImage: document.getElementById('previewImage'),
            downloadBtn: document.getElementById('downloadBtn'),
            closePreviewBtn: document.getElementById('closePreviewBtn')
        };
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        // Shape & Camera
        this.elements.shape.addEventListener('change', () => this.onShapeChange());
        this.elements.cameraType.addEventListener('change', () => this.onCameraTypeChange());
        
        // Dimensions
        ['width', 'height', 'depth'].forEach(dim => {
            this.elements[dim].addEventListener('input', () => this.onDimensionsChange());
        });
        
        // Appearance
        this.elements.bgColor.addEventListener('input', () => this.onColorsChange());
        this.elements.wireColor.addEventListener('input', () => this.onColorsChange());
        this.elements.faceColor.addEventListener('input', () => this.onColorsChange());
        this.elements.faceOpacity.addEventListener('input', () => this.onColorsChange());
        this.elements.edgesOnly.addEventListener('change', () => this.onAppearanceChange());
        this.elements.showFaces.addEventListener('change', () => this.onAppearanceChange());
        
        // Animation parameters
        ['posX', 'posY', 'posZ', 'endPosX', 'endPosY', 'endPosZ'].forEach(pos => {
            this.elements[pos].addEventListener('input', () => this.onAnimationParamsChange());
        });
        ['startAngleX', 'startAngleY', 'endAngleX', 'endAngleY'].forEach(angle => {
            this.elements[angle].addEventListener('input', () => this.onAnimationParamsChange());
        });
        this.elements.easingType.addEventListener('change', () => this.onAnimationParamsChange());
        this.elements.loopMode.addEventListener('change', () => this.onAnimationParamsChange());
        
        // Actions
        this.elements.previewBtn.addEventListener('click', () => this.onPreviewToggle());
        this.elements.renderBtn.addEventListener('click', () => this.onRenderAnimation());
        this.elements.downloadBtn.addEventListener('click', () => this.onDownloadAnimation());
        this.elements.closePreviewBtn.addEventListener('click', () => this.onClosePreview());
        
        // Output format change
        this.elements.outputFormat.addEventListener('change', () => this.onOutputFormatChange());
    }

    /**
     * Handle shape change
     */
    onShapeChange() {
        const shape = this.elements.shape.value;
        this.currentSettings.shape = shape;
        
        this.updateDynamicLabels();
        this.updateGeometry();
        this.saveSettings();
    }

    /**
     * Handle camera type change
     */
    onCameraTypeChange() {
        const cameraType = this.elements.cameraType.value;
        this.currentSettings.cameraType = cameraType;
        
        this.sceneManager.updateCameraType(cameraType);
        this.saveSettings();
    }

    /**
     * Handle dimensions change
     */
    onDimensionsChange() {
        const dimensions = {
            width: Math.max(0.1, parseFloat(this.elements.width.value) || 1),
            height: Math.max(0.1, parseFloat(this.elements.height.value) || 1),
            depth: Math.max(0.1, parseFloat(this.elements.depth.value) || 1)
        };
        
        this.currentSettings.dimensions = dimensions;
        this.updateGeometry();
        this.saveSettings();
    }

    /**
     * Handle colors change
     */
    onColorsChange() {
        const colors = {
            bg: this.elements.bgColor.value,
            wire: this.elements.wireColor.value,
            face: this.elements.faceColor.value,
            faceOpacity: parseFloat(this.elements.faceOpacity.value)
        };
        
        this.currentSettings.colors = colors;
        this.sceneManager.updateColors(colors.bg, colors.wire, colors.face, colors.faceOpacity);
        this.saveSettings();
    }

    /**
     * Handle appearance change
     */
    onAppearanceChange() {
        const appearance = {
            edgesOnly: this.elements.edgesOnly.checked,
            showFaces: this.elements.showFaces.checked
        };
        
        this.currentSettings.appearance = appearance;
        this.sceneManager.updateMeshVisibility(appearance.edgesOnly, appearance.showFaces);
        this.updateFaceControlsState();
        this.saveSettings();
    }

    /**
     * Handle animation parameters change
     */
    onAnimationParamsChange() {
        const animation = {
            startPosition: {
                x: parseFloat(this.elements.posX.value) || 0,
                y: parseFloat(this.elements.posY.value) || 0,
                z: parseFloat(this.elements.posZ.value) || 0
            },
            endPosition: {
                x: parseFloat(this.elements.endPosX.value) || 0,
                y: parseFloat(this.elements.endPosY.value) || 0,
                z: parseFloat(this.elements.endPosZ.value) || 0
            },
            startRotation: {
                x: this.animationEngine.degToRad(parseFloat(this.elements.startAngleX.value) || 0),
                y: this.animationEngine.degToRad(parseFloat(this.elements.startAngleY.value) || 0),
                z: 0
            },
            endRotation: {
                x: this.animationEngine.degToRad(parseFloat(this.elements.endAngleX.value) || 0),
                y: this.animationEngine.degToRad(parseFloat(this.elements.endAngleY.value) || 0),
                z: 0
            },
            easingType: this.elements.easingType.value,
            loopMode: this.elements.loopMode.value
        };
        
        this.currentSettings.animation = animation;
        this.animationEngine.setAnimationParams(animation);
        this.saveSettings();
    }

    /**
     * Handle output format change
     */
    onOutputFormatChange() {
        const format = this.elements.outputFormat.value;
        this.currentSettings.output.format = format;
        
        // Update UI based on format capabilities
        this.updateOutputControls(format);
        this.saveSettings();
    }

    /**
     * Handle preview toggle
     */
    onPreviewToggle() {
        if (this.isPreviewPlaying) {
            this.stopPreview();
        } else {
            this.startPreview();
        }
    }

    /**
     * Start animation preview
     */
    startPreview() {
        if (this.isExporting) return;
        
        this.isPreviewPlaying = true;
        this.elements.previewBtn.textContent = 'Stop Preview';
        this.elements.previewBtn.classList.add('active');
        
        const frameCount = parseInt(this.elements.frameCount.value) || 60;
        this.animationEngine.startPreview(frameCount);
    }

    /**
     * Stop animation preview
     */
    stopPreview() {
        this.isPreviewPlaying = false;
        this.elements.previewBtn.textContent = 'Preview Animation';
        this.elements.previewBtn.classList.remove('active');
        
        this.animationEngine.stopAnimation();
    }

    /**
     * Handle render animation
     */
    async onRenderAnimation() {
        if (this.isExporting || this.isPreviewPlaying) return;
        
        this.isExporting = true;
        this.updateUIForExport(true);
        
        try {
            const settings = this.getExportSettings();
            
            await this.exportManager.exportAnimation(settings, (progress, message) => {
                this.updateProgress(progress, message);
            });
            
            // Show preview
            const previewURL = this.exportManager.getPreviewURL();
            if (previewURL) {
                this.showPreview(previewURL);
            }
            
        } catch (error) {
            console.error('Export failed:', error);
            this.showError(`Export failed: ${error.message}`);
        } finally {
            this.isExporting = false;
            this.updateUIForExport(false);
        }
    }

    /**
     * Handle download animation
     */
    async onDownloadAnimation() {
        try {
            const result = await this.exportManager.downloadAnimation();
            
            if (result && !result.success && !result.cancelled) {
                this.showError(`Download failed: ${result.error || 'Unknown error'}`);
            } else if (result && result.success) {
                // Show brief success message
                const originalText = this.elements.progressInfo.textContent;
                this.elements.progressInfo.textContent = 'Animation saved successfully!';
                this.elements.progressInfo.style.color = '#4CAF50';
                
                setTimeout(() => {
                    this.elements.progressInfo.textContent = originalText;
                    this.elements.progressInfo.style.color = '';
                }, 2000);
            }
        } catch (error) {
            console.error('Download failed:', error);
            this.showError(`Download failed: ${error.message}`);
        }
    }

    /**
     * Handle close preview
     */
    onClosePreview() {
        this.elements.preview.style.display = 'none';
        
        // Clean up preview URL
        const previewURL = this.elements.previewImage.src;
        if (previewURL && previewURL.startsWith('blob:')) {
            URL.revokeObjectURL(previewURL);
        }
        this.elements.previewImage.src = '';
    }

    /**
     * Update geometry in scene
     */
    updateGeometry() {
        const { shape } = this.currentSettings;
        const { dimensions } = this.currentSettings;
        
        this.sceneManager.createGeometry(shape, dimensions);
        this.sceneManager.updateColors(
            this.currentSettings.colors.bg,
            this.currentSettings.colors.wire,
            this.currentSettings.colors.face,
            this.currentSettings.colors.faceOpacity
        );
        this.sceneManager.updateMeshVisibility(
            this.currentSettings.appearance.edgesOnly,
            this.currentSettings.appearance.showFaces
        );
    }

    /**
     * Update dynamic UI labels based on shape
     */
    updateDynamicLabels() {
        const shape = this.currentSettings.shape;
        
        switch(shape) {
            case 'sphere':
                this.elements.depthLabel.textContent = 'Radius:';
                break;
            case 'torus':
                this.elements.depthLabel.textContent = 'Tube Radius:';
                break;
            case 'cylinder':
            case 'cone':
                this.elements.depthLabel.textContent = 'Radius:';
                break;
            default:
                this.elements.depthLabel.textContent = 'Depth:';
        }
    }

    /**
     * Update face controls enabled state
     */
    updateFaceControlsState() {
        const showFaces = this.currentSettings.appearance.showFaces;
        this.elements.faceColor.disabled = !showFaces;
        this.elements.faceOpacity.disabled = !showFaces;
    }

    /**
     * Update export format options
     */
    updateExportFormatOptions() {
        const capabilities = this.exportManager.getCapabilities();
        
        // Enable/disable WebM option
        const webmOption = this.elements.outputFormat.querySelector('option[value="webm"]');
        if (webmOption) {
            webmOption.disabled = !capabilities.webm;
            if (!capabilities.webm) {
                webmOption.textContent += ' (Not Supported)';
            }
        }
    }

    /**
     * Update output controls based on format
     */
    updateOutputControls(format) {
        if (format === 'webm') {
            // WebM specific adjustments
            this.elements.frameDelay.disabled = true;
            this.elements.frameDelay.title = 'Frame rate is fixed for WebM';
        } else {
            // GIF specific adjustments
            this.elements.frameDelay.disabled = false;
            this.elements.frameDelay.title = '';
        }
    }

    /**
     * Update UI during export
     */
    updateUIForExport(isExporting) {
        this.elements.previewBtn.disabled = isExporting;
        this.elements.renderBtn.disabled = isExporting;
        
        const controlsPanel = document.getElementById('controls');
        if (controlsPanel) {
            controlsPanel.classList.toggle('fade-out', isExporting);
        }
        
        if (!isExporting) {
            this.updateProgress(0, 'Ready');
        }
    }

    /**
     * Update progress display
     */
    updateProgress(progress, message) {
        this.elements.progressInfo.textContent = message;
        this.elements.progressFill.style.width = `${progress}%`;
        this.elements.progressFill.textContent = `${progress}%`;
        
        // Reset error styling
        this.elements.progressInfo.style.color = '';
    }

    /**
     * Show error message
     */
    showError(message) {
        this.elements.progressInfo.textContent = message;
        this.elements.progressInfo.style.color = '#d32f2f';
        this.elements.progressFill.style.width = '0%';
        this.elements.progressFill.textContent = '';
    }

    /**
     * Show animation preview
     */
    showPreview(previewURL) {
        this.elements.previewImage.src = previewURL;
        this.elements.preview.style.display = 'block';
    }

    /**
     * Get export settings from UI
     */
    getExportSettings() {
        const output = {
            format: this.elements.outputFormat.value,
            frameCount: parseInt(this.elements.frameCount.value) || 60,
            frameDelay: parseInt(this.elements.frameDelay.value) || 100,
            outputWidth: parseInt(this.elements.outputWidth.value) || 832,
            outputHeight: parseInt(this.elements.outputHeight.value) || 480,
            backgroundColor: this.elements.bgColor.value,
            quality: 10 // Default GIF quality
        };
        
        if (output.format === 'webm') {
            output.frameRate = 30; // Fixed frame rate for WebM
            output.quality = 0.8; // Video quality
        }
        
        return output;
    }

    /**
     * Save current settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('wireframe_settings', JSON.stringify(this.currentSettings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    /**
     * Restore settings from localStorage
     */
    restoreSettings() {
        try {
            const saved = localStorage.getItem('wireframe_settings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.applySettings(settings);
            }
        } catch (error) {
            console.warn('Failed to restore settings:', error);
        }
    }

    /**
     * Apply settings to UI and scene
     */
    applySettings(settings) {
        // Merge with current settings
        this.currentSettings = { ...this.currentSettings, ...settings };
        
        // Update UI elements
        this.updateUIFromSettings();
        
        // Update scene
        this.updateGeometry();
        this.onAnimationParamsChange();
    }

    /**
     * Update UI elements from current settings
     */
    updateUIFromSettings() {
        const s = this.currentSettings;
        
        // Shape & Camera
        this.elements.shape.value = s.shape;
        this.elements.cameraType.value = s.cameraType;
        
        // Dimensions
        this.elements.width.value = s.dimensions.width;
        this.elements.height.value = s.dimensions.height;
        this.elements.depth.value = s.dimensions.depth;
        
        // Colors
        this.elements.bgColor.value = s.colors.bg;
        this.elements.wireColor.value = s.colors.wire;
        this.elements.faceColor.value = s.colors.face;
        this.elements.faceOpacity.value = s.colors.faceOpacity;
        
        // Appearance
        this.elements.edgesOnly.checked = s.appearance.edgesOnly;
        this.elements.showFaces.checked = s.appearance.showFaces;
        
        // Animation
        this.elements.posX.value = s.animation.startPosition.x;
        this.elements.posY.value = s.animation.startPosition.y;
        this.elements.posZ.value = s.animation.startPosition.z;
        this.elements.endPosX.value = s.animation.endPosition.x;
        this.elements.endPosY.value = s.animation.endPosition.y;
        this.elements.endPosZ.value = s.animation.endPosition.z;
        this.elements.startAngleX.value = this.animationEngine.radToDeg(s.animation.startRotation.x);
        this.elements.startAngleY.value = this.animationEngine.radToDeg(s.animation.startRotation.y);
        this.elements.endAngleX.value = this.animationEngine.radToDeg(s.animation.endRotation.x);
        this.elements.endAngleY.value = this.animationEngine.radToDeg(s.animation.endRotation.y);
        this.elements.easingType.value = s.animation.easingType;
        this.elements.loopMode.value = s.animation.loopMode;
        
        // Output
        this.elements.outputWidth.value = s.output.width;
        this.elements.outputHeight.value = s.output.height;
        this.elements.frameCount.value = s.output.frameCount;
        this.elements.frameDelay.value = s.output.frameDelay;
        this.elements.outputFormat.value = s.output.format;
        
        // Update dynamic elements
        this.updateDynamicLabels();
        this.updateFaceControlsState();
        this.updateOutputControls(s.output.format);
    }

    /**
     * Reset all settings to defaults (New Animation)
     */
    resetToDefaults() {
        // Reset to default settings
        this.currentSettings = {
            shape: 'cube',
            cameraType: 'perspective',
            dimensions: { width: 4, height: 2, depth: 2 },
            colors: { bg: '#000000', wire: '#808080', face: '#4444ff', faceOpacity: 0.5 },
            appearance: { edgesOnly: true, showFaces: false },
            animation: {
                startPosition: { x: 0, y: 0, z: 0 },
                endPosition: { x: 0, y: 0, z: 0 },
                startRotation: { x: -10, y: -10, z: 0 },
                endRotation: { x: 10, y: 10, z: 0 },
                easingType: 'linear',
                loopMode: 'normal'
            },
            output: {
                width: 832,
                height: 480,
                frameCount: 81,
                frameDelay: 100,
                format: 'gif'
            }
        };

        // Update UI from settings
        this.updateUIFromSettings();
        
        // Update scene
        this.updateGeometry();
        this.onAnimationParamsChange();
        
        // Stop any running preview
        if (this.isPreviewPlaying) {
            this.stopPreview();
        }
        
        // Close preview panel
        this.onClosePreview();
        
        // Clear progress
        this.updateProgress(0, 'Ready');
        
        // Save the reset settings
        this.saveSettings();
        
        console.log('Settings reset to defaults');
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopPreview();
        this.onClosePreview();
        
        // Remove event listeners would go here if needed
        // (most are cleaned up automatically when elements are removed)
    }
} 