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
        const rgb = color.clone().convertLinearToSRGB();
        faces.push({ a, b, c, depth: (a.z + b.z + c.z) / 3, rgb: [Math.round(rgb.r*255),Math.round(rgb.g*255),Math.round(rgb.b*255)], opacity: material.opacity ?? 1 });
      }
    });
    // Per-pixel depth avoids diagonal occlusion artifacts on long walls,
    // roofs and brick screens in the non-WebGL renderer.
    const w=Math.max(1,Math.round(width)),h=Math.max(1,Math.round(height));
    const pixels=context.createImageData(w,h),rgba=pixels.data;
    const depth=new Float32Array(w*h);depth.fill(Infinity);
    const bg=new THREE.Color(background).convertLinearToSRGB();
    for(let i=0;i<rgba.length;i+=4) {rgba[i]=bg.r*255;rgba[i+1]=bg.g*255;rgba[i+2]=bg.b*255;rgba[i+3]=255;}
    function triangle(f,transparent) {
      const {a,b,c}=f;
      const den=(b.y-c.y)*(a.x-c.x)+(c.x-b.x)*(a.y-c.y);
      if(Math.abs(den)<0.00001) return;
      const minX=Math.max(0,Math.floor(Math.min(a.x,b.x,c.x))),maxX=Math.min(w-1,Math.ceil(Math.max(a.x,b.x,c.x)));
      const minY=Math.max(0,Math.floor(Math.min(a.y,b.y,c.y))),maxY=Math.min(h-1,Math.ceil(Math.max(a.y,b.y,c.y)));
      for(let y=minY;y<=maxY;y++) for(let x=minX;x<=maxX;x++) {
        const u=((b.y-c.y)*(x+0.5-c.x)+(c.x-b.x)*(y+0.5-c.y))/den;
        const v=((c.y-a.y)*(x+0.5-c.x)+(a.x-c.x)*(y+0.5-c.y))/den;
        const t=1-u-v;if(u<0 || v<0 || t<0)continue;
        const z=u*a.z+v*b.z+t*c.z, n=y*w+x;
        if(z>depth[n]+0.000001)continue;
        const j=n*4,alpha=transparent?f.opacity:1;
        for(let k=0;k<3;k++)rgba[j+k]=f.rgb[k]*alpha+rgba[j+k]*(1-alpha);
        if(!transparent)depth[n]=z;
      }
    }
    for(const face of faces)if(face.opacity>=0.99)triangle(face,false);
    faces.filter(f=>f.opacity<0.99).sort((a,b)=>b.depth-a.depth).forEach(f=>triangle(f,true));
    context.putImageData(pixels,0,0);
  }
  return {
    domElement: canvas,
    shadowMap: {},
    setPixelRatio(value) { ratio = 1; },
    setClearColor(value) { background = value; },
    setSize(nextWidth, nextHeight) {
      width = nextWidth; height = nextHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    },
    render
  };
}
