/* Midnight Accord save manager: 3 manual slots + separate autosave. */
(function(){
  'use strict';

  const PREFIX='midnightAccordV2';
  const AUTO_KEY=`${PREFIX}:autosave`;
  const SLOT_KEY=n=>`${PREFIX}:slot:${n}`;
  const LEGACY_KEY='midnightAccordSave';
  let managerMode='load';
  let autosaveTimer=null;

  const clone=value=>JSON.parse(JSON.stringify(value));
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[ch]));

  function makeRecord(kind){
    return {
      version:2,
      kind,
      savedAt:new Date().toISOString(),
      state:clone(state)
    };
  }

  function normalizeRecord(raw){
    if(!raw)return null;
    try{
      const parsed=JSON.parse(raw);
      if(parsed&&parsed.state&&parsed.savedAt)return parsed;
      if(parsed&&parsed.player&&parsed.scene){
        return {version:1,kind:'legacy',savedAt:null,state:parsed};
      }
    }catch(_err){}
    return null;
  }

  function readRecord(key){
    return normalizeRecord(localStorage.getItem(key));
  }

  function writeRecord(key,kind){
    const record=makeRecord(kind);
    localStorage.setItem(key,JSON.stringify(record));
    return record;
  }

  function migrateLegacySave(){
    if(localStorage.getItem(AUTO_KEY))return;
    const legacy=readRecord(LEGACY_KEY);
    if(!legacy)return;
    legacy.kind='autosave';
    legacy.version=2;
    legacy.savedAt=legacy.savedAt||new Date().toISOString();
    localStorage.setItem(AUTO_KEY,JSON.stringify(legacy));
  }

  function formatSavedAt(value){
    if(!value)return 'Earlier save';
    const d=new Date(value);
    if(Number.isNaN(d.getTime()))return 'Saved';
    return d.toLocaleString([],{
      month:'short',day:'numeric',hour:'numeric',minute:'2-digit'
    });
  }

  function describeRecord(record){
    if(!record)return {name:'Empty',chapter:'No save data',location:'',date:''};
    const savedState=record.state||{};
    const player=savedState.player||{};
    const sc=(typeof scenes!=='undefined'&&scenes[savedState.scene])?scenes[savedState.scene]:null;
    return {
      name:player.name||'Unnamed protagonist',
      chapter:sc?.chapter||savedState.scene||'Saved game',
      location:sc?.loc||'',
      date:formatSavedAt(record.savedAt)
    };
  }

  function ensureStyles(){
    if(document.querySelector('#midnight-save-styles'))return;
    const style=document.createElement('style');
    style.id='midnight-save-styles';
    style.textContent=`
      .save-manager{position:fixed;inset:0;z-index:120;display:none;align-items:center;justify-content:center;padding:max(1rem,env(safe-area-inset-top)) max(1rem,env(safe-area-inset-right)) max(1rem,env(safe-area-inset-bottom)) max(1rem,env(safe-area-inset-left));background:rgba(2,2,4,.82);backdrop-filter:blur(12px)}
      .save-manager.open{display:flex}
      .save-panel{width:min(94vw,760px);max-height:88vh;overflow:auto;background:linear-gradient(180deg,#171117,#09070a);border:1px solid rgba(255,255,255,.2);border-radius:1.25rem;box-shadow:0 30px 100px #000;padding:1rem}
      .save-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:.35rem .25rem 1rem;border-bottom:1px solid rgba(255,255,255,.12)}
      .save-head h2{font:700 1.5rem Georgia,serif;margin:0}.save-head p{margin:.3rem 0 0;color:#b9adb2;font-size:.88rem}
      .save-close{width:44px;height:44px;padding:0;border-radius:50%;flex:0 0 auto}
      .save-list{display:grid;gap:.75rem;padding-top:1rem}
      .save-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.8rem;align-items:center;padding:.9rem;border:1px solid rgba(255,255,255,.13);border-radius:.9rem;background:rgba(255,255,255,.035)}
      .save-row.auto{border-color:rgba(214,70,88,.38);background:linear-gradient(90deg,rgba(157,35,51,.13),rgba(255,255,255,.025))}
      .save-copy{min-width:0}.save-label{font-weight:800;color:#f2ece8}.save-row.auto .save-label{color:#ff9aa8}.save-name{font:700 1.08rem Georgia,serif;margin-top:.18rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.save-meta{margin-top:.16rem;color:#b9adb2;font-size:.78rem;line-height:1.35}.save-actions{display:flex;gap:.45rem;flex-wrap:wrap;justify-content:flex-end}.save-actions button{min-width:84px;padding:.68rem .8rem}.save-actions .danger{color:#d9a1aa;background:rgba(90,18,30,.16)}
      .save-empty{opacity:.68}.save-foot{padding:.9rem .2rem .2rem;color:#9f9499;font-size:.76rem;text-align:center}
      #autosave-status{font-size:.68rem;letter-spacing:.12em;color:#c3b9bd;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.4);border-radius:999px;padding:.34rem .54rem;transition:.2s ease;white-space:nowrap}
      #autosave-status.saved{color:#ff9aaa;border-color:rgba(214,70,88,.65);box-shadow:0 0 18px rgba(214,70,88,.14)}
      @media(max-width:640px){.save-manager{padding:.55rem}.save-panel{width:100%;max-height:92vh;border-radius:1rem;padding:.75rem}.save-row{grid-template-columns:1fr;padding:.8rem}.save-actions{justify-content:stretch}.save-actions button{flex:1;min-height:46px}.save-head h2{font-size:1.25rem}#autosave-status{font-size:.58rem;padding:.3rem .42rem}.game-topbar{gap:.35rem}}
    `;
    document.head.appendChild(style);
  }

  function ensureManager(){
    ensureStyles();
    let overlay=document.querySelector('#save-manager');
    if(overlay)return overlay;
    overlay=document.createElement('div');
    overlay.id='save-manager';
    overlay.className='save-manager';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML=`
      <section class="save-panel" role="dialog" aria-modal="true" aria-labelledby="save-manager-title">
        <div class="save-head">
          <div><h2 id="save-manager-title">Load Game</h2><p id="save-manager-subtitle">Choose an autosave or manual slot.</p></div>
          <button class="save-close" type="button" data-save-action="close" aria-label="Close">✕</button>
        </div>
        <div id="save-list" class="save-list"></div>
        <div class="save-foot">Autosave is separate from your three manual slots.</div>
      </section>`;
    document.body.appendChild(overlay);
    overlay.addEventListener('click',event=>{
      if(event.target===overlay){closeManager();return;}
      const btn=event.target.closest('[data-save-action]');
      if(!btn)return;
      const action=btn.dataset.saveAction;
      if(action==='close')closeManager();
      if(action==='save')saveSlot(Number(btn.dataset.slot));
      if(action==='load')loadKey(btn.dataset.key);
      if(action==='clear')clearSlot(Number(btn.dataset.slot));
    });
    return overlay;
  }

  function renderManager(){
    const title=document.querySelector('#save-manager-title');
    const subtitle=document.querySelector('#save-manager-subtitle');
    const list=document.querySelector('#save-list');
    title.textContent=managerMode==='save'?'Save Game':'Load Game';
    subtitle.textContent=managerMode==='save'
      ?'Pick one of three manual slots. Autosave keeps running separately.'
      :'Choose your autosave or one of three manual slots.';

    const auto=readRecord(AUTO_KEY);
    const rows=[{label:'AUTO SAVE',key:AUTO_KEY,record:auto,auto:true}];
    for(let i=1;i<=3;i++)rows.push({label:`SAVE SLOT ${i}`,key:SLOT_KEY(i),record:readRecord(SLOT_KEY(i)),slot:i});

    list.innerHTML=rows.map(row=>{
      const d=describeRecord(row.record);
      const empty=!row.record;
      let actions='';
      if(row.auto){
        actions=row.record?`<button type="button" data-save-action="load" data-key="${esc(row.key)}">Load</button>`:'<button type="button" disabled>Empty</button>';
      }else if(managerMode==='save'){
        actions=`<button class="primary" type="button" data-save-action="save" data-slot="${row.slot}">${row.record?'Overwrite':'Save'}</button>${row.record?`<button type="button" data-save-action="load" data-key="${esc(row.key)}">Load</button><button class="danger" type="button" data-save-action="clear" data-slot="${row.slot}">Clear</button>`:''}`;
      }else{
        actions=row.record?`<button class="primary" type="button" data-save-action="load" data-key="${esc(row.key)}">Load</button><button class="danger" type="button" data-save-action="clear" data-slot="${row.slot}">Clear</button>`:'<button type="button" disabled>Empty</button>';
      }
      return `<article class="save-row ${row.auto?'auto':''} ${empty?'save-empty':''}">
        <div class="save-copy"><div class="save-label">${row.label}</div><div class="save-name">${esc(d.name)}</div><div class="save-meta">${esc(d.chapter)}${d.location?` • ${esc(d.location)}`:''}${d.date?`<br>${esc(d.date)}`:''}</div></div>
        <div class="save-actions">${actions}</div>
      </article>`;
    }).join('');
  }

  function openManager(mode){
    managerMode=mode==='save'?'save':'load';
    const overlay=ensureManager();
    renderManager();
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  }

  function closeManager(){
    const overlay=document.querySelector('#save-manager');
    if(!overlay)return;
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden','true');
    document.body.style.overflow='';
  }

  function saveSlot(slot){
    if(slot<1||slot>3)return;
    writeRecord(SLOT_KEY(slot),`slot-${slot}`);
    renderManager();
    toast(`Saved to Slot ${slot}`);
  }

  function clearSlot(slot){
    if(slot<1||slot>3)return;
    localStorage.removeItem(SLOT_KEY(slot));
    renderManager();
    toast(`Slot ${slot} cleared`);
  }

  function loadKey(key){
    const record=readRecord(key);
    if(!record){toast('That save slot is empty');return;}
    state=clone(record.state);
    closeManager();
    showScreen('game');
    try{creatorPreview();}catch(_err){}
    renderScene();
    toast(key===AUTO_KEY?'Autosave loaded':'Save loaded');
  }

  function installAutosaveIndicator(){
    const bar=document.querySelector('.game-topbar');
    if(!bar||document.querySelector('#autosave-status'))return;
    const status=document.createElement('span');
    status.id='autosave-status';
    status.textContent='AUTO';
    const saveButton=bar.querySelector('[data-action="save-game"]');
    if(saveButton)bar.insertBefore(status,saveButton);else bar.appendChild(status);
  }

  function pulseAutosave(){
    installAutosaveIndicator();
    const status=document.querySelector('#autosave-status');
    if(!status)return;
    status.textContent='AUTO ✓';
    status.classList.add('saved');
    clearTimeout(status._resetTimer);
    status._resetTimer=setTimeout(()=>{status.textContent='AUTO';status.classList.remove('saved');},950);
  }

  function autosaveNow(){
    try{
      if(!state||!state.player||!state.scene)return;
      writeRecord(AUTO_KEY,'autosave');
      pulseAutosave();
    }catch(_err){}
  }

  function queueAutosave(){
    clearTimeout(autosaveTimer);
    autosaveTimer=setTimeout(autosaveNow,180);
  }

  migrateLegacySave();
  ensureStyles();
  installAutosaveIndicator();

  const originalRenderScene=renderScene;
  renderScene=function(){
    const result=originalRenderScene.apply(this,arguments);
    queueAutosave();
    return result;
  };

  document.addEventListener('click',event=>{
    const action=event.target.closest('[data-action]')?.dataset.action;
    if(action==='save-game'){
      event.preventDefault();event.stopImmediatePropagation();openManager('save');
    }
    if(action==='load-game'){
      event.preventDefault();event.stopImmediatePropagation();openManager('load');
    }
  },true);

  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')autosaveNow();});
  window.addEventListener('pagehide',autosaveNow);

  // Make an autosave immediately if the player is already in a game when this script loads.
  if(document.querySelector('#screen-game')?.classList.contains('active'))queueAutosave();
})();
