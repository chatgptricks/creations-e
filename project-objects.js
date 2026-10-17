import * as THREE from './vendor/three.module.min.js';

// Tangible artefacts for E's cabinet of curiosities. The geometry is deliberately
// modelled, rather than flattening each project into the same textured rectangle.
const P = {cream:0xf4e7cb, paper:0xfff5df, orange:0xf26526, deep:0xb83e19, ink:0x202421, dark:0x101b19, sage:0x6c8164, teal:0x61bab1, lime:0xc4e54c, gold:0xcba45a};
const mats = new Map();
const geos = new Map();
const material = (color, roughness=.47, metalness=0) => {
  const key=`${color}-${roughness}-${metalness}`;
  if(!mats.has(key))mats.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));
  return mats.get(key);
};
const M = Object.fromEntries(Object.entries(P).map(([key,color])=>[key,material(color)]));
const metal = material(0xa7aca0,.27,.72);
const glass = new THREE.MeshPhysicalMaterial({color:0x294c4d,metalness:.3,roughness:.14,clearcoat:1,clearcoatRoughness:.12});
const roundShape=(w,h,r)=>{
  const s=new THREE.Shape(); const x=-w/2,y=-h/2;
  r=Math.min(r,w/2,h/2);
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
};
function rounded(w,h,d,r=.07){
 const key=`r${w}/${h}/${d}/${r}`;
 if(!geos.has(key)){
  const bevel=Math.min(.025,d*.22,r*.36);
  const g=new THREE.ExtrudeGeometry(roundShape(w-bevel*2,h-bevel*2,Math.max(.001,r-bevel)),{depth:Math.max(.001,d-bevel*2),bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:3,curveSegments:5,steps:1});
  g.translate(0,0,-(d-bevel*2)/2);geos.set(key,g);
 }return geos.get(key);
}
function add(parent,geo,mat,x=0,y=0,z=0){const o=new THREE.Mesh(geo,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function box(parent,w,h,d,mat,x=0,y=0,z=0,r=.045){return add(parent,rounded(w,h,d,r),mat,x,y,z);}
function cylinder(parent,r1,r2,h,mat,x=0,y=0,z=0,segments=24){const key=`c${r1}/${r2}/${h}/${segments}`;if(!geos.has(key))geos.set(key,new THREE.CylinderGeometry(r1,r2,h,segments));return add(parent,geos.get(key),mat,x,y,z);}
function disk(parent,r,d,mat,x=0,y=0,z=0){const o=cylinder(parent,r,r,d,mat,x,y,z);o.rotation.x=Math.PI/2;return o;}
function plane(parent,w,h,map,x=0,y=0,z=0,emissive=false){const mat=new THREE.MeshStandardMaterial({map,color:0xffffff,roughness:emissive?.26:.8,metalness:0,emissive:emissive?0xffffff:0x000000,emissiveMap:emissive?map:null,emissiveIntensity:emissive?.25:0});return add(parent,new THREE.PlaneGeometry(w,h),mat,x,y,z);}
function canvasTexture(draw,w=1024,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
// Source images are cached independently from GPU resources. Every object starts
// with a valid, painted canvas; the source is drawn only after the image loads.
const sourceImages = new Map();
function sourceImage(relativePath){
 const url=new URL(relativePath,import.meta.url).href;
 if(!sourceImages.has(url))sourceImages.set(url,new Promise((resolve,reject)=>{
  const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=url;
 }));
 return sourceImages.get(url);
}
function printedArtwork(root,relativePath,draw,w=1024,h=1280){
 const texture=canvasTexture((ctx,width,height)=>draw(ctx,width,height,null),w,h);
 const ready=sourceImage(relativePath).then(image=>{
  const canvas=texture.image,ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);draw(ctx,canvas.width,canvas.height,image);
  texture.needsUpdate=true;
 }).catch(()=>{});
 (root.userData.artworkReady ||= []).push(ready);
 return texture;
}
function enginePrint(root){
 return printedArtwork(root,'./assets/engine-art.svg',(c,w,h,image)=>{
  c.fillStyle='#e1d8c8';c.fillRect(0,0,w,h);
  if(image){const scale=Math.max(w/image.naturalWidth,h/image.naturalHeight);const iw=image.naturalWidth*scale,ih=image.naturalHeight*scale;c.drawImage(image,(w-iw)/2,(h-ih)/2,iw,ih);}
  c.fillStyle='#4f4b3d';c.font='70px Arial';c.fillText('Form follows',64,108);c.fillText('imagination.',64,190);
 },1024,1164);
}
function storyPage(root,side){
 return printedArtwork(root,'./assets/story-art.png',(c,w,h,image)=>{
  c.fillStyle='#fff5df';c.fillRect(0,0,w,h);
  const paper=c.createLinearGradient(0,0,w,0);paper.addColorStop(0,side<0?'#fff8e7':'#eddfc3');paper.addColorStop(1,side<0?'#eddfc3':'#fff8e7');c.fillStyle=paper;c.fillRect(0,0,w,h);
  c.fillStyle='#526246';c.textAlign='center';c.font='48px Georgia';c.fillText(side<0?'Cuentacuentos':'Un mundo por descubrir',w/2,106);
  c.fillStyle='#9e885b';c.font='italic 29px Georgia';c.fillText(side<0?'Había una vez…':'…un pequeño gran sueño.',w/2,160);
  if(image){
   const cw=image.naturalWidth/4,ch=image.naturalHeight/2,col=side<0?0:2,row=side<0?0:1;
   c.drawImage(image,col*cw+2,row*ch+2,cw-4,ch-4,55,238,w-110,w-110);
  }
  c.strokeStyle='#d9c6a0';c.lineWidth=2;c.beginPath();c.moveTo(88,931);c.lineTo(w-88,931);c.stroke();
  c.fillStyle='#8d805c';c.font='20px monospace';c.fillText('HISTORIAS PARA IMAGINAR',w/2,979);c.font='18px Georgia';c.fillText(side<0?'01':'02',w/2,1030);
  c.strokeStyle='#c6ae74';c.lineWidth=3;c.beginPath();c.moveTo(66,852);c.quadraticCurveTo(100,830,105,799);c.moveTo(87,833);c.lineTo(70,818);c.moveTo(98,817);c.lineTo(120,811);c.stroke();
 },768,1100);
}
function textTexture(text,{bg='#f4e7cb',color='#202421',small='',align='left',font='Arial',weight=700,aspect=2}={}){
 const height=Math.min(1024,Math.max(64,Math.round(1024/aspect)));
 return canvasTexture((c,w,h)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle=color;c.textAlign=align;const pad=Math.min(44,h*.18);const x=align==='center'?w/2:pad;let size=h*(small?.38:.66);c.font=`${weight} ${size}px ${font}`;while(c.measureText(text).width>w-pad*2&&size>12)c.font=`${weight} ${--size}px ${font}`;c.fillText(text,x,small?h*.46:h*.74);if(small){c.globalAlpha=.63;c.font=`${h*.095}px monospace`;c.fillText(small,x,h*.73);}},1024,height);
}
function label(parent,text,w,h,x,y,z,options={}){const p=plane(parent,w,h,textTexture(text,{...options,aspect:w/h}),x,y,z);p.castShadow=false;return p;}
function screw(parent,x,y,z,r=.023){disk(parent,r,.018,metal,x,y,z);const slot=box(parent,r*1.25,.008,.005,M.ink,x,y,z+.011,.002);slot.rotation.z=.35;}
function line(parent,points,color=0x8a9b86,width=.008){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return add(parent,new THREE.TubeGeometry(curve,Math.max(8,points.length*5),width,6,false),material(color));}
function glow(color,intensity=.6){return new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:intensity,roughness:.25});}
const orangeGlow=glow(0xff9e35,.75), limeGlow=glow(0xbbf843,.55), tealGlow=glow(0x6ef1db,.45);
function polygon(parent,coords,depth,mat,z=0){const s=new THREE.Shape();coords.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:2,bevelSize:.018,bevelThickness:.018,curveSegments:3,steps:1});g.translate(0,0,-depth/2);return add(parent,g,mat,0,0,z);}
function group(parent,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
function star(parent,x,y,z,r=.07,color=P.gold){const pts=[];for(let i=0;i<8;i++){const a=i*Math.PI/4,rr=i%2?r*.26:r;pts.push([Math.sin(a)*rr,Math.cos(a)*rr]);}const s=polygon(parent,pts,.022,material(color),z);s.position.x=x;s.position.y=y;return s;}
function screenTexture(title,type='bars'){
 return canvasTexture((c,w,h)=>{c.fillStyle='#142b26';c.fillRect(0,0,w,h);c.strokeStyle='#517b61';c.lineWidth=2;for(let i=0;i<10;i++){c.beginPath();c.moveTo(0,i*h/10);c.lineTo(w,i*h/10);c.stroke();}c.fillStyle='#c5e874';c.font='bold 42px monospace';c.fillText(title.toUpperCase(),40,70);if(type==='wave'){c.strokeStyle='#c5e874';c.lineWidth=6;c.beginPath();for(let i=0;i<w;i++){const y=h*.59+Math.sin(i*.035)*Math.sin(i*.006)*h*.24;i?c.lineTo(i,y):c.moveTo(i,y);}c.stroke();}else{for(let i=0;i<8;i++){c.fillStyle=i%3===0?'#f38753':'#c5e874';const bh=60+Math.sin(i*1.6+4)**2*225;c.fillRect(45+i*120,h-50-bh,70,bh);}}},1024,512);
}
function engine(project,texture){
 const root=new THREE.Group();
 const rear=group(root,-.29,.04,-.13);rear.rotation.z=.18;box(rear,1.45,1.87,.07,M.deep);box(rear,1.35,1.77,.012,M.orange,0,0,.044,.008);label(rear,'OTHER WORLDS',1.17,.37,0,.55,.055,{bg:'#f26526',color:'#ffe6ba'});disk(rear,.30,.015,M.paper,.30,-.24,.061);
 const mid=group(root,.24,.05,-.06);mid.rotation.z=-.13;box(mid,1.47,1.89,.07,M.cream);box(mid,1.34,1.76,.014,M.teal,0,0,.048,.006);for(let i=0;i<4;i++){const ring=add(mid,new THREE.TorusGeometry(.34+i*.09,.009,6,48),M.paper,.12,-.20,.066);ring.scale.y=.6;}
 const front=group(root,0,-.04,.08);front.rotation.z=.025;box(front,1.42,1.82,.085,M.paper);plane(front,1.31,1.49,enginePrint(root),0,.05,.049);
 label(front,'ENGINE',1.17,.18,0,-.79,.058,{bg:'#fff5df',small:'',weight:700});
 // Violet selection rails and corner handles make the canvas unmistakable.
 const selection=material(0x8765e1);for(const x of [-.66,.66])box(front,.009,1.5,.012,selection,x,.05,.075,.002);for(const y of [-.70,.80])box(front,1.32,.009,.012,selection,0,y,.075,.002);for(const x of [-.66,.66])for(const y of[-.70,.80])box(front,.055,.055,.023,M.paper,x,y,.081,.003);
 const pen=group(root,.99,-.10,.10);pen.rotation.z=-.24;const shaft=cylinder(pen,.045,.045,1.55,M.orange,0,.06,0,6);cylinder(pen,.045,.045,.15,metal,0,.88,0,12);cylinder(pen,.046,.046,.12,M.cream,0,.99,0,12);cylinder(pen,.045,0,.19,M.gold,0,-.81,0,6);cylinder(pen,.014,0,.07,M.ink,0,-.91,0,6);
 const pointer=polygon(root,[[.69,.47],[.76,.16],[.83,.27],[.97,.29]],.024,M.lime,.28);label(root,'E.',.24,.13,.96,.12,.32,{bg:'#c4e54c',color:'#202421',align:'center'});
 root.userData.animate=(t,h)=>{front.rotation.z=.025+Math.sin(t*1.3)*.012*h;pointer.position.y=Math.sin(t*1.7)*.025*h;};return root;
}
function crt(project,texture){
 const root=new THREE.Group();
 box(root,1.96,1.53,.84,M.cream,0,.22,-.05,.16);box(root,1.70,1.22,.10,M.ink,-.04,.28,.409,.13);box(root,1.49,1.01,.04,M.dark,-.04,.28,.471,.10);
 const screen=texture||screenTexture(project.name);plane(root,1.44,.96,screen,-.04,.28,.497,true);
 // Raised screen glass reflection; kept transparent to preserve the source art.
 const glaze=new THREE.MeshPhysicalMaterial({color:0xffffff,transparent:true,opacity:.06,roughness:.08,metalness:.08,depthWrite:false});box(root,1.47,.99,.012,glaze,-.04,.28,.509,.08);
 label(root,'SENTIENT',.68,.16,-.46,-.44,.429,{bg:'#f4e7cb',color:'#343e2e'});disk(root,.055,.03,M.deep,.76,-.40,.447);disk(root,.023,.008,limeGlow,.76,-.40,.467);for(let i=0;i<5;i++)box(root,.10,.017,.012,M.ink,.45+i*.035,-.53,.428,.002);
 const neck=box(root,.30,.27,.36,M.cream,0,-.67,-.11,.07);box(root,1.12,.14,.68,M.cream,0,-.85,.0,.07);box(root,1.21,.055,.73,M.ink,0,-.947,0,.04);
 for(let i=0;i<7;i++)box(root,.018,.54,.011,M.ink,.85-i*.05,.15,-.477,.002);for(const x of[-.83,.83])screw(root,x,-.43,.427);
 const aerial=group(root,.48,1.04,-.14);disk(aerial,.09,.05,M.ink);const stem=cylinder(aerial,.013,.017,.39,metal,.07,.15,0);stem.rotation.z=-.4;add(aerial,new THREE.SphereGeometry(.034,10,8),M.orange,.145,.33,0);
 root.userData.animate=(t,h)=>{glaze.opacity=.04+h*.06+Math.sin(t*2)*.005;};return root;
}
function spacecraft(project){
 const root=new THREE.Group();
 const hull=box(root,.66,1.62,.49,M.cream,0,.13,0,.23);polygon(root,[[-.27,.75],[0,1.10],[.27,.75]],.36,M.paper,.0);
 box(root,.11,1.18,.016,M.orange,0,-.01,.256,.015);box(root,.49,.065,.020,M.orange,0,.74,.25,.015);
 polygon(root,[[-.25,.32],[-.96,-.63],[-.91,-.82],[-.24,-.46]],.17,M.cream,-.01);polygon(root,[[.25,.32],[.96,-.63],[.91,-.82],[.24,-.46]],.17,M.cream,-.01);
 polygon(root,[[-.54,-.20],[-.91,-.63],[-.86,-.70],[-.48,-.38]],.025,M.orange,.105);polygon(root,[[.54,-.20],[.91,-.63],[.86,-.70],[.48,-.38]],.025,M.orange,.105);
 for(const side of[-1,1]){
  const x=side*.61;box(root,.26,.88,.34,M.cream,x,-.49,-.02,.13);box(root,.28,.13,.36,M.orange,x,-.67,-.015,.025);
  const nozzle=cylinder(root,.11,.145,.18,M.ink,x,-1.0,-.02);const rim=cylinder(root,.144,.144,.035,metal,x,-1.06,-.02);const core=cylinder(root,.093,.088,.012,orangeGlow,x,-1.083,-.02);
  for(let k=0;k<3;k++)box(root,.17,.018,.017,M.ink,x,-.43-k*.065,.158,.002);
 }
 const cockpit=add(root,new THREE.SphereGeometry(.21,24,16),glass,0,.49,.25);cockpit.scale.set(.78,1.33,.54);const rim=add(root,new THREE.TorusGeometry(.205,.022,8,32),metal,0,.49,.253);rim.scale.set(.8,1.34,1);
 box(root,.18,.30,.04,M.ink,0,-.57,.285,.018);label(root,'USS',.17,.095,0,-.50,.311,{bg:'#202421',color:'#f4e7cb',align:'center'});label(root,'SENTIENT',.33,.10,0,-.21,.284,{bg:'#f4e7cb',color:'#202421',align:'center'});
 for(const x of[-.2,.2]){screw(root,x,.10,.269,.018);box(root,.038,.16,.018,M.ink,x,-.30,.266,.003);}
 line(root,[[-.18,.90,-.12],[-.28,1.08,-.12],[-.36,1.12,-.12]],0xa7aca0,.012);add(root,new THREE.SphereGeometry(.028,10,8),limeGlow,-.36,1.12,-.12);
 const engines=[];for(const side of[-1,1]){const flame=cylinder(root,.081,0,.20,new THREE.MeshStandardMaterial({color:0xffbd63,emissive:0xff982b,emissiveIntensity:1.5,transparent:true,opacity:.6,depthWrite:false}),side*.61,-1.185,-.02,16);engines.push(flame);}
 root.userData.animate=(t,h)=>engines.forEach((e,i)=>{e.scale.y=.7+h*.4+Math.sin(t*8+i)*.12;e.material.opacity=.35+h*.3;});return root;
}
function storybook(project,texture){
 const root=new THREE.Group();
 const stars=[];
 for(const side of[-1,1]){
  const leaf=group(root,side*.54,0,0);leaf.rotation.y=-side*.13;
  box(leaf,1.10,1.59,.12,M.sage,0,0,-.09,.035);
  for(let i=0;i<5;i++)box(leaf,1.035-i*.006,1.515-i*.008,.021,i%2?M.cream:M.paper,0,0,-.015+i*.022,.012);
  plane(leaf,1.015,1.475,storyPage(root,side),0,0,.105);
  // An elevated curled outer corner catches real light.
  polygon(leaf,[[side*.50,.75],[side*.33,.75],[side*.50,.57]],.015,M.paper,.128);
 }
 cylinder(root,.052,.052,1.51,M.cream,0,0,.082,16);box(root,.085,.42,.026,M.deep,.28,-.87,-.08,.006);polygon(root,[[.237,-1.07],[.28,-1.025],[.323,-1.07]],.027,M.deep,-.08);
 const dust=[[.81,.98,.24,.095],[-.84,.91,.2,.063],[1.12,.29,.16,.06],[.43,1.09,.01,.045]];dust.forEach(([x,y,z,r],i)=>{const s=star(root,x,y,z,r,i%2?P.orange:P.gold);s.userData.baseY=y;stars.push(s);});
 root.userData.animate=(t,h)=>stars.forEach((s,i)=>{s.rotation.z=Math.sin(t*.65+i)*.14;s.position.y=s.userData.baseY+Math.sin(t*1.15+i)*(.012+h*.035);});return root;
}
function drumMachine(project){
 const root=new THREE.Group();
 box(root,2.05,1.78,.34,M.orange,0,0,-.03,.13);box(root,1.91,1.64,.035,M.ink,0,0,.159,.075);
 box(root,.91,.30,.026,M.dark,-.36,.57,.19,.02);plane(root,.84,.245,screenTexture('Meme Deck','wave'),-.36,.57,.207,true);
 label(root,'MEME DECK',.82,.16,-.39,.83,.193,{bg:'#202421',color:'#f4e7cb'});
 const pads=[];const colors=[M.cream,M.cream,M.orange,M.lime,M.cream,M.cream,M.orange,M.cream,M.cream,M.cream,M.cream,M.orange,M.teal,M.cream,M.cream,M.orange];
 for(let row=0;row<4;row++)for(let col=0;col<4;col++){const x=-.65+col*.34,y=.21-row*.32;box(root,.29,.27,.035,M.dark,x,y,.202,.045);const p=box(root,.254,.235,.08,colors[row*4+col],x,y,.251,.035);pads.push(p);label(root,`${row*4+col+1}`,.11,.065,x-.048,y+.045,.294,{bg:row*4+col===3?'#c4e54c':row*4+col===12?'#61bab1':[2,6,11,15].includes(row*4+col)?'#f26526':'#f4e7cb',color:'#44483b',align:'center'});}
 for(let i=0;i<3;i++){const x=.32+i*.24;disk(root,.08,.076,M.cream,x,.57,.23);box(root,.008,.042,.009,M.ink,x,.6,.274,.002);disk(root,.034,.014,i===0?limeGlow:M.deep,x,.36,.214);}
 for(const x of[-.88,.88])for(const y of[-.73,.73])screw(root,x,y,.189,.020);
 for(let i=0;i<5;i++)box(root,.14,.018,.017,M.ink,1.031,-.51+i*.09,-.02,.003).rotation.y=Math.PI/2;
 root.userData.animate=(t,h)=>pads.forEach((p,i)=>p.position.z=.251-Math.max(0,Math.sin(t*2.7-i*.9))*.015*h);return root;
}
function posters(project,texture){
 const root=new THREE.Group();const colors=[M.deep,M.cream,M.teal];
 for(let i=0;i<3;i++){const p=group(root,(i-1)*.13,(i-1)*.045,(i-1)*.08);p.rotation.z=(i-1)*.14;box(p,1.39,1.83,.036,colors[i],0,0,0,.008);if(i===2){if(texture)plane(p,1.31,1.71,texture,0,0,.022);else{box(p,1.30,1.74,.008,M.paper,0,0,.024,.002);label(p,'MAKE',1.11,.49,0,.55,.031,{bg:'#fff5df',color:'#f26526',align:'center'});label(p,'SOMETHING',1.10,.27,0,.20,.031,{bg:'#fff5df',color:'#202421',align:'center'});label(p,'MATTER.',1.12,.43,0,-.14,.031,{bg:'#fff5df',color:'#202421',align:'center'});for(let c=0;c<6;c++)disk(p,.064,.005,[M.orange,M.lime,M.teal,M.sage,M.ink,M.deep][c],-.43+c*.17,-.57,.034);label(p,project.name.toUpperCase(),.98,.10,0,-.76,.033,{bg:'#fff5df',color:'#202421',align:'center'});}}}
 const clip=group(root,-.29,.87,.25);box(clip,.36,.20,.09,M.ink,0,0,0,.012);line(clip,[[-.12,.08,.01],[-.12,.28,.01],[.12,.28,.01],[.12,.08,.01]],0xa7aca0,.013);box(clip,.27,.06,.023,metal,0,.10,.052,.004);
 return root;
}
function terminal(project,texture){
 const root=new THREE.Group();
 box(root,2.10,1.64,.70,M.orange,0,-.02,-.09,.14);box(root,1.95,1.47,.038,M.deep,0,-.03,.271,.065);
 box(root,1.43,.90,.043,M.ink,-.19,.20,.307,.05);box(root,1.28,.76,.025,M.dark,-.19,.20,.34,.035);plane(root,1.23,.72,texture||screenTexture('Sentient Dash'),-.19,.20,.357,true);
 label(root,'SENTIENT DASH',1.22,.12,-.20,.71,.309,{bg:'#b83e19',color:'#f4e7cb'});
 // Recessed mechanical keyboard, with an intentionally oversized amber return.
 box(root,1.77,.35,.045,M.ink,0,-.52,.316,.025);for(let row=0;row<3;row++)for(let col=0;col<11;col++){const x=-.77+col*.14,y=-.415-row*.095;box(root,col===10?.14:.11,.070,.035,col===10?M.orange:M.cream,x,y,.357,.008);}
 for(let i=0;i<2;i++){disk(root,.097,.071,M.ink,.77,.37-i*.33,.345);disk(root,.075,.018,M.cream,.77,.37-i*.33,.39);box(root,.009,.038,.009,M.ink,.77,.40-i*.33,.406,.002);}
 for(let i=0;i<4;i++)disk(root,.018,.007,i<2?limeGlow:M.ink,.69+i*.053,-.12,.319);
 for(const x of[-.85,.85])for(const y of[-.66,.66])screw(root,x,y,.308,.020);
 // U-shaped luggage handle, rear hinges and two little rubber feet.
 for(const x of[-.60,.60])box(root,.13,.34,.17,M.ink,x,.92,-.12,.047);box(root,1.25,.14,.17,M.ink,0,1.08,-.12,.06);for(const x of[-.72,.72])box(root,.26,.09,.4,M.ink,x,-.89,-.09,.02);
 return root;
}
function novel(project){
 const root=new THREE.Group();const navy=material(0x243d50);
 box(root,1.37,1.93,.34,navy,0,0,0,.025);box(root,1.22,1.78,.20,M.paper,.044,0,.005,.005);box(root,1.39,1.95,.053,navy,0,0,.147,.018);box(root,.12,1.95,.35,navy,-.67,0,0,.026);
 const cover=canvasTexture((c,w,h)=>{c.fillStyle='#243d50';c.fillRect(0,0,w,h);c.fillStyle='#e2c99d';c.textAlign='center';c.font='25px monospace';c.fillText('AN ORIGINAL STORY WORLD',w/2,100);c.font='70px Georgia';c.fillText('The Boy',w/2,220);c.font='37px Georgia';c.fillText('from',w/2,286);c.font='67px Georgia';c.fillText('In Between',w/2,365);c.strokeStyle='#e0ad6b';c.lineWidth=5;for(let i=0;i<7;i++){c.beginPath();c.ellipse(w/2,h*.67,54+i*22,89+i*14,-.25,0,Math.PI*2);c.stroke();}c.fillStyle='#e2c99d';c.font='35px Georgia';c.fillText('E.',w/2,h-65);},768,1100);
 plane(root,1.31,1.87,cover,.01,0,.178);for(let i=0;i<12;i++)box(root,.007,1.72,.005,M.cream,.682,0,-.098+i*.015,.001).rotation.y=Math.PI/2;
 box(root,.07,.38,.018,M.orange,.32,-1.00,.0,.004);label(root,'THE BOY FROM IN BETWEEN',1.58,.16,-.697,0,.002,{bg:'#243d50',color:'#e2c99d',align:'center'}).rotation.set(0,-Math.PI/2,Math.PI/2);
 return root;
}
function cartridge(project){
 const root=new THREE.Group();const accent=project.category==='AI & automation'?M.teal:project.category==='Creative experiments'?M.lime:M.orange;
 box(root,1.62,1.80,.30,M.cream,0,0,0,.10);box(root,1.44,1.39,.025,accent,0,.12,.169,.045);label(root,project.name,1.27,.58,0,.42,.187,{bg:accent===M.teal?'#61bab1':accent===M.lime?'#c4e54c':'#f26526',color:'#202421',align:'center',small:'AN EXPERIMENT BY E'});
 box(root,1.23,.43,.023,M.dark,0,-.22,.189,.045);for(const x of[-.37,.37]){disk(root,.145,.025,M.cream,x,-.22,.218);disk(root,.073,.014,M.ink,x,-.22,.237);for(let i=0;i<3;i++){const tooth=box(root,.026,.11,.014,M.cream,x,-.22,.25,.002);tooth.rotation.z=i*Math.PI/3;}}
 box(root,.76,.20,.025,M.ink,0,-.75,.17,.01);for(let i=0;i<7;i++)box(root,.060,.13,.006,M.gold,-.27+i*.09,-.76,.187,.002);for(const x of[-.66,.66])screw(root,x,.75,.172,.02);
 return root;
}

export function createProjectObject(project,texture=null){
 const p={id:'',name:'Untitled project',category:'',...project};
 const factories={'21':engine,'22':crt,'23':spacecraft,'24':storybook,'meme-deck':drumMachine,'03':posters,'09':terminal,'07':novel};
 const root=(factories[String(p.id)]||cartridge)(p,texture);root.name=`artefact-${p.id}`;
 root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root);const size=bounds.getSize(new THREE.Vector3());const center=bounds.getCenter(new THREE.Vector3());
 // Wrap rather than translating every part: its local animation pivots stay valid.
 const wrapper=new THREE.Group();wrapper.name=root.name;root.position.sub(center);const scale=Math.min(1,2.45/size.x,2.45/size.y,1.25/size.z);root.scale.setScalar(scale);root.position.multiplyScalar(scale);wrapper.add(root);
 wrapper.userData.radius=Math.max(size.x,size.y)*scale*.54;wrapper.userData.projectId=p.id;wrapper.userData.animate=root.userData.animate||(()=>{});wrapper.userData.ready=Promise.all(root.userData.artworkReady||[]);
 wrapper.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
 return wrapper;
}
