import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Real muscle model, served by the verified open-source anatomy simulator.
const MUSCLE_MODEL_URL = 'https://drmurataltun.github.io/anatomi-simulatoru/systems/kas.glb';

const ROLE_COLORS = {
  contracting: new THREE.Color('#ff625d'),
  assisting: new THREE.Color('#f5b34f'),
  relaxing: new THREE.Color('#64a8ff')
};

const ACTIONS = [
  {
    id:'abdominal_hollowing', standard:'Abdominal hollowing',
    aliases:['suck tummy in','suck stomach in','pull stomach in','draw stomach in','hollow stomach','tighten deep abs','vacuum stomach'],
    requires:['stomach','tummy','belly','abs','abdominal','vacuum','suck'],
    structures:[
      S('Transversus abdominis','contracting',['transversus abdominis','transverse abdominis'],'Deep abdominal wall draws the abdominal contents inward.'),
      S('Internal oblique','assisting',['internal oblique','obliquus internus abdominis'],'Assists abdominal compression and trunk control.')
    ]
  },
  {
    id:'mouth_open', standard:'Mandibular depression (open mouth)',
    aliases:['open mouth','open my mouth','drop jaw','open jaw'], requires:['mouth','jaw','open'],
    structures:[
      S('Lateral pterygoid','contracting',['lateral pterygoid','pterygoideus lateralis'],'Assists mandibular depression and translation.'),
      S('Digastric','assisting',['digastric'],'Assists depression of the mandible when the hyoid is stabilized.'),
      S('Masseter','relaxing',['masseter'],'Jaw-closing muscle reduces activity/lengthens during opening.'),
      S('Temporalis','relaxing',['temporalis'],'Jaw-closing muscle reduces activity/lengthens during opening.')
    ]
  },
  {
    id:'elbow_flexion', standard:'Elbow flexion', aliases:['bend elbow','bend my elbow','curl arm','curl my arm'], requires:['elbow','bend','curl'], sideAware:true,
    structures:[
      S('Biceps brachii','contracting',['biceps brachii'],'Major elbow flexor, especially with the forearm supinated.'),
      S('Brachialis','contracting',['brachialis'],'Strong elbow flexor in any forearm position.'),
      S('Brachioradialis','assisting',['brachioradialis'],'Assists elbow flexion, strongest near neutral forearm rotation.'),
      S('Triceps brachii','relaxing',['triceps brachii'],'Primary elbow extensor lengthens as the elbow flexes.')
    ]
  },
  {
    id:'arm_tense', standard:'Tense/show the arm muscles', aliases:['tense arm','flex bicep','flex biceps','show bicep','show muscles'], requires:['flex','arm','bicep'], sideAware:true,
    structures:[
      S('Biceps brachii','contracting',['biceps brachii'],'Tenses visibly at the front of the upper arm.'),
      S('Brachialis','assisting',['brachialis'],'Deep elbow flexor contributes to arm tension.'),
      S('Triceps brachii','assisting',['triceps brachii'],'Can co-contract to stiffen the elbow during a pose.')
    ]
  },
  {
    id:'shoulder_flexion', standard:'Shoulder flexion (raise arm forward)', aliases:['raise arm forward','lift arm forward','raise my arm'], requires:['raise','lift','arm','shoulder'], sideAware:true,
    structures:[
      S('Anterior deltoid','contracting',['deltoid anterior','anterior deltoid','deltoid'],'Primary shoulder flexor through much of the motion.'),
      S('Pectoralis major, clavicular head','assisting',['pectoralis major','clavicular'],'Assists shoulder flexion.'),
      S('Latissimus dorsi','relaxing',['latissimus dorsi'],'Shoulder extensor lengthens as the arm flexes forward.')
    ]
  },
  {
    id:'head_turn_left', standard:'Cervical rotation left', aliases:['turn head left','look left','rotate neck left'], requires:['head','neck','left','turn','look'],
    structures:[
      S('Right sternocleidomastoid','contracting',['sternocleidomastoid'], 'Right SCM contributes to rotating the face left.', 'right'),
      S('Left splenius capitis','contracting',['splenius capitis'], 'Left splenius contributes to same-side rotation.', 'left'),
      S('Left semispinalis capitis','assisting',['semispinalis capitis'], 'Deep posterior neck stabilizer/rotator.', 'left')
    ]
  },
  {
    id:'head_turn_right', standard:'Cervical rotation right', aliases:['turn head right','look right','rotate neck right'], requires:['head','neck','right','turn','look'],
    structures:[
      S('Left sternocleidomastoid','contracting',['sternocleidomastoid'], 'Left SCM contributes to rotating the face right.', 'left'),
      S('Right splenius capitis','contracting',['splenius capitis'], 'Right splenius contributes to same-side rotation.', 'right'),
      S('Right semispinalis capitis','assisting',['semispinalis capitis'], 'Deep posterior neck stabilizer/rotator.', 'right')
    ]
  },
  {
    id:'shoulder_shrug', standard:'Scapular elevation (shrug)', aliases:['shrug','shrug shoulders','lift shoulders'], requires:['shrug','shoulder'],
    structures:[S('Upper trapezius','contracting',['trapezius'],'Elevates and upwardly rotates the scapula.'),S('Levator scapulae','contracting',['levator scapulae'],'Elevates the scapula.'),S('Serratus anterior','assisting',['serratus anterior'],'Assists scapular control during elevation.')]
  },
  {
    id:'scapular_retraction', standard:'Scapular retraction', aliases:['pull shoulders back','shoulders backward','pinch shoulder blades','squeeze shoulder blades'], requires:['shoulder','back','pinch','blade'],
    structures:[S('Middle trapezius','contracting',['trapezius'],'Retracts the scapula.'),S('Rhomboids','contracting',['rhomboid major','rhomboid minor'],'Retract and stabilize the scapula.'),S('Pectoralis minor','relaxing',['pectoralis minor'],'Anterior scapular muscle lengthens as the shoulder girdle retracts.')]
  },
  {
    id:'glute_squeeze', standard:'Gluteal isometric contraction', aliases:['squeeze butt','clench butt','tighten glutes','squeeze glutes'], requires:['butt','glute','squeeze','clench'],
    structures:[S('Gluteus maximus','contracting',['gluteus maximus'],'Produces strong hip extension force and can contract isometrically.'),S('Gluteus medius','assisting',['gluteus medius'],'Helps stabilize the pelvis.')]
  },
  {
    id:'toe_curl', standard:'Toe flexion', aliases:['curl toes','scrunch toes','bend toes'], requires:['toe','curl','scrunch'],
    structures:[S('Flexor digitorum longus','contracting',['flexor digitorum longus'],'Flexes the lateral four toes.'),S('Flexor hallucis longus','contracting',['flexor hallucis longus'],'Flexes the big toe.'),S('Intrinsic foot flexors','assisting',['flexor digitorum brevis'],'Assist toe flexion and arch control.')]
  },
  {
    id:'deep_inhale', standard:'Deep inspiration', aliases:['deep breath','breathe in','inhale deeply','take a deep breath'], requires:['breath','inhale','breathe'],
    structures:[S('Diaphragm','contracting',['diaphragm'],'Descends to increase thoracic volume.'),S('External intercostals','contracting',['external intercostal','intercostal'],'Elevate ribs and expand the chest.'),S('Sternocleidomastoid','assisting',['sternocleidomastoid'],'Can assist during a large or labored inspiration.')]
  },
  {
    id:'cough', standard:'Cough / forced expiration', aliases:['cough','cough hard'], requires:['cough'],
    structures:[S('Abdominal wall','contracting',['rectus abdominis','external oblique','internal oblique','transversus abdominis'],'Raises intra-abdominal pressure for forceful expiration.'),S('Internal intercostals','contracting',['internal intercostal'],'Assist forceful expiration.'),S('Diaphragm','relaxing',['diaphragm'],'Recoil/relaxation accompanies expiration after the inspiratory phase.')]
  }
];

function S(label, role, meshTerms, explain, side=null){ return {label,role,meshTerms,explain,side}; }
const norm = s => (s||'').toLowerCase().replace(/[._-]/g,' ').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const hasWord = (txt,w) => norm(txt).includes(norm(w));

class AnatomyViewer {
  constructor(el){
    this.el=el; this.scene=new THREE.Scene(); this.scene.background=null;
    this.camera=new THREE.PerspectiveCamera(34,1,.01,1000); this.camera.position.set(0,0.2,5.2);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true}); this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace; el.appendChild(this.renderer.domElement);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement); this.controls.enableDamping=true; this.controls.target.set(0,0,0);
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x333844,2.2));
    const key=new THREE.DirectionalLight(0xffffff,2.1); key.position.set(4,6,5); this.scene.add(key);
    const rim=new THREE.DirectionalLight(0x8ca8ff,1.1); rim.position.set(-4,2,-5); this.scene.add(rim);
    this.root=new THREE.Group(); this.scene.add(this.root); this.meshes=[]; this.fadeOthers=true;
    this.resizeObserver=new ResizeObserver(()=>this.resize()); this.resizeObserver.observe(el); this.resize(); this.animate();
  }
  async load(){
    const loader=new GLTFLoader();
    const gltf=await loader.loadAsync(MUSCLE_MODEL_URL);
    const json=gltf.parser.json, assoc=gltf.parser.associations;
    const originalName=(obj)=>{const a=assoc.get(obj); return (a&&a.nodes!==undefined&&json.nodes[a.nodes]?.name)||obj.name||''};
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(obj=>{
      if(!obj.isMesh) return;
      obj.userData.anatomyName=originalName(obj);
      obj.material=new THREE.MeshStandardMaterial({color:0x8f473f,roughness:.58,metalness:.02,transparent:true,opacity:1,side:THREE.DoubleSide});
      this.meshes.push(obj);
    });
    this.root.add(gltf.scene); this.fitToObject(gltf.scene,1.25);
    return this.meshes.map(m=>m.userData.anatomyName);
  }
  resetHighlight(){
    this.meshes.forEach(m=>{m.material.color.set('#8f473f');m.material.emissive.set('#000000');m.material.emissiveIntensity=0;m.material.opacity=1;});
  }
  highlight(structures){
    this.resetHighlight(); const matched=[]; const active=new Set();
    for(const st of structures){
      const hits=this.findMeshes(st.meshTerms,st.side);
      hits.forEach(m=>{active.add(m);m.material.color.copy(ROLE_COLORS[st.role]);m.material.emissive.copy(ROLE_COLORS[st.role]);m.material.emissiveIntensity=.18;m.material.opacity=1;});
      matched.push({structure:st,hits});
    }
    if(this.fadeOthers && active.size){this.meshes.forEach(m=>{if(!active.has(m))m.material.opacity=.11;});}
    const hitMeshes=[...active]; if(hitMeshes.length)this.fitMeshes(hitMeshes,1.8);
    return matched;
  }
  findMeshes(terms,side){
    return this.meshes.filter(m=>{
      const n=norm(m.userData.anatomyName);
      const termHit=terms.some(t=>n.includes(norm(t)));
      if(!termHit)return false;
      if(!side)return true;
      const raw=(m.userData.anatomyName||'').toLowerCase();
      if(side==='left') return /\.l\b|\bleft\b/.test(raw) || / l$/.test(n);
      if(side==='right') return /\.r\b|\bright\b/.test(raw) || / r$/.test(n);
      return true;
    });
  }
  fitMeshes(meshes,pad=1.5){ const g=new THREE.Group(); meshes.forEach(m=>g.add(m.clone())); this.fitToObject(g,pad); }
  fitToObject(obj,pad=1.3){
    const box=new THREE.Box3().setFromObject(obj); if(box.isEmpty())return; const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    const max=Math.max(size.x,size.y,size.z); const dist=(max/2)/Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2))*pad;
    const dir=new THREE.Vector3(0,0,1); this.controls.target.copy(center); this.camera.position.copy(center).add(dir.multiplyScalar(dist)); this.camera.near=Math.max(.001,dist/100); this.camera.far=dist*100; this.camera.updateProjectionMatrix(); this.controls.update();
  }
  resize(){const w=this.el.clientWidth,h=this.el.clientHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix()}
  animate(){requestAnimationFrame(()=>this.animate());this.controls.update();this.renderer.render(this.scene,this.camera)}
}

function sideFromText(q){q=norm(q); if(/\b(left|lhs)\b/.test(q))return'left'; if(/\b(right|rhs)\b/.test(q))return'right'; return null;}
function scoreAction(q,a){
  const n=norm(q); let score=0;
  for(const al of a.aliases){ const na=norm(al); if(n===na)score+=100; else if(n.includes(na)||na.includes(n))score+=45; }
  for(const k of a.requires){ if(hasWord(n,k))score+=8; }
  return score;
}
function cloneForSide(action,side){
  const copy=structuredClone(action); if(action.sideAware&&side){ copy.standard += ` — ${side}`; copy.structures.forEach(s=>s.side=side); }
  return copy;
}
function interpretSegment(segment){
  const q=norm(segment); const side=sideFromText(q);
  // Everyday "flex arm" is genuinely ambiguous. Ask instead of silently choosing.
  if(/\bflex\b/.test(q)&&/\b(arm|bicep|biceps)\b/.test(q) && !/\b(elbow|bend|raise|forward|show|tense)\b/.test(q)){
    return {ambiguity:{text:'When you say “flex your arm,” what do you mean?', choices:[
      {label:'Tense/show the arm',query:`tense ${side||''} arm`},
      {label:'Bend the elbow',query:`bend ${side||''} elbow`},
      {label:'Raise the arm forward',query:`raise ${side||''} arm forward`}
    ]}};
  }
  const ranked=ACTIONS.map(a=>({a,score:scoreAction(q,a)})).sort((x,y)=>y.score-x.score);
  if(ranked[0].score>=16)return {action:cloneForSide(ranked[0].a,side)};
  return {unknown:segment};
}
function interpret(q){
  const parts=q.split(/\b(?:and|while|then)\b|[,;+]/i).map(s=>s.trim()).filter(Boolean);
  const out=[]; for(const p of parts){const r=interpretSegment(p);if(r.ambiguity)return r;out.push(r)} return {results:out};
}

const viewer=new AnatomyViewer(document.getElementById('viewer'));
const statusEl=document.getElementById('modelStatus');
viewer.load().then(names=>statusEl.textContent=`Real 3D muscle model loaded · ${names.length} named meshes`).catch(err=>{console.error(err);statusEl.textContent='3D model could not load. Check internet/CORS and run through HTTP.'});

const input=document.getElementById('actionInput'), resultPanel=document.getElementById('resultPanel'), clarifier=document.getElementById('clarifier');
function runQuery(q){ input.value=q; clarifier.hidden=true; const parsed=interpret(q);
  if(parsed.ambiguity){showClarifier(parsed.ambiguity);return;}
  const actions=parsed.results.filter(x=>x.action).map(x=>x.action); const unknown=parsed.results.filter(x=>x.unknown).map(x=>x.unknown);
  const allStructures=actions.flatMap(a=>a.structures); const mapped=viewer.highlight(allStructures); render(actions,unknown,mapped);
}
function showClarifier(a){ clarifier.innerHTML=`<strong>${a.text}</strong><div class="choices"></div>`; const c=clarifier.querySelector('.choices'); a.choices.forEach(x=>{const b=document.createElement('button');b.textContent=x.label;b.onclick=()=>runQuery(x.query);c.appendChild(b)}); clarifier.hidden=false; }
function render(actions,unknown,mapped){
  if(!actions.length){resultPanel.innerHTML=`<div class="empty-state">I couldn't confidently translate <strong>${escapeHtml(unknown.join(', '))}</strong> into a standardized anatomical action yet. The architecture keeps language interpretation separate from the anatomy model, so an AI interpreter can be plugged in later without rebuilding the 3D viewer.</div>`;return;}
  let mi=0; resultPanel.innerHTML=actions.map(a=>{
    const rows=a.structures.map(s=>{const m=mapped[mi++]; const miss=m&&m.hits.length===0?`<div class="model-miss">No exact mesh-name match found in this GLB yet.</div>`:'';return `<div class="structure"><div><div class="structure-name">${escapeHtml(s.label)}</div><div class="structure-explain">${escapeHtml(s.explain)}</div>${miss}</div><span class="role ${s.role}">${s.role}</span></div>`}).join('');
    return `<article class="action-card"><div class="action-title"><div><h2>${escapeHtml(a.standard)}</h2><div class="standard-name">Interpreted anatomical action</div></div></div><div class="structure-list">${rows}</div></article>`;
  }).join('') + (unknown.length?`<div class="empty-state">Also couldn't confidently interpret: ${escapeHtml(unknown.join(', '))}</div>`:'');
}
function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}

document.getElementById('goBtn').onclick=()=>runQuery(input.value.trim()); input.addEventListener('keydown',e=>{if(e.key==='Enter')runQuery(input.value.trim())});
document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>runQuery(b.dataset.q));
document.getElementById('fadeToggle').onclick=e=>{viewer.fadeOthers=!viewer.fadeOthers;e.currentTarget.textContent=`Fade others: ${viewer.fadeOthers?'on':'off'}`; if(input.value.trim())runQuery(input.value.trim());};
document.getElementById('resetView').onclick=()=>{viewer.resetHighlight(); if(viewer.root.children[0])viewer.fitToObject(viewer.root.children[0],1.25)};
