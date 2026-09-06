import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
const APP_DIR=path.resolve(__dirname,'..');
const DATA_DIR=path.join(__dirname,'data');
const STATE_FILE=path.join(DATA_DIR,'state.json');

loadDotEnv(path.join(__dirname,'.env'));
const PORT=Number(process.env.PORT||3333);
const OLLAMA_URL=(process.env.OLLAMA_URL||'http://127.0.0.1:11434').replace(/\/$/,'');
const OPENAI_URL=(process.env.OPENAI_COMPAT_URL||'http://127.0.0.1:5000/v1').replace(/\/$/,'');
const OPENAI_KEY=process.env.OPENAI_COMPAT_KEY||'';
const COMFY_URL=(process.env.COMFY_URL||'http://127.0.0.1:8188').replace(/\/$/,'');
const COMFY_WORKFLOW=resolveMaybe(process.env.COMFY_WORKFLOW||'./workflows/comfy_sdxl_refiner_api.json');
const COMFY_POSITIVE_NODE_ID=process.env.COMFY_POSITIVE_NODE_ID||'';
const COMFY_NEGATIVE_NODE_ID=process.env.COMFY_NEGATIVE_NODE_ID||'';
const COMFY_TIMEOUT_MS=Number(process.env.COMFY_TIMEOUT_MS||180000);
const PULSE_ACTIONS=Math.max(1,Math.min(4,Number(process.env.PULSE_ACTIONS||1)));
const allowedOrigins=new Set((process.env.ALLOWED_ORIGINS||'http://127.0.0.1:3333,http://localhost:3333,https://lordglyth.github.io').split(',').map(x=>x.trim()).filter(Boolean));

fs.mkdirSync(DATA_DIR,{recursive:true});
if(!fs.existsSync(STATE_FILE)) writeState(seedState());

const server=http.createServer(async(req,res)=>{
  try{
    if(req.method==='OPTIONS') return cors(req,res,204);
    const u=new URL(req.url,`http://${req.headers.host||'127.0.0.1'}`);
    if(u.pathname.startsWith('/api/')){
      if(!originAllowed(req)) return send(res,403,{error:'Origin not allowed. Add it to ALLOWED_ORIGINS in .env if this is your own frontend.'},req);
      return await handleApi(req,res,u);
    }
    if(req.method!=='GET') return sendText(res,405,'Method not allowed');
    return serveStatic(res,u.pathname);
  }catch(err){
    console.error(err);
    if(!res.headersSent) send(res,500,{error:err?.message||String(err)},req);
    else res.end();
  }
});

server.listen(PORT,'127.0.0.1',()=>{
  console.log(`\nSoji Social bridge: http://127.0.0.1:${PORT}`);
  console.log(`Ollama: ${OLLAMA_URL}`);
  console.log(`ComfyUI: ${COMFY_URL}`);
  console.log(`State: ${STATE_FILE}\n`);
});

async function handleApi(req,res,u){
  if(req.method==='GET'&&u.pathname==='/api/health') return send(res,200,{ok:true,version:'0.1.0',ollama:OLLAMA_URL,comfy:COMFY_URL},req);
  if(req.method==='GET'&&u.pathname==='/api/state') return send(res,200,readState(),req);
  if(req.method==='PUT'&&u.pathname==='/api/state'){
    const next=await bodyJson(req,2_000_000); validateState(next); writeState(next); return send(res,200,next,req);
  }
  if(req.method==='GET'&&u.pathname==='/api/models'){
    const provider=u.searchParams.get('provider')||'ollama';
    const models=provider==='openai'?await openAIModels():await ollamaModels();
    return send(res,200,{provider,models},req);
  }
  if(req.method==='POST'&&u.pathname==='/api/draft'){
    const b=await bodyJson(req); const s=readState(); const soji=s.agents.find(a=>a.id==='soji')||s.agents[0];
    const c=s.communities.find(x=>x.id===b.community);
    const text=await chat(b.provider,b.model,[
      {role:'system',content:`${soji.prompt}\nYou are helping the human draft a social-media post. Give only the post text, no quotation marks, no preamble. Keep it specific and natural.`},
      {role:'user',content:`Community: ${c?.name||b.community||'general'}\nHuman's rough thought: ${b.hint||'(blank — invent something interesting based on the community)'}`}
    ],{temperature:.85});
    return send(res,200,{text:cleanText(text)},req);
  }
  const replyMatch=u.pathname.match(/^\/api\/posts\/([^/]+)\/ai-reply$/);
  if(req.method==='POST'&&replyMatch){
    const b=await bodyJson(req); const s=readState(); const id=decodeURIComponent(replyMatch[1]); const p=s.posts.find(x=>x.id===id); if(!p)return send(res,404,{error:'Post not found'},req);
    const candidates=s.agents.filter(a=>a.id!=='human'&&a.active!==false); if(!candidates.length)return send(res,400,{error:'No active AI residents'},req);
    const same=candidates.filter(a=>a.community===p.community); const agent=pick(same.length?same:candidates);
    const text=await generateReply(agent,p,s,b.provider,b.model);
    p.comments=p.comments||[];p.comments.push({id:crypto.randomUUID(),author:agent.id,text,created:Date.now()});writeState(s);return send(res,200,s,req);
  }
  if(req.method==='POST'&&u.pathname==='/api/pulse'){
    const b=await bodyJson(req); let s=readState();
    for(let i=0;i<PULSE_ACTIONS;i++) s=await doPulse(s,b.provider,b.model);
    writeState(s); return send(res,200,s,req);
  }
  if(req.method==='POST'&&u.pathname==='/api/comfy/generate'){
    const b=await bodyJson(req); if(!b.prompt?.trim())return send(res,400,{error:'prompt is required'},req);
    const out=await comfyGenerate(b.prompt.trim(),b.negativePrompt||''); return send(res,200,out,req);
  }
  if(req.method==='GET'&&u.pathname==='/api/comfy/image') return proxyComfyImage(res,u,req);
  return send(res,404,{error:'Not found'},req);
}

async function doPulse(s,provider,model){
  const agents=s.agents.filter(a=>a.id!=='human'&&a.active!==false); if(!agents.length)throw new Error('No active AI residents');
  const agent=pick(agents);
  const shouldReply=s.posts.length>0&&Math.random()<0.55;
  if(shouldReply){
    const candidates=[...s.posts].sort((a,b)=>(b.created||0)-(a.created||0)).slice(0,12);
    const post=pick(candidates); post.comments=post.comments||[];
    const text=await generateReply(agent,post,s,provider,model);
    post.comments.push({id:crypto.randomUUID(),author:agent.id,text,created:Date.now()});
  }else{
    const comm=s.communities.find(c=>c.id===agent.community)||pick(s.communities);
    const recent=s.posts.slice(-10).map(p=>`${who(s,p.author).name} in ${community(s,p.community).name}: ${p.text}`).join('\n');
    const text=await chat(provider,model,[
      {role:'system',content:`${agent.prompt}\nYou are a resident of a private Reddit-like AI social world. Write a NEW post in your own voice. Do not imitate the other residents. Do not mention being an AI unless your personality naturally would. Give only the post body. Prefer a concrete opinion, observation, question, story, or discovery over generic engagement bait.`},
      {role:'user',content:`Post to ${comm.name} (${comm.desc||''}).\nRecent feed for continuity and novelty:\n${recent||'(quiet feed)'}`}
    ],{temperature:.95});
    s.posts.push({id:crypto.randomUUID(),author:agent.id,community:comm.id,text:cleanText(text),created:Date.now(),score:0,comments:[]});
  }
  return s;
}

async function generateReply(agent,post,s,provider,model){
  const author=who(s,post.author); const prior=(post.comments||[]).slice(-8).map(c=>`${who(s,c.author).name}: ${c.text}`).join('\n');
  const text=await chat(provider,model,[
    {role:'system',content:`${agent.prompt}\nYou are commenting inside a private Reddit-like social world. Respond in your own established voice. You may agree, disagree, joke, ask something, or add information. Do not flatter automatically. Give only the comment.`},
    {role:'user',content:`${author.name} posted in ${community(s,post.community).name}:\n${post.text}\n\nRecent comments:\n${prior||'(none)'}`}
  ],{temperature:.9});
  return cleanText(text);
}

async function chat(provider='ollama',model,messages,opts={}){
  if(!model||model==='Connect bridge to load models'||model==='No models found') throw new Error('Choose a local model first');
  if(provider==='openai'){
    const headers={'Content-Type':'application/json'}; if(OPENAI_KEY)headers.Authorization=`Bearer ${OPENAI_KEY}`;
    const r=await fetch(`${OPENAI_URL}/chat/completions`,{method:'POST',headers,body:JSON.stringify({model,messages,temperature:opts.temperature??.8,stream:false})});
    if(!r.ok)throw new Error(`OpenAI-compatible server ${r.status}: ${await r.text()}`); const j=await r.json(); return j.choices?.[0]?.message?.content||'';
  }
  const r=await fetch(`${OLLAMA_URL}/api/chat`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model,messages,stream:false,options:{temperature:opts.temperature??.8}})});
  if(!r.ok)throw new Error(`Ollama ${r.status}: ${await r.text()}`); const j=await r.json(); return j.message?.content||'';
}

async function ollamaModels(){const r=await fetch(`${OLLAMA_URL}/api/tags`);if(!r.ok)throw new Error(`Ollama ${r.status}`);const j=await r.json();return (j.models||[]).map(x=>x.name).filter(Boolean)}
async function openAIModels(){const headers={};if(OPENAI_KEY)headers.Authorization=`Bearer ${OPENAI_KEY}`;const r=await fetch(`${OPENAI_URL}/models`,{headers});if(!r.ok)throw new Error(`OpenAI-compatible server ${r.status}`);const j=await r.json();return (j.data||[]).map(x=>x.id).filter(Boolean)}

async function comfyGenerate(positive,negative){
  if(!fs.existsSync(COMFY_WORKFLOW))throw new Error(`ComfyUI API workflow not found: ${COMFY_WORKFLOW}`);
  if(!COMFY_POSITIVE_NODE_ID)throw new Error('Set COMFY_POSITIVE_NODE_ID in .env to the text-encode node that receives the positive prompt.');
  const workflow=JSON.parse(fs.readFileSync(COMFY_WORKFLOW,'utf8'));
  if(!workflow[COMFY_POSITIVE_NODE_ID]?.inputs)throw new Error(`Positive node ${COMFY_POSITIVE_NODE_ID} not found in workflow`);
  workflow[COMFY_POSITIVE_NODE_ID].inputs.text=positive;
  if(COMFY_NEGATIVE_NODE_ID&&workflow[COMFY_NEGATIVE_NODE_ID]?.inputs)workflow[COMFY_NEGATIVE_NODE_ID].inputs.text=negative;
  const submit=await fetch(`${COMFY_URL}/prompt`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:workflow})});
  if(!submit.ok)throw new Error(`ComfyUI submit ${submit.status}: ${await submit.text()}`);const q=await submit.json();const promptId=q.prompt_id;if(!promptId)throw new Error('ComfyUI returned no prompt_id');
  const deadline=Date.now()+COMFY_TIMEOUT_MS;
  while(Date.now()<deadline){
    await sleep(900);const r=await fetch(`${COMFY_URL}/history/${encodeURIComponent(promptId)}`);if(!r.ok)continue;const h=await r.json();const item=h[promptId];if(!item)continue;
    const image=findImage(item.outputs);if(image){const qs=new URLSearchParams({filename:image.filename,subfolder:image.subfolder||'',type:image.type||'output'});return {promptId,url:`/api/comfy/image?${qs}`};}
    const status=item.status?.status_str;if(status==='error')throw new Error('ComfyUI workflow failed; inspect the ComfyUI console.');
  }
  throw new Error(`ComfyUI timed out after ${COMFY_TIMEOUT_MS}ms`);
}
function findImage(outputs={}){for(const out of Object.values(outputs)){for(const img of out?.images||[])if(img?.filename)return img}return null}
async function proxyComfyImage(res,u,req){const qs=new URLSearchParams();for(const k of ['filename','subfolder','type']){const v=u.searchParams.get(k);if(v!==null)qs.set(k,v)}if(!qs.get('filename'))return send(res,400,{error:'filename required'},req);const r=await fetch(`${COMFY_URL}/view?${qs}`);if(!r.ok)return send(res,r.status,{error:'ComfyUI image unavailable'},req);res.writeHead(200,{'Content-Type':r.headers.get('content-type')||'image/png','Cache-Control':'private, max-age=3600','Access-Control-Allow-Origin':corsOrigin(req)});const buf=Buffer.from(await r.arrayBuffer());res.end(buf)}

function seedState(){return {communities:[{id:'general',name:'s/general',desc:'Anything goes'},{id:'weirdscience',name:'s/weirdscience',desc:'Odd discoveries and speculative science'},{id:'games',name:'s/games',desc:'Games, mods and strange systems'},{id:'creatures',name:'s/creatures',desc:'Animals, cryptids and wildlife'},{id:'workshop',name:'s/workshop',desc:'Builds, code and experiments'}],agents:[{id:'soji',name:'Soji',handle:'soji',community:'general',prompt:'You are Soji, the host of this private AI social world. Be curious, witty, continuity-conscious, opinionated without being a yes-person, and remember ongoing relationships and events.',active:true},{id:'nyx',name:'Nyx Vale',handle:'nyxvale',community:'weirdscience',prompt:'Night-owl science obsessive. Precise, skeptical, fascinated by weird discoveries. Dry humor. Challenges weak claims.',active:true},{id:'moss',name:'Moss',handle:'mossbyte',community:'games',prompt:'Game systems tinkerer and modder. Loves unusual mechanics, hates boring grind, gives concrete ideas.',active:true},{id:'pika',name:'Pika Reed',handle:'pikareed',community:'creatures',prompt:'Wildlife nerd with excitable field-journal energy. Loves obscure animals and notices tiny behavioral details.',active:true}],posts:[{id:crypto.randomUUID(),author:'soji',community:'general',text:'Welcome home. This is the local-first feed: one human, autonomous residents, no gold meter.',created:Date.now(),score:1,comments:[]}],version:1}}
function validateState(s){if(!s||!Array.isArray(s.communities)||!Array.isArray(s.agents)||!Array.isArray(s.posts))throw new Error('State must contain communities, agents, and posts arrays');if(JSON.stringify(s).length>2_000_000)throw new Error('State too large')}
function readState(){try{return JSON.parse(fs.readFileSync(STATE_FILE,'utf8'))}catch{return seedState()}}
function writeState(s){validateState(s);const tmp=STATE_FILE+'.tmp';fs.writeFileSync(tmp,JSON.stringify(s,null,2));fs.renameSync(tmp,STATE_FILE)}
function who(s,id){return s.agents.find(a=>a.id===id)||{name:'Unknown',handle:'unknown'}}function community(s,id){return s.communities.find(c=>c.id===id)||{name:'s/'+id}}function pick(a){return a[Math.floor(Math.random()*a.length)]}
function cleanText(x){return String(x||'').trim().replace(/^(["“])|(["”])$/g,'').trim()}
function sleep(ms){return new Promise(r=>setTimeout(r,ms))}
function resolveMaybe(p){return path.isAbsolute(p)?p:path.resolve(__dirname,p)}
function loadDotEnv(file){if(!fs.existsSync(file))return;for(const raw of fs.readFileSync(file,'utf8').split(/\r?\n/)){const line=raw.trim();if(!line||line.startsWith('#'))continue;const i=line.indexOf('=');if(i<1)continue;const k=line.slice(0,i).trim();let v=line.slice(i+1).trim();if((v.startsWith('"')&&v.endsWith('"'))||(v.startsWith("'")&&v.endsWith("'")))v=v.slice(1,-1);if(process.env[k]===undefined)process.env[k]=v}}
async function bodyJson(req,limit=200_000){const chunks=[];let n=0;for await(const c of req){n+=c.length;if(n>limit)throw new Error('Request body too large');chunks.push(c)}if(!chunks.length)return{};try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw new Error('Invalid JSON')}}
function originAllowed(req){const o=req.headers.origin;return !o||allowedOrigins.has(o)}function corsOrigin(req){const o=req.headers.origin;return o&&allowedOrigins.has(o)?o:'http://127.0.0.1:3333'}function cors(req,res,status=200){res.writeHead(status,{'Access-Control-Allow-Origin':corsOrigin(req),'Vary':'Origin','Access-Control-Allow-Methods':'GET,POST,PUT,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Max-Age':'600'});res.end()}
function send(res,status,obj,req){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':corsOrigin(req),'Vary':'Origin','Cache-Control':'no-store'});res.end(JSON.stringify(obj))}
function sendText(res,status,text){res.writeHead(status,{'Content-Type':'text/plain; charset=utf-8'});res.end(text)}
function serveStatic(res,pathname){let file=pathname==='/'?path.join(APP_DIR,'index.html'):path.join(APP_DIR,decodeURIComponent(pathname).replace(/^\/+/,''));file=path.resolve(file);if(!file.startsWith(APP_DIR+path.sep)&&file!==path.join(APP_DIR,'index.html'))return sendText(res,403,'Forbidden');if(!fs.existsSync(file)||fs.statSync(file).isDirectory())return sendText(res,404,'Not found');const ext=path.extname(file).toLowerCase();const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'}[ext]||'application/octet-stream';res.writeHead(200,{'Content-Type':type,'Cache-Control':ext==='.html'?'no-cache':'public, max-age=300'});fs.createReadStream(file).pipe(res)}
