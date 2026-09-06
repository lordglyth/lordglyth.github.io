/* Player portrait + creator UI patch. Loaded after game.js so existing story logic stays untouched. */
(function(){
  const PLAYER_PHOTOS={
    woman:'https://images.unsplash.com/photo-1771580425815-9dd3f5147de1?auto=format&fit=crop&w=900&h=1200&q=88',
    man:'https://images.unsplash.com/photo-1595152452543-e5fc28ebc2b8?auto=format&fit=crop&w=900&h=1200&q=88'
  };
  const wardrobeNames={street:'Midnight Street',academia:'Dark Academia',velvet:'Velvet Formal',rebel:'Rebel',soft:'Soft Noir'};
  Object.values(PLAYER_PHOTOS).forEach(src=>{const i=new Image();i.src=src});

  function installPlayerPhoto(){
    const avatar=document.querySelector('#avatar-preview');
    if(!avatar)return;
    let img=document.querySelector('#player-real-photo');
    let shade=avatar.querySelector('.player-photo-shade');
    let badge=avatar.querySelector('.player-photo-badge');
    if(!img){
      img=document.createElement('img');
      img.id='player-real-photo';
      img.className='player-real-photo';
      img.decoding='async';
      img.alt='Photoreal protagonist preview';
      img.addEventListener('error',()=>{avatar.classList.remove('real-photo-preview');img.style.display='none'});
      img.addEventListener('load',()=>{img.style.display='block';avatar.classList.add('real-photo-preview')});
      avatar.prepend(img);
    }
    if(!shade){shade=document.createElement('div');shade.className='player-photo-shade';avatar.appendChild(shade)}
    if(!badge){badge=document.createElement('div');badge.className='player-photo-badge';avatar.appendChild(badge)}
    const gender=state.player.gender==='man'?'man':'woman';
    const next=PLAYER_PHOTOS[gender];
    if(img.src!==next)img.src=next;
    img.style.objectPosition=gender==='man'?'center 24%':'center 18%';
    badge.textContent=`${gender==='man'?'Man':'Woman'} • ${wardrobeNames[state.player.wardrobe]||'Custom look'}`;
    avatar.classList.add('real-photo-preview');
  }

  const previousCreatorPreview=creatorPreview;
  creatorPreview=function(){
    previousCreatorPreview();
    installPlayerPhoto();
  };

  creatorPreview();
})();
