// Efect tour kit: the portal loader and the closing lockup, shared by every tour. Paths are relative to the tour page (../_efect/).
const K = new URL('.', import.meta.url).href;
export function efLoader(msg = 'פותחים את העולם שלכם') {
  const el = document.createElement('div'); el.id = 'ef-loader';
  el.innerHTML = `<div class="in"><div class="ef-portal"><svg viewBox="0 0 160 160"><circle class="t" cx="80" cy="80" r="70"/><circle class="p" cx="80" cy="80" r="70"/></svg>
    <img src="${K}mark-pink.png" alt=""><img src="${K}mark-orange.png" alt=""><img src="${K}mark-blue.png" alt=""><img src="${K}mark-grey.png" alt=""></div><p>${msg} <b>0%</b></p></div>
    <img class="lock" src="${K}lockup.png" alt="Efect, הבית הישראלי לעולמות וירטואליים">`;
  document.body.appendChild(el); const ring = el.querySelector('.p'), pct = el.querySelector('b'); const t0 = performance.now();
  return {
    progress(p) { p = Math.max(0, Math.min(1, p)); ring.style.strokeDashoffset = String(439.8 * (1 - p)); pct.textContent = Math.round(p * 100) + '%'; },
    // the lockup shows, then the white opens from the middle like a portal onto the place behind it
    async open(minMs = 2600) {
      this.progress(1); await new Promise((r) => setTimeout(r, Math.max(300, minMs - (performance.now() - t0)))); el.classList.add('done'); await new Promise((r) => setTimeout(r, 1500));
      const R = Math.hypot(innerWidth, innerHeight) / 2 + 30, s = performance.now();
      await new Promise((done) => { const step = (t) => { const u = Math.min(1, (t - s) / 850), e = u * u * u, r = e * R; const m = `radial-gradient(circle at 50% 50%, transparent ${Math.max(0, r - 2)}px, #000 ${r}px)`; el.style.webkitMaskImage = m; el.style.maskImage = m; u < 1 ? requestAnimationFrame(step) : done(); }; requestAnimationFrame(step); });
      el.remove();
    },
  };
}
export function efEnd({ title = 'גלו את העולם שלכם', text = 'מהרעיון ועד ההטמעה המלאה: סיור וירטואלי לכל נכס, שכונה או מתחם.', actions = [] } = {}) {
  let el = document.querySelector('.ef-end');
  if (!el) { el = document.createElement('div'); el.className = 'ef-end'; document.body.appendChild(el); }
  el.innerHTML = `<div class="ef-stripe"></div><div class="in"><img src="${K}lockup.png" alt="Efect, הבית הישראלי לעולמות וירטואליים"><h2>${title}</h2><p>${text}</p><div class="acts"></div><div class="foot">efct.co.il &nbsp;·&nbsp; @efct.il</div></div>`;
  const acts = el.querySelector('.acts');
  actions.forEach(([label, fn, alt]) => { const b = document.createElement('button'); b.className = 'ef-btn' + (alt ? ' alt' : ''); b.textContent = label; b.onclick = () => { el.classList.remove('on'); fn && fn(); }; acts.appendChild(b); });
  requestAnimationFrame(() => el.classList.add('on')); return el;
}
