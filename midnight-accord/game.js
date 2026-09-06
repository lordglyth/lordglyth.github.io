const cast = {
  seraphine:{name:'Seraphine Vale',type:'Vampire • Accord Envoy',image:ASSETS.seraphine,desc:'Elegant, dangerous, and infuriatingly controlled. She has spent a century learning how not to want what she wants.',tags:['bisexual','guarded','protective']},
  nora:{name:'Nora Mercer',type:'Human • Occult Archivist',image:ASSETS.nora,desc:'Warm until she is cornered, brilliant when everyone else panics. Nora knows the city’s secrets because she catalogs them.',tags:['bisexual','clever','loyal']},
  liv:{name:'Liv Sable',type:'Moon-Shifter • Courier',image:ASSETS.liv,desc:'A sarcastic courier for the hidden factions. She breaks rules mostly to prove they were badly written.',tags:['bisexual','rebel','fierce']},
  elise:{name:'Elise Rowan',type:'Witch • Ember Circle',image:ASSETS.elise,desc:'A fire-working witch with a soft voice and a ruthless sense for lies. Her calm is not the same thing as mercy.',tags:['bisexual','mystic','intense']}
};

const scenes = {
  title:{chapter:'CHAPTER ONE — THE MARK',bg:ASSETS.lake,loc:'Bellwether Bay',speaker:null,text:`The ferry reaches Bellwether Bay at 11:47 PM. The city rises from the water in black glass, old stone, and a hundred windows that seem to be watching.`,next:'arrival2'},
  arrival2:{chapter:'CHAPTER ONE — THE MARK',bg:ASSETS.lake,loc:'Ferry Terminal',speaker:'nora',text:`"You must be {name}." The blonde woman holding a red umbrella smiles like she has been waiting longer than she admits. "Nora Mercer. Your landlord asked me to get you settled. Bellwether has a way of eating newcomers alive."`,choices:[
    {text:'"Good thing I bite back."',aff:'nora',delta:2,next:'walk'},
    {text:'"That is a weird thing to say to a stranger."',next:'walk'},
    {text:'"Are you always this cheerful at midnight?"',aff:'nora',delta:1,next:'walk'}]},
  walk:{chapter:'CHAPTER ONE — THE MARK',bg:ASSETS.manor,loc:'Old Quarter',speaker:'nora',text:`Nora leads you uphill through a neighborhood of iron gates and ivy-choked brick. Your new building sits opposite a mansion that should have been condemned fifty years ago. Every window is dark except one.`,next:'mark'},
  mark:{chapter:'CHAPTER ONE — THE MARK',bg:ASSETS.clues,loc:'Your Apartment',speaker:null,text:`On your door is a symbol drawn in silver dust: a circle split by four vertical lines. The instant you touch it, a word that is not a voice passes through your skull. WITNESS.`,choices:[
    {text:'Tell Nora exactly what happened.',aff:'nora',delta:2,flag:'honest',next:'noraReact'},
    {text:'Pretend you saw nothing.',flag:'secretive',next:'night'},
    {text:'Photograph the symbol before it fades.',flag:'evidence',next:'night'}]},
  noraReact:{chapter:'CHAPTER ONE — THE MARK',bg:ASSETS.clues,loc:'Your Apartment',speaker:'nora',text:`Nora goes still. Not confused. Not skeptical. Afraid. "If you heard it, then the mark took. Do not open your door for anyone after midnight unless I am with them."`,next:'night'},
  night:{chapter:'CHAPTER ONE — THE MARK',bg:ASSETS.manor,loc:'Across the Street',speaker:null,text:`At 2:13 AM, glass shatters across the street. You look out in time to see a woman leap from the mansion’s third floor and land without bending her knees. She looks up. Straight at you.`,next:'seraphineMeet'},
  seraphineMeet:{chapter:'CHAPTER ONE — THE MARK',bg:ASSETS.manor,loc:'Rain Alley',speaker:'seraphine',text:`Ten minutes later she is in the alley behind your building, dry despite the rain. "You were marked tonight." Her eyes are pale and merciless. "That means someone has entered you into the Accord without your consent."`,choices:[
    {text:'"Start explaining from the beginning."',aff:'seraphine',delta:1,next:'reveal'},
    {text:'"You jumped three floors. Explain that first."',aff:'seraphine',delta:2,next:'reveal'},
    {text:'Back away and call Nora.',aff:'nora',delta:1,next:'noraReturns'}]},
  noraReturns:{chapter:'CHAPTER ONE — THE MARK',bg:ASSETS.manor,loc:'Rain Alley',speaker:'nora',text:`Nora arrives breathless, sees the dark-haired stranger, and swears. "Seraphine. Of course it is you." Seraphine smiles without warmth. "Archivist."`,next:'reveal'},
  reveal:{chapter:'CHAPTER TWO — THE GLASSHOUSE',bg:ASSETS.coven,loc:'The Glasshouse',speaker:'seraphine',text:`By dawn you are seated in a hidden club beneath an abandoned conservatory. Seraphine gives you the short version: vampires, witches, moon-shifters, and a handful of human witnesses have lived under a secret treaty for generations. The treaty is called the Midnight Accord.`,next:'rules'},
  rules:{chapter:'CHAPTER TWO — THE GLASSHOUSE',bg:ASSETS.coven,loc:'The Glasshouse',speaker:'nora',text:`"The old rule was secrecy at any cost," Nora says. "The modern Accord is messier. If a human learns the truth, a tribunal decides whether they keep the knowledge, take a memory seal, or receive a sponsor." She glances at you. "You skipped all three. Someone marked you first."`,choices:[
    {text:'"Then I want to know who."',flag:'investigator',next:'livEnter'},
    {text:'"I want the truth, not a memory seal."',flag:'truth',aff:'nora',delta:1,next:'livEnter'},
    {text:'"And if I refuse the Accord entirely?"',flag:'defiant',next:'livEnter'}]},
  livEnter:{chapter:'CHAPTER TWO — THE GLASSHOUSE',bg:ASSETS.coven,loc:'The Glasshouse',speaker:'liv',text:`"Then you become everybody's administrative nightmare." A brunette drops into the chair beside you, smelling like rain and motor oil. "Liv Sable. Courier. Occasional bad influence. You are the first unregistered Witness in seventeen years."`,choices:[
    {text:'"Occasional?"',aff:'liv',delta:2,next:'eliseEnter'},
    {text:'"Do you know who marked me?"',aff:'liv',delta:1,next:'eliseEnter'},
    {text:'Ignore the flirting and study the room.',next:'eliseEnter'}]},
  eliseEnter:{chapter:'CHAPTER TWO — THE GLASSHOUSE',bg:ASSETS.clues,loc:'The Glasshouse',speaker:'elise',text:`A red-haired woman places a burned scrap of paper on the table. "The mark is not an invitation," Elise Rowan says. "It is a claim." A tiny ember moves across her fingertip without burning her. "Someone believes you belong to them."`,choices:[
    {text:'"You are doing that fire thing on purpose, right?"',aff:'elise',delta:1,next:'attack'},
    {text:'"Can you trace the mark?"',aff:'elise',delta:2,next:'attack'},
    {text:'"I belong to myself."',flag:'selfowned',next:'attack'}]},
  attack:{chapter:'CHAPTER TWO — THE GLASSHOUSE',bg:ASSETS.coven,loc:'The Glasshouse',speaker:null,text:`The club lights die. Something hits the front doors hard enough to buckle steel. In the darkness, your silver mark burns beneath your skin—and suddenly you can feel every lie in the room like a wrong note.`,choices:[
    {text:'Reach for Seraphine.',aff:'seraphine',delta:2,routeHint:'seraphine',next:'power'},
    {text:'Stay with Nora.',aff:'nora',delta:2,routeHint:'nora',next:'power'},
    {text:'Follow Liv toward the service tunnel.',aff:'liv',delta:2,routeHint:'liv',next:'power'},
    {text:'Trust Elise to hold the doorway.',aff:'elise',delta:2,routeHint:'elise',next:'power'}]},
  power:{chapter:'CHAPTER THREE — WITNESS',bg:ASSETS.manor,loc:'Under Bellwether',speaker:null,text:`The attack lasts four minutes. You survive because the mark changes you. You can hear falsehoods. Not thoughts, not emotions—lies. Every deliberate lie rings in your teeth like struck glass. The women around you realize it at the same time.`,next:'aftermath'},
  aftermath:{chapter:'CHAPTER THREE — WITNESS',bg:ASSETS.lake,loc:'Seawall',speaker:'seraphine',text:`At sunrise, Seraphine finds you on the seawall. "Witnesses are supposed to observe us," she says. "You may be something else." Her gaze drops to your mouth, then returns to your eyes. "And that makes you dangerous to people who survive by hiding things."`,choices:[
    {text:'"Are you one of those people?"',aff:'seraphine',delta:2,next:'routeSelect'},
    {text:'"You sound worried about me."',aff:'seraphine',delta:2,next:'routeSelect'},
    {text:'"I have three other women I can ask."',next:'routeSelect'}]},
  routeSelect:{chapter:'CHAPTER THREE — WITNESS',bg:ASSETS.lake,loc:'Bellwether Bay',speaker:null,text:`By evening, four messages wait on your phone. Each woman has found a different piece of the same mystery. You only have time to follow one lead before the tribunal meets.`,choices:[
    {text:'Meet Seraphine at the abandoned chapel.',route:'seraphine',next:'seraphineRoute'},
    {text:'Join Nora in the sealed city archive.',route:'nora',next:'noraRoute'},
    {text:'Ride with Liv to the old freight tunnels.',route:'liv',next:'livRoute'},
    {text:'Follow Elise into the Ember Circle greenhouse.',route:'elise',next:'eliseRoute'}]},
  seraphineRoute:{chapter:'SERAPHINE ROUTE — BLOOD & GLASS',bg:ASSETS.intimacy,loc:'Abandoned Chapel',speaker:'seraphine',text:`Seraphine admits the mark resembles one used by her own vampire house before the Accord. "I thought those rituals died with my maker." For the first time, her composure fractures. "If my house chose you, I need to know why before they decide to collect."`,choices:[
    {text:'Take her hand. "Then we find out together."',aff:'seraphine',delta:3,next:'ending'},
    {text:'"No more half-truths between us."',aff:'seraphine',delta:2,next:'ending'}]},
  noraRoute:{chapter:'NORA ROUTE — THE HUMAN FILE',bg:ASSETS.clues,loc:'Sealed City Archive',speaker:'nora',text:`Nora opens a ledger from 1909. Your family name is inside. Not as vampire, witch, or shifter—but as Witness. "Your bloodline helped write the modern Accord," she whispers. "Someone erased that history. Maybe they were afraid you would inherit the same gift."`,choices:[
    {text:'"You believed me before anyone else did."',aff:'nora',delta:3,next:'ending'},
    {text:'Lean closer over the ledger. "Show me everything."',aff:'nora',delta:2,next:'ending'}]},
  livRoute:{chapter:'LIV ROUTE — RUN WITH WOLVES',bg:ASSETS.lake,loc:'Freight Tunnels',speaker:'liv',text:`Liv shifts only halfway—eyes bright, nails sharpening, senses turning feral. She tracks the silver dust to a locked tunnel beneath city hall. "Somebody in the Accord itself marked you," she says. "Which means the monster under your bed has a committee badge."`,choices:[
    {text:'"Good. I hate committees."',aff:'liv',delta:3,next:'ending'},
    {text:'Kiss her before the next bad idea.',aff:'liv',delta:3,next:'ending'}]},
  eliseRoute:{chapter:'ELISE ROUTE — EMBER TRUTH',bg:ASSETS.coven,loc:'Ember Circle Greenhouse',speaker:'elise',text:`Elise burns the mark’s residue in a copper bowl. The flame turns white. "It is keyed to your choices," she says. "Not your blood. The more freely you choose, the weaker the claim becomes." She smiles faintly. "Whoever marked you made one mistake. They assumed desire was ownership."`,choices:[
    {text:'"Then help me burn their claim to ash."',aff:'elise',delta:3,next:'ending'},
    {text:'"I choose you to help me."',aff:'elise',delta:3,next:'ending'}]},
  ending:{chapter:'EPISODE ONE — END',bg:ASSETS.intimacy,loc:'Bellwether Bay',speaker:null,text:`By midnight, the tribunal summons you by your full name. You now know three things: the hidden world is real, your family was part of it, and someone powerful wants to own the gift waking inside you. You also know who you want beside you when you walk into that room.`,choices:[
    {text:'Save Episode One and return home.',saveEnd:true,next:'title'}
  ]}
};

let state = {
  player:{name:'Alex',gender:'woman',pronouns:'she/her',orientation:'bisexual',skin:'#f2d2bd',hairStyle:'shag',hair:'#17141a',eyes:'#879a89',wardrobe:'street',personality:'bold'},
  scene:'title', affection:{seraphine:0,nora:0,liv:0,elise:0}, flags:{}, route:null
};

const $ = s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
const screens={title:$('#screen-title'),creator:$('#screen-creator'),game:$('#screen-game'),gallery:$('#screen-gallery')};
function showScreen(name){Object.values(screens).forEach(x=>x.classList.remove('active'));screens[name].classList.add('active');window.scrollTo(0,0)}
function interpolate(t){return t.replaceAll('{name}',state.player.name)}
function save(){localStorage.setItem('midnightAccordSave',JSON.stringify(state));toast('Game saved')}
function load(){const raw=localStorage.getItem('midnightAccordSave');if(!raw){toast('No save found');return}try{state=JSON.parse(raw);showScreen('game');renderScene()}catch{toast('Save could not be read')}}
function toast(msg){const el=document.createElement('div');el.textContent=msg;Object.assign(el.style,{position:'fixed',zIndex:99,bottom:'20px',left:'50%',transform:'translateX(-50%)',background:'#151016',border:'1px solid #6d3941',padding:'10px 14px',borderRadius:'999px',boxShadow:'0 10px 40px #000'});document.body.appendChild(el);setTimeout(()=>el.remove(),1600)}

function creatorPreview(){
  const avatar=$('#avatar-preview');avatar.className=`avatar-preview gender-${state.player.gender} style-${state.player.hairStyle} wardrobe-${state.player.wardrobe}`;
  document.documentElement.style.setProperty('--skin',state.player.skin);document.documentElement.style.setProperty('--hair',state.player.hair);document.documentElement.style.setProperty('--eyes',state.player.eyes);
  const outfit={street:'#151821',academia:'#302a27',velvet:'#5a1422',rebel:'#242027',soft:'#4b4b53'}[state.player.wardrobe];document.documentElement.style.setProperty('--outfit',outfit);
  $('#preview-name').textContent=state.player.name||'Alex';$('#preview-identity').textContent=`${state.player.gender==='woman'?'Woman • she/her':'Man • he/him'} • bisexual`;$('#preview-style').textContent={street:'Midnight Street',academia:'Dark Academia',velvet:'Velvet Formal',rebel:'Rebel',soft:'Soft Noir'}[state.player.wardrobe];
}
function openCreator(){showScreen('creator');creatorPreview()}
function startStory(){state.scene='title';state.affection={seraphine:0,nora:0,liv:0,elise:0};state.flags={};state.route=null;showScreen('game');renderScene()}
function renderRels(){const wrap=$('#relationship-strip');wrap.innerHTML=Object.entries(cast).map(([k,v])=>`<div class="rel-chip">${v.name.split(' ')[0]} <b>♥ ${state.affection[k]}</b></div>`).join('')}
function renderScene(){
  const sc=scenes[state.scene]; if(!sc){state.scene='title';return renderScene()}
  $('#chapter-label').textContent=sc.chapter;$('#location-name').textContent=sc.loc||'';$('#scene-bg').style.backgroundImage=`url('${sc.bg}')`;renderRels();
  const p=$('#portrait-wrap'),img=$('#speaker-portrait');
  if(sc.speaker&&cast[sc.speaker]){p.classList.add('show');img.src=cast[sc.speaker].image;$('#speaker-name').textContent=cast[sc.speaker].name}else{p.classList.remove('show');$('#speaker-name').textContent=''}
  $('#dialogue-text').textContent=interpolate(sc.text);const choices=$('#choice-list');choices.innerHTML='';const cont=$('#continue-btn');cont.classList.remove('show');
  if(sc.choices){sc.choices.forEach((c,i)=>{const b=document.createElement('button');b.textContent=c.text;b.onclick=()=>choose(c);choices.appendChild(b)})}else{cont.classList.add('show');cont.onclick=()=>{state.scene=sc.next;renderScene()}}
}
function choose(c){if(c.aff)state.affection[c.aff]=(state.affection[c.aff]||0)+(c.delta||1);if(c.flag)state.flags[c.flag]=true;if(c.routeHint)state.flags.routeHint=c.routeHint;if(c.route)state.route=c.route;if(c.saveEnd)save();state.scene=c.next;renderScene()}
function renderGallery(){const grid=$('#gallery-grid');grid.innerHTML=Object.values(cast).map(c=>`<article class="cast-card"><img src="${c.image}" alt="${c.name}"><div class="card-body"><div class="type">${c.type}</div><h2>${c.name}</h2><p>${c.desc}</p><div class="tags">${c.tags.map(t=>`<span>${t}</span>`).join('')}</div></div></article>`).join('')}

document.addEventListener('click',e=>{
  const action=e.target.closest('[data-action]')?.dataset.action;if(!action)return;
  if(action==='new-game')openCreator();if(action==='load-game')load();if(action==='show-gallery'){renderGallery();showScreen('gallery')}
  if(action==='home')showScreen('title');if(action==='start-story')startStory();if(action==='save-game')save();
});
$$('[data-gender]').forEach(b=>b.onclick=()=>{$$('[data-gender]').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');state.player.gender=b.dataset.gender;state.player.pronouns=b.dataset.gender==='woman'?'she/her':'he/him';creatorPreview()});
$('#player-name').addEventListener('input',e=>{state.player.name=e.target.value.trim()||'Alex';creatorPreview()});
$('#skin-tone').onchange=e=>{state.player.skin=e.target.value;creatorPreview()};$('#hair-style').onchange=e=>{state.player.hairStyle=e.target.value;creatorPreview()};$('#hair-color').onchange=e=>{state.player.hair=e.target.value;creatorPreview()};$('#eye-color').onchange=e=>{state.player.eyes=e.target.value;creatorPreview()};$('#wardrobe').onchange=e=>{state.player.wardrobe=e.target.value;creatorPreview()};$('#personality').onchange=e=>state.player.personality=e.target.value;
document.querySelector('.title-screen').style.backgroundImage=`url('${ASSETS.cover}')`;
renderGallery();creatorPreview();
