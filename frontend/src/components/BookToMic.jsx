import { useEffect, useRef } from "react";

/**
 * Book → Microphone flip animation rendered with Three.js (CDN).
 * The book is visible for the first half-turn; the mic appears after 180°.
 * Keeps geometry simple for quick load but polished with gradients and bloom-like glow.
 */
export default function BookToMic() {
  const canvasRef = useRef(null);

  useEffect(() => {
    let renderer;
    let scene;
    let camera;
    let frameId;
    let bookGroup;
    let micGroup;

    async function init() {
      try {
        const THREE = await import(/* @vite-ignore */ "https://cdn.skypack.dev/three@0.161.0");

        const width = 520;
        const height = 320;

        renderer = new THREE.WebGLRenderer({
          canvas: canvasRef.current,
          antialias: true,
          alpha: true,
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
        camera.position.set(0, 0.4, 6.5);

        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);
        const key = new THREE.DirectionalLight(0xc084fc, 1.2);
        key.position.set(3, 4, 4);
        scene.add(key);
        const rim = new THREE.PointLight(0x7c3aed, 1.5, 12);
        rim.position.set(-3, 2, -2);
        scene.add(rim);

        // Book
        bookGroup = new THREE.Group();
        const bookMaterial = new THREE.MeshStandardMaterial({
          color: 0x7c3aed,
          roughness: 0.35,
          metalness: 0.15,
        });
        const bookCore = new THREE.Mesh(new THREE.BoxGeometry(3, 2, 0.45), bookMaterial);
        bookCore.position.set(0, 0, 0);
        const pageMaterial = new THREE.MeshStandardMaterial({
          color: 0xf8fafc,
          roughness: 0.7,
          metalness: 0.05,
        });
        const pages = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.8, 0.4), pageMaterial);
        pages.position.set(0, 0, 0.02);
        bookGroup.add(bookCore, pages);

        // Mic
        micGroup = new THREE.Group();
        const stemMaterial = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.3,
          metalness: 0.45,
        });
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.85, 32, 32), new THREE.MeshStandardMaterial({
          color: 0x7c3aed,
          roughness: 0.2,
          metalness: 0.55,
        }));
        head.position.y = 1.1;

        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.6, 24), stemMaterial);
        stem.position.y = 0.05;
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.25, 32), stemMaterial);
        base.position.y = -0.9;
        micGroup.add(head, stem, base);
        micGroup.visible = false;

        scene.add(bookGroup);
        scene.add(micGroup);

        // Background stars
        const starGeo = new THREE.BufferGeometry();
        const starCount = 300;
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
          positions[i * 3] = (Math.random() - 0.5) * 18;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
          positions[i * 3 + 2] = - (Math.random() * 12 + 2);
        }
        starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const starMat = new THREE.PointsMaterial({ color: 0xb9a5ff, size: 0.05 });
        scene.add(new THREE.Points(starGeo, starMat));

        const animate = () => {
          frameId = requestAnimationFrame(animate);
          const t = performance.now() * 0.001;
          const angle = (t * 0.6) % (Math.PI * 2); // full rotation cycle

          // toggle visibility based on half-turn
          const showingBook = angle < Math.PI;
          bookGroup.visible = showingBook;
          micGroup.visible = !showingBook;

          // ease rotation for both, keep continuous
          const displayAngle = showingBook ? angle : angle - Math.PI;
          bookGroup.rotation.y = displayAngle;
          micGroup.rotation.y = displayAngle + 0.4;

          // subtle bob
          const bob = Math.sin(t * 2) * 0.08;
          bookGroup.position.y = bob;
          micGroup.position.y = bob;

          renderer.render(scene, camera);
        };

        animate();
      } catch (err) {
        console.error("Three.js book-to-mic failed:", err);
      }
    }

    init();

    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      renderer?.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="book-mic-canvas" aria-hidden="true" />;
}
