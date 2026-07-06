/**
 * Olorsoft Controls
 * Handles WASD + Mouse Look (PointerLock) for desktop,
 * and Virtual Joysticks for mobile touch devices.
 */

class WalkthroughControls {
    constructor(engine) {
        this.engine = engine;
        this.camera = engine.camera;
        this.domElement = engine.renderer.domElement;
        
        // State
        this.isLocked = false;
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        
        // Physics & Jumping
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.speed = 4.0;
        this.canJump = false;
        this.mass = 100.0;
        
        // Mobile State
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        this.init();
    }

    init() {
        if (this.isMobile) {
            document.body.classList.add('is-mobile');
        }

        // Always initialize desktop controls (WASD)
        this.initDesktopControls();

        // Initialize touch controls if mobile
        if (this.isMobile) {
            this.initTouchControls();
        }
        
        // We no longer hijack engine.animate here. 
        // engine.js will call AppControls.update() in its own loop.
    }

    initDesktopControls() {
        document.addEventListener('click', (e) => {
            if (e.target.tagName.toLowerCase() === 'button' || e.target.tagName.toLowerCase() === 'a') return;
            if (window.AppEngine && !window.AppEngine.itemModal.classList.contains('hidden')) return;
            document.body.requestPointerLock();
        });

        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === document.body;
        });

        document.addEventListener('mousemove', (event) => {
            if (!this.isLocked) return;

            const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
            const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

            const euler = new THREE.Euler(0, 0, 0, 'YXZ');
            euler.setFromQuaternion(this.camera.quaternion);

            euler.y -= movementX * 0.002;
            euler.x -= movementY * 0.002;
            euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));

            this.camera.quaternion.setFromEuler(euler);
        });

        document.addEventListener('keydown', (event) => this.onKey(event, true));
        document.addEventListener('keyup', (event) => this.onKey(event, false));
    }

    onKey(event, isDown) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = isDown;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = isDown;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = isDown;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = isDown;
                break;
            case 'Space':
                if (isDown && this.canJump) {
                    this.velocity.y += 10.0;
                    this.canJump = false;
                }
                break;
        }
    }

    initTouchControls() {
        // UI Buttons
        const btnForward = document.getElementById('btnForward');
        const btnBackward = document.getElementById('btnBackward');
        const btnJump = document.getElementById('btnJump');

        // Movement handlers
        btnForward.addEventListener('touchstart', (e) => { e.preventDefault(); this.moveForward = true; }, {passive: false});
        btnForward.addEventListener('touchend', (e) => { e.preventDefault(); this.moveForward = false; });
        
        btnBackward.addEventListener('touchstart', (e) => { e.preventDefault(); this.moveBackward = true; }, {passive: false});
        btnBackward.addEventListener('touchend', (e) => { e.preventDefault(); this.moveBackward = false; });

        btnJump.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.canJump) {
                this.velocity.y += 10.0;
                this.canJump = false;
            }
        }, {passive: false});

        // Look (Right side)
        const touchZoneR = document.createElement('div');
        touchZoneR.style.cssText = 'position:absolute; top:0; right:0; width:50%; height:100%; z-index:5; touch-action:none;';
        document.body.appendChild(touchZoneR);

        let lastTouchR = null;
        touchZoneR.addEventListener('touchstart', (e) => {
            // Ignore if they tapped the jump/interact buttons
            if(e.target.tagName.toLowerCase() === 'button') return;
            lastTouchR = { x: e.changedTouches[0].pageX, y: e.changedTouches[0].pageY };
        });
        touchZoneR.addEventListener('touchmove', (e) => {
            if (!lastTouchR) return;
            const current = e.changedTouches[0];
            const deltaX = current.pageX - lastTouchR.x;
            const deltaY = current.pageY - lastTouchR.y;

            const euler = new THREE.Euler(0, 0, 0, 'YXZ');
            euler.setFromQuaternion(this.camera.quaternion);

            euler.y -= deltaX * 0.005;
            euler.x -= deltaY * 0.005;
            euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x));

            this.camera.quaternion.setFromEuler(euler);

            lastTouchR = { x: current.pageX, y: current.pageY };
        });
        touchZoneR.addEventListener('touchend', () => {
            lastTouchR = null;
        });
    }

    update() {
        const delta = 0.016; // approx 60fps
        
        this.velocity.x -= this.velocity.x * 10.0 * delta;
        this.velocity.z -= this.velocity.z * 10.0 * delta;
        
        // Gravity (independent of mass for acceleration, slightly higher than 9.8 for a snappy game feel)
        this.velocity.y -= 30.0 * delta;

        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveLeft) - Number(this.moveRight);
        this.direction.normalize(); 

        if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * 40.0 * delta;
        if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * 40.0 * delta;

        // X and Z movement are local (so you walk in the direction you look)
        this.camera.translateX(this.velocity.x * delta);
        this.camera.translateZ(this.velocity.z * delta);
        
        // Y movement (Gravity/Jumping) must be GLOBAL, not local!
        this.camera.position.y += this.velocity.y * delta;

        // Ground Check
        if (this.camera.position.y < 1.6) {
            this.velocity.y = 0;
            this.camera.position.y = 1.6;
            this.canJump = true;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if(window.AppEngine) {
            window.AppControls = new WalkthroughControls(window.AppEngine);
        }
    }, 500);
});
