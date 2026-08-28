import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BASE='https://drmurataltun.github.io/anatomi-simulatoru/systems/';
const RIG_URL='https://raw.githubusercontent.com/UMRAM-Bilkent/supine-human-model/main/assets/human.glb';
const SYSTEMS={
  muscle:{url:BASE+'kas.glb',label:'muscles',color:0x914a43,opacity:1},
  bone:{url:BASE+'iskelet.glb',label:'bones',color:0xd9d0bc,opacity:.28},
  organ:{url:BASE+'ic-organlar.glb',label:'organs',color:0xc86d64,opacity:1},
  circulation:{url:BASE+'dolasim.glb',label:'circulation',color:0xb94747,opacity:.9},
  nerve:{url:BASE+'sinir.glb',label:'nerves',color:0xf2cf62,opacity:.9},
  joint:{url:BASE+'eklem.glb',label:'joints / ligaments',color:0xb9a9d0,opacity:.6},
  lymph:{url:BASE+'lenf.glb',label:'lymph',color:0x80cda0,opacity:.7}
};
const ROLE_COLORS={contracting:new THREE.Color('#ff625d'),assisting:new THREE.Color('#f5b34f'),relaxing:new THREE.Color('#64a8ff'),selected:new THREE.Color('#7fe4cb')};
const norm=s=>(s||'').toLowerCase().replace(/[._-]/g,' ').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const rad=d=>d*Math.PI/180;

const STRUCTURES=[
  {name:'Heart',aliases:['heart','cardiac'],terms:['heart','cor '],systems:['organ','circulation'],desc:'The muscular pump in the chest.'},
  {name:'Lungs',aliases:['lung','lungs'],terms:['lung','pulmo'],systems:['organ'],desc:'Paired respiratory organs in the chest.'},
  {name:'Intestines',aliases:['intestine','intestines','bowel','gut'],terms:['intestin','jejun','ileum','duodenum','colon','cecum'],systems:['organ'],desc:'Small and large bowel structures in the abdomen and pelvis.'},
  {name:'Colon',aliases:['colon','large intestine'],terms:['colon','cecum','rectum'],systems:['organ'],desc:'The large intestine.'},
  {name:'Stomach',aliases:['stomach'],terms:['stomach','gastr'],systems:['organ'],desc:'Digestive organ in the upper abdomen.'},
  {name:'Liver',aliases:['liver'],terms:['liver','hepatic'],systems:['organ'],desc:'Large organ in the right upper abdomen.'},
  {name:'Kidneys',aliases:['kidney','kidneys'],terms:['kidney','renal'],systems:['organ'],desc:'Paired organs behind the abdominal cavity.'},
  {name:'Bladder',aliases:['bladder','urinary bladder'],terms:['bladder','vesica'],systems:['organ'],desc:'Stores urine in the pelvis.'},
  {name:'Brain',aliases:['brain'],terms:['brain','cerebr','encephal'],systems:['organ','nerve'],desc:'Central nervous system structures in the skull.'}
];

function S(label,role,terms,explain,side=null){return{label,role,terms,explain,side};}
const ACTIONS=[
 {id:'abdominal_hollowing',title:'Abdominal hollowing',aliases:['suck stomach in','suck tummy in','pull stomach in','draw stomach in','vacuum stomach','suck belly in'],structures:[S('Transversus abdominis','contracting',['transversus abdominis','transverse abdominis'],'Deep abdominal wall draws inward and can change abdominal pressure.'),S('Internal oblique','assisting',['internal oblique','obliquus internus'],'Assists abdominal compression and trunk control.')]},
 {id:'mouth_open',title:'Open mouth / jaw depression',aliases:['open mouth','open my mouth','open jaw','drop jaw'],structures:[S('Lateral pterygoid','contracting',['lateral pterygoid','pterygoideus lateralis'],'Helps depress and translate the jaw.'),S('Digastric','assisting',['digastric'],'Assists jaw opening.'),S('Masseter','relaxing',['masseter'],'Jaw-closing muscle lengthens/reduces activity during opening.')]},
 {id:'inhale',title:'Deep inhale',aliases:['deep breath','breathe in','inhale deeply','take a deep breath'],structures:[S('Diaphragm','contracting',['diaphragm'],'Descends during inspiration.'),S('External intercostals','contracting',['external intercostal','intercostal'],'Expand the rib cage.')]}
];

class Viewer{
 constructor(el){
  this.el=el;this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(34,1,.01,1000);this.camera.position.set(0,.2,5.2);
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.localClippingEnabled=true;el.appendChild(this.renderer.domElement);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.target.set(0,0,0);
  this.scene.add(new THREE.HemisphereLight(0xffffff,0x333844,2.2));const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(4,6,5);this.scene.add(key);const rim=new THREE.DirectionalLight(0x8ca8ff,1);rim.position.set(-4,2,-5);this.scene.add(rim);
  this.root=new THREE.Group();this.scene.add(this.root);this.rigRoot=new THREE.Group();this.scene.add(this.rigRoot);this.rigRoot.visible=false;
  this.systems={};this.enabled={muscle:true,bone:true,organ:true,circulation:false,nerve:false,joint:false,lymph:false};this.view='normal';this.active=[];this.bounds=null;this.heartbeat=false;this.heartBase=[];
  this.rig=null;this.rigBones={};this.rigBase={};this.poseMode=false;
  new ResizeObserver(()=>this.resize()).observe(el);this.resize();this.animate();
 }
 resize(){const w=this.el.clientWidth,h=this.el.clientHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 async loadSystem(type){
  if(this.systems[type])return this.systems[type];const cfg=SYSTEMS[type];const gltf=await new GLTFLoader().loadAsync(cfg.url);const meshes=[];const json=gltf.parser.json,assoc=gltf.parser.associations;
  const originalName=o=>{const a=assoc.get(o);return(a&&a.nodes!==undefined&&json.nodes[a.nodes]?.name)||o.name||''};
  gltf.scene.traverse(o=>{if(!o.isMesh)return;o.userData.anatomyName=originalName(o);o.userData.system=type;const old=o.material;o.material=new THREE.MeshStandardMaterial({color:cfg.color,roughness:.62,metalness:0,transparent:true,opacity:cfg.opacity,side:THREE.DoubleSide});if(old?.map)o.material.map=old.map;meshes.push(o);});
  gltf.scene.visible=!!this.enabled[type];this.root.add(gltf.scene);this.systems[type]={scene:gltf.scene,meshes};this.updateBounds();this.applyView();return this.systems[type];
 }
 async loadRig(){
  if(this.rig)return this.rig;
  const gltf=await new GLTFLoader().loadAsync(RIG_URL);this.rig=gltf.scene;this.rigRoot.add(this.rig);
  this.rig.traverse(o=>{if(o.isBone){this.rigBones[norm(o.name)]=o;this.rigBase[o.uuid]={q:o.quaternion.clone(),p:o.position.clone()};}if(o.isMesh){o.frustumCulled=false;const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats){if(m){m.transparent=true;m.opacity=.95;m.roughness=.72;}}}});
  // Match the rig's overall height/center to the anatomy model so camera behavior stays familiar.
  const rigBox=new THREE.Box3().setFromObject(this.rig);const anatBox=this.bounds||new THREE.Box3().setFromObject(this.root);const rs=rigBox.getSize(new THREE.Vector3()),as=anatBox.getSize(new THREE.Vector3());const scale=(as.y||as.z||1)/(rs.y||rs.z||1);this.rig.scale.setScalar(scale);
  this.rig.updateMatrixWorld(true);const rb2=new THREE.Box3().setFromObject(this.rig);const rc=rb2.getCenter(new THREE.Vector3()),ac=anatBox.getCenter(new THREE.Vector3());this.rig.position.add(ac.clone().sub(rc));this.rig.updateMatrixWorld(true);
  return this.rig;
 }
 bone(...names){for(const n of names){const target=norm(n);for(const [k,b] of Object.entries(this.rigBones)){if(k===target||k.endsWith(' '+target)||k.includes(target))return b;}}return null;}
 resetRigPose(){if(!this.rig)return;this.rig.traverse(o=>{if(o.isBone&&this.rigBase[o.uuid]){o.quaternion.copy(this.rigBase[o.uuid].q);o.position.copy(this.rigBase[o.uuid].p);}});this.rig.rotation.set(0,0,0);}
 rotateBone(bone,xyz){if(!bone)return;const e=new THREE.Euler(rad(xyz[0]||0),rad(xyz[1]||0),rad(xyz[2]||0),'XYZ');bone.quaternion.multiply(new THREE.Quaternion().setFromEuler(e));}
 applyPose(p){
  if(!this.rig)return false;this.resetRigPose();
  const LArm=this.bone('LeftArm','left upper arm','upperarm l'),RArm=this.bone('RightArm','right upper arm','upperarm r');
  const LFore=this.bone('LeftForeArm','LeftLowerArm','left forearm'),RFore=this.bone('RightForeArm','RightLowerArm','right forearm');
  const LThigh=this.bone('LeftUpLeg','left thigh','thigh l'),RThigh=this.bone('RightUpLeg','right thigh','thigh r');
  const LLeg=this.bone('LeftLeg','left calf','calf l'),RLeg=this.bone('RightLeg','right calf','calf r');
  const hips=this.bone('Hips','pelvis'),spine=this.bone('Spine','spine1'),chest=this.bone('Spine2','Chest','upper chest'),neck=this.bone('Neck'),head=this.bone('Head');
  // Generic composable pose controls. Axes are calibrated for the Quaternius rig and intentionally moderate.
  if(p.armsUp==='both'){this.rotateBone(LArm,[0,0,-105]);this.rotateBone(RArm,[0,0,105]);}
  if(p.armsUp==='left')this.rotateBone(LArm,[0,0,-105]);
  if(p.armsUp==='right')this.rotateBone(RArm,[0,0,105]);
  if(p.armsOut){this.rotateBone(LArm,[0,0,-25]);this.rotateBone(RArm,[0,0,25]);}
  if(p.reachForward==='both'){this.rotateBone(LArm,[-80,0,-15]);this.rotateBone(RArm,[-80,0,15]);}
  if(p.reachForward==='left')this.rotateBone(LArm,[-80,0,-15]);
  if(p.reachForward==='right')this.rotateBone(RArm,[-80,0,15]);
  if(p.elbowBend==='both'){this.rotateBone(LFore,[0,0,-90]);this.rotateBone(RFore,[0,0,90]);}
  if(p.elbowBend==='left')this.rotateBone(LFore,[0,0,-90]);
  if(p.elbowBend==='right')this.rotateBone(RFore,[0,0,90]);
  if(p.oneLeg){const side=p.oneLeg==='left'?'left':'right';if(side==='left'){this.rotateBone(LThigh,[-50,0,0]);this.rotateBone(LLeg,[65,0,0]);this.rotateBone(hips,[0,0,-5]);}else{this.rotateBone(RThigh,[-50,0,0]);this.rotateBone(RLeg,[65,0,0]);this.rotateBone(hips,[0,0,5]);}}
  if(p.squat){this.rotateBone(LThigh,[-58,0,0]);this.rotateBone(RThigh,[-58,0,0]);this.rotateBone(LLeg,[75,0,0]);this.rotateBone(RLeg,[75,0,0]);this.rotateBone(hips,[22,0,0]);this.rotateBone(spine,[-12,0,0]);}
  if(p.bendForward){this.rotateBone(hips,[-45,0,0]);this.rotateBone(spine,[-18,0,0]);this.rotateBone(chest,[-12,0,0]);}
  if(p.headLeft)this.rotateBone(neck,[0,35,0]);
  if(p.headRight)this.rotateBone(neck,[0,-35,0]);
  if(p.lookUp)this.rotateBone(head,[-25,0,0]);
  if(p.lookDown)this.rotateBone(head,[25,0,0]);
  if(p.headstand){this.rig.rotation.z=Math.PI;}
  this.rig.updateMatrixWorld(true);this.poseMode=true;this.root.visible=false;this.rigRoot.visible=true;this.fitToObject(this.rigRoot,1.28);return true;
 }
 showAnatomy(){this.poseMode=false;this.rigRoot.visible=false;this.root.visible=true;}
 updateBounds(){this.root.updateMatrixWorld(true);this.bounds=new THREE.Box3().setFromObject(this.root);}
 allMeshes(){return Object.values(this.systems).flatMap(s=>s.meshes);}
 find(terms,systems=null,side=null){const types=systems||Object.keys(this.systems);const out=[];for(const t of types){const sys=this.systems[t];if(!sys)continue;for(const m of sys.meshes){const n=norm(m.userData.anatomyName),raw=(m.userData.anatomyName||'').toLowerCase();if(!terms.some(x=>n.includes(norm(x))))continue;if(side==='left'&&!(/\.l\b|\bleft\b/.test(raw)||/ l$/.test(n)))continue;if(side==='right'&&!(/\.r\b|\bright\b/.test(raw)||/ r$/.test(n)))continue;out.push(m);}}return out;}
 clearActive(){this.heartbeat=false;for(const x of this.heartBase)x.mesh.scale.copy(x.scale);this.heartBase=[];this.active=[];this.applyView();}
 select(meshes,{heartbeat=false}={}){this.showAnatomy();this.active=[...new Set(meshes)];this.heartbeat=heartbeat;this.heartBase=this.active.map(mesh=>({mesh,scale:mesh.scale.clone()}));this.applyView();if(this.active.length)this.fitMeshes(this.active,1.65);}
 baseOpacity(type){if(type==='muscle')return 1;if(type==='bone')return .28;if(type==='organ')return 1;return SYSTEMS[type]?.opacity??.7;}
 resetMaterials(){for(const m of this.allMeshes()){m.material.clippingPlanes=[];m.material.emissive?.set('#000000');m.material.emissiveIntensity=0;m.material.color.setHex(SYSTEMS[m.userData.system].color);m.visible=true;}}
 applyView(){if(this.poseMode)return;this.resetMaterials();const activeSet=new Set(this.active);for(const [type,sys] of Object.entries(this.systems)){sys.scene.visible=!!this.enabled[type];if(!this.enabled[type])continue;for(const m of sys.meshes){let op=this.baseOpacity(type);if(this.view==='transparent')op=type==='muscle'?.09:type==='bone'?.12:type==='organ'?.82:Math.min(op,.45);if(this.view==='cutaway'){if(type==='muscle'||type==='bone')op=type==='muscle'?.04:.07;else if(type==='organ')op=1;}if(this.view==='isolate')m.visible=activeSet.size?activeSet.has(m):false;if(activeSet.size&&this.view!=='isolate'){if(activeSet.has(m)){op=1;m.material.color.copy(ROLE_COLORS.selected);m.material.emissive.copy(ROLE_COLORS.selected);m.material.emissiveIntensity=.15;}else if(type==='muscle')op=Math.min(op,.06);else if(type==='bone')op=Math.min(op,.09);else op=Math.min(op,.16);}m.material.opacity=op;m.material.depthWrite=op>.55;}}
 }
 highlightAction(structures){this.showAnatomy();this.clearActive();const active=[];for(const s of structures){const hits=this.find(s.terms,['muscle'],s.side);for(const m of hits){active.push(m);m.material.color.copy(ROLE_COLORS[s.role]);m.material.emissive.copy(ROLE_COLORS[s.role]);m.material.emissiveIntensity=.18;m.material.opacity=1;}}this.active=[...new Set(active)];for(const m of this.systems.muscle?.meshes||[]){if(!this.active.includes(m))m.material.opacity=.08;}for(const m of this.systems.bone?.meshes||[])m.material.opacity=.12;if(this.active.length)this.fitMeshes(this.active,1.65);return this.active;}
 setView(v){this.showAnatomy();this.view=v;this.applyView();}
 setEnabled(type,on){this.enabled[type]=on;if(this.systems[type])this.systems[type].scene.visible=on;this.applyView();}
 fitMeshes(meshes,pad=1.4){const box=new THREE.Box3();meshes.forEach(m=>box.expandByObject(m));this.fitBox(box,pad);}
 fitToObject(obj,pad=1.3){this.fitBox(new THREE.Box3().setFromObject(obj),pad);}
 fitBox(box,pad=1.3){if(box.isEmpty())return;const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),max=Math.max(size.x,size.y,size.z),fov=this.camera.fov*Math.PI/180,dist=(max/2)/Math.tan(fov/2)*pad;const dir=this.camera.position.clone().sub(this.controls.target).normalize();if(!isFinite(dir.length())||dir.length()<.5)dir.set(0,0,1);this.controls.target.copy(center);this.camera.position.copy(center.clone().add(dir.multiplyScalar(dist)));this.camera.near=Math.max(.001,dist/100);this.camera.far=dist*100;this.camera.updateProjectionMatrix();this.controls.update();}
 resetCamera(){this.showAnatomy();this.clearActive();this.view='normal';this.fitToObject(this.root,1.2);}
 animate(){requestAnimationFrame(()=>this.animate());if(this.heartbeat&&this.heartBase.length){const s=1+Math.max(0,Math.sin(performance.now()/180))*0.055;for(const x of this.heartBase)x.mesh.scale.copy(x.scale).multiplyScalar(s);}this.controls.update();this.renderer.render(this.scene,this.camera);}
}

function parsePose(q){
 const n=norm(q);const p={};let score=0;
 const has=(...x)=>x.some(v=>n.includes(v));
 const side=has('left')?'left':has('right')?'right':null;
 if(has('stand on one leg','one leg','single leg','balance on one leg')){p.oneLeg=side||'right';score+=3;}
 if(has('squat','squatting','sit into a squat')){p.squat=true;score+=3;}
 if(has('headstand','stand on my head','stand on his head','upside down on head')){p.headstand=true;score+=4;}
 if(has('bend forward','lean forward','fold forward','reach toward my toes','touch my toes')){p.bendForward=true;score+=2;}
 if(has('arms up','both arms up','raise both arms','hands overhead','arms overhead')){p.armsUp='both';score+=2;}
 else if(has('arm up','raise arm','lift arm','hand up')){p.armsUp=side||'right';score+=2;}
 if(has('arms out','both arms out','arms to the side','t pose')){p.armsOut=true;score+=2;}
 if(has('reach forward','arms forward','both arms forward')){p.reachForward='both';score+=2;}
 else if(has('arm forward','raise right arm forward','raise left arm forward')){p.reachForward=side||'right';score+=2;}
 if(has('bend elbows','bend both elbows')){p.elbowBend='both';score+=2;}
 else if(has('bend elbow','curl arm','curl my arm')){p.elbowBend=side||'right';score+=2;}
 if(has('turn head left','look left')){p.headLeft=true;score+=2;}
 if(has('turn head right','look right')){p.headRight=true;score+=2;}
 if(has('look up')){p.lookUp=true;score+=1;}
 if(has('look down')){p.lookDown=true;score+=1;}
 return score?{pose:p,score}:null;
}

const viewer=new Viewer(document.querySelector('#viewer'));
const status=document.querySelector('#modelStatus'),result=document.querySelector('#resultPanel'),input=document.querySelector('#actionInput');
function matchStructure(q){const n=norm(q);return STRUCTURES.find(x=>x.aliases.some(a=>n.includes(norm(a))));}
function matchAction(q){const n=norm(q);return ACTIONS.find(a=>a.aliases.some(x=>n.includes(norm(x))));}
function poseCard(q){return `<div class="action-card"><div class="action-title"><div><h2>Pose preview</h2><div class="standard-name">Real skinned skeleton movement</div></div><span class="role selected">rigged</span></div><div class="structure-explain" style="margin-top:12px">Interpreted: <b>${q.replace(/[<>]/g,'')}</b></div><div class="notice">The outer body is moving with a real armature now. The detailed anatomy model is still a separate static reference; attaching every muscle and organ to this rig is the remaining anatomy-rigging step.</div></div>`;}
function actionCard(a,hits){return `<div class="action-card"><div class="action-title"><div><h2>${a.title}</h2><div class="standard-name">Muscle activity view</div></div></div><div class="structure-list">${a.structures.map(s=>`<div class="structure"><div><div class="structure-name">${s.label}</div><div class="structure-explain">${s.explain}</div></div><span class="role ${s.role}">${s.role}</span></div>`).join('')}</div><div class="notice">${hits?'Highlighted on the anatomy model.':'The action was understood, but the source mesh names did not match cleanly.'}</div></div>`;}
function structureCard(s,hits,heartbeat){return `<div class="action-card"><div class="action-title"><div><h2>${s.name}</h2><div class="standard-name">Inside view</div></div><span class="role selected">selected</span></div><div class="structure-explain" style="margin-top:12px">${s.desc}</div><div class="notice">Found ${hits} matching 3D structure${hits===1?'':'s'}.${heartbeat?' Heartbeat preview is on.':''}</div></div>`;}

async function runQuery(q){
 q=(q||'').trim();if(!q)return;
 const s=matchStructure(q);if(s){status.textContent=`Loading ${s.name.toLowerCase()}…`;for(const type of s.systems){viewer.enabled[type]=true;await viewer.loadSystem(type);}document.querySelectorAll('[data-system]').forEach(c=>{if(s.systems.includes(c.dataset.system))c.checked=true;});let hits=viewer.find(s.terms,s.systems);if(!hits.length&&s.name==='Heart')hits=viewer.find(['atri','ventric','myocard'],s.systems);const beat=/beat|beating|pulse|pulsing/.test(norm(q));viewer.select(hits,{heartbeat:beat});viewer.setView('transparent');setActiveView('transparent');status.textContent=`${s.name} · ${hits.length} matching structures`;result.innerHTML=structureCard(s,hits.length,beat);return;}
 const pose=parsePose(q);if(pose){status.textContent='Applying rigged pose…';await viewer.loadRig();viewer.applyPose(pose.pose);setActiveView(null);status.textContent='Rigged pose active';result.innerHTML=poseCard(q);return;}
 const a=matchAction(q);if(a){viewer.enabled.muscle=true;await viewer.loadSystem('muscle');const hits=viewer.highlightAction(a.structures);status.textContent=`${a.title} · ${hits.length} highlighted meshes`;result.innerHTML=actionCard(a,hits.length);return;}
 result.innerHTML=`<div class="empty-state">I couldn't turn <b>${q.replace(/[<>]/g,'')}</b> into a pose yet. Try describing the joints plainly, like “stand on one leg with both arms up” or “squat and look left.”</div>`;
}
function setActiveView(v){document.querySelectorAll('#viewTabs button').forEach(b=>b.classList.toggle('active',b.dataset.view===v));}
document.querySelector('#goBtn').addEventListener('click',()=>runQuery(input.value));input.addEventListener('keydown',e=>{if(e.key==='Enter')runQuery(input.value);});
document.querySelectorAll('#quickExamples button').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.q;runQuery(b.dataset.q);}));
document.querySelectorAll('#viewTabs button').forEach(b=>b.addEventListener('click',()=>{viewer.setView(b.dataset.view);setActiveView(b.dataset.view);}));
document.querySelector('#layersBtn').addEventListener('click',()=>{const p=document.querySelector('#layerPanel');p.hidden=!p.hidden;});
document.querySelectorAll('[data-system]').forEach(c=>c.addEventListener('change',async()=>{const t=c.dataset.system;viewer.setEnabled(t,c.checked);if(c.checked&&!viewer.systems[t]){status.textContent=`Loading ${SYSTEMS[t].label}…`;const s=await viewer.loadSystem(t);status.textContent=`Loaded ${SYSTEMS[t].label} · ${s.meshes.length} structures`;}}));
document.querySelector('#resetView').addEventListener('click',()=>{viewer.resetCamera();setActiveView('normal');result.innerHTML='<div class="empty-state">Reset. Type an action, structure, or pose.</div>';});
(async()=>{try{const [m,b,o]=await Promise.all([viewer.loadSystem('muscle'),viewer.loadSystem('bone'),viewer.loadSystem('organ')]);viewer.updateBounds();viewer.fitToObject(viewer.root,1.2);status.textContent=`Anatomy loaded · ${m.meshes.length} muscles + ${b.meshes.length} bones + ${o.meshes.length} organ structures`;viewer.loadRig().catch(()=>{});}catch(err){console.error(err);status.textContent='Could not load one or more anatomy layers';}})();
