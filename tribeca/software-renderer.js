// Canvas fallback for environments where WebGL is unavailable. The same 3D
// geometry, camera and OrbitControls are used by both rendering paths.
export function createSoftwareRenderer(THREE) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas no disponible');
  let width = 1;
  let height = 1;
  let ratio = 1;
  let background = '#e8e2d7';
  const viewProjection = new THREE.Matrix4();
  const vector = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3();
  const color = new THREE.Color();
  const light = new THREE.Vector3(-0.4, 0.85, 0.5).normalize();
  function render(scene, camera) {
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    const faces = [];
    scene.traverseVisible(object => {
      if (!object.isMesh) return;
      const geometry = object.geometry;
      const positions = geometry.attributes.position;
      const normals = geometry.attributes.normal;
      if (!positions) return;
      const matrix = new THREE.Matrix4().multiplyMatrices(viewProjection, object.matrixWorld);
      normalMatrix.getNormalMatrix(object.matrixWorld);
      const projected = [];
      for (let i = 0; i < positions.count; i++) {
        vector.fromBufferAttribute(positions, i).applyMatrix4(matrix);
        projected.push({ x: (vector.x + 1) * width / 2, y: (1 - vector.y) * height / 2, z: vector.z });
      }
      const index = geometry.index;
      const count = index ? index.count : positions.count;
      for (let i = 0; i < count; i += 3) {
        const ia = index ? index.getX(i) : i;
        const ib = index ? index.getX(i + 1) : i + 1;
        const ic = index ? index.getX(i + 2) : i + 2;
        const a = projected[ia], b = projected[ib], c = projected[ic];
        if ([a, b, c].some(point => !Number.isFinite(point.x) || point.z < -1 || point.z > 1)) continue;
        const material = Array.isArray(object.material) ? object.material[0] : object.material;
        const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        if (area >= 0 && material.side !== THREE.DoubleSide) continue;
        let intensity = 1;
        if (normals && !material.isMeshBasicMaterial) {
          normal.fromBufferAttribute(normals, ia).applyMatrix3(normalMatrix).normalize();
          intensity = 0.68 + Math.max(0, normal.dot(light)) * 0.32;
        }
        color.copy(material.color || new THREE.Color('#dddddd')).multiplyScalar(intensity);
        faces.push({ a, b, c, depth: (a.z + b.z + c.z) / 3, fill: color.getStyle(), opacity: material.opacity ?? 1 });
      }
    });
    faces.sort((a, b) => b.depth - a.depth);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.globalAlpha = 1;
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    for (const face of faces) {
      context.globalAlpha = face.opacity;
      context.fillStyle = face.fill;
      context.beginPath();
      context.moveTo(face.a.x, face.a.y);
      context.lineTo(face.b.x, face.b.y);
      context.lineTo(face.c.x, face.c.y);
      context.closePath();
      context.fill();
    }
    context.globalAlpha = 1;
  }
  return {
    domElement: canvas,
    shadowMap: {},
    setPixelRatio(value) { ratio = Math.min(value, 1.5); },
    setClearColor(value) { background = value; },
    setSize(nextWidth, nextHeight) {
      width = nextWidth; height = nextHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    },
    render
  };
}
