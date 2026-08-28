import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const MODEL_URLS = {
  muscles: 'https://drmurataltun.github.io/anatomi-simulatoru/systems/kas.glb',
  skeleton: 'https://drmurataltun.github.io/anatomi-simulatoru/systems/iskelet.glb'
};

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
      S('Right sternocleidomastoid','contracting',['sternocleidomastoid'],'Right SCM contributes to rotating the face left.','right'),
      S('Left splenius capitis','contracting',['splenius capitis'],'Left splenius contributes to same-side rotation.','left'),
      S('Left semispinalis capitis','assisting',['semispinalis capitis'],'Deep posterior neck stabilizer/rotator.','left')
    ]
  },
  {
    id:'head_turn_right', standard:'Cervical rotation right', aliases:['turn head right','look right','rotate neck right'], requires:['head','neck','right','turn','look'],
    structures:[
      S('Left sternocleidomastoid','contracting',['sternocleidomastoid'],'Left SCM contributes to rotating the face right.','left'),
      S('Right splenius capitis','contracting',['splenius capitis'],'Right splenius contributes to same-side rotation.','right'),
      S('Right semispinalis capitis','assisting',['semispinalis capitis'],'Deep posterior neck stabilizer/rotator.','right')
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
const clamp01 = n => Math.max(0,Math.min(1,n));

class AnatomyViewer {
  constructor(el){
    this.el=el;
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(34,1,.01,1000);
    this.camera.position.set(0,0.2,5.2);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    el.appendChild(this.renderer.domElement);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.enableDamping=true;
    this.controls.target.set(0,0,0);
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x333844,2.2));
    const key=new THREE.DirectionalLight(0xffffff,2.1); key.position.set(4,6,5); this.scene.add(key);
    const rim=new THREE.DirectionalLight(0x8ca8ff,1.1); rim.position.set(-4,2,-5); this.scene.add(rim);
    this.root=new THREE.Group(); this.scene.add(this.root);
    this.muscleMeshes=[]; this.boneMeshes=[]; this.allMeshes=[];
    this.fadeOthers=true;
    this.motion=null; this.motionPlaying=true; this.motionStart=performance.now();
    this.bounds=null;
    this.resizeObserver=new ResizeObserver(()=>this.resize()); this.resizeObserver.observe(el);
    this.resize(); this.animate();
  }

  async load(){
    const [muscles,skeleton]=await Promise.all([
      this.loadSystem(MODEL_URLS.muscles,'muscle'),
      this.loadSystem(MODEL_URLS.skeleton,'bone')
    ]);
    this.root.add(muscles.scene,skeleton.scene);
    this.allMeshes=[...this.muscleMeshes,...this.boneMeshes];
    this.root.updateMatrixWorld(true);
    this.bounds=new THREE.Box3().setFromObject(this.root);
    this.fitToObject(this.root,1.25);
    return {muscles:this.muscleMeshes.length,bones:this.boneMeshes.length,total:this.allMeshes.length};
  }

  async loadSystem(url,type){
    const loader=new GLTFLoader();
    const gltf=await loader.loadAsync(url);
    const json=gltf.parser.json, assoc=gltf.parser.associations;
    const originalName=(obj)=>{const a=assoc.get(obj); return (a&&a.nodes!==undefined&&json.nodes[a.nodes]?.name)||obj.name||''};
    gltf.scene.traverse(obj=>{
      if(!obj.isMesh) return;
      obj.userData.anatomyName=originalName(obj);
      obj.userData.system=type;
      obj.userData.original={
        parent:obj.parent,
        position:obj.position.clone(),
        quaternion:obj.quaternion.clone(),
        scale:obj.scale.clone()
      };
      if(type==='muscle'){
        obj.material=new THREE.MeshStandardMaterial({color:0x8f473f,roughness:.58,metalness:.02,transparent:true,opacity:1,side:THREE.DoubleSide});
        this.muscleMeshes.push(obj);
      } else {
        obj.material=new THREE.MeshStandardMaterial({color:0xd8d0bc,roughness:.72,metalness:.0,transparent:true,opacity:.34,side:THREE.DoubleSide});
        this.boneMeshes.push(obj);
      }
    });
    return gltf;
  }

  resetHighlight(){
    this.muscleMeshes.forEach(m=>{
      m.material.color.set('#8f473f'); m.material.emissive.set('#000000'); m.material.emissiveIntensity=0; m.material.opacity=1;
    });
    this.boneMeshes.forEach(m=>{m.material.color.set('#d8d0bc');m.material.emissive.set('#000000');m.material.opacity=.34;});
  }

  highlight(structures){
    this.resetHighlight();
    const matched=[]; const active=new Set();
    for(const st of structures){
      const hits=this.findMeshes(st.meshTerms,st.side,'muscle');
      hits.forEach(m=>{
        active.add(m);
        m.material.color.copy(ROLE_COLORS[st.role]);
        m.material.emissive.copy(ROLE_COLORS[st.role]);
        m.material.emissiveIntensity=.18;
        m.material.opacity=1;
      });
      matched.push({structure:st,hits});
    }
    if(this.fadeOthers && active.size){
      this.muscleMeshes.forEach(m=>{if(!active.has(m))m.material.opacity=.10;});
      this.boneMeshes.forEach(m=>m.material.opacity=.16);
    }
    const hitMeshes=[...active]; if(hitMeshes.length)this.fitMeshes(hitMeshes,1.8);
    return matched;
  }

  findMeshes(terms,side,system=null){
    const pool=system==='bone'?this.boneMeshes:system==='muscle'?this.muscleMeshes:this.allMeshes;
    return pool.filter(m=>{
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

  getMeshCenter(mesh){
    const box=new THREE.Box3().setFromObject(mesh);
    return box.getCenter(new THREE.Vector3());
  }
  normalizedCenter(mesh){
    const c=this.getMeshCenter(mesh), b=this.bounds, sz=b.getSize(new THREE.Vector3());
    return {x:(c.x-b.min.x)/sz.x,y:(c.y-b.min.y)/sz.y,z:(c.z-b.min.z)/sz.z,world:c};
  }
  sideXSign(side){
    const hits=this.findMeshes(['biceps brachii'],side,'muscle');
    if(hits.length){return Math.sign(this.getMeshCenter(hits[0]).x)||1;}
    return side==='right'?-1:1;
  }

  resetMotion(){
    if(this.motion?.groups){
      for(const g of this.motion.groups){
        for(const item of g.items){
          const {mesh,parent,position,quaternion,scale}=item;
          if(parent) parent.attach(mesh);
          mesh.position.copy(position); mesh.quaternion.copy(quaternion); mesh.scale.copy(scale);
        }
        this.scene.remove(g.pivot);
      }
    }
    if(this.motion?.scales){
      for(const s of this.motion.scales){s.mesh.scale.copy(s.scale);s.mesh.position.copy(s.position);}
    }
    this.motion=null;
  }

  makePivotGroup(meshes,pivotPoint){
    const pivot=new THREE.Group();
    pivot.position.copy(pivotPoint);
    this.scene.add(pivot);
    const items=[];
    for(const mesh of [...new Set(meshes)]){
      if(!mesh?.parent)continue;
      items.push({mesh,parent:mesh.parent,position:mesh.position.clone(),quaternion:mesh.quaternion.clone(),scale:mesh.scale.clone()});
      pivot.attach(mesh);
    }
    return {pivot,items};
  }

  selectByRegion(test){ return this.allMeshes.filter(m=>test(this.normalizedCenter(m),m)); }

  prepareMotion(action){
    this.resetMotion();
    if(!action || !this.bounds)return false;
    const size=this.bounds.getSize(new THREE.Vector3()), center=this.bounds.getCenter(new THREE.Vector3());
    const groups=[]; const scales=[]; const side=action.structures.find(s=>s.side)?.side || /— (left|right)/.exec(action.standard)?.[1] || null;
    const sign=side?this.sideXSign(side):0;
    const topY=this.bounds.min.y+size.y;

    if(action.id==='head_turn_left' || action.id==='head_turn_right'){
      const meshes=this.selectByRegion((c)=>c.y>.82);
      const pivot=new THREE.Vector3(center.x,this.bounds.min.y+size.y*.81,center.z);
      groups.push({...this.makePivotGroup(meshes,pivot), kind:'rotateY', amount:THREE.MathUtils.degToRad(action.id==='head_turn_left'?42:-42)});
    }
    else if(action.id==='mouth_open'){
      let meshes=[...this.findMeshes(['mandible','mandibula'],'', 'bone'),...this.findMeshes(['digastric','mylohyoid','geniohyoid','lateral pterygoid'],'','muscle')];
      if(meshes.length<2){
        meshes=this.selectByRegion((c)=>c.y>.81 && c.y<.89 && c.z>.48);
      }
      const jawCenter=meshes.length?new THREE.Box3().setFromObject(meshes[0]).getCenter(new THREE.Vector3()):new THREE.Vector3(center.x,topY-size.y*.13,center.z);
      const pivot=new THREE.Vector3(center.x,jawCenter.y+size.y*.015,center.z-size.z*.01);
      groups.push({...this.makePivotGroup(meshes,pivot), kind:'rotateXTranslate', amount:THREE.MathUtils.degToRad(-18), dy:-size.y*.008});
    }
    else if(action.id==='elbow_flexion' && side){
      const meshes=this.selectByRegion((c)=>Math.sign(c.world.x)===sign && Math.abs(c.world.x)>size.x*.09 && c.y>.34 && c.y<.63);
      const sideMeshes=this.findMeshes(['brachioradialis'],side,'muscle');
      const elbowY=sideMeshes.length?this.getMeshCenter(sideMeshes[0]).y+size.y*.025:this.bounds.min.y+size.y*.57;
      const x=sideMeshes.length?this.getMeshCenter(sideMeshes[0]).x:sign*size.x*.30;
      const pivot=new THREE.Vector3(x,elbowY,center.z);
      groups.push({...this.makePivotGroup(meshes,pivot), kind:'rotateX', amount:THREE.MathUtils.degToRad(-105)});
    }
    else if(action.id==='shoulder_flexion' && side){
      const meshes=this.selectByRegion((c)=>Math.sign(c.world.x)===sign && Math.abs(c.world.x)>size.x*.10 && c.y>.40 && c.y<.79);
      const x=sign*size.x*.31+center.x;
      const pivot=new THREE.Vector3(x,this.bounds.min.y+size.y*.77,center.z);
      groups.push({...this.makePivotGroup(meshes,pivot), kind:'rotateX', amount:THREE.MathUtils.degToRad(-75)});
    }
    else if(action.id==='abdominal_hollowing'){
      const abdomen=this.muscleMeshes.filter(m=>{const c=this.normalizedCenter(m);return c.y>.43&&c.y<.68&&Math.abs(c.world.x-center.x)<size.x*.30;});
      for(const mesh of abdomen){scales.push({mesh,scale:mesh.scale.clone(),position:mesh.position.clone(),kind:'hollow'});}
    }
    else if(action.id==='arm_tense'){
      const targetSide=side||'right';
      const muscles=[...this.findMeshes(['biceps brachii'],targetSide,'muscle'),...this.findMeshes(['brachialis'],targetSide,'muscle')];
      for(const mesh of muscles){scales.push({mesh,scale:mesh.scale.clone(),position:mesh.position.clone(),kind:'bulge'});}
    }
    else if(action.id==='glute_squeeze'){
      const muscles=this.findMeshes(['gluteus maximus'],'','muscle');
      for(const mesh of muscles){scales.push({mesh,scale:mesh.scale.clone(),position:mesh.position.clone(),kind:'glute'});}
    }
    else if(action.id==='deep_inhale'){
      const thorax=this.allMeshes.filter(m=>{const c=this.normalizedCenter(m);return c.y>.62&&c.y<.80&&Math.abs(c.world.x-center.x)<size.x*.30;});
      for(const mesh of thorax){scales.push({mesh,scale:mesh.scale.clone(),position:mesh.position.clone(),kind:'inhale'});}
    }
    else if(action.id==='cough'){
      const torso=this.muscleMeshes.filter(m=>{const c=this.normalizedCenter(m);return c.y>.44&&c.y<.78&&Math.abs(c.world.x-center.x)<size.x*.31;});
      for(const mesh of torso){scales.push({mesh,scale:mesh.scale.clone(),position:mesh.position.clone(),kind:'cough'});}
    }
    else if(action.id==='shoulder_shrug'){
      const shoulders=this.selectByRegion((c)=>c.y>.68&&c.y<.80&&Math.abs(c.world.x-center.x)>size.x*.10);
      const pivot=new THREE.Vector3(center.x,this.bounds.min.y+size.y*.72,center.z);
      groups.push({...this.makePivotGroup(shoulders,pivot), kind:'translateY', dy:size.y*.022});
    }

    if(!groups.length && !scales.length)return false;
    this.motion={actionId:action.id,groups,scales};
    this.motionStart=performance.now(); this.motionPlaying=true;
    return true;
  }

  applyMotion(progress){
    if(!this.motion)return;
    const p=clamp01(progress);
    for(const g of this.motion.groups){
      g.pivot.rotation.set(0,0,0); g.pivot.position.y=g.pivot.userData.baseY ?? g.pivot.position.y;
      if(g.pivot.userData.baseY===undefined)g.pivot.userData.baseY=g.pivot.position.y;
      if(g.kind==='rotateY')g.pivot.rotation.y=g.amount*p;
      if(g.kind==='rotateX')g.pivot.rotation.x=g.amount*p;
      if(g.kind==='rotateXTranslate'){g.pivot.rotation.x=g.amount*p;g.pivot.position.y=g.pivot.userData.baseY+g.dy*p;}
      if(g.kind==='translateY')g.pivot.position.y=g.pivot.userData.baseY+g.dy*p;
    }
    for(const s of this.motion.scales){
      s.mesh.scale.copy(s.scale); s.mesh.position.copy(s.position);
      if(s.kind==='hollow'){
        s.mesh.scale.x=s.scale.x*(1-.05*p);
        s.mesh.scale.z=s.scale.z*(1-.28*p);
      } else if(s.kind==='bulge'){
        s.mesh.scale.x=s.scale.x*(1+.08*p); s.mesh.scale.z=s.scale.z*(1+.08*p); s.mesh.scale.y=s.scale.y*(1-.03*p);
      } else if(s.kind==='glute'){
        s.mesh.scale.x=s.scale.x*(1+.05*p); s.mesh.scale.z=s.scale.z*(1+.10*p);
      } else if(s.kind==='inhale'){
        s.mesh.scale.x=s.scale.x*(1+.035*p); s.mesh.scale.z=s.scale.z*(1+.055*p);
      } else if(s.kind==='cough'){
        s.mesh.scale.x=s.scale.x*(1-.025*p); s.mesh.scale.z=s.scale.z*(1-.055*p);
      }
    }
  }

  toggleMotion(){this.motionPlaying=!this.motionPlaying; if(this.motionPlaying)this.motionStart=performance.now(); return this.motionPlaying;}
  replayMotion(){this.motionPlaying=true;this.motionStart=performance.now();}

  fitMeshes(meshes,pad=1.5){
    const box=new THREE.Box3(); meshes.forEach(m=>box.expandByObject(m)); this.fitBox(box,pad);
  }
  fitToObject(obj,pad=1.3){this.fitBox(new THREE.Box3().setFromObject(obj),pad);}
  fitBox(box,pad=1.3){
    if(box.isEmpty())return;
    const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
    const max=Math.max(size.x,size.y,size.z); const dist=(max/2)/Math.tan(THREE.MathUtils.degToRad(this.camera.fov/2))*pad;
    const dir=new THREE.Vector3(0,0,1);
    this.controls.target.copy(center); this.camera.position.copy(center).add(dir.multiplyScalar(dist));
    this.camera.near=Math.max(.001,dist/100); this.camera.far=dist*100; this.camera.updateProjectionMatrix(); this.controls.update();
  }
  resize(){const w=this.el.clientWidth,h=this.el.clientHeight;this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  animate(now=performance.now()){
    requestAnimationFrame(t=>this.animate(t));
    if(this.motion&&this.motionPlaying){
      const sec=(now-this.motionStart)/1000;
      const p=(1-Math.cos((sec/2.8)*Math.PI*2))/2;
      this.applyMotion(p);
    }
    this.controls.update(); this.renderer.render(this.scene,this.camera);
  }
}

function sideFromText(q){q=norm(q); if(/\b(left|lhs)\b/.test(q))return'left'; if(/\b(right|rhs)\b/.test(q))return'right'; return null;}
function scoreAction(q,a){
  const n=norm(q); let score=0;
  for(const al of a.aliases){const na=norm(al);if(n===na)score+=100;else if(n.includes(na)||na.includes(n))score+=45;}
  for(const k of a.requires){if(hasWord(n,k))score+=8;}
  return score;
}
function cloneForSide(action,side){
  const copy=structuredClone(action);
  if(action.sideAware&&side){copy.standard+=` — ${side}`;copy.structures.forEach(s=>s.side=side);}
  return copy;
}
function interpretSegment(segment){
  const q=norm(segment); const side=sideFromText(q);
  if(/\bflex\b/.test(q)&&/\b(arm|bicep|biceps)\b/.test(q)&&!/\b(elbow|bend|raise|forward|show|tense)\b/.test(q)){
    return {ambiguity:{text:'When you say “flex your arm,” what do you mean?',choices:[
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
  const out=[];for(const p of parts){const r=interpretSegment(p);if(r.ambiguity)return r;out.push(r);}return {results:out};
}

const viewer=new AnatomyViewer(document.getElementById('viewer'));
const statusEl=document.getElementById('modelStatus');
const toolbar=document.querySelector('.viewer-toolbar');
const motionBtn=document.createElement('button');
motionBtn.id='motionToggle'; motionBtn.className='small-btn'; motionBtn.textContent='Pause motion'; motionBtn.hidden=true;
toolbar.appendChild(motionBtn);

viewer.load().then(counts=>{
  statusEl.textContent=`Live anatomy loaded · ${counts.muscles} muscles + ${counts.bones} bones`;
}).catch(err=>{console.error(err);statusEl.textContent='3D anatomy could not load. Refresh and check internet.';});

const input=document.getElementById('actionInput'), resultPanel=document.getElementById('resultPanel'), clarifier=document.getElementById('clarifier');
function runQuery(q){
  if(!q)return;
  input.value=q; clarifier.hidden=true; const parsed=interpret(q);
  if(parsed.ambiguity){showClarifier(parsed.ambiguity);return;}
  const actions=parsed.results.filter(x=>x.action).map(x=>x.action); const unknown=parsed.results.filter(x=>x.unknown).map(x=>x.unknown);
  const allStructures=actions.flatMap(a=>a.structures); const mapped=viewer.highlight(allStructures);
  const moving=viewer.prepareMotion(actions[0]);
  motionBtn.hidden=!moving; motionBtn.textContent='Pause motion';
  render(actions,unknown,mapped,moving);
}
function showClarifier(a){
  clarifier.innerHTML=`<strong>${a.text}</strong><div class="choices"></div>`;
  const c=clarifier.querySelector('.choices');
  a.choices.forEach(x=>{const b=document.createElement('button');b.textContent=x.label;b.onclick=()=>runQuery(x.query);c.appendChild(b);});
  clarifier.hidden=false;
}
function render(actions,unknown,mapped,moving){
  if(!actions.length){resultPanel.innerHTML=`<div class="empty-state">I couldn't confidently translate <strong>${escapeHtml(unknown.join(', '))}</strong> into a standardized anatomical action yet.</div>`;return;}
  let mi=0;
  resultPanel.innerHTML=(moving?`<div class="empty-state"><strong>Live motion preview is running.</strong> Drag the model while it moves. This version animates joint/body motion and uses simplified muscle deformation; it is not a biomechanics simulation.</div>`:'')+actions.map(a=>{
    const rows=a.structures.map(s=>{const m=mapped[mi++];const miss=m&&m.hits.length===0?`<div class="model-miss">No exact mesh-name match found in this GLB yet.</div>`:'';return `<div class="structure"><div><div class="structure-name">${escapeHtml(s.label)}</div><div class="structure-explain">${escapeHtml(s.explain)}</div>${miss}</div><span class="role ${s.role}">${s.role}</span></div>`;}).join('');
    return `<article class="action-card"><div class="action-title"><div><h2>${escapeHtml(a.standard)}</h2><div class="standard-name">Interpreted anatomical action</div></div></div><div class="structure-list">${rows}</div></article>`;
  }).join('')+(unknown.length?`<div class="empty-state">Also couldn't confidently interpret: ${escapeHtml(unknown.join(', '))}</div>`:'');
}
function escapeHtml(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

document.getElementById('goBtn').onclick=()=>runQuery(input.value.trim());
input.addEventListener('keydown',e=>{if(e.key==='Enter')runQuery(input.value.trim());});
document.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>runQuery(b.dataset.q));
document.getElementById('fadeToggle').onclick=e=>{viewer.fadeOthers=!viewer.fadeOthers;e.currentTarget.textContent=`Fade others: ${viewer.fadeOthers?'on':'off'}`;if(input.value.trim())runQuery(input.value.trim());};
document.getElementById('resetView').onclick=()=>{viewer.resetMotion();viewer.resetHighlight();motionBtn.hidden=true;if(viewer.root.children.length)viewer.fitToObject(viewer.root,1.25);};
motionBtn.onclick=()=>{const playing=viewer.toggleMotion();motionBtn.textContent=playing?'Pause motion':'Play motion';};
