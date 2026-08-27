/**
 * ============================================================
 * AETHERA® x FARM CENTRAL — WEBGL 2.0 ENGINE v3.0
 * ============================================================
 * Next-gen shader terrain, bioluminescent particles,
 * holographic ring scanner, and GSAP camera choreography.
 */

(function () {
    'use strict';

    // Guard: only init if THREE is loaded
    if (typeof THREE === 'undefined') {
        console.warn('[WebGL] Three.js not loaded, skipping.');
        return;
    }

    let scene, camera, renderer, composer;
    let terrainMesh, pointCloud, rings = [], dataNodes = [];
    let mouseX = 0, mouseY = 0, targetMouseX = 0, targetMouseY = 0;
    let windowHalfX = window.innerWidth / 2;
    let windowHalfY = window.innerHeight / 2;
    let clock = new THREE.Clock();
    let isInitialized = false;

    function init() {
        const container = document.getElementById('webgl-canvas-container');
        if (!container || isInitialized) return;
        isInitialized = true;

        // ── Scene ──
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x050a0e, 0.012);

        // ── Camera ──
        camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1200);
        camera.position.set(0, 18, 50);
        camera.lookAt(0, 0, 0);

        // ── WebGL2 Renderer ──
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');
        renderer = new THREE.WebGLRenderer({
            canvas: gl ? canvas : undefined,
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance'
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.15;
        renderer.outputEncoding = THREE.sRGBEncoding;
        container.appendChild(renderer.domElement);

        createTerrain();
        createParticles();
        createHolographicRings();
        createDataNodes();
        createLighting();

        // ── Events ──
        window.addEventListener('resize', onResize, false);
        document.addEventListener('mousemove', onMouseMove, false);
        window.addEventListener('scroll', onScroll, { passive: true });

        animate();
    }

    // ── Procedural Agricultural Terrain ──
    function createTerrain() {
        const geo = new THREE.PlaneGeometry(200, 200, 128, 128);
        geo.rotateX(-Math.PI / 2);

        // Procedural elevation: rolling hills + crop furrows
        const pos = geo.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const z = pos.getZ(i);
            const hill = Math.sin(x * 0.06) * 3.5 + Math.cos(z * 0.06) * 2.8;
            const furrow = Math.sin(x * 0.3) * 0.4;
            const noise = Math.sin((x + z) * 0.03) * 1.5;
            pos.setY(i, hill + furrow + noise);
        }
        geo.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
            color: 0x10b981,
            wireframe: true,
            transparent: true,
            opacity: 0.22,
            roughness: 0.3,
            metalness: 0.85
        });

        terrainMesh = new THREE.Mesh(geo, mat);
        terrainMesh.position.y = -10;
        scene.add(terrainMesh);
    }

    // ── Bioluminescent Particle Point Cloud ──
    function createParticles() {
        const count = 3500;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        const palette = [
            new THREE.Color(0x10b981), // Emerald
            new THREE.Color(0x06b6d4), // Cyan
            new THREE.Color(0x8b5cf6), // Violet
            new THREE.Color(0xf59e0b), // Amber
            new THREE.Color(0x34d399), // Teal
            new THREE.Color(0x22d3ee), // Sky Cyan
        ];

        for (let i = 0; i < count; i++) {
            positions[i * 3]     = (Math.random() - 0.5) * 180;
            positions[i * 3 + 1] = Math.random() * 50 - 8;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 180;

            const c = palette[Math.floor(Math.random() * palette.length)];
            colors[i * 3]     = c.r;
            colors[i * 3 + 1] = c.g;
            colors[i * 3 + 2] = c.b;

            sizes[i] = Math.random() * 1.5 + 0.3;
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.7,
            vertexColors: true,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        });

        pointCloud = new THREE.Points(geo, mat);
        scene.add(pointCloud);
    }

    // ── Holographic Scanner Rings ──
    function createHolographicRings() {
        const ringColors = [0x10b981, 0x06b6d4, 0xa855f7, 0x22d3ee];
        for (let r = 0; r < 4; r++) {
            const geo = new THREE.TorusGeometry(10 + r * 5, 0.06, 16, 120);
            const mat = new THREE.MeshBasicMaterial({
                color: ringColors[r],
                transparent: true,
                opacity: 0.35,
                wireframe: true
            });
            const ring = new THREE.Mesh(geo, mat);
            ring.rotation.x = Math.PI / 3 + r * 0.15;
            ring.position.set(0, 5, 0);
            scene.add(ring);
            rings.push(ring);
        }
    }

    // ── Floating Data Nodes (IoT Sensor Visualization) ──
    function createDataNodes() {
        const nodeGeo = new THREE.OctahedronGeometry(0.4, 0);
        const nodeColors = [0x10b981, 0x06b6d4, 0xf59e0b, 0xa855f7];

        for (let i = 0; i < 30; i++) {
            const mat = new THREE.MeshBasicMaterial({
                color: nodeColors[Math.floor(Math.random() * nodeColors.length)],
                transparent: true,
                opacity: 0.6,
                wireframe: true
            });
            const node = new THREE.Mesh(nodeGeo, mat);
            node.position.set(
                (Math.random() - 0.5) * 100,
                Math.random() * 30 - 3,
                (Math.random() - 0.5) * 100
            );
            node.userData = {
                speed: Math.random() * 2 + 0.5,
                amplitude: Math.random() * 3 + 1,
                phase: Math.random() * Math.PI * 2
            };
            scene.add(node);
            dataNodes.push(node);
        }
    }

    // ── Volumetric Lighting ──
    function createLighting() {
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));

        const dir = new THREE.DirectionalLight(0x10b981, 2.0);
        dir.position.set(25, 45, 25);
        scene.add(dir);

        const p1 = new THREE.PointLight(0x06b6d4, 2.5, 100);
        p1.position.set(-25, 15, -15);
        scene.add(p1);

        const p2 = new THREE.PointLight(0xa855f7, 1.5, 80);
        p2.position.set(30, 8, 20);
        scene.add(p2);

        const p3 = new THREE.PointLight(0xf59e0b, 1.2, 60);
        p3.position.set(-10, 20, 30);
        scene.add(p3);
    }

    // ── Resize ──
    function onResize() {
        windowHalfX = window.innerWidth / 2;
        windowHalfY = window.innerHeight / 2;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    // ── Mouse Parallax ──
    function onMouseMove(e) {
        mouseX = (e.clientX - windowHalfX) * 0.012;
        mouseY = (e.clientY - windowHalfY) * 0.012;
    }

    // ── Scroll Integration ──
    function onScroll() {
        const container = document.getElementById('webgl-canvas-container');
        const scrollY = window.scrollY;
        const heroHeight = window.innerHeight;

        // Fade WebGL in after hero section
        if (container) {
            if (scrollY > heroHeight * 0.6) {
                container.classList.add('active');
                container.style.opacity = Math.min((scrollY - heroHeight * 0.6) / (heroHeight * 0.5), 1);
            } else {
                container.classList.remove('active');
                container.style.opacity = '0';
            }
        }

        // Camera scroll choreography
        if (!camera) return;
        const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
        const progress = Math.min(Math.max(scrollY / (totalScroll || 1), 0), 1);

        // Cinematic camera orbit along scroll
        const angle = progress * Math.PI * 1.5;
        camera.position.x = Math.sin(angle) * 20;
        camera.position.z = 50 - progress * 30;
        camera.position.y = 18 - Math.sin(progress * Math.PI) * 10;
        camera.lookAt(0, 2 - progress * 5, 0);
    }

    // ── Animation Loop ──
    function animate() {
        requestAnimationFrame(animate);

        const time = clock.getElapsedTime();

        // Smooth mouse lerp
        targetMouseX += (mouseX - targetMouseX) * 0.04;
        targetMouseY += (mouseY - targetMouseY) * 0.04;

        // Gentle scene rotation
        if (scene) {
            scene.rotation.y = time * 0.03 + targetMouseX * 0.15;
            scene.rotation.x = targetMouseY * 0.08;
        }

        // Animate terrain waves
        if (terrainMesh) {
            const pos = terrainMesh.geometry.attributes.position;
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const z = pos.getZ(i);
                const y = Math.sin(x * 0.06 + time * 0.8) * 3.2
                        + Math.cos(z * 0.06 + time * 0.6) * 2.5
                        + Math.sin((x + z) * 0.03 + time * 0.4) * 1.2;
                pos.setY(i, y);
            }
            pos.needsUpdate = true;
        }

        // Rotate scanner rings
        rings.forEach((ring, i) => {
            ring.rotation.z += (i % 2 === 0 ? 0.006 : -0.006);
            ring.rotation.y += 0.004;
            ring.position.y = 5 + Math.sin(time * 1.2 + i * 1.1) * 2;
        });

        // Animate data nodes (float, spin)
        dataNodes.forEach(node => {
            const d = node.userData;
            node.position.y += Math.sin(time * d.speed + d.phase) * 0.015;
            node.rotation.x += 0.02;
            node.rotation.y += 0.015;
        });

        // Rotate particle cloud
        if (pointCloud) {
            pointCloud.rotation.y = -time * 0.015;
            // Animate individual particle heights gently
            const pp = pointCloud.geometry.attributes.position;
            for (let i = 0; i < Math.min(pp.count, 500); i++) {
                const currentY = pp.getY(i);
                pp.setY(i, currentY + Math.sin(time * 0.5 + i * 0.1) * 0.003);
            }
            pp.needsUpdate = true;
        }

        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    // ── GSAP ScrollTrigger Integration ──
    function initGSAP() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

        gsap.registerPlugin(ScrollTrigger);

        // Animate each .scroll-frame section
        gsap.utils.toArray('.scroll-frame').forEach((frame, i) => {
            gsap.fromTo(frame,
                { opacity: 0, y: 100, rotateX: 8, scale: 0.95 },
                {
                    opacity: 1, y: 0, rotateX: 0, scale: 1,
                    duration: 1.2,
                    ease: 'power3.out',
                    scrollTrigger: {
                        trigger: frame,
                        start: 'top 85%',
                        end: 'top 30%',
                        toggleActions: 'play none none reverse',
                    }
                }
            );
        });

        // Parallax on nano-images
        gsap.utils.toArray('.nano-parallax').forEach(img => {
            gsap.to(img, {
                yPercent: -15,
                ease: 'none',
                scrollTrigger: {
                    trigger: img,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1.5,
                }
            });
        });

        // Stats counter animation
        gsap.utils.toArray('.stat-counter').forEach(el => {
            const target = parseInt(el.dataset.target, 10);
            const obj = { val: 0 };
            gsap.to(obj, {
                val: target,
                duration: 2.5,
                ease: 'power2.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 80%',
                    toggleActions: 'play none none none',
                },
                onUpdate: () => {
                    el.textContent = Math.floor(obj.val).toLocaleString();
                }
            });
        });

        // SVG line draw
        gsap.utils.toArray('.svg-draw').forEach(svg => {
            ScrollTrigger.create({
                trigger: svg,
                start: 'top 75%',
                onEnter: () => svg.classList.add('is-active'),
            });
        });
    }

    // ── Boot ──
    function boot() {
        init();
        // Slight delay for GSAP plugins to register
        setTimeout(initGSAP, 200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
