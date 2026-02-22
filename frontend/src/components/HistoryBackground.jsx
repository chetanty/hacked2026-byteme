import { useEffect, useRef } from "react";

/**
 * Lightweight Three.js starfield background.
 * Uses dynamic CDN import to avoid bundler dependency on local three install.
 */
export default function HistoryBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    let renderer;
    let scene;
    let camera;
    let animationId;

    async function init() {
      try {
        const THREE = await import(
          /* @vite-ignore */ "https://unpkg.com/three@0.161.0/build/three.module.js"
        );

        const { innerWidth: width, innerHeight: height } = window;

        renderer = new THREE.WebGLRenderer({
          canvas: canvasRef.current,
          antialias: true,
          alpha: true,
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
        camera.position.z = 42;

        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambient);

        // Gradient fog to soften edges
        scene.fog = new THREE.FogExp2(0x0b0a14, 0.045);

        // Starfield particles
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 650;
        const positions = new Float32Array(starCount * 3);
        for (let i = 0; i < starCount; i++) {
          positions[i * 3] = (Math.random() - 0.5) * 80;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
        }
        starGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const starMaterial = new THREE.PointsMaterial({
          color: 0xbc9cff,
          size: 0.35,
          transparent: true,
          opacity: 0.9,
        });
        const stars = new THREE.Points(starGeometry, starMaterial);
        scene.add(stars);

        // Soft aurora plane
        const planeGeometry = new THREE.PlaneGeometry(80, 80, 32, 32);
        const planeMaterial = new THREE.ShaderMaterial({
          uniforms: {
            uTime: { value: 0 },
            uColor1: { value: new THREE.Color(0x7c3aed) },
            uColor2: { value: new THREE.Color(0x111122) },
          },
          transparent: true,
          depthWrite: false,
          vertexShader: `
            uniform float uTime;
            varying vec2 vUv;
            void main() {
              vUv = uv;
              vec3 pos = position;
              pos.z += sin((pos.x + uTime * 0.6) * 0.4) * 1.8;
              pos.z += cos((pos.y + uTime * 0.4) * 0.6) * 1.2;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            varying vec2 vUv;
            void main() {
              float gradient = smoothstep(0.0, 1.0, vUv.y);
              vec3 color = mix(uColor2, uColor1, gradient);
              float alpha = 0.35 * (1.0 - abs(vUv.y - 0.5) * 1.4);
              gl_FragColor = vec4(color, alpha);
            }
          `,
        });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -0.9;
        plane.position.z = -8;
        scene.add(plane);

        const onResize = () => {
          const { innerWidth, innerHeight } = window;
          camera.aspect = innerWidth / innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(innerWidth, innerHeight);
        };
        window.addEventListener("resize", onResize);

        const animate = () => {
          animationId = requestAnimationFrame(animate);
          if (planeMaterial.uniforms) {
            planeMaterial.uniforms.uTime.value += 0.01;
          }
          stars.rotation.y += 0.0008;
          stars.rotation.x += 0.0004;
          renderer.render(scene, camera);
        };

        animate();

        return () => {
          cancelAnimationFrame(animationId);
          window.removeEventListener("resize", onResize);
          renderer?.dispose();
          planeGeometry.dispose();
          planeMaterial.dispose();
          starGeometry.dispose();
          starMaterial.dispose();
        };
      } catch (err) {
        // If CDN fails, silently skip background
        console.error("Three.js background failed:", err);
      }
    }

    init();

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas ref={canvasRef} className="history-canvas" aria-hidden="true" />;
}
