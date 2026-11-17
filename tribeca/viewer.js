const stage = document.getElementById('viewer-stage');
const mount = document.getElementById('model-canvas');
const flatView = document.getElementById('flat-view');
const loading = document.getElementById('viewer-loading');
const hotspots = document.getElementById('room-hotspots');
const floorImage = document.getElementById('floor-image');
const planZoom = document.getElementById('plan-zoom');
const floorNames = ['Planta baja', 'Primera planta alta', 'Segunda planta alta'];
const roomData = [
  [
    { name: 'Cocina', point: [0, -5.8], photo: 'living', description: 'Cocina al fondo de la planta social, conectada con el comedor.' },
    { name: 'Comedor', point: [-0.7, -3.5], photo: 'social', description: 'Un espacio para compartir, junto a la cocina y la sala.' },
    { name: 'Sala', point: [-1, 0.5], photo: 'living', description: 'Área social abierta, vinculada al acceso y al área exterior.' },
    { name: 'Área exterior', point: [-0.7, 5.3], photo: 'overhead0', description: 'Área exterior de la planta baja, según el plano y el render superior.' }
  ],
  [
    { name: 'Dormitorio posterior', point: [0.7, -4.8], photo: 'bedroom', description: 'Dormitorio de la primera planta alta. Explora su relación con el baño y la circulación.' },
    { name: 'Dormitorio frontal', point: [-1, 1.4], photo: 'study', description: 'El plano identifica un dormitorio frontal. El render superior lo presenta ambientado como estudio.' },
    { name: 'Baño', point: [-1.8, -1], photo: 'overhead1', description: 'Baño junto a la circulación de la primera planta alta.' }
  ],
  [
    { name: 'Dormitorio', point: [-1, 1.5], photo: 'bedroom3', description: 'Dormitorio de la segunda planta alta, conectado con la circulación y el baño.' },
    { name: 'Baño', point: [-1.8, -1], photo: 'overhead2', description: 'Baño en la segunda planta alta, según la distribución aportada.' },
    { name: 'Cubierta y vacío', point: [0.7, -4.7], photo: 'overhead2', description: 'El render superior muestra esta superficie como cubierta. Se representa como volumen referencial.' }
  ]
];
let selectedFloor = 0;
let mode = '3d';
let wholeHouse = false;
let engine;
let initialization;
let stageVisible = false;

function updateFlatView() {
  const renderMode = mode === 'render';
  floorImage.src = `assets/${renderMode ? 'overhead' : 'plan'}${selectedFloor}.webp`;
  floorImage.alt = `${renderMode ? 'Render superior' : 'Plano'} de ${floorNames[selectedFloor].toLowerCase()}`;
  planZoom.dataset.full = floorImage.getAttribute('src');
  planZoom.dataset.caption = `${floorNames[selectedFloor]} · ${renderMode ? 'Render superior' : 'Sin escala'}`;
  planZoom.setAttribute('aria-label', `Ampliar ${floorImage.alt.toLowerCase()}`);
}
async function setMode(nextMode) {
  mode = nextMode;
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === mode)));
  const is3D = mode === '3d' || mode === 'top';
  stage.hidden = !is3D;
  flatView.hidden = is3D;
  document.getElementById('viewer-controls').hidden = !is3D;
  document.querySelector('.viewer-options').hidden = !is3D;
  document.getElementById('viewer-instructions').textContent = is3D
    ? 'Arrastra para girar · Pellizca para acercar · Toca un ambiente'
    : 'Toca la imagen para ampliarla';
  document.getElementById('viewer-mode-label').textContent = mode === 'top' ? 'VISTA SUPERIOR 3D' : 'MODELO 3D';
  if (!is3D) { updateFlatView(); return; }
  await initialize();
  engine?.view(mode);
}
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.view)));
document.addEventListener('tribeca:floor', event => {
  selectedFloor = event.detail;
  wholeHouse = false;
  document.getElementById('whole-house').setAttribute('aria-pressed', 'false');
  document.getElementById('viewer-floor-name').textContent = floorNames[selectedFloor].toUpperCase();
  document.getElementById('room-detail').hidden = true;
  updateFlatView();
  engine?.floor(selectedFloor, false);
});
document.getElementById('whole-house').addEventListener('click', async () => {
  wholeHouse = !wholeHouse;
  document.getElementById('whole-house').setAttribute('aria-pressed', String(wholeHouse));
  document.getElementById('viewer-floor-name').textContent = wholeHouse ? 'CASA · TRES NIVELES' : floorNames[selectedFloor].toUpperCase();
  document.getElementById('room-detail').hidden = true;
  await initialize();
  engine?.floor(selectedFloor, wholeHouse);
});
document.getElementById('show-walls').addEventListener('change', event => engine?.walls(event.target.checked));
document.getElementById('room-close').addEventListener('click', () => {
  document.getElementById('room-detail').hidden = true;
  engine?.clearSelection();
});
function showRoom(index) {
  const room = roomData[selectedFloor][index];
  document.getElementById('room-photo').src = `assets/${room.photo}.webp`;
  document.getElementById('room-photo').alt = `${room.name} · Imagen del proyecto`;
  document.getElementById('room-level').textContent = floorNames[selectedFloor];
  document.getElementById('room-name').textContent = room.name;
  document.getElementById('room-description').textContent = room.description;
  const zoom = document.getElementById('room-photo-zoom');
  zoom.dataset.full = `assets/${room.photo}.webp`;
  zoom.dataset.caption = `${room.name} · ${floorNames[selectedFloor]}`;
  document.getElementById('room-detail').hidden = false;
}
function initialize() {
  if (initialization) return initialization;
  initialization = buildViewer().catch(error => {
    console.warn('No se pudo iniciar el visor 3D', error);
    loading.textContent = 'El visor 3D no está disponible en este dispositivo.';
    document.getElementById('viewer-instructions').textContent = 'Explora las vistas superiores, renders y planos con los botones de arriba.';
    setMode('render');
  });
  return initialization;
}

async function buildViewer() {
  const THREE = await import('./vendor/three.module.js');
  const { OrbitControls } = await import('./vendor/OrbitControls.js');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e8e2d7');
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  } catch {
    const { createSoftwareRenderer } = await import('./software-renderer.js');
    renderer = createSoftwareRenderer(THREE);
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor('#e8e2d7');
  mount.append(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', 'Casa tridimensional de Tribeca');
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 150);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.enablePan = true;
  controls.minDistance = 6;
  controls.maxDistance = 45;
  controls.maxPolarAngle = Math.PI / 2.08;
  controls.minPolarAngle = 0.02;
  controls.zoomSpeed = 0.65;
  const ambient = new THREE.HemisphereLight('#ffffff', '#b0a18b', 2.6);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight('#fff1d5', 3.4);
  sun.position.set(-8, 17, 11);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -15; sun.shadow.camera.right = 15;
  sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -15;
  sun.shadow.normalBias = 0.04;
  scene.add(sun);

  const material = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });
  const ivory = material('#e5dfd2');
  const wallTop = material('#d5c9b5');
  const wood = material('#ba9066');
  const paleWood = material('#ceb494');
  const tile = material('#d6cbb7');
  const fabric = material('#e9e1d1');
  const bedspread = material('#bdb5a1');
  const darkWood = material('#77624d');
  const marble = material('#f3f1e7');
  const charcoal = material('#343839');
  const green = material('#809764');
  const foliage = material('#5c764b');
  const glass = material('#a3b8bb', { transparent: true, opacity: 0.32, roughness: 0.15 });
  const models = [];
  const wallGroups = [];
  function block(parent, x, y, z, width, height, depth, mat) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
    mesh.position.set(x, y + height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function wall(parent, x, z, width, depth, height = 1.5) {
    return block(parent, x, 0.08, z, width, height, depth, ivory);
  }
  function chair(parent, x, z, rotation = 0) {
    const group = new THREE.Group();
    group.position.set(x, 0, z); group.rotation.y = rotation; parent.add(group);
    block(group, 0, 0.4, 0, 0.46, 0.14, 0.46, fabric);
    block(group, 0, 0.48, -0.2, 0.46, 0.48, 0.1, paleWood);
    for (const dx of [-0.16, 0.16]) for (const dz of [-0.16, 0.16]) block(group, dx, 0.08, dz, 0.05, 0.34, 0.05, darkWood);
  }
  function bed(parent, x, z, rotation = 0) {
    const group = new THREE.Group();group.position.set(x, 0, z);group.rotation.y = rotation;parent.add(group);
    block(group, 0, 0.09, 0, 1.85, 0.3, 2.35, wood);
    block(group, 0, 0.39, 0, 1.8, 0.24, 2.26, fabric);
    block(group, 0, 0.63, 0.32, 1.82, 0.08, 1.6, bedspread);
    block(group, 0, 0.09, -1.16, 2, 1.12, 0.15, paleWood);
    block(group, -0.46, 0.63, -0.72, 0.65, 0.16, 0.42, fabric);
    block(group, 0.46, 0.63, -0.72, 0.65, 0.16, 0.42, fabric);
    for (const dx of [-1.35, 1.35]) block(group, dx, 0.1, -0.7, 0.55, 0.45, 0.55, paleWood);
  }
  function plant(parent, x, z) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.3, 12), marble);
    pot.position.set(x, 0.22, z);parent.add(pot);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), foliage);
    leaves.scale.set(1, 1.8, 1);leaves.position.set(x, 0.72, z);parent.add(leaves);
  }
  function stairs(parent) {
    for (let i = 0; i < 11; i++) block(parent, 2.22, 0.08, 3.1 - i * 0.32, 1.05, 0.1 + i * 0.115, 0.32, wood);
  }
  function bath(parent, upper = false) {
    const x = upper ? -1.8 : 2;
    const z = upper ? -1 : -1.6;
    block(parent, x, 0.081, z, upper ? 2.1 : 1.35, 0.025, upper ? 2.2 : 2.1, marble);
    block(parent, x + 0.36, 0.1, z + 0.55, 0.45, 0.4, 0.65, fabric);
    block(parent, x - 0.25, 0.1, z - 0.65, 0.75, 0.65, 0.42, wood);
    block(parent, x - 0.25, 0.75, z - 0.65, 0.78, 0.06, 0.45, marble);
    if (upper) block(parent, x - 0.3, 0.1, z - 0.2, 0.85, 0.28, 1.2, fabric);
  }
  function upperSlab(group) {
    // The supplied architectural plan has a rear recess on the left.
    block(group, 0, -0.12, 0.65, 6, 0.2, 5.7, paleWood);
    block(group, 0.82, -0.12, -4.6, 4.36, 0.2, 4.8, paleWood);
  }
  for (let index = 0; index < 3; index++) {
    const group = new THREE.Group(); scene.add(group);models.push(group);
    const walls = new THREE.Group();group.add(walls);wallGroups.push(walls);
    if (index === 0) {
      block(group, 0, -0.12, 0, 6, 0.2, 14, tile);
      block(group, 0, 0.081, 5.15, 5.8, 0.02, 3.6, green);
      for (let i = 0; i < 4; i++) block(group, 1.85, 0.11, 6.5 - i * 0.7, 1.1, 0.07, 0.48, marble);
      wall(walls, -3, -1.8, 0.16, 10.4);
      wall(walls, 3, -1.8, 0.16, 10.4);
      wall(walls, 0, -7, 6, 0.16);
      wall(walls, 1.25, -1.6, 0.13, 2.15);
      wall(walls, 2.12, -2.72, 1.75, 0.13);
      wall(walls, 2.5, -0.49, 0.9, 0.13);
      wall(walls, -1.4, 3.48, 3.2, 0.14, 0.38);
      block(walls, -1.4, 0.47, 3.48, 3.2, 1.1, 0.06, glass);
      block(group, 0, 0.08, -6.48, 5.7, 0.82, 0.88, wood);
      block(group, 0, 0.9, -6.48, 5.78, 0.07, 0.95, marble);
      block(group, -1.5, 0.98, -6.48, 0.85, 0.04, 0.6, charcoal);
      block(group, 2.3, 0.1, -5.5, 0.9, 1.8, 0.85, marble);
      block(group, -0.8, 0.1, -3.5, 1.25, 0.73, 2, wood);
      for (const z of [-4.1, -3, -2.4]) { chair(group, -1.75, z, -Math.PI / 2);chair(group, 0.15, z, Math.PI / 2); }
      block(group, -1.8, 0.12, 1, 1, 0.55, 2.4, fabric);
      block(group, -2.25, 0.5, 1, 0.17, 0.4, 2.4, fabric);
      block(group, -0.35, 0.1, 1, 0.9, 0.4, 1.15, paleWood);
      block(group, 0.95, 0.15, 1, 0.15, 1.3, 1.35, charcoal);
      bath(group);stairs(group);plant(group, -2.1, 5.2);
    } else {
      upperSlab(group);
      wall(walls, 3, -1.8, 0.16, 10.4);
      wall(walls, 0.82, -7, 4.36, 0.16);
      wall(walls, -1.36, -4.6, 0.16, 4.8);
      wall(walls, -3, 0.65, 0.16, 5.7);
      wall(walls, -2.15, -2.2, 1.7, 0.16);
      wall(walls, -1.8, 0.2, 2.4, 0.13);
      wall(walls, -0.6, -1.3, 0.13, 1.8);
      wall(walls, 0.7, -2.2, 2.2, 0.13);
      wall(walls, 1.45, 1.95, 0.13, 3.1);
      wall(walls, -0.8, 3.5, 4.4, 0.16, 0.42);
      block(walls, -0.8, 0.5, 3.5, 4.35, 1.05, 0.05, glass);
      bath(group, true);stairs(group);
      if (index === 1) {
        bed(group, 0.6, -4.7, Math.PI / 2);
        block(group, -1, 0.1, 1.65, 1.9, 0.76, 0.95, darkWood);
        chair(group, -1, 0.65);chair(group, -1, 2.5, Math.PI);
        block(group, -1, 0.9, 1.65, 0.6, 0.45, 0.06, charcoal);
      } else {
        bed(group, -0.75, 1.75, -Math.PI / 2);
        block(group, 0.82, 0.09, -4.6, 4.2, 0.3, 4.6, wallTop);
      }
      plant(group, -2.4, 2.9);
    }
  }
  const plinth = block(scene, 0, -0.65, 0, 7.2, 0.3, 15.2, material('#d0c3ae'));
  plinth.receiveShadow = true;
  const selection = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.54, 40), new THREE.MeshBasicMaterial({ color: '#b18a45', side: THREE.DoubleSide, transparent: true, opacity: 0.95 }));
  selection.rotation.x = -Math.PI / 2;selection.visible = false;scene.add(selection);
  let selectedRoom = -1;
  let visible = false;
  let activeFrame = 0;
  function chooseRoom(index) {
    selectedRoom = index;
    const room = roomData[selectedFloor][index];
    selection.position.set(room.point[0], 0.13, room.point[1]);selection.visible = true;
    hotspots.querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-pressed', String(index === i)));
    showRoom(index);
    draw();
  }
  function makeHotspots() {
    hotspots.replaceChildren();
    if (wholeHouse) return;
    roomData[selectedFloor].forEach((room, index) => {
      const button = document.createElement('button');button.className = 'room-hotspot';
      button.textContent = room.name;button.setAttribute('aria-label', `Explorar ${room.name.toLowerCase()}`);
      button.setAttribute('aria-pressed', 'false');button.addEventListener('click', () => chooseRoom(index));hotspots.append(button);
    });
  }
  function placeHotspots() {
    if (wholeHouse) return;
    const bounds = stage.getBoundingClientRect();
    hotspots.querySelectorAll('button').forEach((button, index) => {
      const room = roomData[selectedFloor][index];
      const point = new THREE.Vector3(room.point[0], 0.9, room.point[1]).project(camera);
      const x = (point.x + 1) / 2 * bounds.width;
      const y = (1 - point.y) / 2 * bounds.height;
      button.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
      button.hidden = point.z > 1 || x < 15 || y < 30 || x > bounds.width - 15 || y > bounds.height - 25;
    });
  }
  function draw() {
    if (!visible || stage.hidden) return;
    renderer.render(scene, camera);placeHotspots();
  }
  function animate() {
    activeFrame = 0;
    if (!visible || stage.hidden) return;
    if (controls.update()) draw();
    activeFrame = requestAnimationFrame(animate);
  }
  function startAnimation() {
    visible = stageVisible;
    draw();
    if (!activeFrame && visible && !stage.hidden) activeFrame = requestAnimationFrame(animate);
  }
  function size() {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;camera.updateProjectionMatrix();renderer.setSize(width, height, false);draw();
  }
  function resetCamera(top = false) {
    controls.target.set(0, wholeHouse ? 3.8 : 0.3, -0.5);
    camera.position.set(top ? 0.01 : 12, wholeHouse ? 24 : top ? 23 : 16, wholeHouse ? 26 : top ? 0.01 : 17);
    controls.update();draw();
  }
  function showFloor(index, all) {
    wholeHouse = all;
    models.forEach((group, i) => { group.visible = all || i === index;group.position.y = all ? i * 4.2 : 0; });
    selection.visible = false;selectedRoom = -1;makeHotspots();resetCamera(mode === 'top');size();startAnimation();
  }
  engine = {
    floor: showFloor,
    walls: show => { wallGroups.forEach(group => { group.visible = show; });draw(); },
    clearSelection: () => { selection.visible = false;selectedRoom = -1;hotspots.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', 'false'));draw(); },
    view: next => { size();resetCamera(next === 'top');startAnimation(); },
    visibility: startAnimation
  };
  document.querySelectorAll('[data-camera]').forEach(button => button.addEventListener('click', () => {
    const action = button.dataset.camera;
    if (action === 'reset') { resetCamera(mode === 'top');return; }
    const offset = camera.position.clone().sub(controls.target);
    if (action === 'in' || action === 'out') offset.multiplyScalar(action === 'in' ? 0.82 : 1.22);
    else offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), action === 'left' ? -0.3 : 0.3);
    offset.clampLength(controls.minDistance, controls.maxDistance);camera.position.copy(controls.target).add(offset);controls.update();draw();
  }));
  stage.addEventListener('keydown', event => {
    const actions = { ArrowLeft: 'left', ArrowRight: 'right', '+': 'in', '=': 'in', '-': 'out', Home: 'reset' };
    if (event.target !== stage || !actions[event.key]) return;
    event.preventDefault();document.querySelector(`[data-camera="${actions[event.key]}"]`).click();
  });
  new ResizeObserver(size).observe(stage);
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();setMode('render');document.getElementById('viewer-instructions').textContent = 'El visor se pausó. Puedes seguir explorando el render y el plano.';
  });
  loading.hidden = true;showFloor(selectedFloor, wholeHouse);startAnimation();
}
const observer = new IntersectionObserver(entries => {
  stageVisible = entries[0].isIntersecting;
  if (stageVisible) initialize();
  engine?.visibility();
}, { rootMargin: '250px' });
observer.observe(stage);
