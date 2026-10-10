class LiquidFire extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:"open"});
    this.canvas = document.createElement("canvas");
    const style = document.createElement("style");
    style.textContent = `
      :host{display:block;contain:strict}
      canvas{width:100%;height:100%;display:block}
    `;
    this.shadowRoot.append(style, this.canvas);
    this.ctx = this.canvas.getContext("2d", {alpha:true});
    this.heat = null;
    this.next = null;
    this.image = null;
    this.trails = [];
    this.pointerDown = false;
    this.lastSpawn = 0;
    this.last = 0;

    this._pointer = e => {
      if (!this.hasAttribute("interactive")) return;
      const r = this.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const x = Math.max(0, Math.min(1, (e.clientX-r.left)/r.width));
      const y = Math.max(0, Math.min(1, (e.clientY-r.top)/r.height));
      const strong = e.type === "pointerdown";
      const now = performance.now();

      if (strong || this.pointerDown || e.pointerType === "mouse") {
        if (strong || now-this.lastSpawn > 28) {
          this.trails.push({x,y,life:1,power:strong?1.55:1.05,radius:strong?.055:.035});
          if (this.trails.length > 28) this.trails.shift();
          this.lastSpawn = now;
        }
      }
    };
    this._down = e => { this.pointerDown = true; this._pointer(e); };
    this._up = () => { this.pointerDown = false; };
  }

  connectedCallback() {
    this.speed = Math.max(.25, Number(this.getAttribute("speed")) || 1);
    this.turbulence = Math.max(.2, Number(this.getAttribute("turbulence")) || 1);
    this.intensity = Math.max(.25, Number(this.getAttribute("intensity")) || 1);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this);

    window.addEventListener("pointerdown", this._down, {passive:true});
    window.addEventListener("pointermove", this._pointer, {passive:true});
    window.addEventListener("pointerup", this._up, {passive:true});
    window.addEventListener("pointercancel", this._up, {passive:true});

    this.resize();
    this.raf = requestAnimationFrame(t => this.tick(t));
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    window.removeEventListener("pointerdown", this._down);
    window.removeEventListener("pointermove", this._pointer);
    window.removeEventListener("pointerup", this._up);
    window.removeEventListener("pointercancel", this._up);
  }

  resize() {
    const r = this.getBoundingClientRect();

    // Render at a much higher internal resolution than the first version.
    // This keeps mobile flames crisp without trying to paint every device pixel.
    this.w = Math.max(260, Math.min(460, Math.round(r.width * .62)));
    this.h = Math.max(420, Math.min(760, Math.round(r.height * .58)));

    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.ctx.imageSmoothingEnabled = true;

    this.heat = new Float32Array(this.w*this.h);
    this.next = new Float32Array(this.w*this.h);
    this.image = this.ctx.createImageData(this.w,this.h);
  }

  fuelAt(x,t) {
    const a = Math.sin(x*.057 + t*.0021*this.speed);
    const b = Math.sin(x*.131 - t*.0033*this.speed);
    const c = Math.sin(x*.021 + t*.0014*this.speed);
    const ridge = Math.max(0, (a*.48 + b*.31 + c*.21) + .38);
    const flicker = Math.random()*.34;
    return .48 + ridge*.88 + flicker;
  }

  injectTrail() {
    if (!this.trails.length) return;
    const w=this.w,h=this.h,src=this.heat;

    for (const p of this.trails) {
      const cx=Math.round(p.x*(w-1));
      const cy=Math.round(p.y*(h-1));
      const rx=Math.max(5,Math.round(w*p.radius));
      const ry=Math.max(8,Math.round(h*p.radius*.72));

      for (let yy=-ry; yy<=ry; yy++) {
        const y=cy+yy;
        if (y<0 || y>=h) continue;
        for (let xx=-rx; xx<=rx; xx++) {
          const x=cx+xx;
          if (x<0 || x>=w) continue;
          const d=(xx*xx)/(rx*rx)+(yy*yy)/(ry*ry);
          if (d>1) continue;
          const hot=(1-d)*(p.power*p.life);
          const i=y*w+x;
          src[i]=Math.min(1.85,src[i]+hot);
        }
      }

      p.life*=.885;
      p.y-=.0045*this.speed;
      p.radius*=1.007;
    }
    this.trails=this.trails.filter(p=>p.life>.045 && p.y>-.08);
  }

  step(t) {
    const w=this.w,h=this.h,src=this.heat,dst=this.next;
    const turb=this.turbulence;

    // Patchy source instead of a solid purple bar.
    for (let x=0;x<w;x++) {
      let fuel=this.fuelAt(x,t);
      if (Math.random()<.018) fuel+=.55;
      src[(h-1)*w+x]=Math.min(1.7,fuel);
      src[(h-2)*w+x]=Math.min(1.55,fuel*.93);
      src[(h-3)*w+x]=Math.min(1.35,fuel*.80);
    }

    this.injectTrail();

    // Upward advection. Lower cooling = flames reach much higher.
    for (let y=0;y<h-3;y++) {
      const height=(h-y)/h;
      for (let x=0;x<w;x++) {
        const wobble =
          Math.sin(y*.075 + t*.0023*this.speed) +
          Math.sin(y*.021 - t*.0017 + x*.026);
        const drift=Math.round(wobble*1.15*turb + (Math.random()-.5)*2.2*turb);

        const x0=(x+drift+w)%w;
        const xL=(x0-1+w)%w;
        const xR=(x0+1)%w;

        const p1=src[(y+1)*w+x0];
        const p2=src[(y+2)*w+x0];
        const p3=src[(y+3)*w+x0];
        const side=(src[(y+1)*w+xL]+src[(y+1)*w+xR])*.5;

        // Favor the hottest path so tongues stay defined instead of averaging into fog.
        const hot=Math.max(p1,p2*.96,p3*.90);
        const smooth=(p1+p2+side)/3;
        let v=hot*.67 + smooth*.33;

        const cooling=.00145 + height*.0007 + Math.random()*.0039*turb;
        v=Math.max(0,v-cooling);

        // Tiny lateral breakup for sharper, licking tips.
        if (Math.random()<.0045*turb) v*=.72;

        dst[y*w+x]=v;
      }
    }

    // Keep the bottom rows alive in the destination buffer.
    for (let y=h-3;y<h;y++) {
      for (let x=0;x<w;x++) dst[y*w+x]=src[y*w+x];
    }

    const tmp=this.heat;
    this.heat=this.next;
    this.next=tmp;
  }

  color(v) {
    // Harder transparency cutoff removes the blurry purple haze.
    const t=Math.max(0,Math.min(1.20,v*this.intensity));
    if (t<.16) return [0,0,0,0];

    // Gamma-like shaping: dim heat vanishes; flame cores stay crisp.
    const s=Math.pow((t-.16)/1.19,.82);

    if (s<.22) {
      const q=s/.22;
      return [24+28*q,0,78+48*q,70+70*q];
    }
    if (s<.48) {
      const q=(s-.22)/.26;
      return [52+48*q,2+8*q,126+76*q,140+50*q];
    }
    if (s<.76) {
      const q=(s-.48)/.28;
      return [100+55*q,10+26*q,202+32*q,190+35*q];
    }
    const q=Math.min(1,(s-.76)/.24);
    return [155+55*q,36+72*q,234+18*q,220];
  }

  render() {
    const d=this.image.data,src=this.heat;
    for (let i=0,j=0;i<src.length;i++,j+=4) {
      const c=this.color(src[i]);
      d[j]=c[0]; d[j+1]=c[1]; d[j+2]=c[2]; d[j+3]=c[3];
    }
    this.ctx.putImageData(this.image,0,0);
  }

  tick(t) {
    if (!this.last) this.last=t;
    const fps=32;
    if (t-this.last >= 1000/fps) {
      this.last=t;
      this.step(t);
      this.render();
    }
    this.raf=requestAnimationFrame(n=>this.tick(n));
  }
}

if (!customElements.get("liquid-fire")) customElements.define("liquid-fire",LiquidFire);
