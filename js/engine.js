/**
 * Olorsoft 3D Engine - Phase 5
 * Handles the Three.js state machine, rendering, raycasting, and aesthetics.
 */

class WalkthroughEngine {
    constructor() {
        this.container = document.getElementById('canvasContainer');
        this.scene = new THREE.Scene();
        
        // Premium Aesthetics: Fog & Background
        this.scene.background = new THREE.Color(0x0d0d12);
        this.scene.fog = new THREE.FogExp2(0x0d0d12, 0.05);
        
        // Basic camera setup
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 1.6, 5); // Average eye height

        // WebGL Renderer with High-Quality Settings
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.container.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xa5b4fc, 1.5);
        dirLight.position.set(5, 10, 5);
        this.scene.add(dirLight);
        
        const pointLight = new THREE.PointLight(0x3b82f6, 2, 20);
        pointLight.position.set(0, 2, 0);
        this.scene.add(pointLight);

        // State & Data
        this.portfolioData = null;
        this.currentRoom = null;
        this.loadedModels = {};
        
        // Interaction Objects
        this.interactables = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2(0, 0); // Always center for crosshair
        this.hoveredItem = null;

        // UI Elements
        this.crosshair = document.getElementById('crosshair');
        this.itemModal = document.getElementById('itemModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalDesc = document.getElementById('modalDesc');
        this.modalLink = document.getElementById('modalLink');
        
        document.getElementById('closeModalBtn').addEventListener('click', () => {
            this.itemModal.classList.add('hidden');
            if (window.AppControls && window.AppControls.isDesktop) {
                document.body.requestPointerLock();
            }
        });

        // Add Environment Particles
        this.initParticles();

        // Bind events
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Handle Clicks for Interaction
        document.addEventListener('click', this.onClick.bind(this));

        // Start render loop
        this.animate();
    }

    initParticles() {
        const particleCount = 500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        
        for(let i=0; i<particleCount*3; i++) {
            positions[i] = (Math.random() - 0.5) * 40; // Spread in 40m area
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            color: 0xa5b4fc,
            size: 0.05,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.scene.add(this.particles);
    }

    async init() {
        try {
            const response = await fetch('assets/data/content.json');
            if (!response.ok) throw new Error('Network response was not ok');
            this.portfolioData = await response.json();
            
            document.getElementById('portfolioTitle').innerText = this.sanitize(this.portfolioData.settings.title);

            await this.loadRoom(this.portfolioData.settings.startRoom);
            
            // Fade out loading screen
            const loader = document.getElementById('loadingScreen');
            loader.style.opacity = '0';
            setTimeout(() => loader.style.display = 'none', 500);
        } catch (error) {
            console.error('Failed to initialize engine:', error);
            document.getElementById('portfolioTitle').innerText = 'Error loading content.';
        }
    }

    async loadRoom(roomId) {
        const roomData = this.portfolioData.rooms.find(r => r.id === roomId);
        if (!roomData) return;
        this.currentRoom = roomData;

        // Clear existing
        Object.values(this.loadedModels).forEach(model => this.scene.remove(model));
        this.interactables.forEach(obj => this.scene.remove(obj));
        this.loadedModels = {};
        this.interactables = [];

        // Load Main Room Model
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
                console.warn(`Could not load main room model. Rendering fallback grid.`);
                const helper = new THREE.GridHelper(50, 50, 0x3b82f6, 0x222222);
                this.scene.add(helper);
                this.loadedModels[roomId] = helper;
            }
        }

        // Spawn Interactive Items
        if (roomData.items) {
            const geometry = new THREE.BoxGeometry(1, 1.5, 1);
            
            roomData.items.forEach(item => {
                // Glow material for wow-factor
                const material = new THREE.MeshStandardMaterial({ 
                    color: 0x3b82f6,
                    emissive: 0x1d4ed8,
                    emissiveIntensity: 0.5,
                    roughness: 0.2,
                    metalness: 0.8
                });
                
                const mesh = new THREE.Mesh(geometry, material);
                if (item.position) {
                    mesh.position.set(item.position[0], item.position[1] + 0.75, item.position[2]);
                } else {
                    mesh.position.set(Math.random()*10 - 5, 0.75, Math.random()*10 - 5);
                }
                
                // Store metadata for raycasting
                mesh.userData = item;
                
                this.scene.add(mesh);
                this.interactables.push(mesh);
            });
        }
    }

    onClick() {
        if (this.hoveredItem && this.itemModal.classList.contains('hidden')) {
            // Unlock pointer to allow interacting with the modal
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            
            // Populate Modal
            const data = this.hoveredItem.userData;
            this.modalTitle.innerText = this.sanitize(data.title);
            this.modalDesc.innerText = this.sanitize(data.description);
            this.modalLink.href = data.link || '#';
            
            // Show Modal
            this.itemModal.classList.remove('hidden');
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        // Rotate particles slowly
        if(this.particles) {
            this.particles.rotation.y += 0.0005;
        }

        // Raycasting Logic
        if (this.interactables.length > 0 && this.itemModal.classList.contains('hidden')) {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.interactables);
            
            if (intersects.length > 0) {
                if (this.hoveredItem !== intersects[0].object) {
                    if (this.hoveredItem) this.hoveredItem.material.emissiveIntensity = 0.5; // Reset old
                    this.hoveredItem = intersects[0].object;
                    this.hoveredItem.material.emissiveIntensity = 2.0; // Highlight new
                    this.crosshair.classList.add('active');
                }
            } else {
                if (this.hoveredItem) {
                    this.hoveredItem.material.emissiveIntensity = 0.5;
                    this.hoveredItem = null;
                    this.crosshair.classList.remove('active');
                }
            }
        }
        
        this.renderer.render(this.scene, this.camera);
    }

    sanitize(str) {
        if(!str) return '';
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.AppEngine = new WalkthroughEngine();
    window.AppEngine.init();
});
