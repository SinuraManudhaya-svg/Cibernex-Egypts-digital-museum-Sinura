/**
 * model-viewer.js
 * A small, self-contained 3D model viewer used across the site
 * wherever an artifact has a real .glb/.gltf model to show. Opens as
 * a modal overlay with drag-to-rotate, scroll-to-zoom (via Three.js
 * OrbitControls), gentle auto-rotate until the visitor interacts,
 * and full cleanup on close so repeated opens don't leak memory.
 *
 * Usage from any regular (non-module) script:
 *   window.openModelViewer('models/artifacts/mask.glb', 'Mask of Tutankhamun');
 *
 * This file is loaded as a <script type="module">, which is why it
 * can use `import` — everything it exposes to the rest of the site
 * goes through window.openModelViewer at the bottom.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let activeViewer = null;

function closeActiveViewer() {
    if (!activeViewer) return;
    activeViewer.dispose();
    activeViewer = null;
}

export function openModelViewer(modelUrl, title) {
    closeActiveViewer();

    const overlay = document.createElement('div');
    overlay.className = 'model-viewer-overlay';
    overlay.innerHTML = `
        <div class="model-viewer-panel" role="dialog" aria-modal="true" aria-label="3D model of ${title}">
            <div class="model-viewer-header">
                <h3>${title}</h3>
                <button type="button" class="model-viewer-close" aria-label="Close 3D viewer">✕</button>
            </div>
            <div class="model-viewer-canvas-wrap">
                <canvas class="model-viewer-canvas"></canvas>
                <p class="model-viewer-status">Loading model…</p>
            </div>
            <p class="model-viewer-hint">Drag to rotate · Scroll to zoom</p>
        </div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const canvas = overlay.querySelector('.model-viewer-canvas');
    const statusEl = overlay.querySelector('.model-viewer-status');
    const wrap = overlay.querySelector('.model-viewer-canvas-wrap');

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, wrap.clientWidth / wrap.clientHeight, 0.1, 1000);
    camera.position.set(0, 0.6, 2.4);

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(wrap.clientWidth, wrap.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Warm, gold-toned lighting to match the site's Egyptian/gold aesthetic
    scene.add(new THREE.HemisphereLight(0xfff2d0, 0x1a1408, 1.1));
    const keyLight = new THREE.DirectionalLight(0xd6a84f, 1.6);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
    rimLight.position.set(-4, 2, -3);
    scene.add(rimLight);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.5;
    controls.maxDistance = 8;

    let modelRoot = null;
    let autoRotate = true;
    let frameId = null;

    const loader = new GLTFLoader();
    loader.load(
        modelUrl,
        gltf => {
            modelRoot = gltf.scene;

            // Center the model and normalize its scale so any .glb —
            // regardless of the units/size it was exported at — fills
            // the viewer consistently.
            const box = new THREE.Box3().setFromObject(modelRoot);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);
            modelRoot.position.sub(center);
            const maxDim = Math.max(size.x, size.y, size.z) || 1;
            modelRoot.scale.setScalar(1.4 / maxDim);

            scene.add(modelRoot);
            statusEl.style.display = 'none';
        },
        undefined,
        err => {
            console.error('Failed to load 3D model:', modelUrl, err);
            statusEl.textContent = 'This 3D model could not be loaded.';
        }
    );

    function onResize() {
        const w = wrap.clientWidth, h = wrap.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    // Stop auto-rotating as soon as the visitor takes control
    controls.addEventListener('start', () => { autoRotate = false; });

    function animate() {
        frameId = requestAnimationFrame(animate);
        if (modelRoot && autoRotate) modelRoot.rotation.y += 0.004;
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    function escHandler(e) {
        if (e.key === 'Escape') closeActiveViewer();
    }
    document.addEventListener('keydown', escHandler);

    overlay.querySelector('.model-viewer-close').addEventListener('click', closeActiveViewer);
    overlay.addEventListener('click', e => {
        if (e.target === overlay) closeActiveViewer();
    });

    activeViewer = {
        dispose() {
            document.removeEventListener('keydown', escHandler);
            cancelAnimationFrame(frameId);
            window.removeEventListener('resize', onResize);
            controls.dispose();
            renderer.dispose();
            scene.traverse(obj => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    (Array.isArray(obj.material) ? obj.material : [obj.material]).forEach(m => m.dispose());
                }
            });
            overlay.remove();
            document.body.style.overflow = '';
        },
    };
}

// Expose to regular (non-module) scripts elsewhere on the site.
window.openModelViewer = openModelViewer;
