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

        // Physics World (Cannon.js 0.6.2)
        this.world = new CANNON.World();
        this.world.gravity.set(0, -30.0, 0); // match our snappy jump gravity
        // Static ground plane
        const groundBody = new CANNON.Body({
            type: CANNON.Body.STATIC,
            shape: new CANNON.Plane(),
        });
        // Cannon.js 0.6.2 uses setFromAxisAngle, not setFromEuler
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); // face up
        this.world.addBody(groundBody);

        // Invisible Walls to keep cubes on the grid (Grid is 50x50, so -25 to 25)
        const wallShape = new CANNON.Box(new CANNON.Vec3(25, 20, 1)); // 25 width, 20 height, 1 depth
        const wallN = new CANNON.Body({ type: CANNON.Body.STATIC, shape: wallShape });
        wallN.position.set(0, 10, -25);
        this.world.addBody(wallN);

        const wallS = new CANNON.Body({ type: CANNON.Body.STATIC, shape: wallShape });
        wallS.position.set(0, 10, 25);
        this.world.addBody(wallS);

        const wallShapeSide = new CANNON.Box(new CANNON.Vec3(1, 20, 25));
        const wallE = new CANNON.Body({ type: CANNON.Body.STATIC, shape: wallShapeSide });
        wallE.position.set(25, 10, 0);
        this.world.addBody(wallE);

        const wallW = new CANNON.Body({ type: CANNON.Body.STATIC, shape: wallShapeSide });
        wallW.position.set(-25, 10, 0);
        this.world.addBody(wallW);

        // Inventory System
        this.activeTool = 'hands';
        this.initInventory();

        // UI Elements
        this.crosshair = document.getElementById('crosshair');
        this.itemModal = document.getElementById('itemModal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalDesc = document.getElementById('modalDesc');
        this.modalLink = document.getElementById('modalLink');
        
        const btnClose = document.getElementById('closeModalBtn');
        if (btnClose) {
            btnClose.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent bubbling up to document and triggering pointer lock error
                this.itemModal.classList.add('hidden');
                
                // Request pointer lock back when closing the modal so they can keep playing smoothly
                if (window.AppControls && window.AppControls.isDesktop) {
                    document.body.requestPointerLock();
                }
            });
        }

        // Add Environment Particles
        this.initParticles();

        // Bind events
        window.addEventListener('resize', this.onWindowResize.bind(this));
        
        // Handle Clicks for Interaction
        document.addEventListener('click', this.onClick.bind(this));
        
        // Desktop Interact Key (E)
        document.addEventListener('keydown', (e) => {
            if (e.code === 'KeyE') {
                this.onClick();
            }
        });
        
        // Mobile Interact Button
        const btnInteract = document.getElementById('btnInteract');
        if (btnInteract) {
            btnInteract.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.onClick();
            }, {passive: false});
        }

        // Start render loop
        this.animate();

        // Track Mouse Down for continuous cleaning
        this.isMouseDown = false;
        document.addEventListener('mousedown', () => this.isMouseDown = true);
        document.addEventListener('mouseup', () => this.isMouseDown = false);
        document.addEventListener('touchstart', () => this.isMouseDown = true, {passive: true});
        document.addEventListener('touchend', () => this.isMouseDown = false);
    }

    initInventory() {
        const slots = document.querySelectorAll('.inv-slot');
        slots.forEach(slot => {
            slot.addEventListener('click', (e) => {
                slots.forEach(s => s.classList.remove('active'));
                e.target.classList.add('active');
                this.activeTool = e.target.dataset.tool;
            });
        });
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
                
                // Drop them from the sky for dramatic effect
                mesh.position.set(
                    item.position ? item.position[0] : (Math.random()*10 - 5), 
                    5.0, 
                    item.position ? item.position[2] : (Math.random()*10 - 5)
                );
                
                // Add Physics Body
                const shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.75, 0.5)); // half extents
                const body = new CANNON.Body({ mass: 5, shape: shape });
                body.position.set(mesh.position.x, mesh.position.y, mesh.position.z);
                this.world.addBody(body);
                
                // Store metadata for raycasting
                mesh.userData = { ...item, physicsBody: body };
                
                // --- Dirt Mesh for Cleaning Mechanic (6 independent faces) ---
                const dirtMaterials = [];
                const canvases = [];
                
                for (let i = 0; i < 6; i++) {
                    const canvas = document.createElement('canvas');
                    canvas.width = 256; // Optimization for 6 faces
                    canvas.height = 256;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#4a4036'; // Dirt color
                    ctx.fillRect(0, 0, 256, 256);

                    const texture = new THREE.CanvasTexture(canvas);
                    canvases.push({ ctx, texture });

                    dirtMaterials.push(new THREE.MeshBasicMaterial({ 
                        map: texture, 
                        transparent: true, 
                        opacity: 1.0,
                        depthWrite: false
                    }));
                }
                
                // Slightly larger mesh to wrap the original
                const dirtMesh = new THREE.Mesh(geometry.clone(), dirtMaterials);
                dirtMesh.scale.set(1.02, 1.02, 1.02);
                
                // Attach the canvas contexts to userData for raycasting later
                dirtMesh.userData = { isDirt: true, canvases: canvases, parentItem: mesh };
                mesh.add(dirtMesh); // Add dirt as child of the interactive mesh
                
                this.scene.add(mesh);
                this.interactables.push(mesh);
                this.interactables.push(dirtMesh); // Add dirt to raycast pool
            });
        }
    }

    onClick() {
        if (this.hoveredItem && this.itemModal.classList.contains('hidden')) {
            if (this.activeTool === 'hands') {
                const targetObj = this.hoveredItem.userData.isDirt ? this.hoveredItem.userData.parentItem : this.hoveredItem;
                
                // Slap the object! (Apply Physics Impulse)
                if (targetObj.userData.physicsBody) {
                    const dir = this.raycaster.ray.direction;
                    // Apply a softer impulse forward and slightly up so it stays on grid
                    const force = new CANNON.Vec3(dir.x * 50, 20, dir.z * 50);
                    targetObj.userData.physicsBody.applyImpulse(force, new CANNON.Vec3(0,0,0));
                }
                
                // Unlock pointer to allow interacting with the modal
                if (document.pointerLockElement) {
                    document.exitPointerLock();
                }
                
                // Populate Modal
                const data = targetObj.userData;
                this.modalTitle.innerText = this.sanitize(data.title);
                this.modalDesc.innerText = this.sanitize(data.description);
                this.modalLink.href = data.link || '#';
                
                // Show Modal
                this.itemModal.classList.remove('hidden');
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
        
        // Update Player Controls
        if (window.AppControls) {
            window.AppControls.update();
        }
        
        // Step Physics World
        if (this.world) {
            this.world.step(1/60, 0.016, 3);
            this.interactables.forEach(mesh => {
                if(mesh.userData.physicsBody) {
                    mesh.position.copy(mesh.userData.physicsBody.position);
                    mesh.quaternion.copy(mesh.userData.physicsBody.quaternion);
                }
            });
        }

        // Rotate particles slowly
        if(this.particles) {
            this.particles.rotation.y += 0.0005;
        }

        // Raycasting Logic
        if (this.interactables.length > 0 && this.itemModal.classList.contains('hidden')) {
            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.interactables, true);
            
            if (intersects.length > 0) {
                this.currentIntersect = intersects[0];
                
                if (this.hoveredItem !== this.currentIntersect.object) {
                    if (this.hoveredItem && !this.hoveredItem.userData.isDirt) this.hoveredItem.material.emissiveIntensity = 0.5; // Reset old
                    this.hoveredItem = this.currentIntersect.object;
                    if (!this.hoveredItem.userData.isDirt) this.hoveredItem.material.emissiveIntensity = 2.0; // Highlight new
                    this.crosshair.classList.add('active');
                }
                
                // CONTINUOUS CLEANING LOGIC
                if (this.isMouseDown && this.hoveredItem.userData.isDirt && this.activeTool !== 'hands') {
                    const uv = this.currentIntersect.uv;
                    
                    if (uv && this.currentIntersect.face) {
                        // Get the exact material face index (0 to 5)
                        const matIndex = this.currentIntersect.face.materialIndex !== undefined ? 
                            this.currentIntersect.face.materialIndex : 
                            Math.floor(this.currentIntersect.faceIndex / 2);
                            
                        const targetCanvas = this.hoveredItem.userData.canvases[matIndex];
                        if (targetCanvas) {
                            const ctx = targetCanvas.ctx;
                            const tex = targetCanvas.texture;
                            
                            let radius = 15; 
                            if (this.activeTool === 'washer') radius = 35; // Bigger cleaning area for washer
                            
                            // Erase the canvas (making it transparent)
                            ctx.globalCompositeOperation = 'destination-out';
                            ctx.beginPath();
                            ctx.arc(uv.x * 256, (1 - uv.y) * 256, radius, 0, Math.PI * 2);
                            ctx.fill();
                            
                            tex.needsUpdate = true;
                        }
                    }
                }
                
            } else {
                if (this.hoveredItem) {
                    if (!this.hoveredItem.userData.isDirt) this.hoveredItem.material.emissiveIntensity = 0.5;
                    this.hoveredItem = null;
                    this.currentIntersect = null;
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
