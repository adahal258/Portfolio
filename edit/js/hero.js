/* ═══════════════════════════════════════════════
   HERO — DEVOPS ∞ SIGN  (fully interactive)
   · Slow cinematic auto-rotation
   · Mouse HOVER → gentle parallax lean
   · Click + DRAG → full control, inertia release
   ═══════════════════════════════════════════════ */

(function initHero() {
  const canvas = document.getElementById('threeCanvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x000000, 0);

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 100);
  camera.position.set(0, 0, 5.5);
  camera.setViewOffset(
    innerWidth, innerHeight,
    -Math.floor(innerWidth * .22), 0,
    innerWidth, innerHeight
  );

  /* ── Lemniscate of Bernoulli  ∞ ── */
  class InfinityCurve extends THREE.Curve {
    constructor(s) { super(); this.s = s || 2.0; }
    getPoint(t) {
      const a = this.s, th = t * Math.PI * 2;
      const d = 1 + Math.sin(th) * Math.sin(th);
      return new THREE.Vector3(
        a * Math.cos(th) / d,
        a * Math.sin(th) * Math.cos(th) / d,
        0
      );
    }
  }
  const curve = new InfinityCurve(2.0);

  /* Outer metallic tube */
  const tubeGeo = new THREE.TubeGeometry(curve, 260, 0.26, 20, true);
  const tube = new THREE.Mesh(tubeGeo, new THREE.MeshStandardMaterial({
    color: 0x062b1a, roughness: 0.22, metalness: 0.88,
    emissive: 0x0a3d28, emissiveIntensity: 0.55
  }));

  /* Wireframe overlay */
  const wire = new THREE.Mesh(tubeGeo, new THREE.MeshBasicMaterial({
    color: 0x10b981, wireframe: true, transparent: true, opacity: 0.14
  }));
  wire.scale.setScalar(1.016);

  /* Glowing inner core */
  const coreGeo = new THREE.TubeGeometry(curve, 260, 0.09, 12, true);
  const core = new THREE.Mesh(coreGeo, new THREE.MeshStandardMaterial({
    color: 0x00ffaa, emissive: 0x00ffaa, emissiveIntensity: 3,
    roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.9
  }));

  /* Master group — everything rotates together */
  const group = new THREE.Group();
  group.add(tube, wire, core);
  scene.add(group);

  /* Orbit halos */
  [[2.9, 0.003, Math.PI / 4, 0, 0x10b981, 0.18],
   [2.5, 0.002, Math.PI / 6, Math.PI / 3, 0x34d399, 0.10]
  ].forEach(p => {
    const m = new THREE.Mesh(
      new THREE.TorusGeometry(p[0], p[1], 2, 200),
      new THREE.MeshBasicMaterial({ color: p[4], transparent: true, opacity: p[5] })
    );
    m.rotation.set(p[2], p[3], 0);
    scene.add(m);
  });

  /* Data packets travelling the loop */
  const PKTS = 14;
  const pkts = [];
  for (let i = 0; i < PKTS; i++) {
    const pm = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 3,
        transparent: true, opacity: 0.92
      })
    );
    pkts.push({ mesh: pm, t: i / PKTS, spd: 0.003 + Math.random() * 0.002 });
    group.add(pm);
  }

  /* Starfield */
  const PC = 420;
  const pp = new Float32Array(PC * 3);
  const pc = new Float32Array(PC * 3);
  for (let i = 0; i < PC; i++) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1);
    const r  = 3.2 + Math.random() * 2;
    pp[i*3]   = r * Math.sin(ph) * Math.cos(th);
    pp[i*3+1] = r * Math.sin(ph) * Math.sin(th);
    pp[i*3+2] = r * Math.cos(ph);
    const b = .4 + Math.random() * .6;
    pc[i*3] = .06*b; pc[i*3+1] = .73*b; pc[i*3+2] = .51*b;
  }
  const ptGeo = new THREE.BufferGeometry();
  ptGeo.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  ptGeo.setAttribute('color',    new THREE.BufferAttribute(pc, 3));
  const pts = new THREE.Points(ptGeo, new THREE.PointsMaterial({
    size: .022, vertexColors: true, transparent: true, opacity: .8
  }));
  scene.add(pts);

  /* Lights */
  scene.add(new THREE.AmbientLight(0x0a2e1a, 2.5));
  const l1 = new THREE.PointLight(0x10b981, 8, 18); l1.position.set(3, 3, 3); scene.add(l1);
  const l2 = new THREE.PointLight(0x34d399, 3, 12); l2.position.set(-3,-2, 2); scene.add(l2);
  const l3 = new THREE.PointLight(0xc9a84c, 2, 10); l3.position.set(0, -3,-2); scene.add(l3);
  const l4 = new THREE.PointLight(0x00ffcc, 4,  8); l4.position.set(0,  0, 4); scene.add(l4);

  /* ══════════════════════════════════════════
     INTERACTION STATE
     Three modes:
       1. AUTO   — slow cinematic drift (default)
       2. HOVER  — mouse position drives subtle parallax lean
       3. DRAG   — click+drag for full control with inertia
  ══════════════════════════════════════════ */

  /* Accumulated rotation angles (world-space) */
  let rotX = 0.18;   // slight forward tilt so ∞ reads nicely
  let rotY = 0;
  let rotZ = 0;

  /* Auto-rotation velocities */
  const AUTO_VY = 0.0018;   // ~10 s per full Y turn
  const AUTO_VX = 0.00042;  // very slow X wobble
  const AUTO_VZ = 0.00018;  // tiny Z roll

  /* Hover parallax targets (lerped) */
  let hoverTargX = 0, hoverTargY = 0;
  let hoverCurrX = 0, hoverCurrY = 0;

  /* Drag state */
  let isDragging = false;
  let prevMouseX = 0, prevMouseY = 0;
  let velX = 0, velY = 0;          // drag inertia velocity
  let isHovering = false;
  let autoPhase = 0;                // for slow sinusoidal X in auto mode

  /* ── Mouse enter/leave the canvas ── */
  canvas.addEventListener('mouseenter', () => { isHovering = true; });
  canvas.addEventListener('mouseleave', () => {
    isHovering = false;
    hoverTargX = 0; hoverTargY = 0;
    if (!isDragging) { velX *= 0.3; velY *= 0.3; }
  });

  /* ── Hover parallax ── */
  canvas.addEventListener('mousemove', e => {
    if (isDragging) {
      /* DRAG: accumulate rotation delta */
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      velY = dx * 0.012;
      velX = dy * 0.008;
      rotY += velY;
      rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX + velX));
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    } else {
      /* HOVER: gentle lean toward cursor */
      const nx = (e.clientX / innerWidth  - 0.5) * 2;  // -1 … 1
      const ny = (e.clientY / innerHeight - 0.5) * 2;
      hoverTargY =  nx * 0.28;   // max ±0.28 rad lean on Y
      hoverTargX = -ny * 0.18;   // max ±0.18 rad lean on X
    }
  });

  /* ── Drag start ── */
  canvas.addEventListener('mousedown', e => {
    isDragging = true;
    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
    velX = 0; velY = 0;
  });

  /* ── Touch support ── */
  canvas.addEventListener('touchstart', e => {
    isDragging = true;
    prevMouseX = e.touches[0].clientX;
    prevMouseY = e.touches[0].clientY;
    velX = 0; velY = 0;
  }, { passive: true });

  canvas.addEventListener('touchmove', e => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - prevMouseX;
    const dy = e.touches[0].clientY - prevMouseY;
    velY = dx * 0.012;
    velX = dy * 0.008;
    rotY += velY;
    rotX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotX + velX));
    prevMouseX = e.touches[0].clientX;
    prevMouseY = e.touches[0].clientY;
  }, { passive: true });

  /* ── Drag end (window-level so releasing outside canvas works) ── */
  window.addEventListener('mouseup',  () => { isDragging = false; });
  window.addEventListener('touchend', () => { isDragging = false; });

  /* Resize */
  window.addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    camera.setViewOffset(
      innerWidth, innerHeight,
      -Math.floor(innerWidth * .22), 0,
      innerWidth, innerHeight
    );
  });

  /* ── ANIMATION LOOP ── */
  let T = 0;
  (function animate() {
    requestAnimationFrame(animate);
    T += 0.005;
    autoPhase += 0.0035;

    if (isDragging) {
      /* While dragging: rotation is set directly in mousemove handler */
      /* Damp hover targets back to zero */
      hoverTargX = 0; hoverTargY = 0;

    } else if (isHovering) {
      /* HOVER mode: stop auto-advance on Y, let hover drive lean
         Smooth inertia decay */
      velY *= 0.92;
      velX *= 0.92;
      rotY += velY;
      rotX += velX;
      /* Ease toward hover target */
      hoverCurrX += (hoverTargX - hoverCurrX) * 0.06;
      hoverCurrY += (hoverTargY - hoverCurrY) * 0.06;

    } else {
      /* AUTO mode: slow cinematic drift */
      velY += (AUTO_VY - velY) * 0.02;   // ease toward steady spin
      velX *= 0.96;
      rotY += velY;
      rotX += velX;
      /* Very slow sinusoidal X wobble */
      rotX += Math.sin(autoPhase * 0.4) * AUTO_VX;
      rotZ += AUTO_VZ * Math.sin(autoPhase * 0.25);
      /* Ease hover offsets back to zero */
      hoverCurrX += (0 - hoverCurrX) * 0.04;
      hoverCurrY += (0 - hoverCurrY) * 0.04;
    }

    /* Apply combined rotation */
    group.rotation.x = rotX + hoverCurrX;
    group.rotation.y = rotY + hoverCurrY;
    group.rotation.z = rotZ;

    /* Breath-like scale pulse */
    group.scale.setScalar(1 + Math.sin(T * 0.55) * 0.008);

    /* Data packets */
    pkts.forEach(p => {
      p.t = (p.t + p.spd) % 1;
      p.mesh.position.copy(curve.getPoint(p.t));
      p.mesh.material.emissiveIntensity = 2 + Math.sin(T * 5 + p.t * 10) * 1;
    });

    /* Animated lights */
    l1.position.x = Math.sin(T * .7) * 5;
    l1.position.z = Math.cos(T * .7) * 4;
    l4.intensity  = 3 + Math.sin(T * 2) * 1.5;

    pts.rotation.y += 0.0003;
    pts.rotation.x -= 0.00015;

    renderer.render(scene, camera);
  })();
})();
