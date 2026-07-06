/**
 * Olorsoft UI & Accessibility
 * Handles ARIA fallbacks, screen reader compatibility,
 * and visual accessibility toggles (High Contrast, Dyslexic Font).
 */

class UIManager {
    constructor() {
        this.uiLayer = document.getElementById('uiLayer');
        this.initToggles();
        this.initAriaFallback();
    }

    initToggles() {
        // Create an accessible menu for toggles
        const menu = document.createElement('div');
        menu.style.cssText = 'position:absolute; bottom:20px; right:20px; z-index:30; pointer-events:auto; display:flex; flex-direction:column; gap:10px; background:rgba(0,0,0,0.7); padding:10px; border-radius:8px;';
        
        // High Contrast Toggle
        const hcBtn = document.createElement('button');
        hcBtn.innerText = 'Toggle High Contrast';
        hcBtn.setAttribute('aria-pressed', 'false');
        hcBtn.onclick = () => {
            const isPressed = hcBtn.getAttribute('aria-pressed') === 'true';
            hcBtn.setAttribute('aria-pressed', !isPressed);
            document.body.classList.toggle('high-contrast', !isPressed);
        };
        
        // Dyslexic Font Toggle
        const fontBtn = document.createElement('button');
        fontBtn.innerText = 'Toggle Dyslexic Font';
        fontBtn.setAttribute('aria-pressed', 'false');
        fontBtn.onclick = () => {
            const isPressed = fontBtn.getAttribute('aria-pressed') === 'true';
            fontBtn.setAttribute('aria-pressed', !isPressed);
            document.body.classList.toggle('dyslexic-font', !isPressed);
        };

        menu.appendChild(hcBtn);
        menu.appendChild(fontBtn);
        this.uiLayer.appendChild(menu);
    }

    initAriaFallback() {
        // Create a semantic HTML list of items in the 3D scene for screen readers
        // This stays visually hidden but accessible
        const srContainer = document.createElement('div');
        srContainer.className = 'sr-only';
        srContainer.style.cssText = 'position:absolute; left:-10000px; top:auto; width:1px; height:1px; overflow:hidden;';
        
        // Wait for engine to load data, then populate
        setTimeout(() => {
            if(window.AppEngine && window.AppEngine.portfolioData) {
                const room = window.AppEngine.currentRoom;
                if(room && room.items) {
                    const ul = document.createElement('ul');
                    ul.setAttribute('aria-label', `Items in ${room.id}`);
                    
                    room.items.forEach(item => {
                        const li = document.createElement('li');
                        const a = document.createElement('a');
                        a.href = item.link || '#';
                        a.innerText = `${item.title}: ${item.description}`;
                        li.appendChild(a);
                        ul.appendChild(li);
                    });
                    
                    srContainer.appendChild(ul);
                }
            }
        }, 2000); // Wait for fetch

        document.body.appendChild(srContainer);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.AppUI = new UIManager();
});
