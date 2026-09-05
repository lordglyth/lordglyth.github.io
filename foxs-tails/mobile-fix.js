(() => {
  'use strict';

  // The fox is drawn as a side-view sprite. The old renderer rotated the whole
  // drawing to face the movement vector, so PI radians made left movement look
  // like a backflip. Large rotations in this game are the fox facing turns;
  // the lever and tail use smaller angles and are left untouched.
  const realRotate = CanvasRenderingContext2D.prototype.rotate;
  CanvasRenderingContext2D.prototype.rotate = function(angle) {
    const a = Math.atan2(Math.sin(angle), Math.cos(angle));
    const abs = Math.abs(a);
    if (abs > 2.35) {
      this.scale(-1, 1);
      return;
    }
    if (abs > 1.0) {
      return realRotate.call(this, Math.sign(a) * 0.18);
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

  const fireShift = type => window.dispatchEvent(new KeyboardEvent(type, {
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

  document.addEventListener('contextmenu', e => e.preventDefault());
  document.addEventListener('gesturestart', e => e.preventDefault?.(), { passive: false });
})();
