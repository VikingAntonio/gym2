(function() {
    // Detectar automáticamente la base URL desde el script
    const scriptTag = document.currentScript;
    let BASE_URL = 'https://wisbe.xyz';
    if (scriptTag && scriptTag.src.includes('widget.js')) {
        BASE_URL = new URL(scriptTag.src).origin;
    }

    class WisbeWidget extends HTMLElement {
        constructor() {
            super();
            this.attachShadow({ mode: 'open' });
        }

        connectedCallback() {
            const type = this.getAttribute('type') || 'rutinas';
            const domain = this.getAttribute('domain') || window.location.hostname;
            const height = this.getAttribute('height') || '800px';

            const iframe = document.createElement('iframe');
            iframe.src = `${BASE_URL}/${type}.html?domain=${domain}&embedded=true`;
            iframe.style.width = '100%';
            iframe.style.height = height;
            iframe.style.border = 'none';
            iframe.style.borderRadius = '20px';
            iframe.style.overflow = 'hidden';

            this.shadowRoot.appendChild(iframe);
        }
    }

    if (!customElements.get('wisbe-widget')) {
        customElements.define('wisbe-widget', WisbeWidget);
    }

    // Compatibilidad con divs tradicionales
    function initWidgets() {
        const containers = [
            { id: 'wisbe-rutinas', type: 'rutinas' },
            { id: 'wisbe-nutricion', type: 'nutricion' },
            { id: 'wisbe-entrenadores', type: 'entrenadores' }
        ];

        containers.forEach(c => {
            const el = document.getElementById(c.id);
            if (el && !el.dataset.initialized) {
                const domain = el.getAttribute('domain') || window.location.hostname;
                const height = el.getAttribute('height') || '800px';

                const iframe = document.createElement('iframe');
                iframe.src = `${BASE_URL}/${c.type}.html?domain=${domain}&embedded=true`;
                iframe.style.width = '100%';
                iframe.style.height = height;
                iframe.style.border = 'none';
                iframe.style.borderRadius = '20px';
                iframe.style.overflow = 'hidden';

                el.appendChild(iframe);
                el.dataset.initialized = 'true';
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initWidgets);
    } else {
        initWidgets();
    }
})();
