// Mondo come rete di processi: una sfera di nodi collegati da archi, con impulsi
// luminosi che viaggiano lungo i collegamenti. Canvas 2D, nessuna libreria.
// Ruota lentamente e segue il puntatore. Con movimento ridotto resta fermo.
(function () {
  var canvas = document.getElementById('globe');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var fine = window.matchMedia('(pointer: fine)');
  var animate = !reduce.matches;

  // Palette Personas, tema scuro
  var BLUE = '142,171,255';   // --blue
  var VIOLET = '188,151,255'; // --violet

  var GOLDEN = Math.PI * (3 - Math.sqrt(5));

  // Punti distribuiti uniformemente su una sfera unitaria
  function sphere(n) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var y = 1 - (i / (n - 1)) * 2;
      var r = Math.sqrt(1 - y * y);
      var th = GOLDEN * i;
      out.push([Math.cos(th) * r, y, Math.sin(th) * r]);
    }
    return out;
  }

  var NODES = sphere(240);   // processi
  var DOTS = sphere(900);    // trama di fondo
  var HUB = [];              // nodi principali, più grandi
  for (var h = 0; h < NODES.length; h++) HUB.push(h % 13 === 0);

  // Collegamenti: ogni nodo con i tre vicini più prossimi
  var edges = [], seen = {};
  for (var i = 0; i < NODES.length; i++) {
    var near = [];
    for (var j = 0; j < NODES.length; j++) {
      if (j === i) continue;
      var dx = NODES[i][0] - NODES[j][0], dy = NODES[i][1] - NODES[j][1], dz = NODES[i][2] - NODES[j][2];
      near.push([dx * dx + dy * dy + dz * dz, j]);
    }
    near.sort(function (a, b) { return a[0] - b[0]; });
    for (var k = 0; k < 3; k++) {
      var a = Math.min(i, near[k][1]), b = Math.max(i, near[k][1]);
      var key = a + '-' + b;
      if (!seen[key]) { seen[key] = true; edges.push([a, b]); }
    }
  }

  // Impulsi: uno ogni quattro archi, velocità e fase diverse
  var pulses = [];
  for (var e = 0; e < edges.length; e += 4) {
    pulses.push({ e: e, speed: 0.08 + ((e * 37) % 17) / 100, off: ((e * 61) % 100) / 100 });
  }

  var W = 0, H = 0, dpr = 1, R = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R = Math.min(W * 0.42, H * 0.46);
  }

  var px = 0, py = 0, tx = 0, ty = 0;
  var start = performance.now();

  // Rotazione attorno a Y, poi inclinazione attorno a X
  function project(p, cY, sY, cX, sX) {
    var x1 = p[0] * cY + p[2] * sY;
    var z1 = -p[0] * sY + p[2] * cY;
    var y1 = p[1] * cX - z1 * sX;
    var z2 = p[1] * sX + z1 * cX;
    return [x1, y1, z2];
  }

  function draw(now) {
    var t = animate ? (now - start) / 1000 : 0;
    px += (tx - px) * 0.06;
    py += (ty - py) * 0.06;

    var angY = t * 0.1 + px * 0.5;
    var angX = 0.32 + py * 0.18;
    var cY = Math.cos(angY), sY = Math.sin(angY);
    var cX = Math.cos(angX), sX = Math.sin(angX);
    var cx = W / 2, cy = H / 2;

    ctx.clearRect(0, 0, W, H);

    // Alone atmosferico
    var halo = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.5);
    halo.addColorStop(0, 'rgba(' + BLUE + ',0.18)');
    halo.addColorStop(0.55, 'rgba(' + VIOLET + ',0.07)');
    halo.addColorStop(1, 'rgba(' + VIOLET + ',0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, W, H);

    // Proiezione di nodi e trama
    var P = NODES.map(function (p) { return project(p, cY, sY, cX, sX); });
    var D = DOTS.map(function (p) { return project(p, cY, sY, cX, sX); });

    // Trama di fondo
    for (var d = 0; d < D.length; d++) {
      var q = D[d], f = (q[2] + 1) / 2;
      ctx.fillStyle = 'rgba(' + BLUE + ',' + (0.05 + 0.4 * f * f).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(cx + q[0] * R, cy - q[1] * R, 0.5 + 0.8 * f, 0, Math.PI * 2);
      ctx.fill();
    }

    // Archi
    ctx.lineWidth = 0.8;
    for (var ed = 0; ed < edges.length; ed++) {
      var A = P[edges[ed][0]], B = P[edges[ed][1]];
      var f2 = ((A[2] + B[2]) / 2 + 1) / 2;
      ctx.strokeStyle = 'rgba(' + BLUE + ',' + (0.04 + 0.3 * f2 * f2).toFixed(3) + ')';
      ctx.beginPath();
      ctx.moveTo(cx + A[0] * R, cy - A[1] * R);
      ctx.lineTo(cx + B[0] * R, cy - B[1] * R);
      ctx.stroke();
    }

    // Nodi
    for (var n = 0; n < P.length; n++) {
      var v = P[n], g = (v[2] + 1) / 2;
      var x = cx + v[0] * R, y = cy - v[1] * R;
      if (HUB[n]) {
        ctx.fillStyle = 'rgba(' + BLUE + ',' + (0.1 + 0.15 * g).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(x, y, 7 + 3 * g, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(' + (HUB[n] ? VIOLET : BLUE) + ',' + (0.3 + 0.7 * Math.pow(g, 1.5)).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(x, y, (HUB[n] ? 2.6 : 1.6) * (0.6 + 0.6 * g), 0, Math.PI * 2);
      ctx.fill();
    }

    // Impulsi lungo gli archi: processi in transito
    for (var pi = 0; pi < pulses.length; pi++) {
      var pl = pulses[pi];
      var s = (t * pl.speed + pl.off) % 1;
      var ea = edges[pl.e];
      var a0 = NODES[ea[0]], a1 = NODES[ea[1]];
      var mx = a0[0] + (a1[0] - a0[0]) * s, my = a0[1] + (a1[1] - a0[1]) * s, mz = a0[2] + (a1[2] - a0[2]) * s;
      var len = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
      var Q = project([mx / len, my / len, mz / len], cY, sY, cX, sX);
      var h2 = (Q[2] + 1) / 2;
      var qx = cx + Q[0] * R, qy = cy - Q[1] * R;
      ctx.fillStyle = 'rgba(' + VIOLET + ',' + (0.12 + 0.2 * h2).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(qx, qy, 6 + 3 * h2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(' + VIOLET + ',' + (0.5 + 0.5 * h2).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(qx, qy, 1.8 + 1.2 * h2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bordo della sfera
    ctx.strokeStyle = 'rgba(' + BLUE + ',0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.stroke();

    if (animate) requestAnimationFrame(draw);
  }

  window.addEventListener('resize', function () { resize(); if (!animate) draw(performance.now()); });

  if (fine.matches) {
    window.addEventListener('pointermove', function (e) {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    }, { passive: true });
  }

  resize();
  requestAnimationFrame(draw);
})();
