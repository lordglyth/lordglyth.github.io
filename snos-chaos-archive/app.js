const POSTS = [
  {
    id:"internet-had-fingerprints",
    title:"The Internet Was Better When Websites Had Fingerprints",
    category:"Rants & Raves",
    date:"Sep 28, 2026",
    accent:"#9b5cff",
    excerpt:"I don't want every page to look like the same startup wearing a different logo. Give me weird buttons, strange corners and proof that a human lived here.",
    body:[
      "There was a time when opening somebody’s website felt like opening the door to their room. You could tell what they loved before you read a word.",
      "Modern design is cleaner, faster and usually easier to use — but somewhere along the way a lot of the personality got pressure-washed off.",
      "This archive is my argument for putting some of it back.",
      "<h3>The rule here</h3><p>If an idea makes the site slightly stranger without making it miserable to use, it probably belongs.</p>",
      "<blockquote>Personal websites should have fingerprints.</blockquote>"
    ]
  },
  {
    id:"ai-chaos-lab",
    title:"AI Is More Fun When It Becomes a Project",
    category:"AI Chaos",
    date:"Sep 27, 2026",
    accent:"#4de4ff",
    excerpt:"Models are neat. Making them do something weird, useful, interactive or completely unnecessary is better.",
    body:[
      "The interesting part is rarely the blank chat box. It is what happens when an idea turns into a tool, a character, a game mechanic, a writing machine or something that absolutely did not need to exist.",
      "This category is where those experiments go."
    ]
  },
  {
    id:"purrble-log",
    title:"Project Log: Purrble",
    category:"Projects",
    date:"Sep 25, 2026",
    accent:"#ff58bd",
    excerpt:"A virtual-pet idea that keeps growing extra limbs every time I touch it.",
    body:[
      "Purrble is one of those projects that refuses to stay a small idea. Every feature suggests three more features.",
      "This archive can hold the design notes, updates and odd little breakthroughs without forcing them into a corporate project page."
    ]
  },
  {
    id:"games-need-weird",
    title:"Games Need More Weird Little Systems",
    category:"Games",
    date:"Sep 23, 2026",
    accent:"#ffc857",
    excerpt:"Give me secret caves, bizarre creatures, tiny mechanics and things nobody explains until I accidentally discover them.",
    body:[
      "A polished map marker can get me to the objective. A weird system can make me remember the game years later.",
      "The best discoveries feel like the developers hid something specifically for the nosiest player."
    ]
  },
  {
    id:"witchy-digital-grimoire",
    title:"What Would a Digital Grimoire Look Like If It Was Actually Fun?",
    category:"Witchy Stuff",
    date:"Sep 21, 2026",
    accent:"#bc8cff",
    excerpt:"Not a beige notes app with a moon icon. I mean something that feels like opening an artifact.",
    body:[
      "Pages could shift with moon phases, symbols could animate when touched and entries could connect like constellations instead of folders.",
      "A digital grimoire does not have to pretend it is paper."
    ]
  },
  {
    id:"weird-web-drawer",
    title:"The Weird Internet Drawer",
    category:"Weird Internet",
    date:"Sep 19, 2026",
    accent:"#62ffb3",
    excerpt:"For all the links that make you say 'what the hell is this' and then keep the tab open for three days.",
    body:[
      "Some things do not deserve a productivity category. They deserve a drawer.",
      "This is that drawer."
    ]
  }
];

const PROJECTS = [
  {icon:"P",name:"Purrble",status:"EVOLVING",accent:"#ff58bd",desc:"Virtual-pet world experiments, creature systems and app ideas."},
  {icon:"T",name:"Tilcayo",status:"WILD",accent:"#ffc857",desc:"Wild-cat simulation ideas, habitats, behavior and discovery."},
  {icon:"D",name:"Dicyanin Vision",status:"EXPERIMENT",accent:"#4de4ff",desc:"Deep indigo / UV-inspired camera and visual-filter experiments."},
  {icon:"✎",name:"Story Lab",status:"WRITING",accent:"#a987ff",desc:"Stories, comics, worldbuilding tools and narrative experiments."}
];

const THOUGHTS = [
  "The internet was more fun when every website looked like somebody lived there.",
  "A feature does not have to be useful if it makes you grin every time you press it.",
  "If the button glows for no practical reason, that is still a reason.",
  "Some projects need roadmaps. Others need a cage and a warning sign.",
  "The correct number of browser tabs is apparently one more than I currently have.",
  "A weird idea with a working prototype beats a sensible idea trapped in a notes app."
];

let activeCategory = "All";
let searchTerm = "";

const qs = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

function renderFilters(){
  const cats = ["All", ...new Set(POSTS.map(p=>p.category))];
  qs("#filters").innerHTML = cats.map(c=>`<button class="filter ${c===activeCategory?"active":""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
  document.querySelectorAll(".filter").forEach(b=>b.onclick=()=>{activeCategory=b.dataset.cat;renderFilters();renderPosts();});
}

function filteredPosts(){
  return POSTS.filter(p=>{
    const cat = activeCategory==="All" || p.category===activeCategory;
    const hay = (p.title+" "+p.excerpt+" "+p.category).toLowerCase();
    return cat && hay.includes(searchTerm.toLowerCase());
  });
}

function renderPosts(){
  const items = filteredPosts();
  const featured = items[0];
  qs("#emptyState").hidden = items.length!==0;
  qs("#featuredPost").innerHTML = featured ? `
    <article class="featured-card" style="--feature-accent:${featured.accent}">
      <div class="featured-content">
        <div class="meta"><span class="category-pill">${esc(featured.category)}</span><span>${esc(featured.date)}</span></div>
        <h3>${esc(featured.title)}</h3>
        <p>${esc(featured.excerpt)}</p>
        <button class="read-btn" data-open="${featured.id}">Read transmission →</button>
      </div>
    </article>` : "";
  qs("#postGrid").innerHTML = items.slice(1).map(p=>`
    <article class="post-card" style="--card-accent:${p.accent}" data-open="${p.id}" tabindex="0">
      <div class="meta"><span class="category-pill" style="--feature-accent:${p.accent}">${esc(p.category)}</span><span>${esc(p.date)}</span></div>
      <h3>${esc(p.title)}</h3>
      <p>${esc(p.excerpt)}</p>
      <div class="card-foot"><span>OPEN FILE</span><span>↗</span></div>
    </article>`).join("");
  document.querySelectorAll("[data-open]").forEach(el=>{
    el.onclick=()=>openPost(el.dataset.open);
    el.onkeydown=e=>{if(e.key==="Enter")openPost(el.dataset.open)}
  });
}

function renderProjects(){
  qs("#projectGrid").innerHTML = PROJECTS.map(p=>`
    <article class="project-card" style="--project-accent:${p.accent}">
      <div class="project-top"><div class="project-icon">${esc(p.icon)}</div><div class="status">${esc(p.status)}</div></div>
      <h3>${esc(p.name)}</h3><p>${esc(p.desc)}</p>
    </article>`).join("");
  qs("#projectCount").textContent = PROJECTS.length;
}

function openPost(id){
  const p = POSTS.find(x=>x.id===id); if(!p)return;
  qs("#dialogContent").innerHTML = `
    <article class="dialog-article">
      <div class="meta"><span class="category-pill" style="--feature-accent:${p.accent}">${esc(p.category)}</span><span>${esc(p.date)}</span></div>
      <h2>${esc(p.title)}</h2>
      <p class="lede">${esc(p.excerpt)}</p>
      <div class="dialog-body">${p.body.map(x=>x.startsWith("<")?x:`<p>${esc(x)}</p>`).join("")}</div>
    </article>`;
  qs("#postDialog").showModal();
}

function randomThought(){
  qs("#thoughtText").textContent = THOUGHTS[Math.floor(Math.random()*THOUGHTS.length)];
}

function toast(msg){
  const t=qs("#toast");t.textContent=msg;t.classList.add("show");clearTimeout(window.__toast);
  window.__toast=setTimeout(()=>t.classList.remove("show"),1800);
}

qs("#searchInput").addEventListener("input",e=>{searchTerm=e.target.value;renderPosts()});
qs("#thoughtBtn").onclick=randomThought;
qs("#randomBtn").onclick=()=>{const p=POSTS[Math.floor(Math.random()*POSTS.length)];openPost(p.id)};
qs("#dialogClose").onclick=()=>qs("#postDialog").close();
qs("#postDialog").addEventListener("click",e=>{if(e.target===qs("#postDialog"))qs("#postDialog").close()});
qs("#chaosBtn").onclick=()=>{document.body.classList.remove("chaos");void document.body.offsetWidth;document.body.classList.add("chaos");toast("Harmless chaos deployed ✦")};
qs("#menuBtn").onclick=()=>{const n=qs("#mainNav");n.classList.toggle("open");qs("#menuBtn").setAttribute("aria-expanded",n.classList.contains("open"))};
document.querySelectorAll("#mainNav a").forEach(a=>a.onclick=()=>qs("#mainNav").classList.remove("open"));

for(let i=0;i<28;i++){
  const p=document.createElement("i");p.className="particle";
  p.style.left=Math.random()*100+"vw";p.style.animationDuration=(12+Math.random()*22)+"s";p.style.animationDelay=(-Math.random()*30)+"s";p.style.opacity=.12+Math.random()*.4;
  qs("#particles").appendChild(p);
}
qs("#postCount").textContent=POSTS.length;
qs("#year").textContent=new Date().getFullYear();
renderFilters();renderPosts();renderProjects();
