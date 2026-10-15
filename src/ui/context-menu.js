// =========================================================================================
// ui/context-menu.js — RIGHT-CLICK MENU
// =========================================================================================
// One open menu at a time, on document.body, at the pointer. Closes on pick, outside press,
// Escape, blur, or scroll.
//
// items: [{ label, keys, disabled, run }] · 'sep' for a divider
// =========================================================================================

const STYLE_ID = 'cbdaw-context-menu-style';

const STYLE_TEXT = `
.cbdaw-menu {
  position: var(--pos-absolute);
  z-index: var(--z-popover);
  display: var(--disp-flex);
  flex-direction: var(--flexdir-column);
  min-width: var(--sp-84);
  padding: var(--sp-2);
  background: var(--panel);
  color: var(--text);
  border: var(--bw) solid var(--line);
  border-radius: var(--r-ctl);
  box-shadow: var(--shadow-raised);
  font-size: var(--fs-sm);
  user-select: var(--usel-none);
}
.cbdaw-menu__item {
  display: var(--disp-flex);
  justify-content: var(--justify-space-between);
  gap: var(--sp-6);
  padding: var(--sp-2) var(--sp-4);
  background: var(--color-transparent);
  color: inherit;
  border: var(--bw) solid var(--color-transparent);
  border-radius: var(--r-sm);
  font: inherit;
  text-align: var(--ta-left);
  cursor: var(--cur-pointer);
}
.cbdaw-menu__item:hover:not(:disabled) { border-color: var(--line); background: var(--btn-face); }
.cbdaw-menu__item:disabled { opacity: var(--op-dim); cursor: var(--cur-default); }
.cbdaw-menu__keys { color: var(--text-dim); }
.cbdaw-menu__sep { height: var(--bw); margin: var(--sp-2) var(--sp-0); background: var(--line); }
`;

// the open menu's close, null when none
let closeOpen = null;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLE_TEXT;
  document.head.appendChild(style);
}

// ⌘ on Mac, Ctrl elsewhere
export const MOD = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';

export function closeContextMenu() {
  closeOpen?.();
}

/** Opens the menu at client (x, y). */
export function openContextMenu(x, y, items) {
  closeContextMenu();
  ensureStyle();

  const menu = document.createElement('div');
  menu.className = 'cbdaw-menu';
  menu.setAttribute('role', 'menu');
  // the menu never takes focus, so edit keys keep reaching the window it opened over
  menu.addEventListener('pointerdown', (e) => e.preventDefault());

  for (const item of items) {
    if (item === 'sep') {
      const sep = document.createElement('div');
      sep.className = 'cbdaw-menu__sep';
      menu.appendChild(sep);
      continue;
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cbdaw-menu__item';
    btn.setAttribute('role', 'menuitem');
    btn.disabled = Boolean(item.disabled);
    const label = document.createElement('span');
    label.textContent = item.label;
    const keys = document.createElement('span');
    keys.className = 'cbdaw-menu__keys';
    keys.textContent = item.keys || '';
    btn.append(label, keys);
    btn.addEventListener('click', () => {
      close();
      item.run?.();
    });
    menu.appendChild(btn);
  }

  document.body.appendChild(menu);

  // kept inside the viewport
  const w = menu.offsetWidth;
  const h = menu.offsetHeight;
  const left = Math.max(0, Math.min(x, window.innerWidth - w));
  const top = Math.max(0, Math.min(y, window.innerHeight - h));
  menu.style.left = `${left + window.scrollX}px`;
  menu.style.top = `${top + window.scrollY}px`;

  const onDown = (e) => { if (!menu.contains(e.target)) close(); };
  const onKey = (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
  const onBlur = () => close();

  function close() {
    if (closeOpen !== close) return;
    closeOpen = null;
    window.removeEventListener('pointerdown', onDown, true);
    window.removeEventListener('keydown', onKey, true);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('scroll', onBlur, true);
    menu.remove();
  }

  closeOpen = close;
  window.addEventListener('pointerdown', onDown, true);
  window.addEventListener('keydown', onKey, true);
  window.addEventListener('blur', onBlur);
  window.addEventListener('scroll', onBlur, true);
  return close;
}
