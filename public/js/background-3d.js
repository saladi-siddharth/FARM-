// FARM CENTRAL - CINEMATIC 3D BACKGROUND
// Uses Three.js for a premium, realistic particle field effect

if (typeof THREE === 'undefined') {
    console.error("Three.js not loaded. Please include CDN.");
} else {
    init3D();
}

function init3D() {
    // Container
    let container = document.getElementById('canvas-bg');
    if (!container) {
        container = document.createElement('div');
        container.id = 'canvas-bg';
        container.style.position = 'fixed';
        container.style.top = '0';
        container.style.left = '0';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.zIndex = '-1';
        container.style.opacity = '1';
        document.body.prepend(container);
    }

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a); // Deep Black
    scene.fog = new THREE.FogExp2(0x0a0a0a, 0.001);

    // Camera
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0, 400, 400); // High angle
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.appendChild(renderer.domElement);

    // --- CYBER TERRAIN ---
    // Moving Grid floor
    const gridHelper = new THREE.GridHelper(4000, 100, 0x00ffff, 0x222222);
    scene.add(gridHelper);

    // Moving Particles (Fireflies/Data)
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 1500;
    const posArray = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 3000;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMaterial = new THREE.PointsMaterial({
        size: 4,
        color: 0x00ffcc,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // --- ANIMATION LOOP ---
    let time = 0;
    function animate() {
        requestAnimationFrame(animate);
        time += 0.002;

        // Rotate scene slightly
        particles.rotation.y = time * 0.5;

        // Gentle float
        camera.position.y = 400 + Math.sin(time) * 20;

        // Dynamic Grid movement simulation (illusion)
        gridHelper.position.z = (time * 100) % 40;

        renderer.render(scene, camera);
    }

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    animate();
}

function createCircleTexture() {
    // Generate a soft glow particle texture programmatically
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 32, 32);

    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
}
