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
    { name: 'Cocina', point: [0, -7], photo: 'living', description: 'Cocina al fondo de la planta social, conectada con el comedor.' },
    { name: 'Comedor', point: [-1.1, -5.3], photo: 'social', description: 'Un espacio para compartir, junto a la cocina y la sala.' },
    { name: 'Sala', point: [-1.2, -0.3], photo: 'living', description: 'Área social abierta, vinculada al acceso y al área exterior.' },
    { name: 'Área exterior', point: [-0.7, 5.3], photo: 'overhead0', description: 'Área exterior de la planta baja, según el plano y el render superior.' }
  ],
  [
    { name: 'Dormitorio posterior', point: [1.1, -5.4], photo: 'bedroom', description: 'Dormitorio de la primera planta alta. Explora su relación con el baño y la circulación.' },
    { name: 'Dormitorio frontal', point: [-1.3, 2.1], photo: 'front-bedroom', description: 'Dormitorio frontal de la primera planta alta, ambientado con cama doble y veladores.' },
    { name: 'Baño', point: [-1.3, -2.1], photo: 'overhead1-wall', description: 'Baño junto a la circulación de la primera planta alta.' }
  ],
  [
    { name: 'Dormitorio', point: [-1.3, 1.5], photo: 'bedroom3', description: 'Dormitorio de la segunda planta alta, conectado con la circulación y el baño.' },
    { name: 'Baño', point: [-1.3, -2.1], photo: 'overhead2-wall', description: 'Baño en la segunda planta alta, según la distribución aportada.' },
    { name: 'Espacio construido', point: [1.1, -5.5], photo: 'overhead2-wall', description: 'Recinto construido de piso gris, incorporado según la imagen superior y la aclaración del proyecto. Uso no especificado.' },
    { name: 'Circulación y escalera', point: [2.2, 0.3], photo: 'overhead2-wall', description: 'Llegada de la escalera desde la primera planta alta. No se añade una subida hacia un cuarto nivel.' }
  ]
];
let selectedFloor = 0;
let mode = '3d';
let wholeHouse = false;
let openFacade = false;
let engine;
let initialization;
let stageVisible = false;

function updateFlatView() {
  const renderMode = mode === 'render';
  floorImage.src = renderMode && selectedFloor > 0 ? `assets/overhead${selectedFloor}-wall.webp` : `assets/${renderMode ? 'overhead' : 'plan'}${selectedFloor}.webp`;
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
  document.getElementById('viewer-mode-label').textContent = wholeHouse ? (openFacade ? 'CORTE INTERIOR · 2 ESCALERAS' : 'EXTERIOR 3D') : mode === 'top' ? 'VISTA SUPERIOR 3D' : 'MODELO 3D';
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
  document.getElementById('viewer-floor-name').textContent = wholeHouse ? 'CASA COMPLETA · TRES NIVELES' : floorNames[selectedFloor].toUpperCase();
  document.getElementById('room-detail').hidden = true;
  await initialize();
  engine?.floor(selectedFloor, wholeHouse);
});
document.getElementById('open-facade').addEventListener('change', event => { openFacade = event.target.checked; engine?.floor(selectedFloor, wholeHouse); });
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
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
  } catch {
    const { createSoftwareRenderer } = await import('./software-renderer.js?v=depth2');
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
  const shells = [];
  const LEVEL = 3.2;
  const brick = material('#b77e58');
  const concrete = material('#777776');
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
  // Coordinates traced from the supplied PDF, rendered at 2x (2382 × 1684).
  // Each floor uses the same drawing scale. Units are normalized, NOT metres:
  // the source drawing contains no dimensions or stated scale.
  const U = 6 / 510;
  const px = x => (x - 255) * U;
  const pz = y => (y - 658) * U;
  function rect(parent, x1, y1, x2, y2, mat, height = 0.025, base = 0.081) {
    return block(parent, px((x1+x2)/2), base, pz((y1+y2)/2), (x2-x1)*U, height, (y2-y1)*U, mat);
  }
  function partition(parent, x1, y1, x2, y2, mat = ivory, height = 1.35) {
    return rect(parent, x1, y1, x2, y2, mat, height);
  }
  function windowStrip(parent, x1, y1, x2, y2) {
    rect(parent,x1,y1,x2,y2,darkWood,0.08,0.08);
    rect(parent,x1,y1,x2,y2,glass,1.18,0.16);
  }
  function planBed(parent,x1,y1,x2,y2,headRight = false) {
    const g = new THREE.Group();
    g.position.set(px((x1+x2)/2),0,pz((y1+y2)/2));
    g.rotation.y = headRight ? Math.PI/2 : -Math.PI/2;
    // Resize the bed itself to its actual symbol footprint in the source plan.
    g.scale.set((y2-y1)*U/1.85,1,(x2-x1)*U/2.35);
    parent.add(g);
    bed(g,0,0);
  }
  function sanitary(parent,upper) {
    if (upper) {
      rect(parent,14,403,285,533,marble);
      rect(parent,18,407,94,531,fabric,0.26);
      rect(parent,24,413,88,523,marble,0.03,0.34);
      rect(parent,126,465,169,526,fabric,0.39);
      rect(parent,199,480,258,530,wood,0.66);
      rect(parent,197,478,260,532,marble,0.055,0.74);
    } else {
      rect(parent,397,333,498,520,marble);
      rect(parent,428,445,471,515,fabric,0.39);
      rect(parent,461,369,495,419,wood,0.65);
      rect(parent,459,367,497,421,marble,0.055,0.73);
    }
  }
  function stairFlight(parent,upper) {
    const start = upper ? 397 : 532;
    const end = 839;
    const count = upper ? 17 : 12;
    const run = (end-start)/count;
    for(let i=0;i<count;i++) {
      rect(parent,397,end-(i+1)*run,499,end-i*run,wood,0.1+i*(LEVEL-0.1)/(count-1));
      // Tread nosing makes the direction and individual steps legible.
      rect(parent,397,end-(i+1)*run,499,end-(i+1)*run+1.5,darkWood,0.012,0.19+i*(LEVEL-0.1)/(count-1));
    }
  }
  for (let index=0; index<3; index++) {
    const group = new THREE.Group(); scene.add(group); models.push(group);
    const walls = new THREE.Group(); group.add(walls); wallGroups.push(walls);
    if(index===0) {
      rect(group,0,0,510,1316,tile,0.2,-0.12);

      [[0,0,510,12],[0,0,12,782],[498,0,510,953],
       [385,204,397,333],[385,318,498,330],[385,407,397,533],
       [385,520,498,533],[283,771,295,851],[397,839,431,851],[476,839,510,851]]
        .forEach(r=>partition(walls,...r));
      windowStrip(walls,11,772,283,782);
      windowStrip(walls,431,840,476,850);
      // Kitchen, laundry niche, six-seat dining and L-shaped living room.
      rect(group,12,12,430,80,wood,0.82);
      rect(group,12,12,430,80,marble,0.05,0.9);
      rect(group,148,19,209,73,charcoal,0.025,0.96);
      rect(group,279,23,365,69,glass,0.025,0.96);
      rect(group,430,12,498,80,marble,1.65);
      rect(group,417,225,485,294,marble,0.82);
      rect(group,72,166,229,251,wood,0.74);
      for(const x of [111,188]) {
        chair(group,px(x),pz(147));chair(group,px(x),pz(270),Math.PI);
      }
      chair(group,px(51),pz(208),-Math.PI/2);
      chair(group,px(250),pz(208),Math.PI/2);
      rect(group,16,496,106,768,fabric,0.56);
      rect(group,16,496,237,585,fabric,0.56);
      rect(group,16,496,31,768,paleWood,0.32,0.64);
      rect(group,31,496,237,510,paleWood,0.32,0.64);
      rect(group,165,617,222,674,paleWood,0.4);
      sanitary(group,false);stairFlight(group,false);
      plant(group,px(70),pz(980));
    } else {
      // Front geometry follows the plan; rear gray built room on level 3
      // is confirmed by the owner and the supplied overhead image.
      rect(group,0,386,397,941,paleWood,0.2,-0.12);
      rect(group,397,386,510,851,paleWood,0.2,-0.12);
      rect(group,170,0,510,386,index===2 ? concrete : paleWood,0.2,-0.12);
      rect(group,12,544,284,611,paleWood,0.52); // built-in wardrobe
      [[0,386,103,398],[170,386,302,398],[0,386,12,941],
       [12,533,295,545],[284,477,296,612],[284,709,296,929],
       [386,839,397,941],[397,839,431,851],[476,839,510,851],
       [498,386,510,851]]
        .forEach(r=>partition(walls,...r));
      windowStrip(walls,103,387,170,397);
      windowStrip(walls,12,929,386,941);
      windowStrip(walls,431,840,476,850);
      sanitary(group,true);
      if(index===1) stairFlight(group,true);
      else {
        // Arrival/void only: exactly two ascending connections for 3 levels.
        rect(group,397,398,498,839,charcoal,0.02,0.09);
        rect(group,385,503,392,839,darkWood,0.85);
        rect(group,397,386,498,403,paleWood,0.04);
      }
      // Front bedroom partition and inward-opening door, traced from plan.
      const door = rect(group,205,701,284,706,wood,1.1);
      door.userData.role = 'front-bedroom-door';
      planBed(group,61,759-(index===2?51:0),238,882-(index===2?51:0));
      if(index===1) {
        [[170,0,510,12],[170,0,182,159],[498,0,510,386],
         [397,386,510,398]].forEach(r=>partition(walls,...r));
        windowStrip(walls,170,159,181,386);
        rect(group,182,12,498,78,paleWood,0.64); // rear wardrobe
        planBed(group,273,145,493,269,true);
      } else {
        [[170,0,510,12],[170,0,182,386],[498,0,510,386],
         [170,386,295,398],[397,386,510,398]].forEach(r=>partition(walls,...r));
        windowStrip(walls,295,387,397,397);
      }
    }
  }
  // Continuous exterior envelope, assembled at structural floor heights.
  // Reference: white projecting frames, dark glazing, terracotta screens.
  // One house is shown; the reference images also depict neighboring units.
  function facadeWindow(parent,x1,y1,x2,y2,base=0.2,height=2.65) {
    rect(parent,x1,y1,x2,y2,charcoal,height+0.1,base);
    rect(parent,x1+2,y1+1,x2-2,y2+1,glass,height-0.06,base+0.05);
  }
  for(let i=0;i<3;i++) {
    const shell = new THREE.Group();scene.add(shell);shells.push(shell);
    // Side and rear enclosure: actual staggered footprint, same scale as plan.
    if(i===0) {
      [[0,0,510,12],[0,0,12,772],[498,0,510,953],
       [283,782,295,851]].forEach(r=>partition(shell,...r,ivory,LEVEL));
      facadeWindow(shell,12,773,283,781,0.16,2.8);
      rect(shell,295,840,397,850,wood,2.8);
      rect(shell,295,839,397,851,ivory,0.32,2.88);
    } else {
      [[0,386,12,941],[0,386,170,398],[170,0,182,386],
       [170,0,510,12],[498,0,510,550],[498,800,510,851],[386,839,397,941],
       [397,839,431,851],[476,839,510,851]]
        .forEach(r=>partition(shell,...r,ivory,LEVEL));
      rect(shell,498,550,503,800,charcoal,2.6,0.28);
      rect(shell,503,552,505,798,glass,2.5,0.33);
      facadeWindow(shell,431,840,476,851,0.28,2.6);
      // Front glazing sits behind a perforated brick screen.
      facadeWindow(shell,12,924,385,929,0.22,2.72);
      rect(shell,0,929,397,946,ivory,0.22,0.08);
      rect(shell,0,929,397,946,ivory,0.24,LEVEL-0.16);
      rect(shell,0,929,14,946,ivory,LEVEL);
      rect(shell,383,929,397,946,ivory,LEVEL);
      for(let row=0;row<14;row++) {
        for(let col=0;col<8;col++) {
          const x=129+col*30+(row%2)*8;
          rect(shell,x,935,x+22,944,brick,0.13,0.35+row*0.18);
        }
      }
      // Slim mullions remain visible beside the screen.
      rect(shell,118,925,122,931,charcoal,2.72,0.22);
      rect(shell,12,929,128,933,charcoal,0.035,1.5);
      rect(shell,12,929,128,933,glass,0.9,0.3);
      // Projecting white frame around the stair-side entrance.
      rect(shell,397,839,510,852,ivory,0.22,LEVEL-0.16);
      rect(shell,498,839,510,852,ivory,LEVEL);
    }
    if(i===2) {
      rect(shell,0,386,397,946,ivory,0.22,LEVEL);
      rect(shell,397,386,510,851,ivory,0.22,LEVEL);
      rect(shell,170,0,510,386,ivory,0.22,LEVEL);
    }
    if(i===2) {
      rect(shell,0,386,397,941,ivory,0.18,LEVEL);
      rect(shell,397,386,510,851,ivory,0.18,LEVEL);
      rect(shell,170,0,510,386,concrete,0.18,LEVEL);
    }
    shell.visible=false;
  }
  const plinth = block(scene, 0, -0.65, 0, 7.2, 0.3, 16.5, material('#d0c3ae'));
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
    controls.target.set(0, wholeHouse ? 4.3 : 0.3, -1.2);
    camera.position.set(top ? 0.01 : 13, wholeHouse ? (top ? 29 : 15) : top ? 25 : 16, top ? -1.19 : wholeHouse ? 22 : 17);
    camera.lookAt(controls.target);
    controls.enableDamping = false;
    controls.update();draw();
  }
  function showFloor(index, all) {
    wholeHouse = all;
    models.forEach((group, i) => { group.visible = all || i === index;group.position.y = all ? i * LEVEL : 0; });
    shells.forEach((shell,i)=>{shell.visible=all && !openFacade;shell.position.y=i*LEVEL;});
    wallGroups.forEach(group=>{group.visible=(!all || openFacade) && document.getElementById('show-walls').checked;});
    document.getElementById('facade-option').hidden = !all;
    document.getElementById('viewer-mode-label').textContent = all ? (openFacade ? 'CORTE INTERIOR · 2 ESCALERAS' : 'EXTERIOR 3D') : mode === 'top' ? 'VISTA SUPERIOR 3D' : 'MODELO 3D';
    selection.visible = false;selectedRoom = -1;makeHotspots();resetCamera(mode === 'top');size();startAnimation();
  }
  engine = {
    floor: showFloor,
    walls: show => { wallGroups.forEach(group => { group.visible = show && (!wholeHouse || openFacade); });draw(); },
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
