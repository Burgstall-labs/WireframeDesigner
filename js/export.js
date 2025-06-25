/**
 * Export Manager - Handles animation export to GIF and WebM formats
 */
export class ExportManager {
    constructor(sceneManager, animationEngine) {
        this.sceneManager = sceneManager;
        this.animationEngine = animationEngine;
        this.isExporting = false;
        this.currentExportBlob = null;
        this.currentExportFormat = null;
        
        // MediaRecorder for WebM export
        this.mediaRecorder = null;
        this.recordedChunks = [];
    }

    /**
     * Export animation based on format
     */
    async exportAnimation(settings, onProgressCallback = null) {
        if (this.isExporting) {
            throw new Error('Export already in progress');
        }

        const {
            format = 'gif',
            frameCount = 60,
            frameDelay = 100,
            outputWidth = 832,
            outputHeight = 480,
            quality = 10,
            backgroundImage = null
        } = settings;

        this.isExporting = true;
        this.currentExportFormat = format;

        try {
            let blob;
            if (format === 'gif') {
                blob = await this.exportGIF(settings, onProgressCallback);
            } else if (format === 'webm') {
                blob = await this.exportWebM(settings, onProgressCallback);
            } else {
                throw new Error(`Unsupported format: ${format}`);
            }

            this.currentExportBlob = blob;
            return blob;

        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        } finally {
            this.isExporting = false;
        }
    }

    /**
     * Export animation as GIF
     */
    async exportGIF(settings, onProgressCallback = null) {
        const {
            frameCount = 60,
            frameDelay = 100,
            outputWidth = 832,
            outputHeight = 480,
            quality = 10,
            backgroundColor = '#000000'
        } = settings;

        // Update progress
        if (onProgressCallback) {
            onProgressCallback(0, 'Initializing GIF encoder...');
        }

        // Setup renderer for capture
        const originalSize = new THREE.Vector2();
        this.sceneManager.renderer.getSize(originalSize);
        this.sceneManager.setRenderSize(outputWidth, outputHeight, false);

        try {
            // Initialize GIF encoder
            const gif = new GIF({
                workers: Math.max(1, navigator.hardwareConcurrency - 1 || 2),
                quality: quality,
                width: outputWidth,
                height: outputHeight,
                workerScript: 'gif.worker.js',
                background: backgroundColor
            });

            // Generate frames
            if (onProgressCallback) {
                onProgressCallback(0, 'Generating frames...');
            }

            const frames = await this.animationEngine.generateFrames(
                frameCount,
                (currentFrame, totalFrames, progress) => {
                    if (onProgressCallback) {
                        const percent = Math.round(progress * 50); // First 50% for frame generation
                        onProgressCallback(percent, `Capturing frame ${currentFrame}/${totalFrames}`);
                    }
                }
            );

            // Add frames to GIF
            if (onProgressCallback) {
                onProgressCallback(50, 'Adding frames to GIF...');
            }

            const framePromises = frames.map((frameDataUrl, index) => {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        try {
                            gif.addFrame(img, { delay: frameDelay });
                            resolve();
                        } catch (error) {
                            reject(error);
                        }
                    };
                    img.onerror = () => reject(new Error(`Failed to load frame ${index}`));
                    img.src = frameDataUrl;
                });
            });

            await Promise.all(framePromises);

            // Render GIF
            if (onProgressCallback) {
                onProgressCallback(75, 'Encoding GIF...');
            }

            return new Promise((resolve, reject) => {
                gif.on('progress', (p) => {
                    if (onProgressCallback) {
                        const percent = Math.round(75 + (p * 25)); // Last 25% for encoding
                        onProgressCallback(percent, `Encoding GIF: ${Math.round(p * 100)}%`);
                    }
                });

                gif.on('finished', (blob) => {
                    if (onProgressCallback) {
                        onProgressCallback(100, 'GIF export complete!');
                    }
                    resolve(blob);
                });

                gif.on('abort', () => {
                    reject(new Error('GIF export was aborted'));
                });

                gif.render();
            });

        } finally {
            // Restore renderer size
            this.sceneManager.setRenderSize(originalSize.x, originalSize.y, true);
        }
    }

    /**
     * Export animation as WebM video
     */
    async exportWebM(settings, onProgressCallback = null) {
        const {
            frameCount = 60,
            frameRate = 30,
            outputWidth = 832,
            outputHeight = 480,
            quality = 0.8
        } = settings;

        if (!MediaRecorder.isTypeSupported('video/webm')) {
            throw new Error('WebM export is not supported in this browser');
        }

        // Setup canvas for recording
        const originalSize = new THREE.Vector2();
        this.sceneManager.renderer.getSize(originalSize);
        this.sceneManager.setRenderSize(outputWidth, outputHeight, false);

        try {
            const canvas = this.sceneManager.renderer.domElement;
            const stream = canvas.captureStream(frameRate);
            
            this.recordedChunks = [];
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm;codecs=vp9',
                videoBitsPerSecond: outputWidth * outputHeight * quality * frameRate
            });

            // Setup MediaRecorder events
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            return new Promise((resolve, reject) => {
                this.mediaRecorder.onstop = () => {
                    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
                    if (onProgressCallback) {
                        onProgressCallback(100, 'WebM export complete!');
                    }
                    resolve(blob);
                };

                this.mediaRecorder.onerror = (error) => {
                    reject(new Error(`MediaRecorder error: ${error}`));
                };

                // Start recording
                this.mediaRecorder.start();
                
                if (onProgressCallback) {
                    onProgressCallback(0, 'Recording WebM video...');
                }

                // Play animation
                this.playAnimationForRecording(frameCount, frameRate, onProgressCallback)
                    .then(() => {
                        this.mediaRecorder.stop();
                    })
                    .catch(reject);
            });

        } finally {
            // Cleanup will happen in the promise resolution
        }
    }

    /**
     * Play animation for WebM recording
     */
    async playAnimationForRecording(frameCount, frameRate, onProgressCallback) {
        const frameDuration = 1000 / frameRate; // ms per frame
        
        for (let i = 0; i < frameCount; i++) {
            const progress = this.animationEngine.calculateProgress(i, frameCount);
            this.animationEngine.updateTransform(progress);
            this.sceneManager.renderFrame();
            
            if (onProgressCallback) {
                const percent = Math.round((i / frameCount) * 100);
                onProgressCallback(percent, `Recording frame ${i + 1}/${frameCount}`);
            }
            
            // Wait for next frame
            await new Promise(resolve => setTimeout(resolve, frameDuration));
        }
    }

    /**
     * Download the exported animation
     */
    async downloadAnimation(filename = null) {
        if (!this.currentExportBlob) {
            throw new Error('No animation to download');
        }

        // Use native file dialog if running in Electron
        if (window.desktopDownload && window.desktopUtils?.isElectron()) {
            try {
                if (!filename) {
                    filename = window.desktopDownload.getSuggestedFilename({
                        shape: 'wireframe',
                        format: this.currentExportFormat
                    });
                }

                const result = await window.desktopDownload.saveAnimation(
                    this.currentExportBlob, 
                    filename, 
                    this.currentExportFormat
                );

                if (result.success) {
                    // Show success notification
                    if (window.desktopNotifications) {
                        window.desktopNotifications.showNotification(
                            'Export Complete',
                            `Animation saved to ${result.filePath}`
                        );
                    }
                    return result;
                } else if (!result.cancelled) {
                    throw new Error(result.error || 'Failed to save file');
                }
                return result;

            } catch (error) {
                console.error('Native download failed, falling back to browser download:', error);
                // Fall through to browser download
            }
        }

        // Browser download fallback
        const url = URL.createObjectURL(this.currentExportBlob);
        const a = document.createElement('a');
        a.href = url;
        
        if (!filename) {
            const timestamp = Date.now();
            const extension = this.currentExportFormat === 'gif' ? 'gif' : 'webm';
            filename = `wireframe-animation-${timestamp}.${extension}`;
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up URL
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        
        return { success: true, method: 'browser' };
    }

    /**
     * Get preview URL for current export
     */
    getPreviewURL() {
        if (!this.currentExportBlob) {
            return null;
        }
        return URL.createObjectURL(this.currentExportBlob);
    }

    /**
     * Cancel current export
     */
    cancelExport() {
        if (!this.isExporting) return;

        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
            this.mediaRecorder.stop();
        }

        this.isExporting = false;
        
        // Clean up current export
        if (this.currentExportBlob) {
            URL.revokeObjectURL(this.currentExportBlob);
            this.currentExportBlob = null;
        }
    }

    /**
     * Get export capabilities
     */
    getCapabilities() {
        return {
            gif: true,
            webm: MediaRecorder.isTypeSupported('video/webm'),
            supportedFormats: ['gif', ...(MediaRecorder.isTypeSupported('video/webm') ? ['webm'] : [])]
        };
    }

    /**
     * Estimate export file size
     */
    estimateFileSize(settings) {
        const { format, frameCount, outputWidth, outputHeight } = settings;
        
        if (format === 'gif') {
            // Rough GIF size estimation (very approximate)
            const pixelsPerFrame = outputWidth * outputHeight;
            const bytesPerPixel = 1; // GIF uses 8-bit color
            const compressionRatio = 0.3; // Assume 30% compression
            return Math.round(pixelsPerFrame * bytesPerPixel * frameCount * compressionRatio);
        } else if (format === 'webm') {
            // Rough WebM size estimation
            const duration = frameCount / 30; // Assume 30 FPS
            const bitrate = outputWidth * outputHeight * 0.1; // Rough bitrate estimation
            return Math.round((bitrate * duration) / 8); // Convert bits to bytes
        }
        
        return 0;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.cancelExport();
        
        if (this.currentExportBlob) {
            URL.revokeObjectURL(this.currentExportBlob);
            this.currentExportBlob = null;
        }
        
        this.recordedChunks = [];
        this.mediaRecorder = null;
    }
} 