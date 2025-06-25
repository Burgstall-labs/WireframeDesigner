/**
 * Scene Manager - Handles all Three.js rendering and 3D scene management
 */
export class SceneManager {
    constructor() {
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.perspectiveCamera = null;
        this.orthographicCamera = null;
        this.objectGroup = null;
        this.wireframeMesh = null;
        this.faceMesh = null;
        this.edges = null;
        
        this.frustumSize = 10;
        this.isRendering = false;
        this.animationId = null;
        
        // Mouse interaction
        this.isMouseDown = false;
        this.mouseLastPosition = { x: 0, y: 0 };
        this.rotationSpeed = 0.005;
        
        // Current settings
        this.currentShape = 'cube';
        this.currentCameraType = 'perspective';
    }

    /**
     * Initialize the scene and renderer
     */
    async init() {
        try {
            this.initRenderer();
            this.initScene();
            this.initCameras();
            this.initLighting();
            this.initObjectGroup();
            this.setupEventListeners();
            
            // Create initial geometry
            this.createGeometry('cube', { width: 4, height: 2, depth: 2 });
            this.updateColors('#000000', '#808080', '#4444ff', 0.5);
            this.updateMeshVisibility(true, false);
            
            // Start render loop
            this.startRenderLoop();
            
            console.log('Scene initialized successfully');
        } catch (error) {
            console.error('Failed to initialize scene:', error);
            throw error;
        }
    }

    /**
     * Initialize WebGL renderer
     */
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            preserveDrawingBuffer: true,
            alpha: true
        });
        
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        const container = document.getElementById('container');
        container.appendChild(this.renderer.domElement);
    }

    /**
     * Initialize the Three.js scene
     */
    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000000);
    }

    /**
     * Initialize cameras
     */
    initCameras() {
        const aspect = window.innerWidth / window.innerHeight;
        
        // Perspective camera
        this.perspectiveCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.perspectiveCamera.position.set(0, 0, 6);
        
        // Orthographic camera
        this.orthographicCamera = new THREE.OrthographicCamera(
            this.frustumSize * aspect / -2, this.frustumSize * aspect / 2,
            this.frustumSize / 2, this.frustumSize / -2,
            0.1, 1000
        );
        this.orthographicCamera.position.set(0, 0, 6);
        
        // Set default camera
        this.camera = this.perspectiveCamera;
    }

    /**
     * Initialize scene lighting
     */
    initLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Additional fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-1, -1, -1);
        this.scene.add(fillLight);
    }

    /**
     * Initialize object group for transformations
     */
    initObjectGroup() {
        this.objectGroup = new THREE.Group();
        this.scene.add(this.objectGroup);
    }

    /**
     * Setup event listeners for mouse interaction and window resize
     */
    setupEventListeners() {
        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Mouse interaction for object rotation
        const canvas = this.renderer.domElement;
        
        canvas.addEventListener('mousedown', (event) => this.onMouseDown(event));
        canvas.addEventListener('mousemove', (event) => this.onMouseMove(event));
        canvas.addEventListener('mouseup', () => this.onMouseUp());
        canvas.addEventListener('mouseleave', () => this.onMouseUp());
        
        // Touch events for mobile
        canvas.addEventListener('touchstart', (event) => this.onTouchStart(event));
        canvas.addEventListener('touchmove', (event) => this.onTouchMove(event));
        canvas.addEventListener('touchend', () => this.onTouchEnd());
    }

    /**
     * Create geometry based on shape type and dimensions
     */
    createGeometry(shape, dimensions) {
        this.currentShape = shape;
        
        // Clear existing meshes
        this.clearObjectGroup();
        
        const { width, height, depth } = dimensions;
        let geometry;
        const segments = 32;

        switch(shape) {
            case 'sphere':
                geometry = new THREE.SphereGeometry(width / 2, segments, Math.max(3, Math.round(segments/2)));
                break;
            case 'cylinder':
                geometry = new THREE.CylinderGeometry(width / 2, width / 2, height, segments);
                break;
            case 'cone':
                geometry = new THREE.ConeGeometry(width / 2, height, segments);
                break;
            case 'torus':
                const torusRadius = width / 2;
                const tubeRadius = Math.max(0.01, Math.min(torusRadius * 0.99, depth / 2));
                geometry = new THREE.TorusGeometry(torusRadius, tubeRadius, Math.max(3, Math.round(segments/2)), segments);
                break;
            case 'pyramid':
                geometry = new THREE.ConeGeometry(width / 2, height, 4);
                break;
            case 'dodecahedron':
                geometry = new THREE.DodecahedronGeometry(width / 2);
                break;
            case 'cube':
            default:
                geometry = new THREE.BoxGeometry(width, height, depth);
        }

        // Create meshes
        this.createMeshes(geometry);
    }

    /**
     * Create wireframe, face, and edge meshes from geometry
     */
    createMeshes(geometry) {
        // Wireframe mesh
        const wireMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff, 
            wireframe: true,
            transparent: true,
            opacity: 1
        });
        this.wireframeMesh = new THREE.Mesh(geometry, wireMaterial);
        this.wireframeMesh.castShadow = true;
        this.wireframeMesh.receiveShadow = true;

        // Edge lines
        const edgesGeometry = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0xffffff,
            linewidth: 1
        });
        this.edges = new THREE.LineSegments(edgesGeometry, lineMaterial);

        // Face mesh
        const faceMaterial = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.5,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
            side: THREE.DoubleSide
        });
        this.faceMesh = new THREE.Mesh(geometry, faceMaterial);
        this.faceMesh.castShadow = true;
        this.faceMesh.receiveShadow = true;

        // Add to object group
        this.objectGroup.add(this.wireframeMesh);
        this.objectGroup.add(this.edges);
        this.objectGroup.add(this.faceMesh);
    }

    /**
     * Clear all objects from the object group
     */
    clearObjectGroup() {
        while (this.objectGroup.children.length > 0) {
            const child = this.objectGroup.children[0];
            this.objectGroup.remove(child);
            
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(m => m.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }
        
        this.wireframeMesh = null;
        this.faceMesh = null;
        this.edges = null;
    }

    /**
     * Update colors and appearance
     */
    updateColors(bgColor, wireColor, faceColor, faceOpacity) {
        this.scene.background = new THREE.Color(bgColor);
        
        const wireColorObj = new THREE.Color(wireColor);
        const faceColorObj = new THREE.Color(faceColor);

        if (this.wireframeMesh?.material) {
            this.wireframeMesh.material.color.set(wireColorObj);
        }
        
        if (this.edges?.material) {
            this.edges.material.color.set(wireColorObj);
            this.edges.material.needsUpdate = true;
        }
        
        if (this.faceMesh?.material) {
            this.faceMesh.material.color.set(faceColorObj);
            this.faceMesh.material.opacity = faceOpacity;
            this.faceMesh.material.needsUpdate = true;
        }
    }

    /**
     * Update mesh visibility
     */
    updateMeshVisibility(edgesOnly, showFaces) {
        if (this.wireframeMesh) {
            this.wireframeMesh.visible = !edgesOnly;
        }
        if (this.edges) {
            this.edges.visible = edgesOnly;
        }
        if (this.faceMesh) {
            this.faceMesh.visible = showFaces;
        }
    }

    /**
     * Update camera type
     */
    updateCameraType(type) {
        this.currentCameraType = type;
        this.camera = (type === 'orthographic') ? this.orthographicCamera : this.perspectiveCamera;
        this.onWindowResize();
    }

    /**
     * Update object transform (position and rotation)
     */
    updateObjectTransform(transform) {
        if (!this.objectGroup) return;

        const { position, rotation } = transform;
        
        if (position) {
            this.objectGroup.position.set(position.x, position.y, position.z);
        }
        
        if (rotation) {
            this.objectGroup.rotation.set(rotation.x, rotation.y, rotation.z);
        }
    }

    /**
     * Handle window resize
     */
    onWindowResize() {
        const aspect = window.innerWidth / window.innerHeight;

        // Update perspective camera
        this.perspectiveCamera.aspect = aspect;
        this.perspectiveCamera.updateProjectionMatrix();

        // Update orthographic camera
        this.orthographicCamera.left = this.frustumSize * aspect / -2;
        this.orthographicCamera.right = this.frustumSize * aspect / 2;
        this.orthographicCamera.top = this.frustumSize / 2;
        this.orthographicCamera.bottom = this.frustumSize / -2;
        this.orthographicCamera.updateProjectionMatrix();

        // Update renderer
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * Mouse interaction handlers
     */
    onMouseDown(event) {
        this.isMouseDown = true;
        this.mouseLastPosition.x = event.clientX;
        this.mouseLastPosition.y = event.clientY;
    }

    onMouseMove(event) {
        if (!this.isMouseDown || !this.objectGroup) return;

        const deltaX = event.clientX - this.mouseLastPosition.x;
        const deltaY = event.clientY - this.mouseLastPosition.y;

        this.objectGroup.rotation.y += deltaX * this.rotationSpeed;
        this.objectGroup.rotation.x += deltaY * this.rotationSpeed;

        this.mouseLastPosition.x = event.clientX;
        this.mouseLastPosition.y = event.clientY;
    }

    onMouseUp() {
        this.isMouseDown = false;
    }

    /**
     * Touch interaction handlers
     */
    onTouchStart(event) {
        if (event.touches.length === 1) {
            event.preventDefault();
            const touch = event.touches[0];
            this.onMouseDown({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    onTouchMove(event) {
        if (event.touches.length === 1) {
            event.preventDefault();
            const touch = event.touches[0];
            this.onMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
        }
    }

    onTouchEnd() {
        this.onMouseUp();
    }

    /**
     * Start the render loop
     */
    startRenderLoop() {
        const render = () => {
            this.animationId = requestAnimationFrame(render);
            if (this.camera && this.scene) {
                this.renderer.render(this.scene, this.camera);
            }
        };
        render();
    }

    /**
     * Stop the render loop
     */
    stopRenderLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Render a single frame (for capturing)
     */
    renderFrame() {
        if (this.camera && this.scene) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Get canvas data URL for frame capture
     */
    getCanvasDataURL() {
        return this.renderer.domElement.toDataURL('image/png');
    }

    /**
     * Set renderer size for capturing
     */
    setRenderSize(width, height, updateStyle = true) {
        this.renderer.setSize(width, height, updateStyle);
        
        if (updateStyle) {
            const aspect = width / height;
            this.perspectiveCamera.aspect = aspect;
            this.perspectiveCamera.updateProjectionMatrix();
            
            this.orthographicCamera.left = this.frustumSize * aspect / -2;
            this.orthographicCamera.right = this.frustumSize * aspect / 2;
            this.orthographicCamera.updateProjectionMatrix();
        }
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        this.stopRenderLoop();
        
        if (this.renderer) {
            this.renderer.dispose();
            const canvas = this.renderer.domElement;
            if (canvas.parentNode) {
                canvas.parentNode.removeChild(canvas);
            }
        }
        
        this.clearObjectGroup();
        
        // Clean up scene
        if (this.scene) {
            this.scene.clear();
        }
    }
} 