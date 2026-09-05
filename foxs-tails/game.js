(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const titleScreen = document.getElementById('titleScreen');
  const startBtn = document.getElementById('startBtn');
  const continueBtn = document.getElementById('continueBtn');
  const dialogueBox = document.getElementById('dialogue');
  const speakerEl = document.getElementById('speaker');
  const dialogueText = document.getElementById('dialogueText');
  const hud = document.getElementById('hud');
  const objectiveEl = document.getElementById('objective');
  const ribbonCountEl = document.getElementById('ribbonCount');
  const berryCountEl = document.getElementById('berryCount');
  const scentStatus = document.getElementById('scentStatus');
  const touchControls = document.getElementById('touchControls');
  const toastEl = document.getElementById('toast');
  const muteBtn = document.getElementById('muteBtn');
  const locationBadge = document.getElementById('locationBadge');
  const mapTransition = document.getElementById('mapTransition');
  const mapTransitionTitle = document.getElementById('mapTransitionTitle');
  const mapTransitionSubtitle = document.getElementById('mapTransitionSubtitle');

  const SAVE_KEY = 'foxs-tails-save-v2';
  const OLD_SAVE_KEY = 'foxs-tails-save-v1';
  const keys = Object.create(null);
  const touch = { up:false, down:false, left:false, right:false, sprint:false };
  const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  if (isTouch) document.documentElement.classList.add('fox-touch');

  let DPR = 1;
  const VIEW = { w: 1280, h: 720 };
  let gameStarted = false;
  let paused = false;
  let transitionBusy = false;
  let transitionCooldown = 0;
  let lastTime = performance.now();
  let toastTimer = 0;
  let muted = false;
  let audioCtx = null;
  let currentDialogue = null;
  let dialogueQueue = [];
  let camera = { x:0, y:0 };
  let particles = [];
  let swishWaves = [];

  const player = {
    map:'village', x:520, y:780, r:23, speed:205,
    dir:'right', moving:false, walkT:0,
    ribbons:[], berries:0, questStage:0,
    scent:0, swish:0
  };

  const state = {
    gateOpen:false,
    pickedBerries:{},
    visited:{ village:true }
  };

  const ribbons = [
    {id:'sun', name:'Sun Ribbon', map:'village', x:805, y:465, color:'#ffd65a'},
    {id:'moss', name:'Moss Ribbon', map:'mosswood', x:690, y:520, color:'#78e08f'},
    {id:'moon', name:'Moon Ribbon', map:'shrine', x:840, y:1000, color:'#9fdcff'}
  ];

  const MAPS = {
    village: {
      name:'Bramblewick Village', subtitle:'lanterns, gardens & suspiciously useful levers',
      w:1800, h:1400, ground:'#607a45', path:'#9c875b', water:'#3e93a3',
      houses:[
        {x:260,y:190,w:290,h:220,roof:'#7b4731',wall:'#d7b579'},
        {x:610,y:170,w:250,h:190,roof:'#48674d',wall:'#c8b58b'},
        {x:280,y:950,w:310,h:220,roof:'#5f536d',wall:'#c7a980'},
        {x:1320,y:230,w:280,h:210,roof:'#7b4731',wall:'#d9bd83'}
      ],
      trees:[[110,150,52],[950,160,54],[1060,170,45],[1180,200,54],[1650,180,58],[120,520,48],[930,510,48],[1280,530,52],[1670,570,58],[150,980,54],[850,1110,54],[1200,1080,56],[1630,1110,60]],
      bushes:[{id:'v1',x:250,y:830},{id:'v2',x:760,y:520},{id:'v3',x:1510,y:850}],
      npcs:[
        {id:'rowan',name:'Elder Rowan',animal:'owl',x:590,y:760,color:'#dbc8a7'},
        {id:'pip',name:'Pip',animal:'hare',x:790,y:860,color:'#c9bba6'}
      ],
      signs:[
        {x:1050,y:690,text:'West: Mosswood. East: Moon Shrine Grove.'},
        {x:310,y:1240,text:'Mosswood trail. If the mushrooms glow back, mind your manners.'}
      ],
      portals:[
        {id:'to-moss',x:40,y:1020,w:100,h:250,to:'mosswood',spawn:{x:1650,y:760},label:'Mosswood Trail',dir:'left'},
        {id:'to-shrine',x:1660,y:500,w:100,h:360,to:'shrine',spawn:{x:180,y:720},label:'Moon Shrine Grove',dir:'right'}
      ],
      river:{x:1030,y:0,w:145,h:1400,bridgeY:680,bridgeH:170},
      gate:{x:1144,y:690,w:30,h:145}, lever:{x:975,y:760}
    },
    mosswood: {
      name:'Mosswood', subtitle:'old roots, blue mushrooms & fox-sized paths',
      w:1900, h:1400, ground:'#355f36', path:'#706845', water:null,
      houses:[],
      trees:[[100,120,70],[260,140,66],[420,110,74],[650,150,64],[880,130,72],[1120,120,68],[1380,150,74],[1640,130,65],[1800,170,68],[180,450,70],[420,500,74],[1020,450,72],[1260,500,70],[1580,470,74],[220,820,70],[460,900,68],[1050,860,78],[1380,830,68],[1700,900,76],[120,1240,70],[390,1210,68],[760,1260,74],[1130,1220,72],[1470,1250,72],[1790,1210,68]],
      bushes:[{id:'m1',x:520,y:780},{id:'m2',x:1180,y:620},{id:'m3',x:1450,y:1030}],
      npcs:[{id:'fern',name:'Fern',animal:'hare',x:980,y:680,color:'#b8c89e'}],
      signs:[{x:1650,y:730,text:'Bramblewick lies east. The deeper woods do not care where you meant to go.'}],
      portals:[{id:'to-village',x:1740,y:620,w:120,h:280,to:'village',spawn:{x:150,y:1130},label:'Bramblewick Village',dir:'right'}],
      river:null, gate:null, lever:null
    },
    shrine: {
      name:'Moon Shrine Grove', subtitle:'river mist, old stone & three waiting hollows',
      w:1700, h:1400, ground:'#54704c', path:'#8e7d58', water:'#417e91',
      houses:[],
      trees:[[180,140,62],[360,170,56],[610,140,62],[1040,160,60],[1420,150,68],[1580,240,58],[260,460,58],[580,500,62],[1080,520,68],[1510,560,64],[240,950,64],[530,1040,60],[1160,1040,68],[1490,1010,64],[340,1280,64],[760,1240,58],[1320,1250,70]],
      bushes:[{id:'s1',x:520,y:830},{id:'s2',x:1030,y:880},{id:'s3',x:1450,y:760}],
      npcs:[
        {id:'marlow',name:'Marlow',animal:'badger',x:420,y:700,color:'#8b8b8b'},
        {id:'ink',name:'Ink',animal:'crow',x:710,y:530,color:'#27323b'}
      ],
      signs:[{x:180,y:780,text:'Bramblewick west. Moon Shrine east.'}],
      portals:[{id:'to-village',x:20,y:610,w:120,h:300,to:'village',spawn:{x:1580,y:690},label:'Bramblewick Village',dir:'left'}],
      river:{x:900,y:0,w:150,h:1400,bridgeY:620,bridgeH:190}, gate:null, lever:null,
      shrine:{x:1360,y:410,r:80}
    }
  };

  function currentMap(){ return MAPS[player.map]; }
  function ribbonName(r){ return r.name; }

  function resizeCanvas(){
    DPR = Math.min(2, window.devicePixelRatio || 1);
    VIEW.w = Math.max(320, window.innerWidth);
    VIEW.h = Math.max(420, window.innerHeight);
    canvas.width = Math.round(VIEW.w * DPR);
    canvas.height = Math.round(VIEW.h * DPR);
    canvas.style.width = VIEW.w + 'px';
    canvas.style.height = VIEW.h + 'px';
    clampCamera(true);
  }
  window.addEventListener('resize', resizeCanvas, {passive:true});
  resizeCanvas();

  function resetGame(){
    player.map='village'; player.x=520; player.y=780; player.dir='right'; player.moving=false;
    player.ribbons=[]; player.berries=0; player.questStage=0; player.scent=0; player.swish=0;
    state.gateOpen=false; state.pickedBerries={}; state.visited={village:true};
    particles=[]; swishWaves=[]; camera={x:0,y:0};
    saveGame();
  }

  function saveGame(){
    if(!gameStarted) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      version:2,map:player.map,x:player.x,y:player.y,dir:player.dir,
      ribbons:player.ribbons,berries:player.berries,questStage:player.questStage,
      gateOpen:state.gateOpen,pickedBerries:state.pickedBerries,visited:state.visited
    }));
  }

  function loadGame(){
    try{
      let data=JSON.parse(localStorage.getItem(SAVE_KEY));
      if(!data){
        const old=JSON.parse(localStorage.getItem(OLD_SAVE_KEY));
        if(old) data={...old,map:'village',dir:'right',pickedBerries:{}};
      }
      if(!data) return false;
      player.map=MAPS[data.map]?data.map:'village';
      player.x=Number(data.x)||520; player.y=Number(data.y)||780;
      player.dir=['left','right','up','down'].includes(data.dir)?data.dir:'right';
      player.ribbons=Array.isArray(data.ribbons)?data.ribbons.filter(id=>['sun','moss','moon'].includes(id)):[];
      player.berries=Number(data.berries)||0; player.questStage=Number(data.questStage)||0;
      state.gateOpen=!!data.gateOpen;
      state.pickedBerries=data.pickedBerries && !Array.isArray(data.pickedBerries) ? data.pickedBerries : {};
      state.visited=data.visited||{village:true};
      player.x=clamp(player.x,player.r,currentMap().w-player.r);
      player.y=clamp(player.y,player.r,currentMap().h-player.r);
      return true;
    }catch(_){ return false; }
  }

  function begin(continueSave){
    gameStarted=true; paused=false;
    const loaded=continueSave && loadGame();
    if(!loaded) resetGame();
    titleScreen.classList.add('hidden'); hud.classList.remove('hidden'); locationBadge.classList.remove('hidden');
    if(isTouch) touchControls.classList.remove('hidden');
    updateHud(); showLocation(); clampCamera(true);
    if(!loaded || player.questStage===0){
      showDialogue('Saffron',[
        'The storm is gone... and my three moon-ribbons are scattered across three different places.',
        'Elder Rowan is waiting under the lantern tree. My nose says this is going to become a whole thing.'
      ]);
    }
  }

  function updateHud(){
    ribbonCountEl.textContent=`${player.ribbons.length}/3`; berryCountEl.textContent=player.berries;
    let text='Speak to Elder Rowan in Bramblewick Village.';
    if(player.questStage===1){
      const missing=ribbons.filter(r=>!player.ribbons.includes(r.id));
      text=`Recover the moon-ribbons: ${player.ribbons.length}/3 found.`;
      if(missing.length) text+=` Scent vision can point toward ${missing.length===1?'the last trail':'nearby trails and exits'}.`;
    }
    if(player.questStage===2) text='All three ribbons found. Reach the Moon Shrine in Moon Shrine Grove.';
    if(player.questStage>=3) text='The Moon Shrine is restored. Explore all three maps, forage, and cause tasteful fox trouble.';
    objectiveEl.textContent=text;
    scentStatus.classList.toggle('active',player.scent>0);
    locationBadge.textContent=currentMap().name;
  }

  function showLocation(){ locationBadge.textContent=currentMap().name; locationBadge.classList.remove('hidden'); }
  function showToast(text,seconds=2.2){ toastEl.textContent=text; toastEl.classList.remove('hidden'); toastTimer=seconds; }

  function showDialogue(speaker,lines,onDone=null){
    dialogueQueue=lines.map((text,i)=>({speaker,text,onDone:i===lines.length-1?onDone:null}));
    currentDialogue=null; advanceDialogue();
  }

  function advanceDialogue(){
    if(currentDialogue?.onDone){ const cb=currentDialogue.onDone; currentDialogue.onDone=null; cb(); }
    if(!dialogueQueue.length){ currentDialogue=null; dialogueBox.classList.add('hidden'); return; }
    currentDialogue=dialogueQueue.shift(); speakerEl.textContent=currentDialogue.speaker; dialogueText.textContent=currentDialogue.text;
    dialogueBox.classList.remove('hidden'); chirp(330,.025);
  }

  function chirp(freq=440,duration=.05){
    if(muted) return;
    try{audioCtx ||= new (window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(.032,audioCtx.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+duration);o.connect(g).connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration);}catch(_){}
  }

  function dist(ax,ay,bx,by){ return Math.hypot(ax-bx,ay-by); }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function rectHitCircle(rect,x,y,r){const cx=clamp(x,rect.x,rect.x+rect.w),cy=clamp(y,rect.y,rect.y+rect.h);return dist(x,y,cx,cy)<r;}

  function blockedAt(x,y){
    const m=currentMap(),r=player.r;
    if(x<r||y<r||x>m.w-r||y>m.h-r)return true;
    if(m.houses.some(h=>rectHitCircle({x:h.x-8,y:h.y+52,w:h.w+16,h:h.h-52},x,y,r)))return true;
    for(const [tx,ty,tr] of m.trees)if(dist(x,y,tx,ty)<tr*.54+r)return true;
    if(m.river){const inRiver=x>m.river.x-r&&x<m.river.x+m.river.w+r;const onBridge=y>m.river.bridgeY+r*.1&&y<m.river.bridgeY+m.river.bridgeH-r*.1;if(inRiver&&!onBridge)return true;}
    if(m.gate&&!state.gateOpen&&rectHitCircle(m.gate,x,y,r))return true;
    if(m.shrine&&dist(x,y,m.shrine.x,m.shrine.y)<m.shrine.r*.75+r)return true;
    return false;
  }

  function movePlayer(dx,dy,dt){
    player.moving=!!(dx||dy);if(!player.moving)return;
    const len=Math.hypot(dx,dy);dx/=len;dy/=len;const sprinting=keys.ShiftLeft||keys.ShiftRight||touch.sprint;const speed=player.speed*(sprinting?1.55:1);const nx=player.x+dx*speed*dt,ny=player.y+dy*speed*dt;
    if(!blockedAt(nx,player.y))player.x=nx;if(!blockedAt(player.x,ny))player.y=ny;
    if(Math.abs(dx)>Math.abs(dy))player.dir=dx<0?'left':'right';else player.dir=dy<0?'up':'down';player.walkT+=dt*(sprinting?13:8);
    if(Math.random()<dt*(sprinting?8:3))particles.push({x:player.x-dx*20,y:player.y-dy*20,vx:-dx*8+(Math.random()-.5)*12,vy:-dy*8+(Math.random()-.5)*12,life:.4,max:.4,size:3,color:'rgba(222,207,168,.45)'});
  }

  function checkPortal(){
    if(transitionBusy||transitionCooldown>0||currentDialogue)return;
    for(const p of currentMap().portals){if(player.x>=p.x&&player.x<=p.x+p.w&&player.y>=p.y&&player.y<=p.y+p.h){transitionTo(p.to,p.spawn,p.label);return;}}
  }

  function transitionTo(mapId,spawn,label){
    if(!MAPS[mapId])return;transitionBusy=true;paused=true;transitionCooldown=.9;const target=MAPS[mapId];mapTransitionTitle.textContent=label||target.name;mapTransitionSubtitle.textContent=target.subtitle;mapTransition.classList.add('show');chirp(240,.12);
    setTimeout(()=>{player.map=mapId;player.x=spawn.x;player.y=spawn.y;state.visited[mapId]=true;camera.x=clamp(player.x-VIEW.w/2,0,Math.max(0,target.w-VIEW.w));camera.y=clamp(player.y-VIEW.h/2,0,Math.max(0,target.h-VIEW.h));updateHud();saveGame();},220);
    setTimeout(()=>{mapTransition.classList.remove('show');paused=false;transitionBusy=false;showLocation();},650);
  }

  function interact(){
    if(!gameStarted)return;if(currentDialogue){advanceDialogue();return;}const m=currentMap(),candidates=[];m.npcs.forEach(n=>candidates.push({kind:'npc',obj:n,d:dist(player.x,player.y,n.x,n.y)}));m.signs.forEach(s=>candidates.push({kind:'sign',obj:s,d:dist(player.x,player.y,s.x,s.y)}));if(m.lever)candidates.push({kind:'lever',obj:m.lever,d:dist(player.x,player.y,m.lever.x,m.lever.y)});if(m.shrine)candidates.push({kind:'shrine',obj:m.shrine,d:dist(player.x,player.y,m.shrine.x,m.shrine.y)});const best=candidates.filter(c=>c.d<95).sort((a,b)=>a.d-b.d)[0];
    if(!best){showToast('Nothing here but wind, grass, and one very busy fox nose.',1.4);return;}if(best.kind==='sign')showDialogue('Wooden Sign',[best.obj.text]);
    if(best.kind==='lever'){if(!state.gateOpen){state.gateOpen=true;saveGame();showToast('The bridge gate clunks open.');chirp(180,.14);showDialogue('Saffron',['Ha. Opposable thumbs remain wildly overrated.']);}else showDialogue('Saffron',['Already open. I remain undefeated by basic machinery.']);}
    if(best.kind==='npc')talkNpc(best.obj);if(best.kind==='shrine')interactShrine();
  }

  function talkNpc(npc){
    if(npc.id==='rowan'){
      if(player.questStage===0)showDialogue('Elder Rowan',['The storm scattered your ribbons farther than I feared. One stayed in Bramblewick, one vanished into Mosswood, and one crossed into the Moon Shrine Grove.','Follow the glowing exits when scent vision is active. The paths now lead to separate places instead of one endless stretch of ground.','Bring all three ribbons to the shrine. And yes, the bridge lever still counts as dignified fox engineering.'],()=>{player.questStage=1;updateHud();saveGame();});
      else if(player.ribbons.length<3)showDialogue('Elder Rowan',[`Your tail inventory says ${player.ribbons.length}/3. The trails between maps are part of the hunt now.`]);else showDialogue('Elder Rowan',['All three. Good. Take the eastern trail to Moon Shrine Grove and finish what the storm started.']);return;
    }
    if(npc.id==='pip')showDialogue('Pip the Hare',[player.ribbons.includes('sun')?'The garden ribbon is gone. I definitely did not consider wearing it.':'The gold ribbon keeps flashing near the village gardens.']);
    if(npc.id==='fern')showDialogue('Fern',[player.ribbons.includes('moss')?'You found the green ribbon. Mosswood looks less smug already.':'The green glow is deeper west. Scent vision makes the old trail easier to read.']);
    if(npc.id==='marlow')showDialogue('Marlow',[player.ribbons.length===3?'Three ribbons? Then the shrine has been waiting for you.':'The grove remembers every creature that crosses its bridge. Try not to make it remember you falling in.']);
    if(npc.id==='ink')showDialogue('Ink the Crow',[player.ribbons.includes('moon')?'The blue ribbon is yours now. Tragic. It improved the scenery.':'Blue light fell south of the shrine. I saw it first, which means this information is technically mine.']);
  }

  function interactShrine(){
    if(player.ribbons.length<3){showDialogue('Moon Shrine',[`Three hollows wait in the stone. ${3-player.ribbons.length} still stand empty.`]);return;}
    if(player.questStage<3)showDialogue('Moon Shrine',['The three ribbons rise from Saffron’s satchel and orbit the carved stone like tiny comets.','Gold, green, and blue settle into the three hollows. The grove exhales, and every path between the maps glimmers at once.','Something under the roots stops listening.'],()=>{player.questStage=3;updateHud();saveGame();const s=currentMap().shrine;for(let i=0;i<90;i++)particles.push({x:s.x,y:s.y,vx:(Math.random()-.5)*260,vy:(Math.random()-.5)*260,life:1.8,max:1.8,size:3+Math.random()*5,color:['#ffd65a','#78e08f','#9fdcff'][i%3]});showToast('MOON SHRINE RESTORED ✦',4);chirp(660,.35);});
    else showDialogue('Moon Shrine',['Warm stone. Quiet roots. Three ribbons flutter without wind.']);
  }

  function activateScent(){if(!gameStarted||currentDialogue)return;player.scent=4.3;updateHud();chirp(520,.1);showToast('Scent vision: trails and exits brighten.',1.4);}
  function tailSwish(){if(!gameStarted||currentDialogue||player.swish>0)return;player.swish=.5;swishWaves.push({map:player.map,x:player.x,y:player.y,r:20,life:.42,max:.42});chirp(220,.04);let harvested=false;for(const b of currentMap().bushes){if(!state.pickedBerries[b.id]&&dist(player.x,player.y,b.x,b.y)<90){state.pickedBerries[b.id]=true;player.berries+=3;harvested=true;for(let i=0;i<12;i++)particles.push({x:b.x,y:b.y,vx:(Math.random()-.5)*90,vy:(Math.random()-.5)*90,life:.7,max:.7,size:5,color:'#7f73d8'});}}if(harvested){showToast('+3 moonberries');updateHud();saveGame();}}

  function checkCollectibles(){for(const r of ribbons){if(r.map!==player.map||player.ribbons.includes(r.id))continue;if(dist(player.x,player.y,r.x,r.y)<46){player.ribbons.push(r.id);for(let i=0;i<25;i++)particles.push({x:r.x,y:r.y,vx:(Math.random()-.5)*130,vy:(Math.random()-.5)*130,life:1,max:1,size:3+Math.random()*3,color:r.color});showToast(`${ribbonName(r)} recovered!`,2.7);chirp(760,.2);if(player.ribbons.length===3)player.questStage=Math.max(player.questStage,2);updateHud();saveGame();}}}

  function update(dt){
    if(!gameStarted)return;transitionCooldown=Math.max(0,transitionCooldown-dt);if(paused)return;if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)toastEl.classList.add('hidden');}player.scent=Math.max(0,player.scent-dt);player.swish=Math.max(0,player.swish-dt);scentStatus.classList.toggle('active',player.scent>0);
    if(!currentDialogue){const dx=(keys.KeyD||keys.ArrowRight||touch.right?1:0)-(keys.KeyA||keys.ArrowLeft||touch.left?1:0);const dy=(keys.KeyS||keys.ArrowDown||touch.down?1:0)-(keys.KeyW||keys.ArrowUp||touch.up?1:0);movePlayer(dx,dy,dt);checkCollectibles();checkPortal();}else player.moving=false;
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.985;p.vy*=.985;p.life-=dt;});particles=particles.filter(p=>p.life>0);swishWaves.forEach(w=>{w.r+=220*dt;w.life-=dt;});swishWaves=swishWaves.filter(w=>w.life>0);clampCamera(false,dt);
  }

  function clampCamera(force=false,dt=.016){const m=currentMap();const tx=clamp(player.x-VIEW.w/2,0,Math.max(0,m.w-VIEW.w)),ty=clamp(player.y-VIEW.h/2,0,Math.max(0,m.h-VIEW.h));if(force){camera.x=tx;camera.y=ty;}else{camera.x+=(tx-camera.x)*Math.min(1,dt*7);camera.y+=(ty-camera.y)*Math.min(1,dt*7);}}
  function roundedRect(x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();}

  function drawGround(m){
    ctx.fillStyle=player.scent>0?shade(m.ground,-28):m.ground;ctx.fillRect(0,0,m.w,m.h);ctx.fillStyle=player.scent>0?shade(m.path,-18):m.path;
    if(player.map==='village'){roundedRect(170,650,760,200,85);ctx.fill();roundedRect(780,690,800,120,50);ctx.fill();roundedRect(1500,500,190,400,70);ctx.fill();roundedRect(120,1010,420,180,70);ctx.fill();}
    else if(player.map==='mosswood'){roundedRect(90,650,1700,170,80);ctx.fill();roundedRect(570,320,190,760,80);ctx.fill();drawMushrooms();}
    else{roundedRect(80,650,1460,190,85);ctx.fill();roundedRect(720,480,200,650,75);ctx.fill();roundedRect(1180,320,300,240,80);ctx.fill();}
    if(m.river){ctx.fillStyle=player.scent>0?'#245a68':m.water;ctx.fillRect(m.river.x,0,m.river.w,m.h);for(let y=15;y<m.h;y+=58){ctx.strokeStyle='rgba(255,255,255,.14)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(m.river.x+10,y);ctx.quadraticCurveTo(m.river.x+m.river.w/2,y+15,m.river.x+m.river.w-10,y);ctx.stroke();}ctx.fillStyle='#725039';ctx.fillRect(m.river.x-10,m.river.bridgeY,m.river.w+20,m.river.bridgeH);ctx.fillStyle='#9e7650';for(let x=m.river.x-3;x<m.river.x+m.river.w+5;x+=20)ctx.fillRect(x,m.river.bridgeY+8,13,m.river.bridgeH-16);}
    ctx.fillStyle='rgba(255,255,255,.045)';for(let x=20;x<m.w;x+=72)for(let y=20;y<m.h;y+=72)if(((x*13+y*7)%11)<4){ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();}
  }

  function shade(hex,amt){const n=parseInt(hex.slice(1),16),r=clamp((n>>16)+amt,0,255),g=clamp(((n>>8)&255)+amt,0,255),b=clamp((n&255)+amt,0,255);return `rgb(${r},${g},${b})`;}
  function drawMushrooms(){for(let i=0;i<18;i++){const x=120+((i*173)%1600),y=180+((i*241)%1060);ctx.fillStyle=player.scent>0?'#83d9d9':'#7ba9a5';ctx.beginPath();ctx.arc(x,y,8,Math.PI,0);ctx.fill();ctx.fillStyle='#d8d1b5';ctx.fillRect(x-2,y,4,10);}}
  function drawHouse(h){ctx.fillStyle='rgba(0,0,0,.2)';roundedRect(h.x+14,h.y+66,h.w,h.h-40,18);ctx.fill();ctx.fillStyle=h.wall;roundedRect(h.x,h.y+52,h.w,h.h-52,14);ctx.fill();ctx.fillStyle='#4b3426';ctx.fillRect(h.x+h.w*.43,h.y+h.h-70,50,70);ctx.fillStyle='#9ed7df';ctx.fillRect(h.x+32,h.y+102,48,40);ctx.fillRect(h.x+h.w-80,h.y+102,48,40);ctx.fillStyle=h.roof;ctx.beginPath();ctx.moveTo(h.x-24,h.y+70);ctx.lineTo(h.x+h.w*.5,h.y);ctx.lineTo(h.x+h.w+24,h.y+70);ctx.closePath();ctx.fill();}
  function drawTree([x,y,r]){ctx.fillStyle='#5b3e28';ctx.fillRect(x-8,y+r*.15,16,r*.8);ctx.fillStyle=player.scent>0?'#245349':'#355f36';ctx.beginPath();ctx.arc(x,y,r*.72,0,Math.PI*2);ctx.fill();ctx.fillStyle=player.scent>0?'#2e6b5c':'#4d7e43';ctx.beginPath();ctx.arc(x-r*.28,y-r*.1,r*.52,0,Math.PI*2);ctx.arc(x+r*.3,y-r*.05,r*.47,0,Math.PI*2);ctx.fill();}
  function drawBush(b){const picked=!!state.pickedBerries[b.id];ctx.fillStyle=picked?'#405d3d':'#315e35';for(const [ox,oy] of [[0,0],[-18,6],[18,5],[-9,-12],[11,-10]]){ctx.beginPath();ctx.arc(b.x+ox,b.y+oy,18,0,Math.PI*2);ctx.fill();}if(!picked){ctx.fillStyle='#7162bd';for(const [ox,oy] of [[-12,-4],[9,7],[18,-9],[-2,12]]){ctx.beginPath();ctx.arc(b.x+ox,b.y+oy,4,0,Math.PI*2);ctx.fill();}}}
  function drawRibbon(r,t){if(r.map!==player.map||player.ribbons.includes(r.id))return;const bob=Math.sin(t*3+r.x)*6;ctx.save();ctx.translate(r.x,r.y+bob);if(player.scent>0){ctx.shadowColor=r.color;ctx.shadowBlur=30;}ctx.fillStyle=r.color;ctx.beginPath();ctx.moveTo(-12,-18);ctx.quadraticCurveTo(0,-26,12,-18);ctx.lineTo(7,18);ctx.lineTo(0,10);ctx.lineTo(-8,20);ctx.closePath();ctx.fill();ctx.shadowBlur=0;ctx.restore();}

  function drawNpc(n){
    ctx.save();ctx.translate(n.x,n.y);ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(0,18,24,10,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=n.color;
    if(n.animal==='owl'){ctx.beginPath();ctx.ellipse(0,0,25,32,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff3c9';ctx.beginPath();ctx.arc(-9,-5,8,0,Math.PI*2);ctx.arc(9,-5,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#312817';ctx.beginPath();ctx.arc(-9,-5,3,0,Math.PI*2);ctx.arc(9,-5,3,0,Math.PI*2);ctx.fill();}
    else if(n.animal==='hare'){ctx.beginPath();ctx.ellipse(0,5,22,28,0,0,Math.PI*2);ctx.fill();ctx.fillRect(-14,-37,10,36);ctx.fillRect(5,-40,10,39);ctx.fillStyle='#2b201b';ctx.beginPath();ctx.arc(7,-2,3,0,Math.PI*2);ctx.fill();}
    else if(n.animal==='badger'){ctx.beginPath();ctx.ellipse(0,3,31,23,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#eee3cf';ctx.fillRect(-5,-18,12,35);ctx.fillStyle='#222';ctx.beginPath();ctx.arc(15,-3,3,0,Math.PI*2);ctx.fill();}
    else{ctx.beginPath();ctx.ellipse(0,0,22,15,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-10,-7);ctx.lineTo(-28,-20);ctx.lineTo(-20,3);ctx.fill();}
    ctx.fillStyle='rgba(15,20,16,.82)';roundedRect(-44,35,88,20,10);ctx.fill();ctx.fillStyle='#fff4d8';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(n.name,0,50);ctx.restore();
  }

  function drawSign(s){ctx.fillStyle='#5a3b25';ctx.fillRect(s.x-5,s.y,10,55);ctx.fillStyle='#8a633a';roundedRect(s.x-55,s.y-28,110,36,5);ctx.fill();}
  function drawLever(m){if(!m.lever)return;const l=m.lever;ctx.fillStyle='#46372c';ctx.fillRect(l.x-18,l.y+10,36,14);ctx.save();ctx.translate(l.x,l.y+10);ctx.rotate(state.gateOpen?.75:-.55);ctx.fillStyle='#b4a078';ctx.fillRect(-5,-44,10,48);ctx.fillStyle='#7d3728';ctx.beginPath();ctx.arc(0,-45,10,0,Math.PI*2);ctx.fill();ctx.restore();if(m.gate&&!state.gateOpen){ctx.fillStyle='#5b3a29';ctx.fillRect(m.gate.x,m.gate.y,m.gate.w,m.gate.h);ctx.fillStyle='#b28d59';for(let y=m.gate.y+12;y<m.gate.y+m.gate.h;y+=32)ctx.fillRect(m.gate.x-9,y,48,8);}}
  function drawShrine(m,t){if(!m.shrine)return;const s=m.shrine;ctx.save();ctx.translate(s.x,s.y);if(player.questStage>=3){ctx.shadowColor='#bdeeff';ctx.shadowBlur=35;}ctx.fillStyle='#8b8d82';ctx.beginPath();ctx.arc(0,0,s.r,Math.PI,0);ctx.lineTo(s.r,55);ctx.lineTo(-s.r,55);ctx.closePath();ctx.fill();ctx.fillStyle='#4c5d58';for(let i=-1;i<=1;i++){ctx.beginPath();ctx.arc(i*32,-2,10,0,Math.PI*2);ctx.fill();}if(player.questStage>=3){['#ffd65a','#78e08f','#9fdcff'].forEach((c,i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc((i-1)*32,-2,7+Math.sin(t*4+i)*1.5,0,Math.PI*2);ctx.fill();});}ctx.shadowBlur=0;ctx.restore();}

  function drawPortals(m,t){for(const p of m.portals){const cx=p.x+p.w/2,cy=p.y+p.h/2,pulse=.5+.5*Math.sin(t*3+p.x);ctx.save();ctx.globalAlpha=.42+pulse*.3;ctx.strokeStyle=player.scent>0?'#bff8ff':'#f6dfa1';ctx.lineWidth=4;ctx.setLineDash([10,10]);ctx.strokeRect(p.x+8,p.y+8,p.w-16,p.h-16);ctx.setLineDash([]);ctx.fillStyle='rgba(16,27,21,.78)';roundedRect(cx-68,cy-18,136,36,18);ctx.fill();ctx.fillStyle='#fff4d8';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText(p.label,cx,cy+4);ctx.restore();}}

  function drawScentTrails(t){
    if(player.scent<=0)return;const targets=[];for(const r of ribbons)if(r.map===player.map&&!player.ribbons.includes(r.id))targets.push({x:r.x,y:r.y,color:r.color});
    if(!targets.length&&player.ribbons.length<3){const missingMaps=new Set(ribbons.filter(r=>!player.ribbons.includes(r.id)).map(r=>r.map));for(const p of currentMap().portals)if(missingMaps.has(p.to))targets.push({x:p.x+p.w/2,y:p.y+p.h/2,color:'#bff8ff'});}
    if(player.questStage===2&&player.map!=='shrine')for(const p of currentMap().portals)if(p.to==='shrine'||(player.map==='mosswood'&&p.to==='village'))targets.push({x:p.x+p.w/2,y:p.y+p.h/2,color:'#9fdcff'});
    targets.forEach(target=>{const dx=target.x-player.x,dy=target.y-player.y,d=Math.hypot(dx,dy);if(d<1)return;const nx=dx/d,ny=dy/d,count=Math.min(18,Math.floor(d/58));for(let i=1;i<=count;i++){const px=player.x+nx*i*56,py=player.y+ny*i*56,pulse=.45+.45*Math.sin(t*5-i*.8);ctx.globalAlpha=.28+pulse*.5;ctx.fillStyle=target.color;ctx.beginPath();ctx.arc(px,py,4+pulse*3,0,Math.PI*2);ctx.fill();}});ctx.globalAlpha=1;
  }

  function drawFox(t){ctx.save();ctx.translate(player.x,player.y);const bob=player.moving?Math.sin(player.walkT)*2:Math.sin(t*2)*.5;ctx.translate(0,bob);ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(0,22,34,11,0,0,Math.PI*2);ctx.fill();if(player.dir==='left'||player.dir==='right')drawFoxSide(player.dir==='left'?-1:1,t);else drawFoxVertical(player.dir==='up',t);if(player.swish>0){ctx.strokeStyle='rgba(255,231,176,.75)';ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,2,58,-2.5,.7);ctx.stroke();}ctx.restore();}
  function drawFoxSide(flip,t){ctx.save();ctx.scale(flip,1);const tailWave=Math.sin(t*4)*4;ctx.fillStyle='#d66b32';ctx.beginPath();ctx.ellipse(-40,8+tailWave*.12,40,15,-.1,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f2e4c9';ctx.beginPath();ctx.ellipse(-70,11+tailWave*.12,17,10,-.1,0,Math.PI*2);ctx.fill();ctx.fillStyle='#dd7638';ctx.beginPath();ctx.ellipse(0,4,34,20,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(27,-5,21,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(18,-21);ctx.lineTo(21,-46);ctx.lineTo(33,-23);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(32,-22);ctx.lineTo(45,-42);ctx.lineTo(45,-16);ctx.closePath();ctx.fill();ctx.fillStyle='#f5ead3';ctx.beginPath();ctx.moveTo(32,4);ctx.lineTo(52,3);ctx.lineTo(34,15);ctx.lineTo(19,13);ctx.closePath();ctx.fill();ctx.fillStyle='#1e1c19';ctx.beginPath();ctx.arc(49,2,4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(34,-8,2.6,0,Math.PI*2);ctx.fill();const step=player.moving?Math.sin(player.walkT)*4:0;ctx.fillStyle='#3a2c24';ctx.fillRect(-11,15,8,18+step);ctx.fillRect(14,15,8,18-step);ctx.restore();}
  function drawFoxVertical(up,t){const step=player.moving?Math.sin(player.walkT)*4:0;ctx.fillStyle='#d66b32';ctx.beginPath();ctx.ellipse(0,23,18,42,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f2e4c9';ctx.beginPath();ctx.ellipse(0,58,11,19,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#dd7638';ctx.beginPath();ctx.ellipse(0,0,25,30,0,0,Math.PI*2);ctx.fill();if(up){ctx.beginPath();ctx.moveTo(-18,-17);ctx.lineTo(-14,-43);ctx.lineTo(-4,-20);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(18,-17);ctx.lineTo(14,-43);ctx.lineTo(4,-20);ctx.closePath();ctx.fill();ctx.fillStyle='#7c3e2d';ctx.beginPath();ctx.arc(0,-10,5,0,Math.PI*2);ctx.fill();}else{ctx.beginPath();ctx.moveTo(-18,-16);ctx.lineTo(-14,-42);ctx.lineTo(-4,-19);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(18,-16);ctx.lineTo(14,-42);ctx.lineTo(4,-19);ctx.closePath();ctx.fill();ctx.fillStyle='#f5ead3';ctx.beginPath();ctx.ellipse(0,4,17,15,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#1e1c19';ctx.beginPath();ctx.arc(-8,-7,2.5,0,Math.PI*2);ctx.arc(8,-7,2.5,0,Math.PI*2);ctx.arc(0,6,3.5,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#3a2c24';ctx.fillRect(-18,17,7,17+step);ctx.fillRect(11,17,7,17-step);}

  function drawParticles(){for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;for(const w of swishWaves){if(w.map!==player.map)continue;ctx.globalAlpha=w.life/w.max;ctx.strokeStyle='#ffe7ae';ctx.lineWidth=4;ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;}
  function drawNearbyHint(){if(currentDialogue)return;const m=currentMap();let nearest=Infinity;for(const o of [...m.npcs,...m.signs])nearest=Math.min(nearest,dist(player.x,player.y,o.x,o.y));if(m.lever)nearest=Math.min(nearest,dist(player.x,player.y,m.lever.x,m.lever.y));if(m.shrine)nearest=Math.min(nearest,dist(player.x,player.y,m.shrine.x,m.shrine.y));if(nearest<92){ctx.save();ctx.translate(player.x,player.y-58);ctx.fillStyle='rgba(15,20,16,.85)';roundedRect(-48,-15,96,30,15);ctx.fill();ctx.fillStyle='#fff4d8';ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(isTouch?'USE':'E  INTERACT',0,5);ctx.restore();}}

  function draw(){const t=performance.now()/1000,m=currentMap();ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,VIEW.w,VIEW.h);ctx.save();ctx.translate(-camera.x,-camera.y);drawGround(m);drawScentTrails(t);m.houses.forEach(drawHouse);m.trees.forEach(drawTree);m.bushes.forEach(drawBush);m.signs.forEach(drawSign);drawLever(m);drawShrine(m,t);drawPortals(m,t);ribbons.forEach(r=>drawRibbon(r,t));m.npcs.forEach(drawNpc);drawParticles();drawFox(t);drawNearbyHint();ctx.restore();if(player.scent>0){const g=ctx.createRadialGradient(VIEW.w/2,VIEW.h/2,80,VIEW.w/2,VIEW.h/2,Math.max(VIEW.w,VIEW.h)*.7);g.addColorStop(0,'rgba(77,172,181,0)');g.addColorStop(1,'rgba(15,48,53,.34)');ctx.fillStyle=g;ctx.fillRect(0,0,VIEW.w,VIEW.h);}}
  function loop(now){const dt=Math.min(.033,(now-lastTime)/1000);lastTime=now;update(dt);draw();requestAnimationFrame(loop);}

  window.addEventListener('keydown',e=>{keys[e.code]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(e.repeat)return;if(e.code==='KeyE')interact();if(e.code==='KeyQ')activateScent();if(e.code==='Space')tailSwish();if(e.code==='Escape'&&currentDialogue)advanceDialogue();});
  window.addEventListener('keyup',e=>keys[e.code]=false);
  window.addEventListener('blur',()=>{Object.keys(keys).forEach(k=>keys[k]=false);Object.keys(touch).forEach(k=>touch[k]=false);saveGame();});
  document.querySelectorAll('[data-touch]').forEach(btn=>{const action=btn.dataset.touch;const down=e=>{e.preventDefault();if(['up','down','left','right','sprint'].includes(action)){touch[action]=true;btn.classList.add('pressed');}else if(action==='interact')interact();else if(action==='scent')activateScent();else if(action==='swish')tailSwish();};const up=e=>{e.preventDefault();if(['up','down','left','right','sprint'].includes(action)){touch[action]=false;btn.classList.remove('pressed');}};btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('pointerleave',up);});
  dialogueBox.addEventListener('pointerdown',()=>{if(currentDialogue)advanceDialogue();});startBtn.addEventListener('click',()=>begin(false));continueBtn.addEventListener('click',()=>begin(true));continueBtn.style.display=(localStorage.getItem(SAVE_KEY)||localStorage.getItem(OLD_SAVE_KEY))?'block':'none';muteBtn.addEventListener('click',()=>{muted=!muted;muteBtn.textContent=muted?'🔇':'🔊';});window.addEventListener('beforeunload',saveGame);document.addEventListener('contextmenu',e=>{if(isTouch)e.preventDefault();});requestAnimationFrame(loop);
})();
