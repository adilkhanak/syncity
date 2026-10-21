/* Syncity — лендинг. Анимации: GSAP + ScrollTrigger, плавный скролл — Lenis.
   Без библиотек и при prefers-reduced-motion страница остаётся целой: всё видно, окна горят. */
(() => {
  'use strict';

  const doc = document.documentElement;
  doc.classList.add('js');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const G = window.gsap;
  const ST = window.ScrollTrigger;
  const motion = !!(G && ST) && !reduce;
  if (G && ST) G.registerPlugin(ST);

  const NS = 'http://www.w3.org/2000/svg';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const isFinePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function svgEl(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function shuffled(n, R) {
    const a = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
  function visibleWatch(node, cb, margin = '0px') {
    const io = new IntersectionObserver(([e]) => cb(e.isIntersecting), { rootMargin: margin });
    io.observe(node);
  }
  const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  /* ---------- Плавный скролл ---------- */
  let lenis = null;
  if (motion && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.09 });
    lenis.on('scroll', ST.update);
    G.ticker.add(t => lenis.raf(t * 1000));
    G.ticker.lagSmoothing(0);
    doc.style.scrollBehavior = 'auto';
  }
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const target = id === '#top' ? document.body : $(id);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(id === '#top' ? 0 : target, { duration: 1.6 });
    else if (id === '#top') scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  }));

  /* ---------- День и ночь по секциям ---------- */
  const themeMeta = $('meta[name="theme-color"]');
  function setScene(s) {
    if (!s || doc.dataset.scene === s) return;
    doc.dataset.scene = s;
    if (themeMeta) themeMeta.content = s === 'day' ? '#f0eeea' : '#17171a';
  }
  const sceneIO = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) setScene(en.target.dataset.scene); });
  }, { rootMargin: '-50% 0px -50% 0px' });
  $$('main [data-scene]').forEach(s => sceneIO.observe(s));

  /* ---------- Навигация ---------- */
  const nav = $('#nav');
  let lastY = scrollY;
  function onNavScroll() {
    const y = scrollY;
    nav.classList.toggle('is-solid', y > 40);
    nav.classList.toggle('is-hidden', y > 600 && y > lastY + 4);
    if (y < lastY - 4 || y < 600) nav.classList.remove('is-hidden');
    lastY = y;
  }
  addEventListener('scroll', onNavScroll, { passive: true });
  onNavScroll();

  /* =========================================================
     Город: дома из прямоугольников, окна — двойники
     ========================================================= */
  function setWin(o, state) {
    o.on = state === 'on';
    o.red = state === 'red';
    o.el.classList.toggle('on', o.on);
    o.el.classList.toggle('red', o.red);
  }

  function buildCity(svg, cfg) {
    const { W, H, avoid, seed, small, maxFrac, tower } = cfg;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
    svg.textContent = '';
    const R = rng(seed);
    const near = small ? { w: 14, h: 18, px: 22, py: 26, pad: 10 } : { w: 20, h: 26, px: 32, py: 38, pad: 14 };
    const far = small ? { w: 7, h: 9, px: 12, py: 15, pad: 7 } : { w: 10, h: 13, px: 16, py: 19, pad: 9 };
    const skyTop = H * (1 - maxFrac);
    const limitTop = (x0, x1) => (avoid && x1 > avoid.x0 && x0 < avoid.x1) ? Math.max(skyTop, avoid.y1) : skyTop;
    const houses = [];
    const wins = [];

    const outerFar = svgEl('g', { class: 'far' }, svg);
    const gFar = svgEl('g', {}, outerFar);
    const outerNear = svgEl('g', {}, svg);
    const gNear = svgEl('g', {}, outerNear);
    const widthOf = (cols, geo) => cols * geo.px - (geo.px - geo.w) + geo.pad * 2;

    function house(g, x, top, cols, geo, layer, extra = {}) {
      x = Math.round(x); top = Math.round(top);
      const w = widthOf(cols, geo);
      const grp = svgEl('g', {}, g);
      svgEl('rect', { class: 'f', x, y: top, width: w, height: H - top + 4 }, grp);
      if (R() < 0.4 && top > skyTop + 30) {
        const thin = R() < 0.5;
        const rw = thin ? 4 : Math.round(w * (0.22 + R() * 0.3));
        const rh = Math.round(thin ? 12 + R() * 16 : 8 + R() * 10);
        svgEl('rect', { class: 'f', x: Math.round(x + w * (0.12 + R() * 0.55)), y: top - rh, width: rw, height: rh + 1 }, grp);
      }
      const hs = { x0: x, x1: x + w, top, grp, wins: [], layer, ...extra };
      const rows = Math.floor((H - top - geo.pad) / geo.py) + 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const wx = x + geo.pad + c * geo.px;
          const wy = top + geo.pad + r * geo.py;
          if (wy > H) continue;
          const node = svgEl('rect', { class: 'w', x: wx, y: wy, width: geo.w, height: geo.h }, grp);
          const o = { el: node, x: wx, y: wy, w: geo.w, h: geo.h, cx: wx + geo.w / 2, cy: wy + geo.h / 2, c, r, layer, house: hs, on: false, red: false };
          hs.wins.push(o);
          wins.push(o);
        }
      }
      houses.push(hs);
      return hs;
    }

    // дальний ряд: мелкие окна, приглушённые фасады
    let x = -R() * 60;
    while (x < W) {
      const cols = 3 + Math.floor(R() * 5);
      const w = widthOf(cols, far);
      const range = H - limitTop(x, x + w);
      const hgt = range * (0.25 + R() * 0.4);
      if (hgt >= 60) house(gFar, x, H - hgt, cols, far, 'far');
      x += w + 4 + R() * 40;
    }

    // ближний ряд: башня справа в обрез, крыло слева от неё, дальше — дома пониже
    let rightEdge = W + 40;
    if (tower) {
      const tc = small ? 6 : 8;
      const tw = widthOf(tc, near);
      const tx = W - tw + (small ? 24 : 56);
      const tTop = limitTop(tx, tx + tw);
      house(gNear, tx, tTop, tc, near, 'near', { tower: true });
      const wc = small ? 3 : 4;
      const ww = widthOf(wc, near);
      const wx = tx - ww;
      house(gNear, wx, Math.max(H - (H - tTop) * 0.42, limitTop(wx, wx + ww)), wc, near, 'near');
      rightEdge = wx - 10 - R() * 24;
    }
    x = -R() * 40;
    while (x < rightEdge - 40) {
      let cols = 2 + Math.floor(R() * 4);
      while (cols > 2 && x + widthOf(cols, near) > rightEdge + 16) cols--;
      const w = widthOf(cols, near);
      const range = H - limitTop(x, x + w);
      const minH = near.pad * 2 + near.py * 2;
      const hgt = Math.min(range, Math.max(minH, range * (0.28 + R() * 0.36)));
      if (range >= minH) house(gNear, x, H - hgt, cols, near, 'near');
      x += w + 6 + R() * 36;
    }

    return { svg, W, H, houses, wins, gFar, gNear, outerFar, outerNear, small };
  }

  // Волна: окна вспыхивают по мере удаления от точки и оседают в целевое состояние
  function ripple(list, origin, { speed = 1.25, jitter = 240, flash = 170, done } = {}) {
    const items = list
      .map(o => ({ o, t: Math.hypot(o.cx - origin.x, o.cy - origin.y) / speed + Math.random() * jitter }))
      .sort((a, b) => a.t - b.t);
    const offs = [];
    let i = 0, j = 0;
    const t0 = performance.now();
    function step(now) {
      const t = now - t0;
      while (i < items.length && items[i].t <= t) {
        const it = items[i++];
        if (it.o.red) continue;
        setWin(it.o, 'on');
        if (!it.o.target) offs.push({ o: it.o, t: it.t + flash });
      }
      while (j < offs.length && offs[j].t <= t) { const it = offs[j++]; if (!it.o.red && !it.o.target) setWin(it.o, 'off'); }
      if (i < items.length || j < offs.length) requestAnimationFrame(step);
      else if (done) done();
    }
    requestAnimationFrame(step);
  }

  function ambient(city, isActive) {
    setInterval(() => {
      if (!isActive()) return;
      for (let k = 0; k < 3; k++) {
        const o = city.current.wins[Math.floor(Math.random() * city.current.wins.length)];
        if (!o || o.red || o.tmp) continue;
        o.target = !o.on;
        setWin(o, o.target ? 'on' : 'off');
      }
    }, 650);
  }

  function typeText(node, text, speed = 26) {
    const token = (node._typeToken || 0) + 1;
    node._typeToken = token;
    if (!motion) { node.textContent = text; return; }
    node.textContent = '';
    const caret = document.createElement('span');
    caret.className = 'caret';
    const txt = document.createTextNode('');
    node.append(txt, caret);
    let i = 0;
    (function tick() {
      if (node._typeToken !== token) return;
      txt.data = text.slice(0, ++i);
      if (i < text.length) setTimeout(tick, speed + Math.random() * speed);
      else setTimeout(() => caret.remove(), 900);
    })();
  }

  /* =========================================================
     01 · Hero
     ========================================================= */
  const hero = $('#top');
  const heroSvg = $('#hero-svg');
  const heroText = $('#hero-text');
  const twinLayer = $('#hero-twin-layer');
  const twin = $('#hero-twin');
  const twinMeta = $('[data-meta]', twin);
  const twinQuote = $('[data-quote]', twin);
  const LABEL_SPAN = 250 + 12 + 96 + 10;
  const QUOTES = [
    { m: '№48 213 · шымкент, 27', q: '«Купила бы, если реклама на казахском»' },
    { m: '№12 077 · алматы, 34', q: '«За 2 990 ₸ возьму, за 3 990 уже нет»' },
    { m: '№30 518 · туркестан, 52', q: '«Слово понятное, но звучит по-городскому»' },
    { m: '№7 402 · астана, 19', q: '«Подписку возьму, если первый месяц бесплатно»' },
  ];
  const heroState = { current: null, cands: [], red: null, qi: 0, visible: true, introDone: false, st: null };

  // область текста внутри секции — по раскладке, без учёта параллакса
  function textBox(node) {
    const p = node.offsetParent;
    const x = p.offsetLeft + node.offsetLeft, y = p.offsetTop + node.offsetTop;
    return { x0: x - 24, x1: x + node.offsetWidth + 24, y0: y - 24, y1: y + node.offsetHeight + 28 };
  }

  function findLabelSpots(city, avoid) {
    const t = city.houses.find(h => h.tower);
    if (!t || city.small) return [];
    const spots = t.wins.filter(o => o.c === 0).filter(o => {
      const xEnd = o.x - 10;
      const xStart = xEnd - LABEL_SPAN + 10;
      const yTop = o.cy - 36, yBot = o.cy + 32;
      if (xStart < 16 || yTop < 90) return false;
      for (const h of city.houses) {
        if (h === t) continue;
        if (h.x1 > xStart && h.x0 < xEnd && h.top - 32 < yBot) return false;
      }
      if (avoid && xStart < avoid.x1 && xEnd > avoid.x0 && yTop < avoid.y1 && yBot > avoid.y0) return false;
      return true;
    });
    // не соседние этажи, чтобы цитаты «переезжали» заметно
    const out = [];
    spots.forEach(o => { if (!out.some(p => Math.abs(p.r - o.r) < 2)) out.push(o); });
    return out;
  }

  function placeTwin(o, q) {
    twin.classList.remove('is-on');
    twinMeta.textContent = q.m;
    twin.style.left = (o.x - LABEL_SPAN) + 'px';
    twin.style.top = Math.round(o.cy - twin.offsetHeight / 2) + 'px';
    requestAnimationFrame(() => {
      twin.classList.add('is-on');
      typeText(twinQuote, q.q, 22);
    });
  }

  function heroQuote(next) {
    const s = heroState;
    if (!s.cands.length) return;
    if (next) s.qi = (s.qi + 1) % QUOTES.length;
    const o = s.cands[s.qi % s.cands.length];
    if (s.red && s.red !== o) { s.red.target = true; setWin(s.red, 'on'); }
    s.red = o;
    o.target = true;
    setWin(o, 'red');
    placeTwin(o, QUOTES[s.qi]);
  }

  function buildHero() {
    const sky = heroSvg.parentElement;
    const W = sky.clientWidth;
    const H = sky.clientHeight;
    const small = W < 700;
    const stacked = H < hero.clientHeight - 40; // телефон: город над текстом
    const avoid = stacked ? null : textBox(heroText);
    const city = buildCity(heroSvg, { W, H, avoid, seed: 11, small, maxFrac: stacked ? 0.8 : 0.84, tower: true });
    heroState.current = city;
    heroState.size = [W, H];
    const R = rng(5);
    city.wins.forEach(o => { o.target = R() < (o.layer === 'far' ? 0.22 : 0.36); });

    heroState.cands = findLabelSpots(city, avoid);
    hero.classList.toggle('no-label', !heroState.cands.length);
    twin.classList.remove('is-on');

    let red = heroState.cands[heroState.qi % Math.max(1, heroState.cands.length)];
    if (!red) {
      const t = city.houses.find(h => h.tower);
      red = t.wins[Math.min(t.wins.length - 1, 1 + Math.floor(t.wins.length * 0.18))];
    }
    heroState.red = red;
    red.target = true;
    setWin(red, 'red');

    if (!motion || heroState.introDone) {
      city.wins.forEach(o => { if (!o.red) setWin(o, o.target ? 'on' : 'off'); });
      if (heroState.cands.length) placeTwin(red, QUOTES[heroState.qi]);
    } else if (heroState.armed) {
      // первая загрузка: тёмный город, красное окно отвечает, свет расходится волной
      heroState.introDone = true;
      setTimeout(() => {
        if (heroState.current !== city) return;
        ripple(city.wins, { x: red.cx, y: red.cy }, { speed: 1.1, jitter: 260 });
        if (heroState.cands.length) setTimeout(() => { if (heroState.current === city) placeTwin(red, QUOTES[heroState.qi]); }, 700);
      }, 450);
    }

    if (motion) {
      if (heroState.st) heroState.st.kill();
      const tl = G.timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
      tl.to(city.outerNear, { y: H * 0.14, ease: 'none' }, 0)
        .to(city.outerFar, { y: H * 0.05, ease: 'none' }, 0)
        .to(twinLayer, { y: H * 0.14, ease: 'none' }, 0)
        .to(heroText, { y: -H * 0.12, ease: 'none' }, 0);
      heroState.st = tl.scrollTrigger;
    }
  }

  buildHero();
  visibleWatch(hero, v => { heroState.visible = v; });
  ambient(heroState, () => heroState.visible && !document.hidden);
  setInterval(() => { if (heroState.visible && !document.hidden) heroQuote(true); }, 5600);

  // курсор зажигает окна — «вы спрашиваете общество»
  if (motion) {
    let pending = null, raf = 0;
    const lit = new Set();
    const RADIUS = 86;
    function flashAt(px, py, radius, hold) {
      const now = performance.now();
      for (const o of heroState.current.wins) {
        if (o.red) continue;
        const d = Math.hypot(o.cx - px, o.cy - py);
        if (d < radius) {
          if (!o.on) { setWin(o, 'on'); o.tmp = true; lit.add(o); }
          if (o.tmp) o.until = now + hold + (radius - d) * 4;
        }
      }
    }
    hero.addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      pending = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const b = heroSvg.getBoundingClientRect();
        const near = heroState.current.gNear;
        const nx = (pending.clientX - b.left) / b.width - 0.5;
        const ny = (pending.clientY - b.top) / b.height - 0.5;
        const tx = Number(G.getProperty(near, 'x')) || 0;
        const scrollY0 = Number(G.getProperty(heroState.current.outerNear, 'y')) || 0;
        flashAt(pending.clientX - b.left - tx, pending.clientY - b.top - scrollY0, RADIUS, 700);
        G.to([near, twin], { x: -nx * 26, y: -ny * 8, duration: 1.2, ease: 'power3.out', overwrite: 'auto' });
        G.to(heroState.current.gFar, { x: -nx * 10, y: -ny * 3, duration: 1.4, ease: 'power3.out', overwrite: 'auto' });
      });
    });
    hero.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') return;
      const b = heroSvg.getBoundingClientRect();
      flashAt(e.clientX - b.left, e.clientY - b.top, 150, 900);
    });
    setInterval(() => {
      const now = performance.now();
      lit.forEach(o => {
        if (o.until < now) { o.tmp = false; lit.delete(o); if (!o.red) setWin(o, o.target ? 'on' : 'off'); }
      });
    }, 120);

    // заголовок поднимается строками
    G.from('.hero .line > span', { yPercent: 110, duration: 1.15, ease: 'power4.out', stagger: 0.09, delay: 0.15 });
    G.from(['.hero .eyebrow', '.hero .lead', '.hero__ctas'], { y: 22, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.55 });
  }

  // лента вопросов: дублируем содержимое для бесконечной прокрутки
  const ticker = $('#ticker');
  ticker.innerHTML += ticker.innerHTML;
  $$('.ticker__item', ticker).slice(ticker.children.length / 2).forEach(n => n.setAttribute('aria-hidden', 'true'));

  /* =========================================================
     02 · История: дом 4×5 загорается 0 → 2 → 11 → 17
     ========================================================= */
  const storySvg = $('#story-svg');
  const storyCount = $('#story-count');
  const storyStatus = $('#story-status');
  const ORDER = [13, 6, 1, 18, 9, 4, 15, 10, 2, 19, 7, 12, 0, 16, 5, 11, 8, 3, 14, 17];
  svgEl('rect', { class: 'f', x: 0, y: 28, width: 296, height: 452 }, storySvg);
  svgEl('rect', { class: 'f', x: 206, y: 0, width: 6, height: 30 }, storySvg);
  const storyWins = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 4; c++) {
    const node = svgEl('rect', { class: 'w', x: 32 + c * 64, y: 60 + r * 76, width: 40, height: 52 }, storySvg);
    storyWins.push({ el: node });
  }
  let storyN = 0;
  function setStory(n, withRed) {
    const prev = storyN;
    ORDER.forEach((idx, i) => {
      const o = storyWins[idx];
      const state = i < n ? (withRed && i === n - 1 ? 'red' : 'on') : 'off';
      o.el.style.transitionDelay = motion && i >= prev && i < n ? `${(i - prev) * 70}ms` : '0ms';
      setWin(o, state);
    });
    if (motion) {
      const obj = { v: prev };
      G.to(obj, { v: n, duration: 0.3 + Math.abs(n - prev) * 0.07, ease: 'power1.out', onUpdate: () => { storyCount.textContent = `${Math.round(obj.v)} из 20`; } });
    } else storyCount.textContent = `${n} из 20`;
    storyN = n;
  }
  const steps = $$('.step');
  function activateStep(step) {
    steps.forEach(s => s.classList.toggle('is-active', s === step));
    if (!step.classList.contains('was-active')) {
      step.classList.add('was-active');
      $$('.reveal-seg', step).forEach((n, i) => { n.style.transitionDelay = `${300 + i * 260}ms`; });
      const typing = $('[data-typing]', step);
      if (typing) typeText(typing, typing.textContent.trim(), 30);
    }
    setStory(Number(step.dataset.lit), step.hasAttribute('data-red'));
    storyStatus.textContent = step.dataset.status;
  }
  const stepIO = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) activateStep(en.target); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  steps.forEach(s => stepIO.observe(s));
  activateStep(steps[0]);

  /* =========================================================
     03 · Одно окно: зум в красное окно
     ========================================================= */
  const zoom = $('#zoom');
  const zFacade = $('#zoom-facade');
  const zRed = $('#zoom-red');
  const zIntro = $('#zoom-intro');
  const zoomState = { wins: [], tl: null, visible: false };
  function buildZoom() {
    const pin = zFacade.parentElement;
    const vw = pin.clientWidth;
    const vh = pin.clientHeight;
    const small = vw < 700;
    const g = small ? { w: 28, h: 36, px: 44, py: 52, pad: 20 } : { w: 40, h: 52, px: 64, py: 76, pad: 32 };
    const top = Math.round(zIntro.offsetTop + zIntro.offsetHeight + (small ? 32 : 56));
    const fh = vh - top;
    zFacade.style.top = top + 'px';
    zFacade.textContent = '';
    const cols = Math.ceil(vw / g.px) + 1;
    const offX = Math.round((vw - (cols * g.px - (g.px - g.w))) / 2);
    const rows = Math.ceil((fh - g.pad) / g.py) + 1;
    const R = rng(3);
    const wins = [];
    const frag = document.createDocumentFragment();
    let red = null, best = Infinity;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = offX + c * g.px, y = g.pad + r * g.py;
      const d = Math.hypot(x + g.w / 2 - vw / 2, y + g.h / 2 - fh * 0.34);
      const n = document.createElement('i');
      n.className = 'zoom__win' + (R() < 0.38 ? ' on' : '');
      n.style.cssText = `left:${x}px;top:${y}px;width:${g.w}px;height:${g.h}px`;
      frag.appendChild(n);
      const o = { n, x, y };
      wins.push(o);
      if (d < best) { best = d; red = o; }
    }
    zFacade.appendChild(frag);
    red.n.className = 'zoom__win red';
    zoomState.wins = wins.filter(o => o !== red);

    const cx = red.x + g.w / 2, cy = red.y + g.h / 2;
    zRed.style.cssText = `left:${red.x}px;top:${top + red.y}px;width:${g.w}px;height:${g.h}px`;
    zFacade.style.transformOrigin = `${cx}px ${cy}px`;

    if (!motion) return;
    if (zoomState.tl) { zoomState.tl.scrollTrigger.kill(); zoomState.tl.kill(); }
    G.set([zFacade, zRed], { clearProps: 'transform,opacity,visibility' });
    G.set(zIntro, { clearProps: 'transform,opacity' });
    const dx = vw / 2 - cx, dy = vh / 2 - (top + cy);
    const S = Math.max(vw / g.w, vh / g.h) * 1.15;
    const tl = G.timeline({ scrollTrigger: { trigger: zoom, start: 'top top', end: 'bottom bottom', scrub: 0.8 } });
    tl.to(zIntro, { opacity: 0, y: -60, ease: 'power1.in', duration: 0.16 }, 0.06)
      .to([zFacade, zRed], { x: dx, y: dy, scale: S, ease: 'power3.in', duration: 0.5 }, 0.1)
      .set(zFacade, { autoAlpha: 0 }, 0.6)
      .fromTo('[data-z]', { opacity: 0, y: 40 }, { opacity: 1, y: 0, stagger: 0.035, duration: 0.12, ease: 'power2.out' }, 0.62)
      .to({}, { duration: 0.18 });
    zoomState.tl = tl;
  }
  if (!motion) zoom.classList.add('is-static');
  else {
    buildZoom();
    visibleWatch(zoom, v => { zoomState.visible = v; });
    setInterval(() => {
      if (!zoomState.visible || document.hidden) return;
      for (let k = 0; k < 4; k++) {
        const o = zoomState.wins[Math.floor(Math.random() * zoomState.wins.length)];
        if (o) o.n.classList.toggle('on');
      }
    }, 500);
  }

  /* =========================================================
     04 · Квартал: шесть домов, доля «за» — горящие окна
     ========================================================= */
  const CITIES = [
    { name: 'алматы', cols: 4, rows: 10 },
    { name: 'астана', cols: 4, rows: 8 },
    { name: 'шымкент', cols: 4, rows: 7 },
    { name: 'караганда', cols: 3, rows: 6 },
    { name: 'туркестан', cols: 3, rows: 5 },
    { name: 'село', cols: 6, rows: 2 },
  ];
  const CITY_QS = [
    { q: 'Реклама кофейни только на русском — зайдёт?', v: [72, 64, 41, 70, 18, 22], red: 4,
      insight: 'Туркестан и село против. Нужна казахская версия.' },
    { q: 'Доставка за 1 490 ₸ — нормальная цена?', v: [68, 61, 34, 47, 29, 12], red: 2,
      insight: 'В Шымкенте цена кажется высокой. Проверьте 990 ₸.' },
    { q: 'Слоган «Жаңа дәм — жаңа күн» понятен?', v: [58, 66, 81, 44, 87, 79], red: 3,
      insight: 'В Караганде слоган понимают хуже. Нужны два языка.' },
  ];
  const citySvg = $('#city-svg');
  const cityQs = $('#city-qs');
  const cityInsight = $('#city-insight');
  const GROUND = 456;
  const cityHouses = [];
  (function buildSkyline() {
    const geo = { w: 20, h: 26, px: 32, py: 38, pad: 14 };
    const widths = CITIES.map(c => c.cols * geo.px - (geo.px - geo.w) + geo.pad * 2);
    const gap = (1240 - widths.reduce((a, b) => a + b, 0)) / (CITIES.length - 1);
    svgEl('rect', { class: 'ground', x: 0, y: GROUND, width: 1240, height: 1 }, citySvg);
    let x = 0;
    const R = rng(9);
    CITIES.forEach((c, i) => {
      const w = widths[i];
      const h = c.rows * geo.py - (geo.py - geo.h) + geo.pad * 2;
      const top = GROUND - h;
      const g = svgEl('g', {}, citySvg);
      svgEl('rect', { class: 'f', x, y: top, width: w, height: h }, g);
      const wins = [];
      for (let r = 0; r < c.rows; r++) for (let k = 0; k < c.cols; k++) {
        wins.push({ el: svgEl('rect', { class: 'w', x: x + geo.pad + k * geo.px, y: top + geo.pad + r * geo.py, width: geo.w, height: geo.h }, g) });
      }
      // порядок загорания: снизу вверх с разбросом — как этажи
      const rank = wins.map((o, idx) => ({ idx, k: (wins.length - idx) / wins.length + R() * 0.55 }))
        .sort((a, b) => b.k - a.k).map(o => wins[o.idx]);
      const pct = svgEl('text', { class: 'pct', x, y: top - 18 }, citySvg);
      pct.textContent = '—';
      const lbl = svgEl('text', { class: 'lbl', x, y: GROUND + 30 }, citySvg);
      lbl.textContent = c.name;
      cityHouses.push({ g, wins: rank, pct, val: 0 });
      x += w + gap;
    });
  })();

  let cityQ = -1, cityAuto = null, cityTouched = false;
  function setCityQ(qi) {
    if (qi === cityQ) return;
    cityQ = qi;
    const d = CITY_QS[qi];
    $$('.chip', cityQs).forEach((b, i) => { b.setAttribute('aria-selected', String(i === qi)); b.tabIndex = i === qi ? 0 : -1; });
    cityHouses.forEach((h, hi) => {
      const n = h.wins.length;
      const lit = Math.max(1, Math.round(d.v[hi] / 100 * n));
      h.wins.forEach((o, ri) => {
        const state = ri < lit ? (hi === d.red && ri === lit - 1 ? 'red' : 'on') : 'off';
        o.el.style.transitionDelay = motion ? `${hi * 60 + ri * 22}ms` : '0ms';
        setWin(o, state);
      });
      h.pct.classList.toggle('is-signal', hi === d.red);
      if (motion) {
        const obj = { v: h.val };
        G.to(obj, { v: d.v[hi], duration: 0.9, delay: hi * 0.06, ease: 'power2.out', onUpdate: () => { h.pct.textContent = Math.round(obj.v) + '%'; } });
      } else h.pct.textContent = d.v[hi] + '%';
      h.val = d.v[hi];
    });
    cityInsight.style.opacity = 0;
    setTimeout(() => { cityInsight.textContent = d.insight; cityInsight.style.opacity = 1; }, motion ? 250 : 0);
  }
  CITY_QS.forEach((d, i) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.id = `city-q-${i}`;
    b.textContent = d.q;
    b.addEventListener('click', () => { cityTouched = true; setCityQ(i); });
    b.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const ni = (i + (e.key === 'ArrowRight' ? 1 : CITY_QS.length - 1)) % CITY_QS.length;
      cityTouched = true;
      setCityQ(ni);
      $(`#city-q-${ni}`).focus();
    });
    cityQs.appendChild(b);
  });
  function startCity() {
    setCityQ(0);
    if (cityAuto) return;
    cityAuto = setInterval(() => {
      if (cityTouched || document.hidden || !cityInView) return;
      setCityQ((cityQ + 1) % CITY_QS.length);
    }, 6500);
  }
  let cityInView = false;
  visibleWatch(citySvg, v => { cityInView = v; });
  if (motion) {
    G.from(cityHouses.map(h => h.g), {
      scaleY: 0, transformOrigin: '50% 100%', duration: 1.2, ease: 'power4.out', stagger: 0.09,
      scrollTrigger: { trigger: citySvg, start: 'top 80%', once: true, onEnter: () => setTimeout(startCity, 700) },
    });
  } else startCity();

  /* =========================================================
     05 · Два дома: живые люди и двойники, совпало 15 из 20
     ========================================================= */
  const truthSvg = $('#truth-svg');
  const truthStat = $('#truth-stat');
  const truthCap = $('#truth-cap');
  const REAL = [1,0,1,1, 0,1,0,1, 1,1,0,0, 0,1,1,0, 1,0,1,1];
  const FLIP = new Set([2, 6, 11, 15, 17]);
  const MARK = 11;
  const tWins = [];
  (function buildTruth() {
    const gx = [0, 304];
    const geo = { w: 40, h: 52, px: 56, py: 70, pad: 24 };
    gx.forEach((x0, hi) => {
      svgEl('rect', { class: hi ? 'f' : 'fo', x: x0 + (hi ? 0 : 0.75), y: 24.75, width: 256 - (hi ? 0 : 1.5), height: 380 }, truthSvg);
      for (let i = 0; i < 20; i++) {
        const c = i % 4, r = Math.floor(i / 4);
        const x = x0 + geo.pad + c * geo.px, y = 24 + geo.pad + r * geo.py;
        const node = svgEl('rect', { class: hi ? 'w' : 'wo', x: x + (hi ? 0 : 0.5), y: y + (hi ? 0 : 0.5), width: geo.w - (hi ? 0 : 1), height: geo.h - (hi ? 0 : 1) }, truthSvg);
        (tWins[i] = tWins[i] || [])[hi] = { el: node, x, y };
      }
      const t = svgEl('text', { class: 'lbl', x: x0, y: 432 }, truthSvg);
      t.textContent = hi ? 'двойники' : 'живые люди';
    });
    const m = tWins[MARK][1];
    tWins.mark = svgEl('rect', { class: 'mk', x: m.x - 6, y: m.y - 6, width: geo.w + 12, height: geo.h + 12 }, truthSvg);
  })();
  function truthFinal() {
    tWins.forEach((pair, i) => {
      const real = !!REAL[i];
      const tw = FLIP.has(i) ? !real : real;
      pair[0].el.classList.toggle('on', real);
      pair[1].el.classList.toggle('on', tw);
    });
    tWins.mark.classList.add('is-on');
  }
  function truthPlay() {
    let matched = 0;
    truthStat.textContent = '0%';
    tWins.forEach((pair, i) => {
      setTimeout(() => {
        const real = !!REAL[i];
        const tw = FLIP.has(i) ? !real : real;
        pair[0].el.classList.toggle('on', real);
        pair[1].el.classList.toggle('on', tw);
        if (real === tw) matched++;
        truthStat.textContent = Math.round(matched / 20 * 100) + '%';
        truthCap.textContent = `совпало ${matched} из ${i + 1} окон`;
        if (i === 19) setTimeout(() => {
          tWins.mark.classList.add('is-on');
          truthCap.textContent = 'совпало 15 из 20 окон';
        }, 400);
      }, i * 120);
    });
  }
  if (motion) ST.create({ trigger: truthSvg, start: 'top 75%', once: true, onEnter: truthPlay });
  else truthFinal();

  /* =========================================================
     06 · Гонка: агентство против 15 запросов
     ========================================================= */
  const raceBar = $('#race-bar');
  const raceWins = $('#race-wins');
  for (let i = 0; i < 15; i++) raceWins.appendChild(document.createElement('i'));
  const raceItems = [...raceWins.children];
  let raceTimers = [];
  function raceReset() {
    raceTimers.forEach(clearTimeout); raceTimers = [];
    raceItems.forEach(n => n.classList.remove('on'));
    if (motion) G.set(raceBar, { scaleX: 0.02 });
  }
  function racePlay() {
    raceReset();
    G.to(raceBar, { scaleX: 1, duration: 7, ease: 'none' });
    raceItems.forEach((n, i) => raceTimers.push(setTimeout(() => n.classList.add('on'), 250 + i * 140)));
  }
  if (motion) {
    ST.create({ trigger: '#race', start: 'top 75%', onEnter: racePlay, onEnterBack: racePlay, onLeaveBack: raceReset });
  } else {
    raceBar.style.transform = 'scaleX(1)';
    raceItems.forEach(n => n.classList.add('on'));
  }

  /* ---------- Мини-дома в «Для кого» ---------- */
  $$('[data-mini]').forEach((m, mi) => {
    const R = rng(40 + mi);
    const base = Number(m.dataset.mini);
    const order = shuffled(15, R);
    for (let i = 0; i < 15; i++) m.appendChild(document.createElement('i'));
    const cells = [...m.children];
    const show = n => order.forEach((idx, i) => {
      cells[idx].style.transitionDelay = `${i * 30}ms`;
      cells[idx].classList.toggle('on', i < n);
    });
    show(base);
    const item = m.closest('.who__item');
    item.addEventListener('pointerenter', () => show(15));
    item.addEventListener('pointerleave', () => show(base));
    item.addEventListener('focusin', () => show(15));
    item.addEventListener('focusout', () => show(base));
  });

  /* =========================================================
     10 · Финал: город загорается, форма
     ========================================================= */
  const fin = $('#start');
  const finSvg = $('#final-svg');
  const finText = $('#final-text');
  const finState = { current: null, lit: false, visible: false, size: [0, 0] };
  function buildFinal() {
    const W = fin.clientWidth, H = fin.clientHeight;
    const avoid = textBox(finText);
    const city = buildCity(finSvg, { W, H, avoid, seed: 23, small: W < 700, maxFrac: W < 700 ? 0.95 : 0.86, tower: true });
    finState.current = city;
    finState.size = [W, H];
    const R = rng(8);
    city.wins.forEach(o => { o.target = R() < (o.layer === 'far' ? 0.4 : 0.62); });
    const t = city.houses.find(h => h.tower);
    const red = t.wins[Math.min(t.wins.length - 1, 9)];
    red.target = true;
    if (finState.lit || !motion) {
      city.wins.forEach(o => setWin(o, o === red ? 'red' : (o.target ? 'on' : 'off')));
    }
    finState.red = red;
  }
  buildFinal();
  visibleWatch(fin, v => { finState.visible = v; });
  ambient(finState, () => finState.visible && !document.hidden);
  if (motion) {
    ST.create({
      trigger: fin, start: 'top 55%', once: true,
      onEnter: () => {
        finState.lit = true;
        const c = finState.current;
        setWin(finState.red, 'red');
        ripple(c.wins, { x: c.W * 0.5, y: c.H + 40 }, { speed: 0.9, jitter: 300 });
      },
    });
  }

  const form = $('#form');
  const msg = $('#form-msg');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const email = $('#f-email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      msg.textContent = 'Проверьте почту: нужен адрес вида name@company.kz';
      msg.classList.add('is-error');
      $('#f-email').focus();
      return;
    }
    msg.classList.remove('is-error');
    msg.textContent = `Спасибо. Мы напишем на ${email} и откроем доступ.`;
    // весь город отвечает
    const c = finState.current;
    const btn = form.querySelector('button').getBoundingClientRect();
    const b = finSvg.getBoundingClientRect();
    c.wins.forEach(o => { o.target = o.target || Math.random() < 0.75; });
    if (motion) ripple(c.wins, { x: btn.left - b.left + btn.width / 2, y: btn.top - b.top }, { speed: 1.4, jitter: 200 });
    else c.wins.forEach(o => { if (!o.red) setWin(o, o.target ? 'on' : 'off'); });
  });

  /* ---------- Прогресс-дом: 20 окон = 100% страницы ---------- */
  const prog = $('#progress');
  const progCells = [];
  for (let i = 0; i < 20; i++) progCells.push(prog.appendChild(document.createElement('i')));
  // снизу вверх, слева направо
  const progOrder = [];
  for (let r = 4; r >= 0; r--) for (let c = 0; c < 4; c++) progOrder.push(r * 4 + c);
  function onProgress() {
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    const n = Math.round(p * 20);
    prog.classList.toggle('is-off', scrollY < innerHeight * 0.6);
    progOrder.forEach((idx, i) => {
      progCells[idx].classList.toggle('on', i < n && !(i === 19 && n === 20));
      progCells[idx].classList.toggle('red', i === 19 && n === 20);
    });
  }
  addEventListener('scroll', onProgress, { passive: true });
  onProgress();

  /* ---------- Появление блоков ---------- */
  if (motion) {
    const groups = ['.section__head', '.truth__text', '.race', '.who', '.price', '.faq'];
    groups.forEach(sel => $$(sel).forEach(g => {
      G.from(g.children, {
        y: 44, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08,
        scrollTrigger: { trigger: g, start: 'top 85%', once: true },
      });
    }));
    G.from('.final__text > *', {
      y: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.08,
      scrollTrigger: { trigger: fin, start: 'top 60%', once: true },
    });
  }

  /* ---------- Пересборка при смене размера ---------- */
  let lastW = innerWidth, lastH = innerHeight;
  addEventListener('resize', debounce(() => {
    const w = innerWidth, h = innerHeight;
    if (Math.abs(w - lastW) < 2 && Math.abs(h - lastH) < 150) return;
    lastW = w; lastH = h;
    buildHero();
    buildFinal();
    if (motion) { buildZoom(); ST.refresh(); }
  }, 220));

  // шрифты меняют высоту текста: пересобираем сцены и только потом зажигаем город
  let fontsHandled = false;
  function afterFonts() {
    if (fontsHandled) return;
    fontsHandled = true;
    heroState.armed = true;
    buildHero();
    buildFinal();
    if (motion) { buildZoom(); ST.refresh(); }
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(afterFonts);
  setTimeout(afterFonts, 1500);
})();
