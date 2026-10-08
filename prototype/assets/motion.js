/* 永生花 · Everbloom — 动效与交互
 * 一株花的一生：开场（融化、落下、开花）→ 常驻（滴落、摇曳、作画）→ 滚动（藤蔓、压制、盖章）
 */
(function () {
  const E = window.Everbloom;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const ease = {
    out: 'cubic-bezier(.16,1,.3,1)',
    inOut: 'cubic-bezier(.65,0,.35,1)',
    in: 'cubic-bezier(.55,0,1,.45)',
    spring: 'cubic-bezier(.34,1.56,.64,1)',
    soft: 'cubic-bezier(.22,.61,.36,1)'
  };
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // 动画结束后把末帧写回内联样式并释放动画，让 CSS（悬停、循环）重新接管
  function play(node, frames, opts) {
    const a = node.animate(frames, Object.assign({ fill: 'both' }, opts));
    a.finished.then(() => {
      const last = frames[frames.length - 1];
      for (const k in last) if (k !== 'offset' && k !== 'easing' && k !== 'composite') node.style[k] = last[k];
      a.cancel();
    }).catch(() => {});
    return a;
  }

  function countUp(node, to, opts) {
    opts = opts || {};
    const dur = opts.duration || 1400, delay = opts.delay || 0;
    const fmt = opts.format || (v => Math.round(v).toLocaleString('en-US'));
    if (reduced) { node.textContent = fmt(to); return; }
    node.textContent = fmt(0);
    const t0 = performance.now() + delay;
    const tick = (now) => {
      const t = clamp((now - t0) / dur, 0, 1);
      node.textContent = fmt(to * (1 - Math.pow(1 - t, 4)));
      if (t < 1 && !skipping) requestAnimationFrame(tick);
      else node.textContent = fmt(to);
    };
    requestAnimationFrame(tick);
  }

  function typeText(node, text, opts) {
    opts = opts || {};
    const step = opts.step || 28, delay = opts.delay || 0;
    if (reduced) { node.textContent = text; return; }
    node.textContent = '';
    let i = 0;
    const t0 = performance.now() + delay;
    const tick = (now) => {
      const n = skipping ? text.length : clamp(Math.floor((now - t0) / step), 0, text.length);
      if (n !== i) { i = n; node.textContent = text.slice(0, i); }
      if (i < text.length) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // 把文字拆成单字，保留 <br> 与内部标签
  function splitChars(node) {
    const out = [];
    const walk = (n) => {
      Array.from(n.childNodes).forEach(c => {
        if (c.nodeType === 3) {
          const frag = document.createDocumentFragment();
          for (const ch of c.textContent) {
            if (/\s/.test(ch)) { frag.appendChild(document.createTextNode(ch)); continue; }
            const s = document.createElement('span');
            s.className = 'ch';
            s.textContent = ch;
            frag.appendChild(s);
            out.push(s);
          }
          c.replaceWith(frag);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    };
    walk(node);
    node.setAttribute('aria-label', node.textContent);
    return out;
  }

  function inkIn(chars, opts) {
    opts = opts || {};
    const step = opts.step || 34, delay = opts.delay || 0;
    chars.forEach((c, i) => play(c, [
      { opacity: 0, filter: 'blur(8px)', transform: 'translateY(.35em)' },
      { opacity: 1, filter: 'blur(0px)', transform: 'none' }
    ], { duration: 900, delay: delay + i * step, easing: ease.out }));
  }

  // 只触发一次的进入视口
  function onEnter(nodes, fn, opts) {
    opts = opts || {};
    if (!('IntersectionObserver' in window)) { nodes.forEach(n => fn(n, 0)); return; }
    let batch = 0, batchTimer;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        fn(en.target, batch++);
        clearTimeout(batchTimer);
        batchTimer = setTimeout(() => { batch = 0; }, 120);
      });
    }, { threshold: opts.threshold || .2, rootMargin: opts.rootMargin || '0px 0px -8% 0px' });
    nodes.forEach(n => io.observe(n));
  }

  /* ---------------- 花：隐藏、开放、吹散 ---------------- */

  function stemLen(p) { try { return p.getTotalLength(); } catch (e) { return 200; } }

  function hideFlora(scope) {
    $$('.petal, .leaf-in, .core', scope).forEach(n => { n.style.transform = 'scale(0)'; });
    $$('.stem', scope).forEach(p => {
      if (p.closest('.sketch')) { p.style.opacity = '0'; return; }
      const L = stemLen(p);
      p.style.strokeDasharray = L;
      p.style.strokeDashoffset = L;
    });
    $$('.tape-rect', scope).forEach(n => { n.style.opacity = '0'; });
  }

  function bloomIn(scope, opts) {
    opts = opts || {};
    const d0 = opts.delay || 0, k = opts.speed || 1;
    let t = d0;
    // 压花滤镜（湍流位移）逐帧重算很贵：生长时先摘掉，落定那一刻再"压"上去
    const pressed = [scope, ...$$('[filter]', scope)].filter(n => n.getAttribute && n.getAttribute('filter'));
    pressed.forEach(n => { n.dataset.press = n.getAttribute('filter'); n.removeAttribute('filter'); });
    const stems = $$('.stem', scope);
    stems.forEach((p, i) => {
      if (p.closest('.sketch')) {
        play(p, [{ opacity: 0 }, { opacity: 1 }], { duration: 700 * k, delay: t + i * 30 * k });
      } else {
        const L = stemLen(p);
        p.style.strokeDasharray = L;
        play(p, [{ strokeDashoffset: L }, { strokeDashoffset: 0 }], { duration: (p.classList.contains('branch') ? 380 : 800) * k, delay: t + (p.classList.contains('branch') ? 500 * k : 0), easing: ease.inOut });
      }
    });
    t += 450 * k;
    $$('.leaf-in', scope).forEach((n, i) => play(n, [
      { transform: 'scale(0) rotate(-35deg)' },
      { transform: 'scale(1) rotate(0deg)' }
    ], { duration: 900 * k, delay: t + i * 110 * k, easing: ease.spring }));
    t += 380 * k;
    const petals = $$('.petal', scope);
    const step = Math.min(32, 900 / Math.max(petals.length, 1)) * k;
    petals.forEach((n, i) => play(n, [
      { transform: 'scale(0) rotate(-24deg)' },
      { transform: 'scale(1.08) rotate(3deg)', offset: .7 },
      { transform: 'scale(1) rotate(0deg)' }
    ], { duration: 1000 * k, delay: t + i * step, easing: ease.out }));
    t += petals.length * step + 220 * k;
    $$('.core', scope).forEach((n, i) => play(n, [
      { transform: 'scale(0)' }, { transform: 'scale(1)' }
    ], { duration: 700 * k, delay: t + i * 20 * k, easing: ease.spring }));
    $$('.tape-rect', scope).forEach((n, i) => {
      n.style.transformBox = 'fill-box';
      n.style.transformOrigin = 'center';
      play(n, [
        { opacity: 0, transform: 'translateY(-14px) rotate(-14deg) scale(1.4)' },
        { opacity: 1, transform: 'none' }
      ], { duration: 520, delay: t + 300 + i * 160, easing: ease.out });
    });
    const end = t + 700 * k;
    setTimeout(() => pressed.forEach(n => { if (n.dataset.press) n.setAttribute('filter', n.dataset.press); }), end);
    return end;
  }

  // 把屏幕方向的位移换算到元素的局部坐标（累计祖先的 rotate 与 scale）
  function localVec(node, wx, wy) {
    let ang = 0, sc = 1, n = node.parentNode;
    while (n && n.tagName && n.tagName.toLowerCase() !== 'svg') {
      const tr = n.getAttribute && n.getAttribute('transform');
      if (tr) {
        const r = tr.match(/rotate\(([-\d.]+)/); if (r) ang += +r[1];
        const s = tr.match(/scale\(([\d.]+)/); if (s) sc *= +s[1];
      }
      n = n.parentNode;
    }
    const th = -ang * Math.PI / 180;
    return [(wx * Math.cos(th) - wy * Math.sin(th)) / sc, (wx * Math.sin(th) + wy * Math.cos(th)) / sc];
  }

  // 一阵风：花瓣与叶片向下飘落
  function scatter(scope, opts) {
    opts = opts || {};
    const reach = opts.reach || 1, tempo = opts.tempo || 1;
    const parts = $$('.petal, .leaf-in, .core', scope);
    let longest = 0;
    const anims = parts.map(n => {
      const wind = rand(-.4, 1) * 90 * reach, fall = rand(120, 260) * reach;
      const [mx, my] = localVec(n, wind * .5 + rand(-20, 20), fall * .35);
      const [ex, ey] = localVec(n, wind, fall);
      const rot = rand(-260, 260), dur = rand(1100, 1900) * tempo, delay = rand(0, 380) * tempo;
      longest = Math.max(longest, dur + delay);
      return n.animate([
        { transform: 'translate(0,0) rotate(0deg) scale(1)', opacity: 1 },
        { transform: `translate(${mx}px,${my}px) rotate(${rot * .4}deg) scale(.95)`, opacity: 1, offset: .4 },
        { transform: `translate(${ex}px,${ey}px) rotate(${rot}deg) scale(.7)`, opacity: 0 }
      ], { duration: dur, delay, easing: ease.soft, fill: 'forwards' });
    });
    return new Promise(res => setTimeout(() => res(anims), longest));
  }

  /* ---------------- 世界上有这么多花：随机花种 ---------------- */

  const GENUS = ['Codexia', 'Pixelaria', 'Rustica', 'Vectoria', 'Glyphia', 'Bytea', 'Layeria', 'Kernelia', 'Fontana', 'Schemia'];
  const EPITHET = ['aurea', 'nocturna', 'fragilis', 'perennis', 'silens', 'repetita', 'reversa', 'minima', 'tenera', 'aperta'];
  const ZH_A = ['晨', '夜', '旧', '远', '小', '素', '回', '静', '重', '浮'];
  const ZH_B = ['码', '格', '层', '帧', '字', '光', '线', '页', '音', '图'];
  const ZH_C = ['兰', '菊', '莲', '葵', '棠', '堇', '茶', '薇', '萱', '蓼'];
  const PALETTE = ['#C8553D', '#D9A23A', '#5B5FA0', '#E3B7B2', '#7FA3C9', '#8C7BB8', '#E4A9B4', '#C9578A', '#8FA6CF', '#B5412D', '#D98C5F', '#6E8FA6', '#C2A3C9', '#E7D3A1', '#7E9C6B'];
  const CORES = ['#2B2A28', '#5A3B22', '#E0B84C', '#C9A94A', '#5E6B3C', '#F2D36B'];

  function randomSpecies(seed) {
    const r = E.rng(seed);
    const pick = (arr) => arr[Math.floor(r() * arr.length)];
    const shapes = ['round', 'pointed', 'slender', 'notched'];
    const cluster = r() < .2;
    const color = pick(PALETTE);
    const rings = [];
    if (cluster) {
      rings.push({ n: 4 + Math.floor(r() * 3), L: 22, W: 18, shape: pick(['round', 'pointed']), color, rot: r() * 90 });
    } else {
      const shape = pick(shapes);
      const n = shape === 'slender' ? 10 + Math.floor(r() * 12) : 4 + Math.floor(r() * 9);
      const L = 38 + r() * 14;
      const W = clamp(Math.PI * L * .9 / n, 6, 34);
      const layers = 1 + Math.floor(r() * 3);
      for (let i = 0; i < layers; i++) {
        rings.push({ n, L: L * Math.pow(.74, i), W: W * Math.pow(.82, i), shape, color: E.shade(color, -.09 * i), rot: i * 180 / n });
      }
    }
    const ctype = pick(['poppy', 'disk', 'dot', 'stamens', 'pod']);
    const sp = {
      rings,
      center: { type: ctype, r: ctype === 'disk' ? 8 + r() * 10 : 4 + r() * 6, color: pick(CORES) },
      leaves: 1 + Math.floor(r() * 3),
      leaf: pick(['lance', 'oval', 'lobed', 'thread', 'blade']),
      stemCurve: 6 + r() * 26
    };
    if (cluster) sp.cluster = { count: 4 + Math.floor(r() * 11), spread: 30 + r() * 12, scale: .42 + r() * .2 };
    sp.latin = `${pick(GENUS)} ${pick(EPITHET)}`;
    sp.zh = pick(ZH_A) + pick(ZH_B) + pick(ZH_C);
    return sp;
  }

  /* ---------------- 首屏 ---------------- */

  let skipping = false;
  const introAnims = [];

  function hero() {
    const svg = $('#heroArt');
    if (!svg) return;
    // 减少动态效果：直接呈现最终画面，只保留作画等用户主动触发的交互
    if (reduced) { heroInteractions(svg); return; }
    const at =(node, frames, opts) => { if (node) introAnims.push(play(node, frames, opts)); };
    const S = .8; // 整体节奏
    const fadeUp = [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }];

    // 标题
    const h1 = $('.hero-mast h1');
    const titleChars = splitChars(h1);
    at(h1, [{ opacity: 0 }, { opacity: 1 }], { duration: 10 });
    titleChars.forEach((c, i) => at(c, [
      { opacity: 0, transform: 'translateY(.45em)', filter: 'blur(12px)' },
      { opacity: 1, transform: 'none', filter: 'blur(0px)' }
    ], { duration: 1300, delay: 150 + i * 160, easing: ease.out }));
    at($('.hero-mast .latin'), [{ opacity: 0, letterSpacing: '1.1em' }, { opacity: 1, letterSpacing: '.5em' }], { duration: 1800, delay: 500, easing: ease.out });

    // 窗口：描边 → 填充 → 开机
    const gWin = $('#gWindow');
    at(gWin, [{ opacity: 0 }, { opacity: 1 }], { duration: 10, delay: 250 * S });
    const frame = $('.w-frame', svg);
    const fl = stemLen(frame);
    frame.style.strokeDasharray = fl;
    at(frame, [{ strokeDashoffset: fl }, { strokeDashoffset: 0 }], { duration: 1100 * S, delay: 250 * S, easing: ease.inOut });
    at($('.w-fill', svg), [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 700 * S, delay: 800 * S, easing: ease.out });
    at($('#pix'), [{ clipPath: 'inset(0 0 100% 0)', opacity: 1 }, { clipPath: 'inset(0 0 0% 0)', opacity: 1 }], { duration: 800 * S, delay: 1250 * S, easing: 'steps(14, end)' });
    at($('#ants'), [{ opacity: 0 }, { opacity: 1 }], { duration: 300, delay: 2100 * S });

    // 融化
    at($('#gDrip'), [{ clipPath: 'inset(0 0 100% 0)', opacity: 1 }, { clipPath: 'inset(0 0 0% 0)', opacity: 1 }], { duration: 1500 * S, delay: 2100 * S, easing: ease.in });

    // 代码落下
    $$('#rain .rain').forEach((c, i) => at(c, [{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }], { duration: 260, delay: 3300 * S + i * 70, easing: ease.out }));

    // 第一滴 → 水洼
    setTimeout(() => { if (!skipping) drop('#2F7478', true); }, 4100 * S);
    const pool = $('#gPool');
    pool.style.transformBox = 'fill-box';
    pool.style.transformOrigin = 'center';
    at(pool, [{ opacity: 0, transform: 'scale(0, .2)' }, { opacity: 1, transform: 'scale(1.06, 1.1)', offset: .6 }, { opacity: 1, transform: 'scale(1)' }], { duration: 900, delay: 4900 * S, easing: ease.out });

    // 代码作茎
    const stemP = $('#stemPath');
    const sl = stemLen(stemP);
    stemP.style.strokeDasharray = sl;
    at($('#gStem'), [{ opacity: 0 }, { opacity: 1 }], { duration: 10, delay: 5200 * S });
    at(stemP, [{ strokeDashoffset: sl }, { strokeDashoffset: 0 }], { duration: 1000, delay: 5200 * S, easing: ease.inOut });
    const tp = $('#stemText');
    const stemCode = tp.textContent;
    tp.textContent = '';
    setTimeout(() => typeText(tp, stemCode, { step: 24 }), 5200 * S);

    // 开花
    const hf = $('#heroFlower');
    hideFlora(hf);
    hf.style.opacity = '1';
    setTimeout(() => { if (!skipping) bloomIn(hf, { speed: .9 }); }, 5700 * S);

    // 两个小人与尺寸
    at($('#fig1'), [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 6600 * S, easing: ease.spring });
    at($('#fig2'), [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 6800 * S, easing: ease.spring });
    at($('#gDim'), [{ opacity: 0, clipPath: 'inset(0 50% 0 50%)' }, { opacity: 1, clipPath: 'inset(0 0% 0 0%)' }], { duration: 900, delay: 7000 * S, easing: ease.out });
    setTimeout(() => countUp($('#dimText'), 11119388, { duration: 1800, format: v => Math.round(v).toLocaleString('en-US') + ' B' }), 7000 * S);

    // 文字
    at($('.hero-vert'), [{ opacity: 1, clipPath: 'inset(0 0 100% 0)' }, { opacity: 1, clipPath: 'inset(0 0 0% 0)' }], { duration: 1600, delay: 6400 * S, easing: ease.inOut });
    at($('.hero-poem'), fadeUp, { duration: 1200, delay: 7200 * S, easing: ease.out });
    at($('.hero-caption'), fadeUp, { duration: 1200, delay: 7600 * S, easing: ease.out });

    const live = () => {
      svg.classList.add('alive');
      dripLoop();
    };
    const liveTimer = setTimeout(live, 7800 * S);

    // 任意操作即可跳过开场
    const skip = () => {
      if (skipping) return;
      skipping = true;
      introAnims.forEach(a => { try { a.finish(); } catch (e) {} });
      tp.textContent = stemCode;
      $$('.petal, .leaf-in, .core', hf).forEach(n => { n.getAnimations().forEach(a => a.finish()); n.style.transform = 'none'; });
      $$('.stem', hf).forEach(n => { n.style.strokeDashoffset = 0; });
      clearTimeout(liveTimer);
      setTimeout(() => { skipping = false; live(); }, 60);
      removeSkip();
    };
    const evs = ['wheel', 'touchstart', 'keydown', 'pointerdown'];
    const removeSkip = () => evs.forEach(e => window.removeEventListener(e, skip));
    evs.forEach(e => window.addEventListener(e, skip, { passive: true, once: true }));
    setTimeout(removeSkip, 8000 * S);

    heroInteractions(svg);
  }

  // 一滴水：从融化的窗口落到水洼
  let lastPaint = { color: null, t: 0 };
  function drop(color, first) {
    const layer = $('#dropLayer');
    if (!layer || document.hidden || E.heroPaused) return;
    const d = E.el('path', { d: 'M0 -8 C3 -2 5 1 5 4 C5 7 2.5 9 0 9 C-2.5 9 -5 7 -5 4 C-5 1 -3 -2 0 -8Z', fill: color }, layer);
    const fall = d.animate([
      { transform: 'translate(499px,520px) scale(.2,.5)', opacity: 0 },
      { transform: 'translate(499px,532px) scale(.7,1.1)', opacity: 1, offset: .22 },
      { transform: 'translate(499px,767px) scale(.85,1.3)', opacity: 1 }
    ], { duration: first ? 1000 : 1150, easing: ease.in });
    fall.finished.then(() => {
      d.remove();
      for (let i = 0; i < 2; i++) {
        const ring = E.el('ellipse', { cx: 499, cy: 778, rx: 9, ry: 2, fill: 'none', stroke: i ? '#fff' : color, 'stroke-width': .9 }, layer);
        ring.style.transformBox = 'fill-box';
        ring.style.transformOrigin = 'center';
        ring.animate([{ transform: 'scale(.4)', opacity: .9 }, { transform: 'scale(5.2,4.4)', opacity: 0 }], { duration: 1500, delay: i * 220, easing: ease.out, fill: 'both' })
          .finished.then(() => ring.remove());
      }
      [-1, 1].forEach(s => {
        const sp = E.el('circle', { cx: 0, cy: 0, r: 1.4, fill: color }, layer);
        sp.animate([
          { transform: 'translate(499px,776px)', opacity: 1 },
          { transform: `translate(${499 + s * 9}px,762px)`, opacity: 1, offset: .45 },
          { transform: `translate(${499 + s * 16}px,778px)`, opacity: 0 }
        ], { duration: 620, easing: ease.soft, fill: 'both' }).finished.then(() => sp.remove());
      });
      // 水洼被染色后慢慢回到湖青
      if (color !== '#2F7478') {
        const pool = $('#poolBody');
        pool.animate([{ fill: color }, { fill: '#2F7478' }], { duration: 2600, easing: ease.out });
      }
    }).catch(() => d.remove());
  }

  function dripLoop() {
    if (reduced) return;
    const next = () => {
      const fresh = lastPaint.color && performance.now() - lastPaint.t < 5000;
      drop(fresh ? lastPaint.color : '#2F7478');
      setTimeout(next, rand(2200, 3400));
    };
    setTimeout(next, 900);
  }

  function heroInteractions(svg) {
    const hero = $('.hero');
    const pWin = $('#pWin'), pFlower = $('#pFlower'), pFig = $('#pFig'), mast = $('.hero-mast'), vert = $('.hero-vert');
    let mx = 0, my = 0, cx = 0, cy = 0, visible = true, scrollP = 0;

    // 视差：跟随指针与滚动
    if (finePointer && !reduced) {
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        mx = (e.clientX - r.left) / r.width - .5;
        my = (e.clientY - r.top) / r.height - .5;
      });
      hero.addEventListener('pointerleave', () => { mx = 0; my = 0; });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(hero);
    }
    let lastKey = '';
    const loop = () => {
      if (visible && !reduced && !E.heroPaused) {
        cx = lerp(cx, mx, .06); cy = lerp(cy, my, .06);
        const h = hero.offsetHeight || 1;
        scrollP = clamp(window.scrollY / h, 0, 1);
        // 静止时不写样式，避免整幅 SVG 每帧重绘
        const key = cx.toFixed(3) + cy.toFixed(3) + scrollP.toFixed(3);
        if (key === lastKey) { requestAnimationFrame(loop); return; }
        lastKey = key;
        pWin.style.transform = `translate(${(cx * -18).toFixed(2)}px, ${(cy * -10 - scrollP * 140).toFixed(2)}px)`;
        pFlower.style.transform = `translate(${(cx * 14).toFixed(2)}px, ${(cy * 8 - scrollP * 40).toFixed(2)}px)`;
        pFig.style.transform = `translate(${(cx * 6).toFixed(2)}px, ${(cy * 3).toFixed(2)}px)`;
        mast.style.transform = `translateY(${(scrollP * 120).toFixed(1)}px)`;
        mast.style.opacity = (1 - scrollP * 1.6).toFixed(3);
        vert.style.transform = `translateY(${(scrollP * -60).toFixed(1)}px)`;
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    // 在窗口里作画：像素画笔 + 跟随的选区
    const pix = $('#pix'), cv = E.heroCanvas, ants = $$('#ants rect');
    if (cv && pix) {
      const ctx = cv.getContext('2d');
      const brush = ['#C8553D', '#F0C35A', '#F4EFE6', '#E4A9B4', '#9DC3C1'];
      let bi = 0, last = null, dirty = false, strokeTimer;
      const W = cv.width, H = cv.height;
      const paint = (x, y) => {
        ctx.fillStyle = brush[bi];
        ctx.fillRect(x, y, 2, 2);
        dirty = true;
      };
      pix.style.cursor = 'crosshair';
      pix.addEventListener('pointermove', (e) => {
        const r = pix.getBoundingClientRect();
        const x = Math.floor((e.clientX - r.left) / r.width * W), y = Math.floor((e.clientY - r.top) / r.height * H);
        if (last) {
          const n = Math.max(Math.abs(x - last[0]), Math.abs(y - last[1]), 1);
          for (let i = 0; i <= n; i++) paint(Math.round(lerp(last[0], x, i / n)), Math.round(lerp(last[1], y, i / n)));
        } else paint(x, y);
        last = [x, y];
        lastPaint = { color: brush[bi], t: performance.now() };
        // 选区缓缓跟随
        const sx = 302 + x / W * 416 - 84, sy = 104 + y / H * 250 - 52;
        ants.forEach(a => { a.setAttribute('x', clamp(sx, 302, 550).toFixed(1)); a.setAttribute('y', clamp(sy, 104, 250).toFixed(1)); });
        clearTimeout(strokeTimer);
        strokeTimer = setTimeout(() => { last = null; bi = (bi + 1) % brush.length; }, 900);
      });
      pix.addEventListener('pointerleave', () => { last = null; bi = (bi + 1) % brush.length; });
      const flush = () => {
        if (dirty) { pix.setAttribute('href', cv.toDataURL()); dirty = false; }
        requestAnimationFrame(flush);
      };
      requestAnimationFrame(flush);
    }

    // 点一下花：一阵风吹散，再重新开
    const hf = $('#heroFlower');
    let busy = false;
    hf.style.cursor = 'pointer';
    hf.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (busy) return;
      busy = true;
      const anims = await scatter(hf, { reach: 1.4, tempo: .85 });
      anims.forEach(a => a.cancel());
      hideFlora(hf);
      $$('.stem', hf).forEach(n => { n.style.strokeDashoffset = 0; });
      bloomIn(hf, { speed: .8 });
      setTimeout(() => { busy = false; }, 1800);
    });
  }

  /* ---------------- 滚动藤蔓（进度 + 目录） ---------------- */

  function vine() {
    if (reduced || !matchMedia('(min-width: 1100px)').matches) return;
    const sections = $$('main > section[id], main > section[aria-label]').filter(s => s.id || s.classList.contains('hero'));
    if (sections.length < 3) return;
    const host = document.createElement('div');
    host.className = 'vine';
    host.setAttribute('aria-hidden', 'false');
    document.body.appendChild(host);
    const svg = E.el('svg', { width: 44, height: '100%' }, host);
    const path = E.el('path', { class: 'vine-stem', fill: 'none' }, svg);
    const leaves = E.el('g', {}, svg);
    const bud = E.el('g', { class: 'vine-bud' }, svg);
    let H = 0, L = 0, marks = [];
    const labels = { preface: '序', herbarium: '标本册', method: '方法', invite: '采集' };

    const build = () => {
      H = window.innerHeight;
      svg.setAttribute('viewBox', `0 0 44 ${H}`);
      let d = `M22 ${H - 6}`;
      for (let y = H - 6; y > 40; y -= 12) d += ` L${(22 + Math.sin(y * .018) * 5).toFixed(1)} ${y}`;
      d += ' L22 40';
      path.setAttribute('d', d);
      L = path.getTotalLength();
      path.style.strokeDasharray = L;
      leaves.innerHTML = '';
      const docH = document.documentElement.scrollHeight - H;
      marks = sections.filter(s => labels[s.id]).map((s, i) => {
        const t = clamp(s.offsetTop / docH, .04, .96);
        const p = path.getPointAtLength(L * t);
        const side = i % 2 ? 1 : -1;
        const a = E.el('a', { href: '#' + s.id, class: 'vine-leaf' }, leaves);
        const g = E.el('g', { transform: `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${side > 0 ? -30 : -150})` }, a);
        const lg = E.el('g', { class: 'vl' }, g);
        E.el('path', { d: 'M0 0 C4 -4 11 -4 15 0 C11 4 4 4 0 0Z' }, lg);
        const tx = E.el('text', { x: p.x + 22, y: p.y + 4, class: 'vine-label' }, a);
        tx.textContent = labels[s.id];
        return { t, a };
      });
      if (!bud.childNodes.length) {
        const g = E.el('g', { transform: 'translate(22 34) scale(.3)' }, bud);
        E.drawBloom(g, E.SPECIES.poppy, E.rng(7), true);
      }
    };
    build();
    window.addEventListener('resize', () => requestAnimationFrame(build));

    const update = () => {
      const docH = document.documentElement.scrollHeight - H;
      const p = clamp(window.scrollY / Math.max(docH, 1), 0, 1);
      path.style.strokeDashoffset = (L * (1 - p)).toFixed(1);
      marks.forEach(m => m.a.classList.toggle('on', p >= m.t - .01));
      host.classList.toggle('done', p > .985);
    };
    window.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    update();
  }

  /* ---------------- 标本册卡片 ---------------- */

  function cards() {
    const list = $$('.card');
    if (!list.length) return;

    list.forEach(card => {
      const sheet = $('.sheet', card);
      const sheen = document.createElement('span');
      sheen.className = 'sheen';
      sheet.appendChild(sheen);

      // 待采集：悬停时浮现被采集后的样子
      if (card.classList.contains('lead')) {
        const svg = $('svg.flora', card);
        const sketch = $('.plant', svg);
        const s = E.SPECIMENS.find(x => x.name === card.dataset.name);
        if (s && sketch) {
          const ghost = E.el('g', { class: 'ghost' });
          svg.insertBefore(ghost, sketch);
          ghost.appendChild(E.drawPlant(svg, s.species, { pressed: true, seed: s.name, radius: 56 }));
        }
      }

      if (!reduced) {
        card.style.opacity = '0';
        hideFlora($('svg.flora > .plant', card));
        const tape = $('.tape', card); if (tape) tape.style.opacity = '0';
        const stamp = $('.sheet > .stamp', card); if (stamp) stamp.style.opacity = '0';
      }

      // 3D 倾斜 + 纸面反光
      if (finePointer && !reduced) {
        const wrap = $('.sheet-wrap', card);
        card.addEventListener('pointermove', (e) => {
          const r = wrap.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          wrap.style.setProperty('--ry', ((x - .5) * 14).toFixed(2) + 'deg');
          wrap.style.setProperty('--rx', ((.5 - y) * 10).toFixed(2) + 'deg');
          sheet.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
          sheet.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        });
        card.addEventListener('pointerleave', () => {
          wrap.style.setProperty('--ry', '0deg');
          wrap.style.setProperty('--rx', '0deg');
        });
      }
    });

    if (reduced) return;
    onEnter(list, (card, i) => {
      const d = i * 200;
      play(card, [
        { opacity: 0, transform: 'translateY(60px) rotate(2.5deg)' },
        { opacity: 1, transform: 'none' }
      ], { duration: 1100, delay: d, easing: ease.out });
      const tape = $('.tape', card);
      if (tape) play(tape, [
        { opacity: 0, transform: 'translateX(-50%) translateY(-26px) rotate(-16deg) scale(1.3)' },
        { opacity: 1, transform: 'translateX(-50%) rotate(-3deg)' }
      ], { duration: 520, delay: d + 520, easing: ease.out });
      const plant = $('svg.flora > .plant', card);
      const end = bloomIn(plant, { delay: d + 700, speed: card.classList.contains('lead') ? .8 : 1 });
      const stamp = $('.sheet > .stamp', card);
      if (stamp) {
        play(stamp, [
          { opacity: 0, transform: 'scale(2.8) rotate(-18deg)' },
          { opacity: 1, transform: 'scale(.92) rotate(-6deg)', offset: .7 },
          { opacity: 1, transform: 'rotate(-6deg)' }
        ], { duration: 520, delay: end + 100, easing: ease.in });
        setTimeout(() => {
          $('.sheet', card).animate([
            { transform: 'translate(0,0)' }, { transform: 'translate(1.5px,2px)' }, { transform: 'translate(-1px,-1px)' }, { transform: 'translate(0,0)' }
          ], { duration: 260 });
        }, end + 100 + 360);
      }
    }, { threshold: .25 });
  }

  /* ---------------- 文字与区块入场 ---------------- */

  function reveals() {
    if (reduced) return;
    const heads = $$('main section:not(.hero) h2, .statement, .verdict, .plate-title h1');
    heads.forEach(h => {
      const chars = splitChars(h);
      chars.forEach(c => { c.style.opacity = '0'; });
      h._chars = chars;
    });
    onEnter(heads, (h) => inkIn(h._chars, { step: h.classList.contains('verdict') ? 16 : h.classList.contains('statement') ? 26 : 40 }));

    const eyebrows = $$('.eyebrow');
    eyebrows.forEach(e => { e.style.opacity = '0'; });
    onEnter(eyebrows, (e) => play(e, [{ opacity: 0, letterSpacing: '.9em' }, { opacity: 1, letterSpacing: '.3em' }], { duration: 1400, easing: ease.out }));

    const fades = $$('.lede, .intro-notes p:not(.eyebrow), .herbarium-count, .actions, .note, .tags, .bar-row, .unknowns li, .evidence li, .next-link');
    fades.forEach(e => { e.style.opacity = '0'; });
    onEnter(fades, (e, i) => play(e, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }], { duration: 1000, delay: i * 90, easing: ease.out }));

    // 铅笔：一笔一笔写出来
    const pencil = $$('.ink-claim li');
    pencil.forEach(e => { e.style.opacity = '0'; });
    onEnter(pencil, (e, i) => play(e, [
      { opacity: 1, clipPath: 'inset(0 100% 0 0)' },
      { opacity: 1, clipPath: 'inset(0 0% 0 0)' }
    ], { duration: 1100, delay: i * 380, easing: 'cubic-bezier(.4,.1,.6,.9)' }));

    // 墨水：在纸上洇开
    const ink = $$('.ink-seen li');
    ink.forEach(e => { e.style.opacity = '0'; });
    onEnter(ink, (e, i) => play(e, [
      { opacity: 0, filter: 'blur(7px)', letterSpacing: '.18em' },
      { opacity: 1, filter: 'blur(0px)', letterSpacing: '0em' }
    ], { duration: 1300, delay: 300 + i * 380, easing: ease.out }));

    // 印章：砰
    const stamps = $$('.status-legend > div');
    stamps.forEach(e => { e.style.opacity = '0'; });
    onEnter(stamps, (e, i) => {
      const st = $('.stamp', e);
      play(e, [{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: i * 200 });
      play(st, [
        { transform: 'scale(2.6) rotate(-20deg)', opacity: 0 },
        { transform: 'scale(.92) rotate(-6deg)', opacity: 1, offset: .7 },
        { transform: 'rotate(-6deg)', opacity: 1 }
      ], { duration: 500, delay: i * 200, easing: ease.in });
    });
  }

  /* ---------------- 采集处：随机一株 ---------------- */

  function generator() {
    const svg = $('#inviteFlower');
    if (!svg) return;
    const stage = $('.gen-stage');
    const noEl = $('#genNo'), latinEl = $('#genLatin'), zhEl = $('#genZh');
    let count = 0, busy = false;
    let base = Math.floor(Math.random() * 1e9);

    const grow = (animate) => {
      count++;
      const sp = randomSpecies(base + count * 7919);
      svg.innerHTML = '';
      const plant = E.drawPlant(svg, sp, { pressed: true, seed: 'gen' + base + count, radius: 58 });
      noEl.textContent = 'No. ∞–' + String(count).padStart(4, '0');
      latinEl.textContent = sp.latin;
      zhEl.textContent = sp.zh;
      if (animate && !reduced) {
        hideFlora(plant);
        bloomIn(plant, { speed: .85 });
        [noEl, latinEl, zhEl].forEach((n, i) => play(n, [{ opacity: 0, filter: 'blur(6px)' }, { opacity: 1, filter: 'blur(0px)' }], { duration: 700, delay: 400 + i * 120 }));
      }
      return plant;
    };

    let plant = grow(false);
    if (!reduced) {
      hideFlora(plant);
      onEnter([svg], () => bloomIn(plant, { speed: .9 }), { threshold: .4 });
    }
    const next = async () => {
      if (busy) return;
      busy = true;
      if (!reduced) {
        const anims = await scatter(svg, { tempo: .6 });
        anims.forEach(a => a.cancel());
      }
      plant = grow(true);
      setTimeout(() => { busy = false; }, 400);
    };
    stage.addEventListener('click', next);
    const btn = $('#genNext');
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); next(); });
  }

  /* ---------------- 标本详情页 ---------------- */

  function specimen() {
    const plateSvg = $('#plateFlower');
    if (!plateSvg) return;

    if (!reduced) {
      hideFlora(plateSvg);
      const end = bloomIn(plateSvg, { delay: 450 });
      const stamp = $('.herb-label .stamp');
      play(stamp, [
        { opacity: 0, transform: 'scale(2.8) rotate(-20deg)' },
        { opacity: 1, transform: 'scale(.92) rotate(-6deg)', offset: .7 },
        { opacity: 1, transform: 'rotate(-6deg)' }
      ], { duration: 560, delay: end + 200, easing: ease.in });
      setTimeout(() => {
        $('.herb-label').animate([{ transform: 'translate(0,0)' }, { transform: 'translate(2px,2px)' }, { transform: 'translate(-1px,-1px)' }, { transform: 'none' }], { duration: 260 });
      }, end + 200 + 390);
      $$('.herb-label dt, .herb-label dd').forEach((n, i) => play(n, [
        { opacity: 0, transform: 'translateX(-6px)' }, { opacity: 1, transform: 'none' }
      ], { duration: 600, delay: 700 + i * 45, easing: ease.out }));
      play($('.herb-label'), [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 800, delay: 500, easing: ease.out });
    }

    // 放大镜
    if (finePointer) {
      const host = plateSvg.parentNode.insertBefore(document.createElement('div'), plateSvg);
      host.className = 'loupe-host';
      host.appendChild(plateSvg);
      const loupe = document.createElement('div');
      loupe.className = 'loupe';
      loupe.innerHTML = '<span class="loupe-readout">×2.6</span>';
      host.appendChild(loupe);
      let clone = null;
      const Z = 2.6, R = 90;
      host.addEventListener('pointerenter', () => {
        if (clone) clone.remove();
        clone = plateSvg.cloneNode(true);
        clone.removeAttribute('id');
        clone.classList.add('loupe-svg');
        loupe.insertBefore(clone, loupe.firstChild);
        host.classList.add('looking');
      });
      host.addEventListener('pointermove', (e) => {
        if (!clone) return;
        const r = plateSvg.getBoundingClientRect(), h = host.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        loupe.style.transform = `translate(${(e.clientX - h.left - R).toFixed(1)}px, ${(e.clientY - h.top - R).toFixed(1)}px)`;
        clone.style.width = (r.width * Z) + 'px';
        clone.style.left = (R - x * Z) + 'px';
        clone.style.top = (R - y * Z) + 'px';
      });
      host.addEventListener('pointerleave', () => host.classList.remove('looking'));
    }

    // 成熟度之花
    const sc = $('#scorecard');
    if (sc) {
      const petals = $$('.sc-petal', sc), dots = $$('.sc-dot', sc), core = $('.sc-core-g', sc), coreText = $('#scCoreText');
      const finalText = coreText.textContent;
      if (!reduced) {
        petals.forEach(p => { p.style.transform = 'scale(0)'; });
        dots.forEach(d => { d.style.opacity = '0'; d.style.transformBox = 'fill-box'; d.style.transformOrigin = 'center'; });
        core.style.transform = 'scale(0)';
        onEnter([sc], () => {
          play(core, [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 700, easing: ease.spring });
          petals.forEach((p, i) => play(p, [
            { transform: 'scale(0) rotate(-30deg)' }, { transform: 'scale(1.06) rotate(2deg)', offset: .7 }, { transform: 'scale(1) rotate(0deg)' }
          ], { duration: 900, delay: 250 + i * 55, easing: ease.out }));
          // 结束后清掉内联透明度，让图例联动的 CSS 生效
          dots.forEach((d, i) => play(d, [
            { opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1)' }
          ], { duration: 500, delay: 900 + i * 9, easing: ease.spring }).finished.then(() => { d.style.opacity = ''; }).catch(() => {}));
          countUp(coreText, 3, { duration: 1600, delay: 300, format: v => Math.round(v) + '/30' });
        }, { threshold: .35 });
      } else coreText.textContent = finalText;

      // 花瓣与图例联动
      const items = $$('.legend-list li');
      const focus = (kind) => {
        if (kind) sc.setAttribute('data-focus', kind); else sc.removeAttribute('data-focus');
        items.forEach(li => li.classList.toggle('hit', li.dataset.kind === kind));
      };
      items.forEach(li => {
        li.addEventListener('pointerenter', () => focus(li.dataset.kind));
        li.addEventListener('pointerleave', () => focus(null));
      });
      [...petals, ...dots].forEach(p => {
        p.addEventListener('pointerenter', () => focus(p.dataset.kind));
        p.addEventListener('pointerleave', () => focus(null));
      });
      onEnter(items, (li, i) => {
        const n = $('.n', li);
        countUp(n, +n.dataset.to || +n.textContent, { duration: 1400, delay: 300 + i * 150, format: v => String(Math.round(v)) });
      }, { threshold: .5 });
    }

    // 体积条
    const rows = $$('.bar-row');
    if (rows.length && !reduced) {
      rows.forEach(r => { $('.bar-fill', r).dataset.w = $('.bar-fill', r).style.width; $('.bar-fill', r).style.width = '0%'; });
      onEnter(rows, (r, i) => {
        const fill = $('.bar-fill', r), bytes = $('.bytes', r);
        const to = +bytes.dataset.bytes;
        play(fill, [{ width: '0%' }, { width: fill.dataset.w }], { duration: 1600, delay: 200 + i * 180, easing: ease.out });
        countUp(bytes, to, { duration: 1600, delay: 200 + i * 180, format: v => `${Math.round(v).toLocaleString('en-US')} B · ${(v / 1e6).toFixed(2)} MB` });
      }, { threshold: .6 });
    }
  }

  /* ---------------- 跟随指针的小标签 ---------------- */

  function cursorTag() {
    if (!finePointer || reduced) return;
    const tag = document.createElement('div');
    tag.className = 'cursor-tag';
    document.body.appendChild(tag);
    let x = 0, y = 0, tx = 0, ty = 0, on = false;
    document.addEventListener('pointermove', (e) => {
      tx = e.clientX; ty = e.clientY;
      const t = e.target.closest && e.target.closest('[data-cursor]');
      if (t) { if (tag.textContent !== t.dataset.cursor) tag.textContent = t.dataset.cursor; if (!on) { x = tx; y = ty; } }
      on = !!t;
      tag.classList.toggle('on', on);
    });
    const loop = () => {
      x = lerp(x, tx, .2); y = lerp(y, ty, .2);
      tag.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  // 开场：页眉
  function header() {
    if (reduced) return;
    play($('.site-header'), [{ opacity: 0, transform: 'translateY(-12px)' }, { opacity: 1, transform: 'none' }], { duration: 900, delay: 100, easing: ease.out });
  }

  // 供花田等页面复用
  Object.assign(E, { randomSpecies, bloomIn, hideFlora, scatter });

  header();
  hero();
  cards();
  reveals();
  generator();
  specimen();
  vine();
  cursorTag();
})();
