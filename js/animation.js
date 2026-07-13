/**
 * Animation Engine - Handles animation interpolation, easing functions, and loop modes
 */
export class AnimationEngine {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.isAnimating = false;
        this.animationId = null;
        this.currentFrame = 0;
        this.totalFrames = 0;
        this.onFrameCallback = null;
        
        // Animation settings
        this.startTransform = {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 }
        };
        this.endTransform = {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 }
        };
        this.easingType = 'linear';
        this.loopMode = 'normal';
    }

    /**
     * Easing functions
     */
    static easing = {
        linear: (t) => t,
        
        easeIn: (t) => t * t,
        
        easeOut: (t) => t * (2 - t),
        
        easeInOut: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
        
        elastic: (t) => {
            if (t === 0 || t === 1) return t;
            const p = 0.3;
            const s = p / 4;
            return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
        },
        
        bounce: (t) => {
            if (t < (1 / 2.75)) {
                return 7.5625 * t * t;
            } else if (t < (2 / 2.75)) {
                return 7.5625 * (t -= (1.5 / 2.75)) * t + 0.75;
            } else if (t < (2.5 / 2.75)) {
                return 7.5625 * (t -= (2.25 / 2.75)) * t + 0.9375;
            } else {
                return 7.5625 * (t -= (2.625 / 2.75)) * t + 0.984375;
            }
        }
    };

    /**
     * Set animation parameters
     */
    setAnimationParams(params) {
        const {
            startPosition,
            endPosition,
            startRotation,
            endRotation,
            easingType = 'linear',
            loopMode = 'normal'
        } = params;

        if (startPosition) {
            this.startTransform.position = { ...startPosition };
        }
        if (endPosition) {
            this.endTransform.position = { ...endPosition };
        }
        if (startRotation) {
            this.startTransform.rotation = { ...startRotation };
        }
        if (endRotation) {
            this.endTransform.rotation = { ...endRotation };
        }

        this.easingType = easingType;
        this.loopMode = loopMode;
    }

    /**
     * Start preview animation
     */
    startPreview(frameCount = 60, onFrameCallback = null) {
        this.stopAnimation();
        
        this.totalFrames = frameCount;
        this.currentFrame = 0;
        this.isAnimating = true;
        this.onFrameCallback = onFrameCallback;

        this.animateFrame();
    }

    /**
     * Stop animation
     */
    stopAnimation() {
        this.isAnimating = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Reset to start position
        this.updateTransform(0);
    }

    /**
     * Animate a single frame
     */
    animateFrame() {
        if (!this.isAnimating) return;

        const progress = this.calculateProgress(this.currentFrame, this.totalFrames);
        this.updateTransform(progress);

        if (this.onFrameCallback) {
            this.onFrameCallback(this.currentFrame, progress);
        }

        this.currentFrame++;
        if (this.currentFrame >= this.totalFrames) {
            this.currentFrame = 0;
        }

        this.animationId = requestAnimationFrame(() => this.animateFrame());
    }

    /**
     * Calculate animation progress with easing and loop mode
     */
    calculateProgress(frame, totalFrames) {
        if (totalFrames <= 1) return 0;

        let rawProgress = frame / (totalFrames - 1);
        
        // Apply loop mode
        switch (this.loopMode) {
            case 'pingpong':
                if (rawProgress > 0.5) {
                    rawProgress = 1 - rawProgress;
                }
                rawProgress *= 2;
                break;
            case 'reverse':
                rawProgress = 1 - rawProgress;
                break;
            case 'normal':
            default:
                // Keep as is
                break;
        }

        // Clamp progress
        rawProgress = Math.max(0, Math.min(1, rawProgress));

        // Apply easing
        const easingFunc = AnimationEngine.easing[this.easingType] || AnimationEngine.easing.linear;
        return easingFunc(rawProgress);
    }

    /**
     * Update object transform based on progress
     */
    updateTransform(progress) {
        if (!this.sceneManager || !this.sceneManager.objectGroup) return;

        // Interpolate position
        const position = {
            x: this.lerp(this.startTransform.position.x, this.endTransform.position.x, progress),
            y: this.lerp(this.startTransform.position.y, this.endTransform.position.y, progress),
            z: this.lerp(this.startTransform.position.z, this.endTransform.position.z, progress)
        };

        // Interpolate rotation
        const rotation = {
            x: this.lerp(this.startTransform.rotation.x, this.endTransform.rotation.x, progress),
            y: this.lerp(this.startTransform.rotation.y, this.endTransform.rotation.y, progress),
            z: this.lerp(this.startTransform.rotation.z, this.endTransform.rotation.z, progress)
        };

        this.sceneManager.updateObjectTransform({ position, rotation });
    }

    /**
     * Generate animation frames for export
     */
    async generateFrames(frameCount, onProgressCallback = null) {
        const frames = [];
        const originalSize = new THREE.Vector2();
        this.sceneManager.renderer.getSize(originalSize);

        try {
            for (let i = 0; i < frameCount; i++) {
                const progress = this.calculateProgress(i, frameCount);
                this.updateTransform(progress);
                
                // Render frame
                this.sceneManager.renderFrame();
                
                // Capture frame
                const frameDataUrl = this.sceneManager.getCanvasDataURL();
                frames.push(frameDataUrl);
                
                // Report progress
                if (onProgressCallback) {
                    onProgressCallback(i + 1, frameCount, (i + 1) / frameCount);
                }
                
                // Allow UI to update
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        } catch (error) {
            console.error('Error generating frames:', error);
            throw error;
        }

        return frames;
    }

    /**
     * Linear interpolation helper
     */
    lerp(start, end, t) {
        return start + (end - start) * t;
    }

    /**
     * Convert degrees to radians
     */
    degToRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    /**
     * Convert radians to degrees
     */
    radToDeg(radians) {
        return radians * (180 / Math.PI);
    }

    /**
     * Get current animation state
     */
    getAnimationState() {
        return {
            isAnimating: this.isAnimating,
            currentFrame: this.currentFrame,
            totalFrames: this.totalFrames,
            progress: this.totalFrames > 0 ? this.currentFrame / this.totalFrames : 0,
            easingType: this.easingType,
            loopMode: this.loopMode
        };
    }

    /**
     * Reset to start position
     */
    resetToStart() {
        this.updateTransform(0);
    }

    /**
     * Set to end position
     */
    setToEnd() {
        this.updateTransform(1);
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopAnimation();
        this.onFrameCallback = null;
    }
} 