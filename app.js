import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const BASE='https://drmurataltun.github.io/anatomi-simulatoru/systems/';
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

const STRUCTURES=[
  {name:'Heart',aliases:['heart','cardiac'],terms:['heart','cor '],systems:['organ','circulation'],desc:'The muscular pump in the chest.'},
  {name:'Lungs',aliases:['lung','lungs'],terms:['lung','pulmo'],systems:['organ'],desc:'Paired respiratory organs in the chest.'},
  {name:'Intestines',aliases:['intestine','intestines','bowel','gut'],terms:['intestin','jejun','ileum','duodenum','colon','cecum'],systems:['organ'],desc:'Small and large bowel structures in the abdomen and pelvis.'},
  {name:'Colon',aliases:['colon','large intestine'],terms:['colon','cecum','rectum'],systems:['organ'],desc:'The large intestine.'},
  {name:'Stomach',aliases:['stomach'],terms:['stomach','gastr'],systems:['organ'],desc:'Digestive organ in the upper abdomen.'},
  {name:'Liver',aliases:['liver'],terms:['liver','hepatic'],systems:['organ'],desc:'Large organ in the right upper abdomen.'},
  {name:'Kidneys',aliases:['kidney','kidneys'],terms:['kidney','renal'],systems:['organ'],desc:'Paired organs behind the abdominal cavity.'},
  {name:'Bladder',aliases:['bladder','urinary bladder'],terms:['bladder','vesica'],systems:['organ'],desc:'Stores urine in the pelvis.'},
  {name:'Brain',aliases:['brain'],terms:['brain','cerebr','encephal'],systems:['organ','nerve'],desc:'Central nervous system structures in the skull.'},
  {name:'Pancreas',aliases:['pancreas'],terms:['pancreas','pancreatic'],systems:['organ'],desc:'Digestive and endocrine organ behind the stomach.'},
  {name:'Spleen',aliases:['spleen'],terms:['spleen','splenic'],systems:['organ'],desc:'Immune organ in the left upper abdomen.'},
  {name:'Esophagus',aliases:['esophagus','oesophagus'],terms:['esoph','oesoph'],systems:['organ'],desc:'Tube carrying swallowed material to the stomach.'},
  {name:'Rectum',aliases:['rectum'],terms:['rectum'],systems:['organ'],desc:'Terminal portion of the large intestine.'}
];

function S(label,role,terms,explain,side=null){return{label,role,terms,explain,side};}
const ACTIONS=[
 {id:'abdominal_hollowing',title:'Abdominal hollowing',aliases:['suck stomach in','suck tummy in','pull stomach in','draw stomach in','vacuum stomach','suck belly in'],structures:[S('Transversus abdominis','contracting',['transversus abdominis','transverse abdominis'],'Deep abdominal wall draws inward and can change abdominal pressure.'),S('Internal oblique','assisting',['internal oblique','obliquus internus'],'Assists abdominal compression and trunk control.')]},
 {id:'mouth_open',title:'Open mouth / jaw depression',aliases:['open mouth','open my mouth','open jaw','drop jaw'],structures:[S('Lateral pterygoid','contracting',['lateral pterygoid','pterygoideus lateralis'],'Helps depress and translate the jaw.'),S('Digastric','assisting',['digastric'],'Assists jaw opening.'),S('Masseter','relaxing',['masseter'],'Jaw-closing muscle lengthens/reduces activity during opening.')]},
 {id:'elbow_flexion',title:'Elbow flexion',aliases:['bend elbow','bend my elbow','curl arm','curl my arm'],structures:[S('Biceps brachii','contracting',['biceps brachii'],'Major elbow flexor.'),S('Brachialis','contracting',['brachialis'],'Strong elbow flexor.'),S('Triceps brachii','relaxing',['triceps brachii'],'Primary elbow extensor lengthens as the elbow bends.')]},
 {id:'head_left',title:'Turn head left',aliases:['turn head left','look left','rotate neck left'],structures:[S('Right sternocleidomastoid','contracting',['sternocleidomastoid'],'Contributes to rotating the face left.','right'),S('Left splenius capitis','contracting',['splenius capitis'],'Contributes to same-side rotation.','left')]},
 {id:'head_right',title:'Turn head right',aliases:['turn head right','look right','rotate neck right'],structures:[S('Left sternocleidomastoid','contracting',['sternocleidomastoid'],'Contributes to rotating the face right.','left'),S('Right splenius capitis','contracting',['splenius capitis'],'Contributes to same-side rotation.','right')]},
 {id:'inhale',title:'Deep inhale',aliases:['deep breath','breathe in','inhale deeply','take a deep breath'],structures:[S('Diaphragm','contracting',['diaphragm'],'Descends during inspiration.'),S('External intercostals','contracting',['external intercostal','intercostal'],'Expand the rib cage.')]},
 {id:'cough',title:'Cough / forced expiration',aliases:['cough','cough hard'],structures:[S('Abdominal wall','contracting',['rectus abdominis','external oblique','internal oblique','transversus abdominis'],'Raises abdominal pressure during forceful expiration.'),S('Internal intercostals','contracting',['internal intercostal'],'Assist forceful expiration.')]} 
];

class Viewer{
 constructor(el){
  this.el=el;this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(34,1,.01,1000);this.camera.position.set(0,.2,5.2);
  this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.localClippingEnabled=true;el.appendChild(this.renderer.domElement);
  this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.target.set(0,0,0);
  this.scene.add(new THREE.HemisphereLight(0xffffff,0x333844,2.2));const key=new THREE.DirectionalLight(0xffffff,2);key.position.set(4,6,5);this.scene.add(key);const rim=new THREE.DirectionalLight(0x8ca8ff,1);rim.position.set(-4,2,-5);this.scene.add(rim);
  this.root=new THREE.Group();this.scene.add(this.root);this.systems={};this.enabled={muscle:true,bone:true,organ:true,circulation:false,nerve:false,joint:false,lymph:false};this.view='normal';this.active=[];this.bounds=null;this.heartbeat=false;this.heartBase=[];
  new ResizeObserver(()=>this.resize()).observe(el);this.resize();this.animate();
 }
 resize(){const w=this.el.clientWidth,h=this.el.clientHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
 async loadSystem(type){
  if(this.systems[type])return this.systems[type];const cfg=SYSTEMS[type];const gltf=await new GLTFLoader().loadAsync(cfg.url);const meshes=[];const json=gltf.parser.json,assoc=gltf.parser.associations;
  const originalName=o=>{const a=assoc.get(o);return(a&&a.nodes!==undefined&&json.nodes[a.nodes]?.name)||o.name||''};
  gltf.scene.traverse(o=>{if(!o.isMesh)return;o.userData.anatomyName=originalName(o);o.userData.system=type;const old=o.material;o.material=new THREE.MeshStandardMaterial({color:cfg.color,roughness:.62,metalness:0,transparent:true,opacity:cfg.opacity,side:THREE.DoubleSide});if(old?.map)o.material.map=old.map;meshes.push(o);});
  gltf.scene.visible=!!this.enabled[type];this.root.add(gltf.scene);this.systems[type]={scene:gltf.scene,meshes};this.updateBounds();this.applyView();return this.systems[type];
 }
 async loadCore(){const [m,b,o]=await Promise.all([this.loadSystem('muscle'),this.loadSystem('bone'),this.loadSystem('organ')]);this.updateBounds();this.fitToObject(this.root,1.2);return{muscles:m.meshes.length,bones:b.meshes.length,organs:o.meshes.length};}
 updateBounds(){this.root.updateMatrixWorld(true);this.bounds=new THREE.Box3().setFromObject(this.root);}
 allMeshes(){return Object.values(this.systems).flatMap(s=>s.meshes);}
 find(terms,systems=null,side=null){const types=systems||Object.keys(this.systems);const out=[];for(const t of types){const sys=this.systems[t];if(!sys)continue;for(const m of sys.meshes){const n=norm(m.userData.anatomyName),raw=(m.userData.anatomyName||'').toLowerCase();if(!terms.some(x=>n.includes(norm(x))))continue;if(side==='left'&&!(/\.l\b|\bleft\b/.test(raw)||/ l$/.test(n)))continue;if(side==='right'&&!(/\.r\b|\bright\b/.test(raw)||/ r$/.test(n)))continue;out.push(m);}}return out;}
 clearActive(){this.heartbeat=false;for(const x of this.heartBase)x.mesh.scale.copy(x.scale);this.heartBase=[];this.active=[];this.applyView();}
 select(meshes,{heartbeat=false}={}){this.active=[...new Set(meshes)];this.heartbeat=heartbeat;this.heartBase=this.active.map(mesh=>({mesh,scale:mesh.scale.clone()}));this.applyView();if(this.active.length)this.fitMeshes(this.active,1.65);}
 baseOpacity(type){if(type==='muscle')return 1;if(type==='bone')return .28;if(type==='organ')return 1;return SYSTEMS[type]?.opacity??.7;}
 resetMaterials(){for(const m of this.allMeshes()){m.material.clippingPlanes=[];m.material.emissive?.set('#000000');m.material.emissiveIntensity=0;m.material.color.setHex(SYSTEMS[m.userData.system].color);m.visible=true;}}
 applyView(){
  this.resetMaterials();const activeSet=new Set(this.active);const center=this.bounds?.getCenter(new THREE.Vector3())||new THREE.Vector3();const camDir=this.camera.position.clone().sub(center).normalize();
  for(const [type,sys] of Object.entries(this.systems)){
   sys.scene.visible=!!this.enabled[type];if(!this.enabled[type])continue;
   for(const m of sys.meshes){
    let op=this.baseOpacity(type);
    if(this.view==='transparent'){op=type==='muscle'?.09:type==='bone'?.12:type==='organ'?.82:Math.min(op,.45);}
    if(this.view==='cutaway'){
      if(type==='muscle'||type==='bone'){
       const c=new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());const front=c.clone().sub(center).dot(camDir)>0;if(front)op=.025;else op=type==='muscle'?.2:.18;
      } else if(type==='organ')op=1;
    }
    if(this.view==='isolate')m.visible=activeSet.size?activeSet.has(m):false;
    if(activeSet.size&&this.view!=='isolate'){
      if(activeSet.has(m)){op=1;m.material.color.copy(ROLE_COLORS.selected);m.material.emissive.copy(ROLE_COLORS.selected);m.material.emissiveIntensity=.15;}
      else if(type==='muscle')op=Math.min(op,.06);else if(type==='bone')op=Math.min(op,.09);else op=Math.min(op,.16);
    }
    m.material.opacity=op;m.material.depthWrite=op>.55;
   }
  }
 }
 highlightAction(structures){this.clearActive();const active=[];for(const s of structures){const hits=this.find(s.terms,['muscle'],s.side);for(const m of hits){active.push(m);m.material.color.copy(ROLE_COLORS[s.role]);m.material.emissive.copy(ROLE_COLORS[s.role]);m.material.emissiveIntensity=.18;m.material.opacity=1;}}this.active=[...new Set(active)];for(const m of this.systems.muscle?.meshes||[]){if(!this.active.includes(m))m.material.opacity=.08;}for(const m of this.systems.bone?.meshes||[])m.material.opacity=.12;if(this.active.length)this.fitMeshes(this.active,1.65);return this.active;}
 setView(v){this.view=v;this.applyView();}
 setEnabled(type,on){this.enabled[type]=on;if(this.systems[type])this.systems[type].scene.visible=on;this.applyView();}
 fitMeshes(meshes,pad=1.4){const box=new THREE.Box3();meshes.forEach(m=>box.expandByObject(m));this.fitBox(box,pad);}
 fitToObject(obj,pad=1.3){this.fitBox(new THREE.Box3().setFromObject(obj),pad);}
 fitBox(box,pad=1.3){if(box.isEmpty())return;const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),max=Math.max(size.x,size.y,size.z),fov=this.camera.fov*Math.PI/180,dist=(max/2)/Math.tan(fov/2)*pad;const dir=this.camera.position.clone().sub(this.controls.target).normalize();if(!isFinite(dir.length())||dir.length()<.5)dir.set(0,0,1);this.controls.target.copy(center);this.camera.position.copy(center.clone().add(dir.multiplyScalar(dist)));this.camera.near=Math.max(.001,dist/100);this.camera.far=dist*100;this.camera.updateProjectionMatrix();this.controls.update();}
 resetCamera(){this.clearActive();this.view='normal';this.fitToObject(this.root,1.2);}
 animate(){requestAnimationFrame(()=>this.animate());if(this.heartbeat&&this.heartBase.length){const s=1+Math.max(0,Math.sin(performance.now()/180))*0.055;for(const x of this.heartBase)x.mesh.scale.copy(x.scale).multiplyScalar(s);}this.controls.update();this.renderer.render(this.scene,this.camera);}
}

const viewer=new Viewer(document.querySelector('#viewer'));
const status=document.querySelector('#modelStatus'),result=document.querySelector('#resultPanel'),input=document.querySelector('#actionInput');

function matchStructure(q){const n=norm(q);return STRUCTURES.find(x=>x.aliases.some(a=>n.includes(norm(a))));}
function matchAction(q){const n=norm(q);return ACTIONS.find(a=>a.aliases.some(x=>n.includes(norm(x))));}
function actionCard(a,hits){return `<div class="action-card"><div class="action-title"><div><h2>${a.title}</h2><div class="standard-name">Muscle activity view</div></div></div><div class="structure-list">${a.structures.map(s=>`<div class="structure"><div><div class="structure-name">${s.label}</div><div class="structure-explain">${s.explain}</div></div><span class="role ${s.role}">${s.role}</span></div>`).join('')}</div><div class="notice">${hits?'Highlighted on the anatomy model.':'The action was understood, but the source mesh names did not match cleanly.'} Whole-body motion is being rebuilt around a real rig instead of the old mesh-stretch method.</div></div>`;}
function structureCard(s,hits,heartbeat){return `<div class="action-card"><div class="action-title"><div><h2>${s.name}</h2><div class="standard-name">Inside view</div></div><span class="role selected">selected</span></div><div class="structure-explain" style="margin-top:12px">${s.desc}</div><div class="notice">Found ${hits} matching 3D structure${hits===1?'':'s'}.${heartbeat?' Heartbeat preview is on.':''} Use <b>Transparent</b>, <b>Cutaway</b>, or <b>Isolate</b> above the model.</div></div>`;}

async function runQuery(q){
 q=(q||'').trim();if(!q)return;const s=matchStructure(q);if(s){status.textContent=`Loading ${s.name.toLowerCase()}…`;for(const type of s.systems){viewer.enabled[type]=true;await viewer.loadSystem(type);}document.querySelectorAll('[data-system]').forEach(c=>{if(s.systems.includes(c.dataset.system))c.checked=true;});let hits=viewer.find(s.terms,s.systems);if(!hits.length&&s.name==='Heart'){hits=viewer.find(['atri','ventric','myocard'],s.systems);}const beat=/beat|beating|pulse|pulsing/.test(norm(q));viewer.select(hits,{heartbeat:beat});viewer.setView('transparent');setActiveView('transparent');status.textContent=`${s.name} · ${hits.length} matching structures`;result.innerHTML=structureCard(s,hits.length,beat);return;}
 const a=matchAction(q);if(a){viewer.enabled.muscle=true;await viewer.loadSystem('muscle');const hits=viewer.highlightAction(a.structures);status.textContent=`${a.title} · ${hits.length} highlighted meshes`;result.innerHTML=actionCard(a,hits.length);return;}
 result.innerHTML=`<div class="empty-state">I don't have a clean match for <b>${q.replace(/[<>]/g,'')}</b> yet. You can still use the layer controls to inspect the body. The next step is replacing phrase-by-phrase movement with a real pose interpreter.</div>`;
}

function setActiveView(v){document.querySelectorAll('#viewTabs button').forEach(b=>b.classList.toggle('active',b.dataset.view===v));}

document.querySelector('#goBtn').addEventListener('click',()=>runQuery(input.value));input.addEventListener('keydown',e=>{if(e.key==='Enter')runQuery(input.value);});
document.querySelectorAll('#quickExamples button').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.q;runQuery(b.dataset.q);}));
document.querySelectorAll('#viewTabs button').forEach(b=>b.addEventListener('click',()=>{viewer.setView(b.dataset.view);setActiveView(b.dataset.view);}));
document.querySelector('#layersBtn').addEventListener('click',()=>{const p=document.querySelector('#layerPanel');p.hidden=!p.hidden;});
document.querySelectorAll('[data-system]').forEach(c=>c.addEventListener('change',async()=>{const t=c.dataset.system;viewer.setEnabled(t,c.checked);if(c.checked&&!viewer.systems[t]){status.textContent=`Loading ${SYSTEMS[t].label}…`;const s=await viewer.loadSystem(t);status.textContent=`Loaded ${SYSTEMS[t].label} · ${s.meshes.length} structures`;}}));
document.querySelector('#resetView').addEventListener('click',()=>{viewer.resetCamera();setActiveView('normal');result.innerHTML='<div class="empty-state">Reset. Type an action or structure.</div>';});

(async()=>{try{const c=await viewer.loadCore();status.textContent=`Anatomy loaded · ${c.muscles} muscles + ${c.bones} bones + ${c.organs} organ structures`;}catch(err){console.error(err);status.textContent='Could not load one or more anatomy layers';result.innerHTML='<div class="empty-state">The anatomy host did not load correctly. Try refreshing once.</div>';}})();
