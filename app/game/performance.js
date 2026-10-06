import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export const PERFORMANCE = {
  balanced: {fps:30, pixels:1, width:1440, height:900, shadows:true, particles: .65},
  smooth: {fps:60, pixels:1, width:1440, height:900, shadows:false, particles:.55},
  battery: {fps:24, pixels:.8, width:1100, height:700, shadows:false, particles: .4},
  high: {fps:60, pixels:1.5, width:1920, height:1200, shadows:true, particles:1},
};
export function profile(name){return PERFORMANCE[name]||PERFORMANCE.balanced;}

export function batchActor(root){
  // Static face/ear/outfit subgroups share batches. Animation pivots remain intact.
  const pivots=new Set([root,...Object.values(root.userData).filter(o=>o?.isObject3D)]);
  root.updateMatrixWorld(true);
  for(const group of pivots){
    if(group===root.userData.staff)continue; // The spell crystal has its own material.
    const buckets=new Map(), inverse=new THREE.Matrix4().copy(group.matrixWorld).invert();
    const collect=o=>{
      if(o!==group&&pivots.has(o))return;
      if(o.isMesh&&!Array.isArray(o.material)&&!o.material.transparent&&!o.userData.shadow){
        const key=[o.material.uuid,!!o.userData.ink,!!o.userData.softSurface].join(':');if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);
      }
      for(const child of o.children)collect(child);
    };
    collect(group);
    for(const meshes of buckets.values()){
      if(meshes.length<2)continue;
      const geometries=meshes.map(o=>{
        const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
        g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,o.matrixWorld));
        for(const a of Object.keys(g.attributes))if(!['position','normal'].includes(a))g.deleteAttribute(a);
        return g;
      });
      const geometry=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!geometry)continue;
      const mesh=new THREE.Mesh(geometry,meshes[0].material);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.ink=meshes[0].userData.ink;mesh.userData.softSurface=meshes[0].userData.softSurface;group.add(mesh);
      for(const o of meshes){o.removeFromParent();o.geometry.dispose();}
    }
  }
  return root;
}

// Merge only immutable opaque scenery. Interactive objects and animated groups
// retain their identities; spatial buckets preserve useful frustum culling.
export function batchScenery(world){
  const excluded=new Set([...world.objects.map(o=>o.mesh),...world.npcs.map(n=>n.mesh),...world.floaters,...world.banners,world.player]);
  const buckets=new Map(),position=new THREE.Vector3();let before=0,after=0;
  world.scene.updateMatrixWorld(true);
  world.scene.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||o.material.transparent||o.userData.sky||o.geometry.type==='PlaneGeometry')return;
    for(let p=o;p;p=p.parent)if(excluded.has(p))return;
    if(o.children.length)return;
    o.getWorldPosition(position);
    const key=[o.material.uuid,Math.floor(position.x/24),Math.floor(position.z/24),o.castShadow,o.receiveShadow].join(':');
    if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);
  });
  for(const meshes of buckets.values()){
    if(meshes.length<2)continue;
    const geometries=meshes.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);for(const key of Object.keys(g.attributes))if(!['position','normal','uv'].includes(key))g.deleteAttribute(key);if(!g.attributes.uv)g.setAttribute('uv',new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));return g;});
    const combined=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!combined)continue;
    combined.computeBoundingSphere();const mesh=new THREE.Mesh(combined,meshes[0].material);mesh.castShadow=meshes[0].castShadow;mesh.receiveShadow=meshes[0].receiveShadow;mesh.matrixAutoUpdate=false;
    world.scene.add(mesh);for(const old of meshes){old.removeFromParent();old.geometry.dispose();}before+=meshes.length;after++;
  }
  return {before,after};
}
