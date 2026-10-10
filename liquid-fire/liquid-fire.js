/**
 * Liquid Fire — dependency-free Web Component, GitHub Pages ready.
 *
 * Usage:
 *   <script src="liquid-fire.js" defer></script>
 *   <liquid-fire palette="ember" speed="1" turbulence="1"
 *                intensity="1.15" quality="auto" interactive></liquid-fire>
 *
 * Attributes: palette=ember|inferno|violet|aether|toxic,
 * speed=0..3, turbulence=0..2, intensity=0..2,
 * quality=auto|low|medium|high, interactive, transparent, paused.
 *
 * The element fills the size of its containing box; give the element or
 * its parent an explicit height (e.g. height: 440px).
 */
(() => {
  'use strict';
  if (customElements.get('liquid-fire')) return;

  const PALETTES = {
    ember:   ['#29070f', '#a51d17', '#ff6c1f', '#fff2a4'],
    inferno: ['#250307', '#a6070a', '#fd4111', '#fff3c0'],
    violet:  ['#170d3a', '#7937cd', '#fa61bf', '#fff1ff'],
    aether:  ['#061b45', '#075da0', '#16d9f6', '#e4ffff'],
    toxic:   ['#092d14', '#148c42', '#9beb28', '#f5ffc7']
  };

  const VERTEX_SHADER = `
    attribute vec2 a_position;
    void main() { gl_Position = vec4(a_position, 0.0, 1.0); }
  `;

  const FRAGMENT_SHADER = `
    precision highp float;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform float u_speed;
    uniform float u_turbulence;
    uniform float u_intensity;
    uniform vec2 u_pointer;
    uniform float u_pointerActive;
    uniform float u_transparent;
    uniform vec3 u_c0, u_c1, u_c2, u_c3;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f*f*(3.0-2.0*f);
      return mix(mix(hash(i), hash(i+vec2(1.,0.)), u.x),
                 mix(hash(i+vec2(0.,1.)), hash(i+vec2(1.,1.)), u.x),u.y);
    }
    float fbm(vec2 p) {
      float v = 0., a = .5;
      for (int i=0; i<5; i++) {
        v += a*noise(p);
        p = mat2(1.6,-1.2,1.2,1.6)*p;
        a *= .5;
      }
      return v;
    }
    vec3 palette(float f) {
      vec3 a = mix(u_c0, u_c1, smoothstep(.02,.37,f));
      a = mix(a, u_c2, smoothstep(.32,.72,f));
      return mix(a, u_c3, smoothstep(.69,1.10,f));
    }
    void main() {
      vec2 uv = gl_FragCoord.xy/u_resolution;
      float aspect = u_resolution.x / u_resolution.y;
      vec2 p = (uv-.5)*vec2(aspect,1.);
      float t = u_time * (.25 + u_speed * .75);
      float y = clamp(uv.y,0.,1.);
      float turb = u_turbulence;

      // Rising domain-warped liquid: large eddies carry fine hot filaments.
      float nA = fbm(vec2(p.x*2.15, y*2.45-t*.51));
      float nB = fbm(vec2(p.x*4.55+nA*2.2,y*4.15-t*.88));
      float nC = fbm(vec2(p.x*9.1-nB*2.5,y*8.3-t*1.42));
      float sweep = .13*sin(y*5.2-t*.6)+.07*sin(y*11.1+t*.33);
      float warp = ((nA-.5)*.46+(nB-.5)*.21 + sweep) * (.35+turb*.68);

      // Pointer stirs nearby material without interrupting the flow.
      vec2 mouse = (u_pointer-.5)*vec2(aspect,1.);
      vec2 delta = p-mouse;
      float stir = exp(-dot(delta,delta)*11.5)*u_pointerActive;
      warp += stir*.23*sin(t*3.6+y*14.+delta.x*10.);

      float x = p.x + warp;
      float radius = .59*pow(1.-y,.77)+.025;
      float cut = abs(x) / max(.04,radius);
      float jagged = (nB-.46)*(.41+.26*y)*turb + (nC-.5)*.15*turb;
      float mainFlame = 1.-smoothstep(.65+jagged,1.13+jagged,cut);
      mainFlame *= (1.-smoothstep(.79,1.015,y));

      // Secondary branching tongues make the outline dance organically.
      float tongue1 = 1.-smoothstep(.0, .20,
        abs(p.x-(.29+.10*sin(y*10.-t*1.25))+(nB-.5)*.17*turb) - (.17*(1.-y)));
      tongue1 *= smoothstep(.09,.36,y)*(1.-smoothstep(.69,.99,y));
      float tongue2 = 1.-smoothstep(.0,.18,
        abs(p.x-(-.29+.13*sin(y*8.+t*.87))+(nA-.5)*.2*turb) - (.17*(1.-y)));
      tongue2 *= smoothstep(.08,.29,y)*(1.-smoothstep(.61,.92,y));
      float tongue3 = 1.-smoothstep(.0,.10,
        abs(p.x-(.10+.11*sin(y*11.-t*1.1))+(nB-.5)*.13) - (.12*(1.-y)));
      tongue3 *= smoothstep(.54,.73,y)*(1.-smoothstep(.82,.985,y));
      float shape = max(mainFlame, max(tongue1*.83,max(tongue2*.81,tongue3*.8)));

      // Luminous currents, glowing pockets, and dark viscous folds.
      float liquid = fbm(vec2(x*7.8+nB*3.8,y*10.7-t*1.57));
      float flow = fbm(vec2(x*15.4+nA*6.,y*19.2-t*2.18));
      float hotVeins = pow(max(0.,1.-abs(sin((x*10.9+nA*5.7+nB*2.4+y*1.3)*2.65))),7.);
      float core = exp(-abs(x)/(radius*.43+.014));
      float heat = shape*(.30+.40*liquid+.23*flow+.31*core+.23*hotVeins);
      heat *= (1.0-.24*y);
      heat *= .55+u_intensity*.43;
      heat = clamp(heat,0.,1.25);

      // Warm glow around the entire flame, even beyond its silhouette.
      float halo = exp(-pow(abs(x)/max(radius*1.5,.10),2.))*(.48+.52*nA)*(1.-y*.43);
      float rim = shape*(1.-smoothstep(.38, .94, core));
      vec3 luminous = palette(heat);
      luminous *= (1.05+.37*hotVeins*shape+.22*nC);
      luminous += u_c2*rim*.065;
      vec3 glow = u_c1*halo*.12 + u_c2*halo*.075;
      glow += u_c2*pow(shape,.75)*.07;

      // Cooling molten reservoir at the bottom edge.
      float pool = exp(-y*22.)*exp(-pow(p.x/.77,2.));
      glow += (u_c1*.24+u_c2*.14)*pool;
      heat = max(heat,pool*.49);

      // Sparse floating embers, animated independently of the main field.
      vec2 particleUV = vec2(p.x*15., y*12.-t*.62);
      vec2 cell = floor(particleUV);
      vec2 fracCell = fract(particleUV)-.5;
      vec2 particleOffset = vec2(hash(cell+3.7)-.5,hash(cell+12.3)-.5)*.68;
      float ember = 1.-smoothstep(.018,.10,length(fracCell-particleOffset));
      ember *= step(.927,hash(cell+19.2));
      ember *= smoothstep(.10,.4,y)*(1.-smoothstep(.68,1.,y));
      ember *= exp(-abs(p.x)*1.1);
      vec3 sparks = u_c3*ember*.8;

      vec3 col = luminous*shape + glow + sparks;
      // A subtler secondary glow keeps non-transparent mode rich and dark.
      vec3 bg = vec3(.014,.017,.029) + u_c0*halo*.022;
      float alpha = clamp(shape*.93+halo*.19+ember*.9+pool*.2,0.,1.);
      if (u_transparent > .5) {
        gl_FragColor = vec4(col, alpha);
      } else {
        gl_FragColor = vec4(bg+col,1.);
      }
    }
  `;

  const hexToRgb = hex => {
    const s = hex.replace('#','');
    return [0,2,4].map(i => parseInt(s.slice(i,i+2),16)/255);
  };
  const clamp = (v, lo, hi) => Math.min(hi,Math.max(lo,v));

  class LiquidFire extends HTMLElement {
    static get observedAttributes() {
      return ['palette','speed','turbulence','intensity','quality','interactive','transparent','paused'];
    }
    constructor() {
      super();
      this.attachShadow({mode:'open'});
      this.shadowRoot.innerHTML = `
        <style>
          :host { display:block; position:relative; overflow:hidden; min-height:160px; contain:layout paint; }
          canvas { display:block; width:100%; height:100%; background:transparent; touch-action:pan-y; }
          .fallback { position:absolute; inset:0; display:none; overflow:hidden;
            background:radial-gradient(ellipse at 50% 100%,#ffb73c 0%,#e33d12 20%,#5b0e13 43%,#0a0c16 76%); }
          .fallback:before { content:''; position:absolute; inset:-20%; opacity:.75;
            background:repeating-radial-gradient(ellipse at 50% 80%,transparent 0 22px,#ffbe54a8 25px 34px,transparent 40px 67px);
            filter:blur(22px); animation:drift var(--fallback-duration, 4s) ease-in-out infinite alternate; }
          @keyframes drift { from{transform:rotate(-6deg) scale(1)}to{transform:rotate(6deg) scale(1.13) translateY(-6%)} }
          :host([paused]) .fallback:before { animation-play-state:paused; }
        </style>
        <canvas role="img" aria-label="Animated, swirling liquid fire"></canvas>
        <div class="fallback" aria-hidden="true"></div>`;
      this.canvas = this.shadowRoot.querySelector('canvas');
      this.fallback = this.shadowRoot.querySelector('.fallback');
      this.gl = null;
      this.raf = 0;
      this.elapsed = 0;
      this.lastFrame = 0;
      this.visible = true;
      this.pointer = [.5,.5];
      this.pointerTarget = [.5,.5];
      this.pointerStrength = 0;
      this.isPointerDown = false;
      this.onMove = this.onMove.bind(this);
      this.onLeave = this.onLeave.bind(this);
      this.tick = this.tick.bind(this);
      this.onVisibility = this.onVisibility.bind(this);
    }
    connectedCallback() {
      if (!this.gl) this.initialize();
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this);
      this.intersectionObserver = new IntersectionObserver(entries => {
        this.visible = !!entries[0]?.isIntersecting;
        this.updateRunning();
      },{threshold:0});
      this.intersectionObserver.observe(this);
      document.addEventListener('visibilitychange',this.onVisibility);
      this.canvas.addEventListener('pointermove',this.onMove,{passive:true});
      this.canvas.addEventListener('pointerdown',this.onMove,{passive:true});
      this.canvas.addEventListener('pointerenter',this.onMove,{passive:true});
      this.canvas.addEventListener('pointerup',this.onLeave,{passive:true});
      this.canvas.addEventListener('pointerleave',this.onLeave,{passive:true});
      this.updateFallback();
      this.updateRunning();
    }
    disconnectedCallback() {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.resizeObserver?.disconnect();
      this.intersectionObserver?.disconnect();
      document.removeEventListener('visibilitychange',this.onVisibility);
      for (const name of ['pointermove','pointerdown','pointerenter']) this.canvas.removeEventListener(name,this.onMove);
      for (const name of ['pointerup','pointerleave']) this.canvas.removeEventListener(name,this.onLeave);
    }
    attributeChangedCallback() {
      if (this.isConnected) { this.updateFallback(); this.updateRunning(); }
    }
    updateFallback() {
      const palette = PALETTES[this.getAttribute('palette')] || PALETTES.ember;
      this.fallback.style.background = `radial-gradient(ellipse at 50% 100%,${palette[3]} 0%,${palette[2]} 20%,${palette[1]} 45%,#0a0c16 85%)`;
      this.fallback.style.setProperty('--fallback-duration',`${Math.max(1,6-this.numSpeed*2)}s`);
      this.fallback.style.filter = `brightness(${.72 + this.numIntensity*.28})`;
    }
    get numSpeed() { return clamp(parseFloat(this.getAttribute('speed') ?? '1') || 0,0,3); }
    get numTurbulence() { return clamp(parseFloat(this.getAttribute('turbulence') ?? '1') || 0,0,2); }
    get numIntensity() { return clamp(parseFloat(this.getAttribute('intensity') ?? '1') || 0,0,2); }
    initialize() {
      try {
        const gl = this.canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,preserveDrawingBuffer:false});
        if (!gl) throw new Error('WebGL unavailable');
        const shader = (type, source) => {
          const s = gl.createShader(type);
          gl.shaderSource(s,source);
          gl.compileShader(s);
          if (!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
          return s;
        };
        const program = gl.createProgram();
        gl.attachShader(program,shader(gl.VERTEX_SHADER,VERTEX_SHADER));
        gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FRAGMENT_SHADER));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
        gl.useProgram(program);
        const vertices = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER,vertices);
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
        const position = gl.getAttribLocation(program,'a_position');
        gl.enableVertexAttribArray(position);
        gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
        this.uniforms = {};
        for (const key of ['resolution','time','speed','turbulence','intensity','pointer','pointerActive','transparent','c0','c1','c2','c3']) {
          this.uniforms[key] = gl.getUniformLocation(program,'u_'+key);
        }
        this.gl = gl;
        this.resize();
        this.canvas.addEventListener('webglcontextlost',e => {e.preventDefault();this.gl=null;cancelAnimationFrame(this.raf);this.raf=0;});
        this.canvas.addEventListener('webglcontextrestored',() => {this.initialize();this.updateRunning();});
      } catch(e) {
        console.warn('[liquid-fire] WebGL fallback:',e);
        this.canvas.style.display = 'none';
        this.fallback.style.display = 'block';
      }
    }
    resize() {
      if (!this.gl) return;
      const r = this.getBoundingClientRect();
      const q = this.getAttribute('quality') || 'auto';
      const scale = q==='low' ? .65 : q==='medium' ? 1 : q==='high' ? 1.7 : Math.min(window.devicePixelRatio||1,1.45);
      const cap = q==='low' ? 900 : q==='high' ? 2000 : 1400;
      const factor = Math.min(scale,cap/Math.max(r.width,r.height,1));
      const w = Math.max(1,Math.round(r.width*factor));
      const h = Math.max(1,Math.round(r.height*factor));
      if (this.canvas.width!==w || this.canvas.height!==h) {
        this.canvas.width=w;this.canvas.height=h;
      }
      this.gl.viewport(0,0,w,h);
    }
    onMove(e) {
      if (!this.hasAttribute('interactive')) return;
      const r=this.canvas.getBoundingClientRect();
      this.pointerTarget = [clamp((e.clientX-r.left)/r.width,0,1),clamp(1-(e.clientY-r.top)/r.height,0,1)];
      this.pointerStrength = 1;
      this.isPointerDown = e.buttons > 0;
    }
    onLeave() { this.isPointerDown=false; }
    onVisibility() { this.updateRunning(); }
    updateRunning() {
      if (!this.gl || !this.isConnected) return;
      this.resize();
      const running = !this.hasAttribute('paused') && this.visible && !document.hidden;
      if (running && !this.raf) { this.lastFrame=performance.now();this.raf=requestAnimationFrame(this.tick); }
      if (!running && this.raf) { cancelAnimationFrame(this.raf);this.raf=0; }
    }
    tick(now) {
      this.raf=0;
      if (!this.gl || this.hasAttribute('paused') || !this.visible || document.hidden) return;
      const dt=Math.min((now-this.lastFrame)/1000,.05);
      this.lastFrame=now;
      this.elapsed += dt;
      this.pointer[0] += (this.pointerTarget[0]-this.pointer[0])*Math.min(1,dt*9);
      this.pointer[1] += (this.pointerTarget[1]-this.pointer[1])*Math.min(1,dt*9);
      this.pointerStrength = Math.max(0,this.pointerStrength-dt*.65);
      const gl=this.gl, u=this.uniforms;
      gl.uniform2f(u.resolution,this.canvas.width,this.canvas.height);
      gl.uniform1f(u.time,this.elapsed);
      gl.uniform1f(u.speed,this.numSpeed);
      gl.uniform1f(u.turbulence,this.numTurbulence);
      gl.uniform1f(u.intensity,this.numIntensity);
      gl.uniform2f(u.pointer,this.pointer[0],this.pointer[1]);
      gl.uniform1f(u.pointerActive,this.hasAttribute('interactive')?this.pointerStrength:0);
      gl.uniform1f(u.transparent,this.hasAttribute('transparent')?1:0);
      const palette=PALETTES[this.getAttribute('palette')]||PALETTES.ember;
      palette.forEach((hex,i) => gl.uniform3fv(u['c'+i],hexToRgb(hex)));
      gl.drawArrays(gl.TRIANGLES,0,6);
      this.raf=requestAnimationFrame(this.tick);
    }
  }
  customElements.define('liquid-fire',LiquidFire);
})();