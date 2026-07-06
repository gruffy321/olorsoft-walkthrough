/**
 * Olorsoft 3D Engine
 * Handles the Three.js state machine, rendering, and data loading.
 */

class WalkthroughEngine {
    constructor() {
        this.container = document.getElementById('canvasContainer');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a1a);
        
        // Basic camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.6, 5); // Average eye height (1.6m)

        // WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);

        // State & Data
        this.portfolioData = null;
        this.currentRoom = null;
        this.loadedModels = {};

        // Bind events
        window.addEventListener('resize', this.onWindowResize.bind(this));

        // Start render loop
        this.animate();
    }

    async init() {
        try {
            // Load JSON data safely
            const response = await fetch('assets/data/content.json');
            if (!response.ok) throw new Error('Network response was not ok');
            this.portfolioData = await response.json();
            
            // Sanitize and set UI title
            document.getElementById('portfolioTitle').innerText = this.sanitize(this.portfolioData.settings.title);

            // Load initial room
            await this.loadRoom(this.portfolioData.settings.startRoom);
            
            // Hide loading screen
            document.getElementById('loadingScreen').style.display = 'none';
        } catch (error) {
            console.error('Failed to initialize engine:', error);
            document.getElementById('portfolioTitle').innerText = 'Error loading content.';
        }
    }

    async loadRoom(roomId) {
        const roomData = this.portfolioData.rooms.find(r => r.id === roomId);
        if (!roomData) return;

        this.currentRoom = roomData;

        // Clear existing models
        Object.values(this.loadedModels).forEach(model => {
            this.scene.remove(model);
        });
        this.loadedModels = {};

        // Load GLTF Model if it exists
        if (roomData.modelUrl) {
            try {
                const loader = new THREE.GLTFLoader();
                const gltf = await new Promise((resolve, reject) => {
                    loader.load(roomData.modelUrl, resolve, undefined, reject);
                });
                const model = gltf.scene;
                this.scene.add(model);
                this.loadedModels[roomId] = model;
            } catch (err) {
                console.warn(`Could not load model for room ${roomId}. It might not exist yet.`);
                // Fallback: Create a simple grid floor
                const helper = new THREE.GridHelper(50, 50);
                this.scene.add(helper);
                this.loadedModels[roomId] = helper;
            }
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Optional: Simple ambient rotation if no controls are active yet
        // In Phase 4, controls.js will handle camera updating
        
        this.renderer.render(this.scene, this.camera);
    }

    // Basic DOM sanitization utility
    sanitize(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }
}

// Boot the engine when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.AppEngine = new WalkthroughEngine();
    window.AppEngine.init();
});
