const paths={
  ember:{name:'The Ember Path',icon:'🔥',tagline:'You move first, learn fast, and refuse to live half-awake.',body:'You are driven by courage, appetite, momentum, and a strong dislike of being controlled. You do best when there is something real to chase, defend, build, or break open.',traits:['bold','protective','impatient','resourceful','hard to intimidate']},
  moon:{name:'The Moon Path',icon:'🌙',tagline:'You notice what everyone else walks past.',body:'You are intuitive, imaginative, private, and unusually sensitive to atmosphere. You tend to read subtext before people finish explaining themselves, and you need room to follow odd connections.',traits:['intuitive','creative','observant','private','symbol-minded']},
  thorn:{name:'The Thorn Path',icon:'🌿',tagline:'Soft does not mean easy to move.',body:'You are persistent, loyal, grounded, and surprisingly difficult to uproot. You value trust earned over time and tend to protect people, animals, places, or principles once they become yours.',traits:['loyal','steady','stubborn','caring','practical']},
  storm:{name:'The Storm Path',icon:'⚡',tagline:'Your mind changes direction faster than the room can keep up.',body:'You are restless, curious, inventive, and allergic to boring answers. You thrive on patterns, experiments, strange tools, and turning frustration into a new system that works better.',traits:['curious','inventive','restless','independent','pattern-seeking']}
};

const questions=[
  ['INSTINCT','A locked door appears where there was no door yesterday. What do you do?',[
    ['Try the handle immediately.','You can think after you know whether it opens.','ember'],
    ['Study the frame, symbols, and shadows first.','The details are probably the real message.','moon'],
    ['Check whether anyone else is in danger before touching it.','A mystery can wait if someone needs help.','thorn'],
    ['Test it from six different angles and look for a workaround.','There is always another interface.','storm']]],
  ['POWER','Which kind of power is hardest for you to resist?',[
    ['The power to act without permission.','Freedom beats prestige.','ember'],
    ['The power to see what is hidden.','Knowing the unseen changes everything.','moon'],
    ['The power to keep what you love safe.','Protection matters more than spectacle.','thorn'],
    ['The power to understand how anything works.','Give you the mechanism and you will remake it.','storm']]],
  ['CONFLICT','Someone underestimates you. Your first impulse?',[
    ['Prove them wrong in public.','A demonstration is efficient.','ember'],
    ['Remember exactly what they revealed about themselves.','Information has a long shelf life.','moon'],
    ['Ignore them unless they threaten someone you care about.','Not every insult deserves energy.','thorn'],
    ['Outbuild them.','The best reply is a system they cannot dismiss.','storm']]],
  ['PLACE','Which place feels most like it could contain a secret meant for you?',[
    ['An abandoned tower during a thunderstorm.','Danger plus a view. Perfect.','ember'],
    ['A moonlit forest where the path keeps changing.','The uncertainty is part of the invitation.','moon'],
    ['An overgrown cottage with animals living nearby.','Someone cared for this place once.','thorn'],
    ['A sealed laboratory full of obsolete machines.','Obsolete does not mean useless.','storm']]],
  ['TRUST','What earns your trust fastest?',[
    ['Someone who shows up when things get ugly.','Action counts.','ember'],
    ['Someone who understands what you meant without forcing you to overexplain.','Recognition matters.','moon'],
    ['Someone consistent over a long stretch of time.','Reliability is the proof.','thorn'],
    ['Someone willing to question the obvious answer with you.','Shared curiosity is intimacy.','storm']]],
  ['RULES','A rule makes no sense and hurts people. What is your relationship to it?',[
    ['Break it.','A bad rule forfeits obedience.','ember'],
    ['Learn why it exists before deciding how to move around it.','Context can expose the weak point.','moon'],
    ['Protect people from it while pushing for a durable fix.','Survival first, repair second.','thorn'],
    ['Reverse-engineer the system that created it.','Fix the architecture, not the symptom.','storm']]],
  ['MAGIC','Pick a magical tool.',[
    ['A blade that cuts through barriers but only when you mean it.','Direct and decisive.','ember'],
    ['A mirror that shows emotional echoes left in a room.','Places remember things.','moon'],
    ['A lantern that makes any shelter feel safe.','Sanctuary is a kind of power.','thorn'],
    ['A brass device that can translate any machine, spell, or language.','Universal debug mode.','storm']]],
  ['FEAR','Which failure bothers you most?',[
    ['Freezing when action mattered.','You would rather move and adjust.','ember'],
    ['Missing a sign that was right in front of you.','You hate realizing the pattern too late.','moon'],
    ['Letting someone down after they relied on you.','Responsibility sticks.','thorn'],
    ['Being trapped with no way to change the system.','Helplessness feels like bad design.','storm']]],
  ['COMPANION','Choose a companion for a dangerous journey.',[
    ['A fierce creature that commits instantly.','No hesitation when it counts.','ember'],
    ['A quiet creature that senses things before you do.','Warnings matter.','moon'],
    ['A stubborn animal that always finds its way home.','Steady beats flashy.','thorn'],
    ['A weird little construct that keeps learning new tricks.','Obviously you are upgrading it.','storm']]],
  ['REWARD','At the end of the quest, what reward would actually satisfy you?',[
    ['Complete freedom to choose what happens next.','No leash, no gatekeeper.','ember'],
    ['The answer to one mystery that has haunted you for years.','Closure through understanding.','moon'],
    ['A permanent home where your people are safe.','A place that cannot be taken lightly.','thorn'],
    ['A workshop and access to every tool you could want.','Now the real projects begin.','storm']]],
  ['REPUTATION','How would you rather be remembered?',[
    ['They could not make me submit.','Defiance with a pulse.','ember'],
    ['I saw what others missed.','Perception became the legacy.','moon'],
    ['I kept something precious alive.','Care leaves evidence.','thorn'],
    ['I made a better way to do it.','Improvement is its own monument.','storm']]],
  ['CHOICE','You find a map with four marked destinations. Which label wins?',[
    ['FORBIDDEN','If someone wrote that, there is definitely something there.','ember'],
    ['FORGOTTEN','What disappears is often more interesting than what survives.','moon'],
    ['HOME','Maybe the whole point was getting somewhere safe.','thorn'],
    ['UNFINISHED','Excellent. Somebody left you a project.','storm']]]
];

let current=0,answersChosen=[];
const $=id=>document.getElementById(id);
const panels=['start','quiz','analyzing','result'];
function show(id){panels.forEach(p=>$(p).classList.toggle('active',p===id));window.scrollTo({top:0,behavior:'smooth'})}
function render(){
  const q=questions[current],pct=Math.round((current/questions.length)*100);
  $('stepText').textContent=`Question ${current+1} of ${questions.length}`;
  $('percentText').textContent=`${pct}%`;
  $('progressBar').style.width=`${pct}%`;
  $('questionKicker').textContent=q[0];$('questionText').textContent=q[1];
  $('answers').innerHTML='';
  q[2].forEach((a,i)=>{const b=document.createElement('button');b.className='answer';b.innerHTML=`<span class="marker">${String.fromCharCode(65+i)}</span><span><span class="answer-title">${a[0]}</span><span class="answer-sub">${a[1]}</span></span>`;b.onclick=()=>choose(a[2]);$('answers').appendChild(b)});
  $('backBtn').style.visibility=current?'visible':'hidden';
}
function choose(path){answersChosen[current]=path;if(current<questions.length-1){current++;render()}else finish()}
function finish(){
  show('analyzing');
  const lines=['Looking at your instincts.','Comparing how you handle power and trust.','Checking what you protect, challenge, and chase.','Your pattern is coming into focus.'];let i=0;
  const timer=setInterval(()=>{i++;if(i<lines.length){$('analysisLine').textContent=lines[i]}else{clearInterval(timer);showResult()}},500)
}
function score(){const s={ember:0,moon:0,thorn:0,storm:0};answersChosen.forEach(x=>s[x]++);return s}
function showResult(){
  const s=score();const winner=Object.keys(s).sort((a,b)=>s[b]-s[a])[0],r=paths[winner],total=answersChosen.length;
  $('resultIcon').textContent=r.icon;$('resultName').textContent=r.name;$('resultTagline').textContent=r.tagline;$('resultBody').textContent=r.body;
  $('traitPills').innerHTML=r.traits.map(t=>`<span class="pill">${t}</span>`).join('');
  $('scoreBars').innerHTML=Object.entries(s).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="score-row"><div class="score-label"><span>${paths[k].icon} ${paths[k].name.replace('The ','')}</span><strong>${Math.round(v/total*100)}%</strong></div><div class="score-track"><div class="score-fill" style="width:${Math.round(v/total*100)}%"></div></div></div>`).join('');
  show('result')
}
$('startBtn').onclick=()=>{show('quiz');render()};
$('backBtn').onclick=()=>{if(current>0){current--;render()}};
$('restartBtn').onclick=()=>{current=0;answersChosen=[];$('copyStatus').textContent='';show('start')};
$('copyBtn').onclick=async()=>{const text=`My Arcane Academy result: ${$('resultName').textContent} — ${$('resultTagline').textContent}`;try{await navigator.clipboard.writeText(text);$('copyStatus').textContent='Copied.'}catch{$('copyStatus').textContent=text}};
