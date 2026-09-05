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

  const WORLD = { w: 2400, h: 1600 };
  const SAVE_KEY = 'foxs-tails-save-v1';
  const keys = Object.create(null);
  const touch = { up:false, down:false, left:false, right:false };
  let gameStarted = false;
  let paused = false;
  let lastTime = performance.now();
  let toastTimer = 0;
  let muted = false;
  let audioCtx = null;
  let dialogueQueue = [];
  let currentDialogue = null;
  let camera = { x: 0, y: 0 };
  let particles = [];
  let swishWaves = [];

  const player = {
    x: 520, y: 780, r: 24, facing: 0, speed: 210,
    ribbons: [], berries: 0, questStage: 0,
    scent: 0, swish: 0, walkT: 0
  };

  const gate = { x: 1168, y: 686, w: 34, h: 142, open: false };

  const houses = [
    {x:360,y:250,w:300,h:220,roof:'#7b4731',wall:'#d7b579'},
    {x:670,y:235,w:250,h:190,roof:'#48674d',wall:'#c8b58b'},
    {x:420,y:960,w:310,h:220,roof:'#5f536d',wall:'#c7a980'},
    {x:1450,y:250,w:280,h:210,roof:'#7b4731',wall:'#d9bd83'},
    {x:1580,y:930,w:320,h:230,roof:'#425f4d',wall:'#c9ae79'}
  ];

  const trees = [
    [150,180,52],[270,170,46],[1040,190,54],[1160,160,45],[1280,210,54],[2100,160,58],[2250,240,48],
    [120,520,48],[210,670,56],[1030,510,48],[1310,540,52],[2210,560,58],[2320,730,48],
    [150,960,54],[260,1110,44],[930,1110,54],[1260,1080,56],[1370,1240,46],[2210,1080,60],
    [100,1390,58],[330,1430,50],[760,1410,56],[1010,1450,46],[1510,1400,58],[1800,1440,50],[2220,1390,60]
  ];

  const berryBushes = [
    {x:290,y:860,picked:false}, {x:805,y:520,picked:false}, {x:1460,y:720,picked:false},
    {x:2010,y:1020,picked:false}, {x:490,y:1320,picked:false}
  ];

  const ribbons = [
    {id:'sun', name:'Sun Ribbon', x:805, y:465, color:'#ffd65a', picked:false},
    {id:'moss', name:'Moss Ribbon', x:300, y:1285, color:'#78e08f', picked:false},
    {id:'moon', name:'Moon Ribbon', x:2050, y:1190, color:'#9fdcff', picked:false}
  ];

  const npcs = [
    {id:'rowan', name:'Elder Rowan', animal:'owl', x:620, y:760, color:'#dbc8a7'},
    {id:'pip', name:'Pip', animal:'hare', x:830, y:850, color:'#c9bba6'},
    {id:'marlow', name:'Marlow', animal:'badger', x:1510, y:690, color:'#8b8b8b'},
    {id:'ink', name:'Ink', animal:'crow', x:1870, y:510, color:'#27323b'}
  ];

  const signs = [
    {x:930,y:675,text:'Bramblewick →   Moon Shrine →'},
    {x:415,y:1230,text:'Old Mosswood. If the mushrooms glow back, mind your manners.'}
  ];

  const shrine = {x:2020,y:340,r:76};
  const lever = {x:985,y:760};

  function resetGame() {
    player.x = 520; player.y = 780; player.facing = 0;
    player.ribbons = []; player.berries = 0; player.questStage = 0;
    player.scent = 0; player.swish = 0;
    gate.open = false;
    ribbons.forEach(r => r.picked = false);
    berryBushes.forEach(b => b.picked = false);
    particles = [];
    saveGame();
  }

  function saveGame() {
    if (!gameStarted) return;
    const data = {
      x: player.x, y: player.y, ribbons: player.ribbons,
      berries: player.berries, questStage: player.questStage,
      gateOpen: gate.open,
      pickedBerries: berryBushes.map(b => b.picked)
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  }

  function loadGame() {
    try {
      const data = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (!data) return false;
      player.x = Number(data.x) || 520;
      player.y = Number(data.y) || 780;
      player.ribbons = Array.isArray(data.ribbons) ? data.ribbons : [];
      player.berries = Number(data.berries) || 0;
      player.questStage = Number(data.questStage) || 0;
      gate.open = !!data.gateOpen;
      ribbons.forEach(r => r.picked = player.ribbons.includes(r.id));
      berryBushes.forEach((b,i) => b.picked = !!(data.pickedBerries && data.pickedBerries[i]));
      return true;
    } catch (_) { return false; }
  }

  function begin(continueSave) {
    gameStarted = true;
    paused = false;
    if (continueSave) loadGame(); else resetGame();
    titleScreen.classList.add('hidden');
    hud.classList.remove('hidden');
    if (matchMedia('(pointer: coarse)').matches) touchControls.classList.remove('hidden');
    updateHud();
    if (!continueSave || player.questStage === 0) {
      showDialogue('Saffron', [
        'The storm is gone... but my three moon-ribbons are not.',
        'Elder Rowan said to meet beneath the lantern tree. My nose says he already knows more than he told me.'
      ]);
    }
    chirp(440, .06);
  }

  function updateHud() {
    ribbonCountEl.textContent = `${player.ribbons.length}/3`;
    berryCountEl.textContent = player.berries;
    let objective = 'Speak to Elder Rowan by the lantern tree.';
    if (player.questStage === 1) objective = `Recover the three moon-ribbons. ${player.ribbons.length}/3 found. Scent vision can reveal their trails.`;
    if (player.questStage === 2) objective = 'All three ribbons found. Take them to the Moon Shrine east of the river.';
    if (player.questStage >= 3) objective = 'The Moon Shrine is restored. Bramblewick is safe — explore, forage, and cause tasteful fox trouble.';
    objectiveEl.textContent = objective;
    scentStatus.classList.toggle('active', player.scent > 0);
  }

  function showToast(text, seconds=2.3) {
    toastEl.textContent = text;
    toastEl.classList.remove('hidden');
    toastTimer = seconds;
  }

  function showDialogue(speaker, lines, onDone=null) {
    dialogueQueue = lines.map(text => ({speaker, text}));
    dialogueQueue[dialogueQueue.length - 1].onDone = onDone;
    advanceDialogue();
  }

  function advanceDialogue() {
    if (!dialogueQueue.length) {
      if (currentDialogue && currentDialogue.onDone) currentDialogue.onDone();
      currentDialogue = null;
      dialogueBox.classList.add('hidden');
      return;
    }
    if (currentDialogue && currentDialogue.onDone) currentDialogue.onDone();
    currentDialogue = dialogueQueue.shift();
    speakerEl.textContent = currentDialogue.speaker;
    dialogueText.textContent = currentDialogue.text;
    dialogueBox.classList.remove('hidden');
    chirp(330, .025);
  }

  function chirp(freq=440, duration=.05) {
    if (muted) return;
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(.035, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.0001, audioCtx.currentTime + duration);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + duration);
    } catch (_) {}
  }

  function dist(ax, ay, bx, by) { return Math.hypot(ax-bx, ay-by); }
  function clamp(v,a,b){ return Math.max(a,Math.min(b,v)); }
  function rectHitCircle(rect, x, y, r) {
    const cx = clamp(x, rect.x, rect.x + rect.w);
    const cy = clamp(y, rect.y, rect.y + rect.h);
    return dist(x,y,cx,cy) < r;
  }

  function blockedAt(x,y) {
    const r = player.r;
    if (x < r || y < r || x > WORLD.w-r || y > WORLD.h-r) return true;
    if (houses.some(h => rectHitCircle({x:h.x-8,y:h.y+52,w:h.w+16,h:h.h-52},x,y,r))) return true;
    if (!gate.open && rectHitCircle(gate,x,y,r)) return true;
    const inRiver = x > 1050-r && x < 1200+r;
    const onBridge = y > 675+r*.2 && y < 840-r*.2;
    if (inRiver && !onBridge) return true;
    for (const [tx,ty,tr] of trees) if (dist(x,y,tx,ty) < tr*.55+r) return true;
    return false;
  }

  function movePlayer(dx,dy,dt) {
    if (!dx && !dy) return;
    const len = Math.hypot(dx,dy); dx/=len; dy/=len;
    const sprinting = keys.ShiftLeft || keys.ShiftRight;
    const speed = player.speed * (sprinting ? 1.55 : 1);
    const nx = player.x + dx*speed*dt;
    const ny = player.y + dy*speed*dt;
    if (!blockedAt(nx, player.y)) player.x = nx;
    if (!blockedAt(player.x, ny)) player.y = ny;
    player.facing = Math.atan2(dy,dx);
    player.walkT += dt * (sprinting ? 12 : 8);
    if (Math.random() < dt * (sprinting ? 10 : 4)) {
      particles.push({x:player.x-dx*18,y:player.y-dy*18,vx:-dx*10+(Math.random()-.5)*15,vy:-dy*10+(Math.random()-.5)*15,life:.45,max:.45,size:4,color:'rgba(220,205,166,.45)'});
    }
  }

  function interact() {
    if (!gameStarted) return;
    if (currentDialogue) { advanceDialogue(); return; }

    let best = null;
    const candidates = [];
    npcs.forEach(n => candidates.push({kind:'npc', obj:n, d:dist(player.x,player.y,n.x,n.y)}));
    signs.forEach(s => candidates.push({kind:'sign', obj:s, d:dist(player.x,player.y,s.x,s.y)}));
    candidates.push({kind:'lever', obj:lever, d:dist(player.x,player.y,lever.x,lever.y)});
    candidates.push({kind:'shrine', obj:shrine, d:dist(player.x,player.y,shrine.x,shrine.y)});
    best = candidates.filter(c => c.d < 92).sort((a,b)=>a.d-b.d)[0];
    if (!best) { showToast('Nothing here but grass, wind, and suspiciously judgmental mushrooms.',1.5); return; }

    if (best.kind === 'sign') showDialogue('Wooden Sign', [best.obj.text]);
    if (best.kind === 'lever') {
      if (!gate.open) {
        gate.open = true; saveGame(); chirp(180,.15); showToast('The bridge gate clunks open.');
        showDialogue('Saffron',['Ha. Opposable thumbs remain wildly overrated.']);
      } else showDialogue('Saffron',['Already open. I am extremely good at levers.']);
    }
    if (best.kind === 'shrine') interactShrine();
    if (best.kind === 'npc') talkNpc(best.obj);
  }

  function talkNpc(npc) {
    if (npc.id === 'rowan') {
      if (player.questStage === 0) {
        showDialogue('Elder Rowan',[
          'Saffron. The storm did not steal your ribbons. Something beneath the Moon Shrine woke and scattered them on purpose.',
          'One glints near the village gardens, one fell into Mosswood, and the last crossed the river. Use your nose when your eyes fail you.',
          'Bring all three to the shrine. And yes, before you ask, pulling the bridge lever with your mouth is considered dignified fox engineering.'
        ],()=>{ player.questStage=1; saveGame(); updateHud(); });
      } else if (player.ribbons.length < 3) {
        showDialogue('Elder Rowan',[`Your ears say confidence. Your tail says ${player.ribbons.length}/3. I trust the tail.`]);
      } else {
        showDialogue('Elder Rowan',['Three ribbons, one fox, and not a single village cart overturned. I admit I underestimated your restraint.','Go to the Moon Shrine. Let it remember you.']);
      }
    }
    if (npc.id === 'pip') showDialogue('Pip the Hare',[
      player.ribbons.includes('sun') ? 'You found the shiny thing by the gardens! I absolutely did not stare at it for twenty minutes.' : 'Something golden keeps flashing behind the gardens. I would investigate, but I am currently very busy standing here.'
    ]);
    if (npc.id === 'marlow') showDialogue('Marlow the Badger',[
      gate.open ? 'Bridge gate is open. Clean work. You used the lever instead of chewing through the hinge, which puts you ahead of three generations of foxes.' : 'The bridge gate sticks. Lever is on the west bank. Give it a good shove.'
    ]);
    if (npc.id === 'ink') showDialogue('Ink the Crow',[
      player.ribbons.includes('moon') ? 'Blue ribbon is gone from the southern stones. Pity. It matched my eyes. Do not look at my eyes.' : 'Saw a blue light fall south, near the old stone circle. I charge one berry for this information. ...Fine. Introductory rate: free.'
    ]);
  }

  function interactShrine() {
    if (player.ribbons.length < 3) {
      showDialogue('Moon Shrine',[`Three hollows wait in the stone. ${3-player.ribbons.length} still stand empty.`]);
      return;
    }
    if (player.questStage < 3) {
      showDialogue('Moon Shrine',[
        'The ribbons rise from Saffron’s satchel and orbit the carved stone like three tiny comets.',
        'Gold, green, and blue knot themselves around the ancient tails engraved in the shrine. Bramblewick exhales.',
        'Somewhere under the roots, something that had been listening goes very, very quiet.'
      ],()=>{
        player.questStage=3; saveGame(); updateHud();
        for(let i=0;i<80;i++) particles.push({x:shrine.x,y:shrine.y,vx:(Math.random()-.5)*240,vy:(Math.random()-.5)*240,life:1.8,max:1.8,size:3+Math.random()*5,color:['#ffd65a','#78e08f','#9fdcff'][i%3]});
        showToast('MOON SHRINE RESTORED ✦',4);
        chirp(660,.4);
      });
    } else showDialogue('Moon Shrine',['Warm stone. Quiet roots. Three ribbons flutter without wind.']);
  }

  function activateScent() {
    if (!gameStarted || currentDialogue) return;
    player.scent = 4.2;
    updateHud();
    chirp(520,.12);
    showToast('Scent vision: trails brighten in the air.',1.4);
  }

  function tailSwish() {
    if (!gameStarted || currentDialogue || player.swish > 0) return;
    player.swish = .55;
    swishWaves.push({x:player.x,y:player.y,r:22,life:.45,max:.45});
    chirp(220,.04);
    let harvested = false;
    for (const bush of berryBushes) {
      if (!bush.picked && dist(player.x,player.y,bush.x,bush.y) < 88) {
        bush.picked = true; player.berries += 3; harvested = true;
        for(let i=0;i<12;i++) particles.push({x:bush.x,y:bush.y,vx:(Math.random()-.5)*90,vy:(Math.random()-.5)*90,life:.7,max:.7,size:5,color:'#7f73d8'});
      }
    }
    if (harvested) { showToast('+3 moonberries'); saveGame(); updateHud(); }
  }

  function checkCollectibles() {
    for (const r of ribbons) {
      if (!r.picked && dist(player.x,player.y,r.x,r.y) < 42) {
        r.picked = true; player.ribbons.push(r.id);
        for(let i=0;i<25;i++) particles.push({x:r.x,y:r.y,vx:(Math.random()-.5)*130,vy:(Math.random()-.5)*130,life:1,max:1,size:3+Math.random()*3,color:r.color});
        showToast(`${r.name} recovered!`,2.8); chirp(760,.22);
        if (player.ribbons.length === 3) player.questStage = Math.max(player.questStage,2);
        saveGame(); updateHud();
      }
    }
  }

  function update(dt) {
    if (!gameStarted || paused) return;
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) toastEl.classList.add('hidden');
    }
    player.scent = Math.max(0,player.scent-dt);
    player.swish = Math.max(0,player.swish-dt);
    scentStatus.classList.toggle('active', player.scent > 0);

    if (!currentDialogue) {
      const dx = (keys.KeyD || keys.ArrowRight || touch.right ? 1:0) - (keys.KeyA || keys.ArrowLeft || touch.left ? 1:0);
      const dy = (keys.KeyS || keys.ArrowDown || touch.down ? 1:0) - (keys.KeyW || keys.ArrowUp || touch.up ? 1:0);
      movePlayer(dx,dy,dt);
      checkCollectibles();
    }

    particles.forEach(p => { p.x += p.vx*dt; p.y += p.vy*dt; p.vx*=.985; p.vy*=.985; p.life-=dt; });
    particles = particles.filter(p=>p.life>0);
    swishWaves.forEach(w=>{w.r+=220*dt;w.life-=dt});
    swishWaves = swishWaves.filter(w=>w.life>0);

    const targetX = clamp(player.x - canvas.width/2, 0, WORLD.w-canvas.width);
    const targetY = clamp(player.y - canvas.height/2, 0, WORLD.h-canvas.height);
    camera.x += (targetX-camera.x) * Math.min(1,dt*6);
    camera.y += (targetY-camera.y) * Math.min(1,dt*6);
  }

  function roundedRect(x,y,w,h,r) {
    const rr=Math.min(r,w/2,h/2); ctx.beginPath();
    ctx.moveTo(x+rr,y); ctx.arcTo(x+w,y,x+w,y+h,rr); ctx.arcTo(x+w,y+h,x,y+h,rr);
    ctx.arcTo(x,y+h,x,y,rr); ctx.arcTo(x,y,x+w,y,rr); ctx.closePath();
  }

  function drawGround() {
    ctx.fillStyle = player.scent>0 ? '#19342f' : '#607a45';
    ctx.fillRect(0,0,WORLD.w,WORLD.h);

    ctx.fillStyle = player.scent>0 ? '#35514b' : '#9c875b';
    roundedRect(250,650,780,190,80); ctx.fill();
    roundedRect(880,690,780,120,50); ctx.fill();
    roundedRect(1500,550,500,150,65); ctx.fill();
    roundedRect(1850,400,130,760,60); ctx.fill();

    ctx.fillStyle = player.scent>0 ? '#1d5665' : '#3e93a3';
    ctx.fillRect(1050,0,150,WORLD.h);
    for(let y=10;y<WORLD.h;y+=55){
      ctx.strokeStyle='rgba(255,255,255,.15)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(1060,y);ctx.quadraticCurveTo(1125,y+16,1190,y);ctx.stroke();
    }

    ctx.fillStyle='#725039';ctx.fillRect(1040,675,170,165);
    ctx.fillStyle='#9e7650';for(let x=1047;x<1205;x+=20)ctx.fillRect(x,684,13,147);
    if (!gate.open) {
      ctx.fillStyle='#5b3a29';ctx.fillRect(gate.x,gate.y,gate.w,gate.h);
      ctx.fillStyle='#b28d59';for(let y=700;y<820;y+=32)ctx.fillRect(gate.x-9,y,52,8);
    }

    ctx.fillStyle='rgba(255,255,255,.05)';
    for(let x=20;x<WORLD.w;x+=70) for(let y=20;y<WORLD.h;y+=70) if(((x*13+y*7)%11)<4){ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();}
  }

  function drawHouse(h) {
    ctx.fillStyle='rgba(0,0,0,.2)';roundedRect(h.x+14,h.y+66,h.w,h.h-40,18);ctx.fill();
    ctx.fillStyle=h.wall;roundedRect(h.x,h.y+52,h.w,h.h-52,14);ctx.fill();
    ctx.fillStyle='#4b3426';ctx.fillRect(h.x+h.w*.43,h.y+h.h-70,50,70);
    ctx.fillStyle='#9ed7df';ctx.fillRect(h.x+32,h.y+102,48,40);ctx.fillRect(h.x+h.w-80,h.y+102,48,40);
    ctx.fillStyle=h.roof;ctx.beginPath();ctx.moveTo(h.x-24,h.y+70);ctx.lineTo(h.x+h.w*.5,h.y);ctx.lineTo(h.x+h.w+24,h.y+70);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(45,25,18,.35)';ctx.lineWidth=7;ctx.stroke();
  }

  function drawTree([x,y,r]) {
    ctx.fillStyle='#5b3e28';ctx.fillRect(x-8,y+r*.15,16,r*.8);
    ctx.fillStyle=player.scent>0?'#245349':'#355f36';ctx.beginPath();ctx.arc(x,y,r*.72,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=player.scent>0?'#2e6b5c':'#4d7e43';ctx.beginPath();ctx.arc(x-r*.28,y-r*.1,r*.52,0,Math.PI*2);ctx.arc(x+r*.3,y-r*.05,r*.47,0,Math.PI*2);ctx.fill();
  }

  function drawBush(b) {
    ctx.fillStyle=b.picked?'#405d3d':'#315e35';
    for(const [ox,oy] of [[0,0],[-18,6],[18,5],[-9,-12],[11,-10]]){ctx.beginPath();ctx.arc(b.x+ox,b.y+oy,18,0,Math.PI*2);ctx.fill();}
    if(!b.picked){ctx.fillStyle='#7162bd';for(const [ox,oy] of [[-12,-4],[9,7],[18,-9],[-2,12]]){ctx.beginPath();ctx.arc(b.x+ox,b.y+oy,4,0,Math.PI*2);ctx.fill();}}
  }

  function drawRibbon(r,t) {
    if(r.picked)return;
    const bob=Math.sin(t*3+r.x)*6;
    ctx.save();ctx.translate(r.x,r.y+bob);
    if(player.scent>0){ctx.shadowColor=r.color;ctx.shadowBlur=30;}
    ctx.fillStyle=r.color;ctx.beginPath();ctx.moveTo(-12,-18);ctx.quadraticCurveTo(0,-26,12,-18);ctx.lineTo(7,18);ctx.lineTo(0,10);ctx.lineTo(-8,20);ctx.closePath();ctx.fill();
    ctx.shadowBlur=0;ctx.restore();
  }

  function drawNpc(n) {
    ctx.save();ctx.translate(n.x,n.y);
    ctx.fillStyle='rgba(0,0,0,.18)';ctx.beginPath();ctx.ellipse(0,18,24,10,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=n.color;
    if(n.animal==='owl'){
      ctx.beginPath();ctx.ellipse(0,0,25,32,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#fff3c9';ctx.beginPath();ctx.arc(-9,-5,8,0,Math.PI*2);ctx.arc(9,-5,8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#312817';ctx.beginPath();ctx.arc(-9,-5,3,0,Math.PI*2);ctx.arc(9,-5,3,0,Math.PI*2);ctx.fill();
    } else if(n.animal==='hare'){
      ctx.beginPath();ctx.ellipse(0,5,22,28,0,0,Math.PI*2);ctx.fill();ctx.fillRect(-14,-37,10,36);ctx.fillRect(5,-40,10,39);
      ctx.fillStyle='#2b201b';ctx.beginPath();ctx.arc(7,-2,3,0,Math.PI*2);ctx.fill();
    } else if(n.animal==='badger'){
      ctx.beginPath();ctx.ellipse(0,3,31,23,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#eee3cf';ctx.fillRect(-5,-18,12,35);ctx.fillStyle='#222';ctx.beginPath();ctx.arc(15,-3,3,0,Math.PI*2);ctx.fill();
    } else {
      ctx.beginPath();ctx.ellipse(0,0,22,15,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(-10,-7);ctx.lineTo(-28,-20);ctx.lineTo(-20,3);ctx.fill();
    }
    ctx.fillStyle='rgba(15,20,16,.82)';roundedRect(-44,35,88,20,10);ctx.fill();ctx.fillStyle='#fff4d8';ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(n.name,0,50);
    ctx.restore();
  }

  function drawLever() {
    ctx.fillStyle='#46372c';ctx.fillRect(lever.x-18,lever.y+10,36,14);
    ctx.save();ctx.translate(lever.x,lever.y+10);ctx.rotate(gate.open?.75:-.55);ctx.fillStyle='#b4a078';ctx.fillRect(-5,-44,10,48);ctx.fillStyle='#7d3728';ctx.beginPath();ctx.arc(0,-45,10,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  function drawShrine(t) {
    ctx.save();ctx.translate(shrine.x,shrine.y);
    if(player.questStage>=3){ctx.shadowColor='#bdeeff';ctx.shadowBlur=35;}
    ctx.fillStyle='#8b8d82';ctx.beginPath();ctx.arc(0,0,shrine.r,Math.PI,0);ctx.lineTo(shrine.r,55);ctx.lineTo(-shrine.r,55);ctx.closePath();ctx.fill();
    ctx.fillStyle='#4c5d58';for(let i=-1;i<=1;i++){ctx.beginPath();ctx.arc(i*32,-2,10,0,Math.PI*2);ctx.fill();}
    if(player.questStage>=3){['#ffd65a','#78e08f','#9fdcff'].forEach((c,i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc((i-1)*32,-2,7+Math.sin(t*4+i)*1.5,0,Math.PI*2);ctx.fill();});}
    ctx.shadowBlur=0;ctx.restore();
  }

  function drawSign(s){ctx.fillStyle='#5a3b25';ctx.fillRect(s.x-5,s.y,10,55);ctx.fillStyle='#8a633a';roundedRect(s.x-55,s.y-28,110,36,5);ctx.fill();}

  function drawScentTrails(t) {
    if(player.scent<=0)return;
    const targets = ribbons.filter(r=>!r.picked).map(r=>({x:r.x,y:r.y,color:r.color}));
    if(!gate.open)targets.push({x:lever.x,y:lever.y,color:'#ffad6b'});
    targets.forEach(target=>{
      const dx=target.x-player.x,dy=target.y-player.y,d=Math.hypot(dx,dy),nx=dx/d,ny=dy/d;
      const count=Math.min(18,Math.floor(d/60));
      for(let i=1;i<=count;i++){
        const px=player.x+nx*i*58,py=player.y+ny*i*58;
        const pulse=.45+.45*Math.sin(t*5-i*.8);
        ctx.globalAlpha=.28+pulse*.5;ctx.fillStyle=target.color;ctx.beginPath();ctx.arc(px,py,4+pulse*3,0,Math.PI*2);ctx.fill();
      }
    });ctx.globalAlpha=1;
  }

  function drawFox(t) {
    ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.facing);
    const bob=Math.sin(player.walkT)*2;
    ctx.translate(0,bob);
    ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(-2,18,34,12,0,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.rotate(-.35+Math.sin(t*4)*.12);ctx.fillStyle='#d66b32';ctx.beginPath();ctx.ellipse(-36,8,42,16,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#f2e4c9';ctx.beginPath();ctx.ellipse(-67,18,18,11,0,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.fillStyle='#dd7638';ctx.beginPath();ctx.ellipse(0,3,34,20,0,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(27,-5,21,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.moveTo(18,-21);ctx.lineTo(21,-47);ctx.lineTo(33,-23);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(32,-22);ctx.lineTo(45,-43);ctx.lineTo(45,-16);ctx.closePath();ctx.fill();
    ctx.fillStyle='#f5ead3';ctx.beginPath();ctx.moveTo(32,4);ctx.lineTo(52,3);ctx.lineTo(34,15);ctx.lineTo(19,13);ctx.closePath();ctx.fill();
    ctx.fillStyle='#1e1c19';ctx.beginPath();ctx.arc(49,2,4,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(34,-8,2.6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#3a2c24';ctx.fillRect(-9,15,8,18);ctx.fillRect(15,14,8,18);
    if(player.swish>0){ctx.strokeStyle='rgba(255,231,176,.75)';ctx.lineWidth=5;ctx.beginPath();ctx.arc(-25,4,58,-1.6,1.5);ctx.stroke();}
    ctx.restore();
  }

  function drawParticles() {
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;
    for(const w of swishWaves){ctx.globalAlpha=w.life/w.max;ctx.strokeStyle='#ffe7ae';ctx.lineWidth=4;ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,Math.PI*2);ctx.stroke();}ctx.globalAlpha=1;
  }

  function drawNearbyHint() {
    if(currentDialogue)return;
    let nearest=Infinity;
    [...npcs,...signs,[lever]].flat().forEach(o=>{if(o&&o.x!==undefined)nearest=Math.min(nearest,dist(player.x,player.y,o.x,o.y));});
    nearest=Math.min(nearest,dist(player.x,player.y,shrine.x,shrine.y));
    if(nearest<90){ctx.save();ctx.translate(player.x,player.y-55);ctx.fillStyle='rgba(15,20,16,.85)';roundedRect(-44,-15,88,30,15);ctx.fill();ctx.fillStyle='#fff4d8';ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillText('E  INTERACT',0,5);ctx.restore();}
  }

  function draw() {
    const t=performance.now()/1000;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.save();ctx.translate(-camera.x,-camera.y);
    drawGround();
    drawScentTrails(t);
    houses.forEach(drawHouse);
    trees.forEach(drawTree);
    berryBushes.forEach(drawBush);
    signs.forEach(drawSign);
    drawLever();drawShrine(t);
    ribbons.forEach(r=>drawRibbon(r,t));
    npcs.forEach(drawNpc);
    drawParticles();
    drawFox(t);drawNearbyHint();
    ctx.restore();

    if(player.scent>0){
      const g=ctx.createRadialGradient(canvas.width/2,canvas.height/2,120,canvas.width/2,canvas.height/2,700);
      g.addColorStop(0,'rgba(77,172,181,0)');g.addColorStop(1,'rgba(15,48,53,.35)');ctx.fillStyle=g;ctx.fillRect(0,0,canvas.width,canvas.height);
    }
  }

  function loop(now) {
    const dt=Math.min(.033,(now-lastTime)/1000);lastTime=now;
    update(dt);draw();requestAnimationFrame(loop);
  }

  window.addEventListener('keydown',e=>{
    keys[e.code]=true;
    if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
    if(e.repeat)return;
    if(e.code==='KeyE')interact();
    if(e.code==='KeyQ')activateScent();
    if(e.code==='Space')tailSwish();
    if(e.code==='Escape'&&currentDialogue)advanceDialogue();
  });
  window.addEventListener('keyup',e=>keys[e.code]=false);
  window.addEventListener('blur',()=>{Object.keys(keys).forEach(k=>keys[k]=false);Object.keys(touch).forEach(k=>touch[k]=false);saveGame();});

  document.querySelectorAll('[data-touch]').forEach(btn=>{
    const action=btn.dataset.touch;
    const down=e=>{e.preventDefault();if(['up','down','left','right'].includes(action))touch[action]=true;else if(action==='interact')interact();else if(action==='scent')activateScent();else if(action==='swish')tailSwish();};
    const up=e=>{e.preventDefault();if(['up','down','left','right'].includes(action))touch[action]=false;};
    btn.addEventListener('pointerdown',down);btn.addEventListener('pointerup',up);btn.addEventListener('pointercancel',up);btn.addEventListener('pointerleave',up);
  });
  dialogueBox.addEventListener('pointerdown',()=>{if(currentDialogue)advanceDialogue();});

  startBtn.addEventListener('click',()=>begin(false));
  continueBtn.addEventListener('click',()=>begin(true));
  continueBtn.style.display=localStorage.getItem(SAVE_KEY)?'block':'none';
  muteBtn.addEventListener('click',()=>{muted=!muted;muteBtn.textContent=muted?'🔇':'🔊';});
  window.addEventListener('beforeunload',saveGame);

  requestAnimationFrame(loop);
})();
