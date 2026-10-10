class LiquidFire extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({mode:"open"});
    this.canvas = document.createElement("canvas");
    const style = document.createElement("style");
    style.textContent = `:host{display:block;contain:strict}canvas{width:100%;height:100%;display:block}`;
    this.shadowRoot.append(style, this.canvas);
    this.ctx = this.canvas.getContext("2d", {alpha:true});
    this.pointerX = 0.5;
    this.pointerHeat = 0;
    this.last = 0;
    this.frame = 0;
    this._onPointer = e => {
      if (!this.hasAttribute("interactive")) return;
      this.pointerX = e.clientX / Math.max(1, innerWidth);
      this.pointerHeat = 1;
    };
  }

  connectedCallback() {
    this.speed = Math.max(.2, Number(this.getAttribute("speed")) || 1);
    this.turbulence = Math.max(.2, Number(this.getAttribute("turbulence")) || 1);
    this.intensity = Math.max(.2, Number(this.getAttribute("intensity")) || 1);
    this.palette = this.getAttribute("palette") || "violet";
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this);
    window.addEventListener("pointermove", this._onPointer, {passive:true});
    window.addEventListener("pointerdown", this._onPointer, {passive:true});
    this.resize();
    this.seed();
    this.raf = requestAnimationFrame(t => this.tick(t));
  }

  disconnectedCallback() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver?.disconnect();
    window.removeEventListener("pointermove", this._onPointer);
    window.removeEventListener("pointerdown", this._onPointer);
  }

  resize() {
    const r = this.getBoundingClientRect();
    const aspect = Math.max(.5, r.width / Math.max(1, r.height));
    this.w = Math.max(100, Math.min(240, Math.round(150 * aspect)));
    this.h = 150;
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.heat = new Float32Array(this.w * this.h);
    this.next = new Float32Array(this.w * this.h);
    this.image = this.ctx.createImageData(this.w, this.h);
    this.ctx.imageSmoothingEnabled = true;
  }

  seed() {
    if (!this.heat) return;
    for (let x=0; x<this.w; x++) {
      const wave = .62 + .18 * Math.sin(x*.11) + .12 * Math.sin(x*.027);
      this.heat[(this.h-1)*this.w+x] = Math.max(0, wave + Math.random()*.35);
    }
  }

  color(t) {
    t = Math.max(0, Math.min(1.25, t * this.intensity));
    if (t < .10) return [3,0,10,0];
    if (t < .28) {
      const q=(t-.10)/.18;
      return [22+38*q, 2+4*q, 48+65*q, 75+70*q];
    }
    if (t < .52) {
      const q=(t-.28)/.24;
      return [60+75*q, 6+18*q, 113+80*q, 145+45*q];
    }
    if (t < .78) {
      const q=(t-.52)/.26;
      return [135+70*q, 24+40*q, 193+40*q, 190+35*q];
    }
    const q=Math.min(1,(t-.78)/.35);
    return [205+45*q, 64+120*q, 233+20*q, 225];
  }

  step(time) {
    const w=this.w,h=this.h,src=this.heat,dst=this.next;
    const turb=this.turbulence;
    const base = .72 + .07*Math.sin(time*.0017*this.speed);
    for (let x=0;x<w;x++) {
      const n = (Math.sin(x*.15 + time*.0023*this.speed) + Math.sin(x*.047 - time*.0015))*0.5;
      let fuel = base + .16*n + Math.random()*.22;
      if (this.pointerHeat > .01) {
        const dx = Math.abs(x/(w-1)-this.pointerX);
        fuel += Math.max(0, 1-dx*9) * .7 * this.pointerHeat;
      }
      src[(h-1)*w+x] = Math.min(1.3, fuel);
      src[(h-2)*w+x] = Math.min(1.15, fuel*.92);
    }

    for (let y=0;y<h-2;y++) {
      for (let x=0;x<w;x++) {
        const below=(y+1)*w+x;
        const below2=(y+2)*w+x;
        const left=(y+1)*w+((x-1+w)%w);
        const right=(y+1)*w+((x+1)%w);
        const drift = Math.round((Math.sin(y*.19 + time*.002*turb) + (Math.random()-.5)*turb)*1.2);
        const sx=(x+drift+w)%w;
        const v = (
          src[(y+1)*w+sx]*2.2 +
          src[below]*1.4 +
          src[below2]*1.1 +
          src[left]*.7 +
          src[right]*.7
        ) / 6.1;
        const decay = .0065 + (y/h)*.002 + Math.random()*.010*turb;
        dst[y*w+x] = Math.max(0, v-decay);
      }
    }
    this.pointerHeat *= .92;
    const tmp=this.heat; this.heat=this.next; this.next=tmp;
  }

  render() {
    const data=this.image.data, src=this.heat;
    for (let i=0,j=0;i<src.length;i++,j+=4) {
      const [r,g,b,a]=this.color(src[i]);
      data[j]=r; data[j+1]=g; data[j+2]=b; data[j+3]=a;
    }
    this.ctx.putImageData(this.image,0,0);
  }

  tick(t) {
    if (!this.last) this.last=t;
    const interval = 1000 / Math.max(24, Math.min(60, 42*this.speed));
    if (t-this.last >= interval) {
      this.last=t;
      this.step(t);
      this.render();
    }
    this.raf=requestAnimationFrame(n=>this.tick(n));
  }
}

if (!customElements.get("liquid-fire")) customElements.define("liquid-fire", LiquidFire);
