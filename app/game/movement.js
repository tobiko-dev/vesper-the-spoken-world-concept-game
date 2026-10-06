export const damp=(current,target,rate,dt)=>current+(target-current)*(1-Math.exp(-rate*dt));
export function angleDelta(from,to){return Math.atan2(Math.sin(to-from),Math.cos(to-from));}
export function movementInput(keys,yaw){
  let x=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
  let z=Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup'));
  const length=Math.hypot(x,z);if(length){x/=length;z/=length;}
  return {x:x*Math.cos(yaw)+z*Math.sin(yaw),z:-x*Math.sin(yaw)+z*Math.cos(yaw),active:!!length};
}
export class Locomotion {
  constructor(){this.x=0;this.z=0;this.phase=0;this.blend=0;}
  stop(){this.x=this.z=0;this.blend=0;}
  step(input,dt){
    const reverse=this.x*input.x+this.z*input.z<0;
    const rate=!input.active?48:reverse?40:32;
    const tx=input.x*5.8,tz=input.z*5.8,weight=(1-Math.exp(-rate*dt))/rate;
    const delta={x:tx*dt+(this.x-tx)*weight,z:tz*dt+(this.z-tz)*weight};
    this.x=damp(this.x,tx,rate,dt);this.z=damp(this.z,tz,rate,dt);
    if(!input.active&&Math.hypot(this.x,this.z)<.025)this.x=this.z=0;
    return delta;
  }
  gait(travel,dt){
    const speed=travel/Math.max(dt,.001);this.phase+=travel/2.65*Math.PI*2;
    this.blend=damp(this.blend,Math.min(1,speed/5.8),18,dt);
    return {swing:Math.sin(this.phase)*.58*this.blend,bob:(1-Math.cos(this.phase*2))*.012*this.blend,blend:this.blend};
  }
}

// Resolve movement against the wall boundary instead of discarding an entire
// step. Small sweeps keep fast dodges from tunnelling through narrow pillars.
export function slideMove(state,dx,dz,collisions){
  const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.18));dx/=count;dz/=count;
  for(let i=0;i<count;i++){
    let x=Math.max(-118.9,Math.min(118.9,state.x+dx));
    for(const b of collisions)if(Math.abs(state.z-b.z)<b.d){if(dx>0&&state.x<=b.x-b.w&&x>b.x-b.w)x=Math.min(x,b.x-b.w);else if(dx<0&&state.x>=b.x+b.w&&x<b.x+b.w)x=Math.max(x,b.x+b.w);}
    state.x=x;
    let z=Math.max(-113.9,Math.min(111.9,state.z+dz));
    for(const b of collisions)if(Math.abs(state.x-b.x)<b.w){if(dz>0&&state.z<=b.z-b.d&&z>b.z-b.d)z=Math.min(z,b.z-b.d);else if(dz<0&&state.z>=b.z+b.d&&z<b.z+b.d)z=Math.max(z,b.z+b.d);}
    state.z=z;
  }
}

export function cameraArmLength(origin,direction,length,collisions){
  let nearest=length;
  for(const b of collisions){
    if(!b.h)continue;let entry=0,exit=length,hit=true;
    for(const [axis,lo,hi] of [['x',b.x-b.w-.15,b.x+b.w+.15],['y',-.2,b.h+.2],['z',b.z-b.d-.15,b.z+b.d+.15]]){
      if(Math.abs(direction[axis])<1e-8){if(origin[axis]<lo||origin[axis]>hi){hit=false;break;}}
      else {const a=(lo-origin[axis])/direction[axis],c=(hi-origin[axis])/direction[axis];entry=Math.max(entry,Math.min(a,c));exit=Math.min(exit,Math.max(a,c));if(entry>exit){hit=false;break;}}
    }
    if(hit&&entry>0)nearest=Math.min(nearest,Math.max(.65,entry-.12));
  }
  return nearest;
}
