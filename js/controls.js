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
        
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.speed = 4.0;
        
        // Touch State
        this.isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        
        this.init();
    }

    init() {
        if (!this.isTouch) {
            this.initDesktopControls();
        } else {
            this.initTouchControls();
        }
        
        // Hook into engine's render loop
        const originalAnimate = this.engine.animate.bind(this.engine);
        this.engine.animate = () => {
            this.update();
            this.engine.renderer.render(this.engine.scene, this.camera);
            requestAnimationFrame(this.engine.animate);
        };
        // Restart animation with hook
        this.engine.animate();
    }

    initDesktopControls() {
        document.addEventListener('click', () => {
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
            
            // Limit looking up and down
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
        }
    }

    initTouchControls() {
        // Simple invisible overlay zones for left (move) and right (look)
        const touchZoneL = document.createElement('div');
        touchZoneL.style.cssText = 'position:absolute; top:0; left:0; width:50%; height:100%; z-index:20; touch-action:none;';
        
        const touchZoneR = document.createElement('div');
        touchZoneR.style.cssText = 'position:absolute; top:0; right:0; width:50%; height:100%; z-index:20; touch-action:none;';

        document.body.appendChild(touchZoneL);
        document.body.appendChild(touchZoneR);

        // Movement (Left side)
        let startTouchL = null;
        touchZoneL.addEventListener('touchstart', (e) => {
            startTouchL = e.changedTouches[0];
            this.moveForward = true; // basic tap to move forward for prototype
        });
        touchZoneL.addEventListener('touchmove', (e) => {
            // Calculate delta and set movement direction
        });
        touchZoneL.addEventListener('touchend', () => {
            startTouchL = null;
            this.moveForward = false;
        });

        // Look (Right side)
        let lastTouchR = null;
        touchZoneR.addEventListener('touchstart', (e) => {
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

        this.direction.z = Number(this.moveForward) - Number(this.moveBackward);
        this.direction.x = Number(this.moveRight) - Number(this.moveLeft);
        this.direction.normalize(); // consistent speed in all directions

        if (this.moveForward || this.moveBackward) this.velocity.z -= this.direction.z * 40.0 * delta;
        if (this.moveLeft || this.moveRight) this.velocity.x -= this.direction.x * 40.0 * delta;

        this.camera.translateX(this.velocity.x * delta);
        this.camera.translateZ(this.velocity.z * delta);
    }
}

// Hook it into the engine
document.addEventListener('DOMContentLoaded', () => {
    // Wait for engine to initialize slightly
    setTimeout(() => {
        if(window.AppEngine) {
            window.AppControls = new WalkthroughControls(window.AppEngine);
        }
    }, 500);
});
