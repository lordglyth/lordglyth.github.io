(() => {
  'use strict';

  // The original fox art is a side-view drawing. Rotating the whole sprite by PI
  // made left movement literally turn the fox upside down. Intercept only the
  // large facing rotations used by drawFox; leave its smaller tail rotations alone.
  const realRotate = CanvasRenderingContext2D.prototype.rotate;
  CanvasRenderingContext2D.prototype.rotate = function(angle) {
    const stack = new Error().stack || '';
    if (stack.includes('drawFox')) {
      const a = Math.atan2(Math.sin(angle), Math.cos(angle));
      const abs = Math.abs(a);
      if (abs > 2.35) {
        this.scale(-1, 1);
        return;
      }
      if (abs > 0.62) {
        return realRotate.call(this, Math.sign(a) * 0.18);
      }
    }
    return realRotate.call(this, angle);
  };

  const isTouch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  if (!isTouch) return;

  document.documentElement.classList.add('fox-touch');

  const touchControls = document.getElementById('touchControls');
  const sprint = document.createElement('button');
  sprint.id = 'sprintBtn';
  sprint.className = 'sprint-button';
  sprint.innerHTML = '⚡<small>Sprint</small>';
  sprint.setAttribute('aria-label', 'Hold to sprint');
  touchControls?.querySelector('.action-pad')?.prepend(sprint);

  const fireShift = (type) => window.dispatchEvent(new KeyboardEvent(type, {
    code: 'ShiftLeft', key: 'Shift', bubbles: true
  }));
  const sprintDown = e => {
    e.preventDefault();
    sprint.classList.add('pressed');
    fireShift('keydown');
    try { navigator.vibrate?.(8); } catch (_) {}
  };
  const sprintUp = e => {
    e?.preventDefault?.();
    sprint.classList.remove('pressed');
    fireShift('keyup');
  };
  sprint.addEventListener('pointerdown', sprintDown);
  sprint.addEventListener('pointerup', sprintUp);
  sprint.addEventListener('pointercancel', sprintUp);
  sprint.addEventListener('pointerleave', sprintUp);
  window.addEventListener('blur', sprintUp);

  // Stop browser gestures/selection from stealing movement touches.
  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault?.(), { passive: false });
})();
