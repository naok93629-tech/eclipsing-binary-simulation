const day = 86400,                   // [s]
      Mo  = 1.9884e30,               // [kg]
      Ro  = 6.960e8,                 // [m]
      Lo  = 3.839e26,                // [W]
      G   = 6.67430e-11 * day ** 2,  // [m^3 kg^-1 s^-2]
      AU  = 149597870700,            // [m]
      ly  = 9460730472580800;        // [m]

let star1, star2;

let scaleBase = 50, scaleBaseDelta = 10, scale;
let mu, a, e, p, r12, v0x, v0y, paramMode = "a";
let raan, inc, argp, basises;
let tick, t, dt, maxTrLen, doShowT, doDrawCtr;
let plotStyle, graphYMin, maxFluxLen, doLogFlux;
let trail, next, fluxes, maxFlux;
//let dst;
let coef1, coef2;

let intervalId, isRunning, isPausing;

let canvas1, ctx1;
let canvas2, ctx2, chart;
let canvasA, ctxA;

let ui = {};

// Star
class Star {
    constructor(mass, radius, tmp, lum) {
        this.mass   = mass;
        this.radius = radius;
        this.tmp    = tmp;
        this.color  = color(tmp); // rgb string
        this.lum    = lum;
        this.calcFlux();

        this.trX  = []; // old to new
        this.trY  = [];
        this.trZ  = [];
        this.vx   = 0;
        this.vy   = 0;
        this.vz   = 0;
        this.imgX = 0;
        this.imgY = 0;
        this.imgZ = 0;

        this.visArea = 0;
    }

    rx() { return this.trX[this.trX.length - 1]; }
    ry() { return this.trY[this.trY.length - 1]; }
    rz() { return this.trZ[this.trZ.length - 1]; }
    pos(t=0) { const len = this.trX.length - 1; return [this.trX[len - t], this.trY[len - t], this.trZ[len - t]]; } // t: 0 is current
    vel() { return [this.vx, this.vy, this.vz]; }
    imgPos() { return [this.imgX, this.imgY, this.imgZ]; }
    
    clearTrail() { this.trX = []; this.trY = []; this.trZ = []; }
    shiftTrail() { this.trX.shift(); this.trY.shift(); this.trZ.shift(); }
    setPos(x, y, z) { this.trX.push(x); this.trY.push(y); this.trZ.push(z); }
    setVel(vx, vy, vz) { this.vx = vx; this.vy = vy; this.vz = vz; }
    setImgPos(x, y, z) { this.imgX = x; this.imgY = y; this.imgZ = z; }
    setVals(vx, vy, x, y) { this.setVel(vx, vy, 0); this.setPos(x, y, 0); }
    
    calcImgPos() { this.setImgPos(...toImgSpace(...this.pos())); }
    calcFlux() { this.flux = this.lum / (4 * Math.PI * this.radius ** 2); }
}


// Initializations
onload = () => {
    initUI();

    star1 = new Star(1 * Mo, 1 * Ro, 6000, 1 * Lo);
    star2 = new Star(1 * Mo, 1 * Ro, 6000, 1 * Lo);

    canvas1 = ui.output.canvas1;
    canvas2 = ui.output.canvas2;
    canvasA = ui.output.canvasA;
    ctx1 = canvas1.getContext("2d");
    ctx2 = canvas2.getContext("2d");
    ctxA = canvasA.getContext("2d");

    const dpr = window.devicePixelRatio || 1;
    [canvas1, canvas2, canvasA].forEach((canvas) => {
        const style = getComputedStyle(canvas);
        canvas.width = parseInt(style.width) * dpr;
        canvas.height = parseInt(style.height) * dpr;
    });
    ctx1.scale(dpr, dpr);
    ctx2.scale(dpr, dpr);
    ctxA.scale(dpr, dpr);

    initVars();
    initLoop();

    updateMaxTrLenOutput();
    updateMaxFluxLenOutput();

    drawStars();
    drawLightCurve();
    drawBasis();
}

function initUI() {
    ui = {
        input: {
            m1: document.getElementById("m1"),
            r1: document.getElementById("r1"),
            t1: document.getElementById("t1"),
            l1: document.getElementById("l1"),
            
            m2: document.getElementById("m2"),
            r2: document.getElementById("r2"),
            t2: document.getElementById("t2"),
            l2: document.getElementById("l2"),

            a: document.getElementById("a"),
            e: document.getElementById("e"),
            p: document.getElementById("p"),
            
            r12: document.getElementById("r12"),
            v0x: document.getElementById("v0x"),
            v0y: document.getElementById("v0y"),
            
            raan: document.getElementById("raan"),
            inc:  document.getElementById("inc"),
            argp: document.getElementById("argp"),
            
            dt: document.getElementById("dt"),

            maxTrLen: document.getElementById("maxTrLenInput"),
            doShowT: document.getElementById("doShowT"),
            doDrawCtr: document.getElementById("doDrawCtr"),

            plotStyle: document.getElementById("plotStyle"),
            graphYMin: document.getElementById("graphYMin"),
            maxFluxLen: document.getElementById("maxFluxLenInput"),
            doLogFlux: document.getElementById("doLogFlux"),

            //dst: document.getElementById("dst")
        },

        button: {
            start: document.getElementById("start"),
            pause: document.getElementById("pause"),
            reset: document.getElementById("reset"),
            zoomIn: document.getElementById("zoomIn"),
            zoomOut: document.getElementById("zoomOut")
        },

        output: {
            canvas1: document.getElementById("canvas1"),
            canvas2: document.getElementById("canvas2"),
            canvasA: document.getElementById("canvasA"),
            maxTrLen: document.getElementById("maxTrLenOutput"),
            maxFluxLen: document.getElementById("maxFluxLenOutput")
        }
    };

    ui.input.m1.addEventListener("input", handleM1Input);
    ui.input.r1.addEventListener("input", handleR1Input);
    ui.input.t1.addEventListener("input", handleT1Input);
    ui.input.l1.addEventListener("input", handleL1Input);
    ui.input.m2.addEventListener("input", handleM2Input);
    ui.input.r2.addEventListener("input", handleR2Input);
    ui.input.t2.addEventListener("input", handleT2Input);
    ui.input.l2.addEventListener("input", handleL2Input);
    ui.input.a.addEventListener("input", handleAInput);
    ui.input.e.addEventListener("input", handleEInput);
    ui.input.p.addEventListener("input", handlePInput);
    ui.input.r12.addEventListener("input", handleR12Input);
    ui.input.v0x.addEventListener("input", handleV0xInput);
    ui.input.v0y.addEventListener("input", handleV0yInput);
    ui.input.raan.addEventListener("input", handleRaanInput);
    ui.input.inc.addEventListener("input", handleIncInput);
    ui.input.argp.addEventListener("input", handleArgpInput);
    ui.input.dt.addEventListener("input", handleDtInput);
    ui.input.maxTrLen.addEventListener("input", handleMaxTrLenInput);
    ui.input.doShowT.addEventListener("input", handleDoShowTInput);
    ui.input.doDrawCtr.addEventListener("input", handleDoDrawCtrInput);
    ui.input.plotStyle.addEventListener("input", handlePlotStyleInput);
    ui.input.graphYMin.addEventListener("input", handleGraphYMinInput);
    ui.input.maxFluxLen.addEventListener("input", handleMaxFluxLenInput);
    ui.input.doLogFlux.addEventListener("input", handleDoLogFluxInput);
    //ui.input.dst.addEventListener("input", handleDstInput);

    ui.button.start.addEventListener("click", startLoop);
    ui.button.pause.addEventListener("click", pauseLoop);
    ui.button.reset.addEventListener("click", resetLoop);
    ui.button.zoomIn.addEventListener("click", zoomIn);
    ui.button.zoomOut.addEventListener("click", zoomOut);

    setInactiveInputs("p", "r12", "v0x", "v0y");
}

function initVars() {
    updateM1FromInput();
    updateR1FromInput();
    updateC1FromInput();
    updateL1FromInput();
    updateM2FromInput();
    updateR2FromInput();
    updateC2FromInput();
    updateL2FromInput();

    calcScale();
    calcMu();

    updateAFromInput();
    updateEFromInput();
    // updatePFromInput();
    calcP();
    updatePInput();

    // updateR12FromInput();
    // updateV0xFromInput();
    // updateV0yFromInput();
    calcInitVals();
    updateR12Input();
    updateV0xInput();
    updateV0yInput();

    updateRaanFromInput();
    updateIncFromInput();
    updateArgpFromInput();
    calcBasis();

    updateDtFromInput();

    updateMaxTrLenFromInput();
    updateDoShowTFromInput();
    updateDoDrawCtrFromInput();

    updateMaxFluxLenFromInput();
    updatePlotStyleFromInput();
    updateGraphYMinFromInput();
    updateDoLogFluxFromInput();

    //updateDstFromInput();

    calcCoefs();
}

function initLoop() {
    tick = 0;
    t = 0;
    next = [v0x, v0y, r12, 0];  // vx, vy, rx, ry

    star1.clearTrail();
    star2.clearTrail();
    star1.setPos(r12 * coef1, 0, 0);
    star2.setPos(r12 * coef2, 0, 0);
    star1.setVel(v0x * coef1, v0y * coef1, 0);
    star2.setVel(v0x * coef2, v0y * coef2, 0);
    star1.calcImgPos();
    star2.calcImgPos();
    trail = [[star1.imgPos()], [star2.imgPos()]]; // [[star1 trail], [star2 trail]] old to new

    fluxes  = Array(maxFluxLen);
    maxFlux = 0.25 * (star1.lum + star2.lum);
    star1.calcFlux();
    star2.calcFlux();
    calcRelFlux();

    isRunning = false;
    isPausing = false;
}


// Main loop
function loop() {
    update();
    
    drawStars();
    if (doDrawCtr) drawCtr();

    drawLightCurve();
}

// Update function
function update() {
    next = nextStep(...next);
    star1.setVals(...next.map(val => val * coef1));
    star2.setVals(...next.map(val => val * coef2));

    tick++;
    t += dt;
    if (t >= Number.MAX_SAFE_INTEGER) {
        resetLoop();
        return;
    }

    star1.calcImgPos();
    star2.calcImgPos();
    trail[0].push(star1.imgPos());
    trail[1].push(star2.imgPos());
    while (star1.trX.length > maxTrLen) {
        star1.shiftTrail();
        star2.shiftTrail();
        trail[0].shift();
        trail[1].shift();
    }
    calcRelFlux();
    while (fluxes.length > maxFluxLen) fluxes.shift();
}

// Drawing functions
function drawStars() {
    const w = canvas1.width,
          h = canvas1.height,
          stars = star1.imgZ > star2.imgZ ? [star1, star2] : [star2, star1],
          tr = Array.from({ length: 5 }, () => []); // [[[whichStar, stTick. enTick], [...], ], [...], ] (index = zZone -> 0: most back, 1: back star, 2: center, 3: front star, 4: frontest)

    for (let whichStar = 0; whichStar < 2; whichStar++) {
        // star1: 0, star2: 1
        let zRun; // [zZone, stT] zoning run
        for (let tick = 0, fin = star1.trX.length - 1; tick <= fin; tick++) { // old to new
            if (!trail[whichStar][tick]) break;
            const z = trail[whichStar][tick][2];

            let zZone;
            if (z > stars[0].imgZ) zZone = 0;
            else if (z < stars[1].imgZ) zZone = 4;
            else zZone = 2;

            if (!zRun) { zRun = [zZone, tick]; continue; }
            if (zZone === zRun[0] && tick !== fin) continue;

            if (zRun[1] !== tick - 1) tr[zRun[0]].push([whichStar, zRun[1], tick - 1]);
            if (zZone !== zRun[0]) tr[0.5 * (zZone + zRun[0])].push([whichStar, tick - 1, tick]);
            zRun = [zZone, tick];
        }
    }

    ctx1.save();
    ctx1.clearRect(0, 0, w, h);
    ctx1.translate(w / 2, h / 2);
    ctx1.scale(scale, -scale);
    ctx1.lineWidth = 1.5 / scale;

    for (let zZone = 0; zZone < 5; zZone++) {
        switch (zZone) {
            case 0:
            case 2:
            case 4:
                for (let [whichStar, stTick, enTick] of tr[zZone]) {
                    ctx1.strokeStyle = whichStar === 0 ? star1.color : star2.color;
                    ctx1.beginPath();

                    let first = true;
                    for (let tick = stTick; tick <= enTick; tick++) {
                        const [x, y, _] = trail[whichStar][tick];
                        if (first) {
                            ctx1.moveTo(x, y);
                            first = false;
                        } else {
                            ctx1.lineTo(x, y);
                        }
                    }

                    ctx1.stroke();
                }
                break;
            case 1:
            case 3:
                const starInZone = zZone === 1 ? stars[0] : stars[1];
                const midPoints = tr[zZone].map(([whichStar, stTick, enTick]) => {
                    const [x1, y1, z1] = trail[whichStar][stTick],
                          [x2, y2, z2] = trail[whichStar][enTick];
                    const ratio = (starInZone.imgZ - z1) / (z2 - z1);
                    return [x1 + (x2 - x1) * ratio, y1 + (y2 - y1) * ratio];
                });
                
                for (let i = 0; i < tr[zZone].length; i++) {
                    const [whichStar, stTick, _] = tr[zZone][i];
                    
                    ctx1.strokeStyle = whichStar === 0 ? star1.color : star2.color;
                    ctx1.beginPath();
                    ctx1.moveTo(...trail[whichStar][stTick].slice(0, 2));
                    ctx1.lineTo(...midPoints[i]);
                    ctx1.stroke();
                }

                ctx1.beginPath();
                ctx1.fillStyle = starInZone.color;
                ctx1.strokeStyle = "black";
                ctx1.arc(starInZone.imgX, starInZone.imgY, starInZone.radius, 0, 2 * Math.PI);
                ctx1.fill();
                ctx1.stroke();

                for (let i = 0; i < tr[zZone].length; i++) {
                    const [whichStar, _, enTick] = tr[zZone][i];

                    ctx1.strokeStyle = whichStar === 0 ? star1.color : star2.color;
                    ctx1.beginPath();
                    ctx1.moveTo(...midPoints[i]);
                    ctx1.lineTo(...trail[whichStar][enTick].slice(0, 2));
                    ctx1.stroke();
                }
                break;
        }
    }
    ctx1.restore();
    
    if (doShowT) drawT();
    if (doDrawCtr) drawCtr();
}
function drawT() {
    ctx1.save();
    ctx1.fillStyle = "white";
    ctx1.font = "16px Arial";
    ctx1.fillText(`Time: ${t.toFixed(4)} day`, 10, 30);
    ctx1.fillText(`Period: ${(t / p).toFixed(4)} Orbital Periods`, 10, 55);
    ctx1.restore();
}
function drawCtr() {
    ctx1.save();
    ctx1.translate(canvas1.width / 2, canvas1.height / 2);
    ctx1.fillStyle = "white";
    ctx1.beginPath();
    ctx1.arc(0, 0, 3, 0, 2 * Math.PI);
    ctx1.fill();
    ctx1.restore();
}

function drawLightCurve() {
    const style = plotStyle.toLowerCase(),
          pointDrawing = style.includes("point"),
          lineDrawing = style.includes("line"),
          lineSmoothing = style.includes("smooth");

    if (chart) chart.destroy();
    
    chart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: fluxes.map((_, i) => (i * dt / p).toFixed(4) + ' (' + ((t + (i + 1 - fluxes.filter(Boolean).length) * dt) / p).toFixed(4) + ')'),
            datasets: [{
                label: 'Relative Flux',
                data: fluxes,
                fill: false
            }]
        },
        options: {
            elements: {
                point: {
                    radius: pointDrawing ? 3 : 0
                },
                line: {
                    borderWidth: lineDrawing ? 3 : 0,
                    cubicInterpolationMode: lineSmoothing ? 'monotone' : 'default',
                    tension: 0
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Time (in units of Orbital Period)'
                    },
                    ticks: {
                        display: false
                    },
                    grid: {
                        display: false
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Relative Flux'
                    },
                    type: doLogFlux ? 'logarithmic' : 'linear',
                    suggestedMin: graphYMin > 0 ? graphYMin : (doLogFlux ? 0.001 : 0),
                    suggestedMax: 1
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Light Curve'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: () => '',
                        label: ctx => `Time: ${ctx.label}, Flux: ${ctx.formattedValue}`
                    }
                }
            },
            animation: false,
            layout: {
                padding: {
                    right: 10
                }
            }
        }
    })
}

function drawBasis() {
    const fontSize = 10,
          lineWeight = 3,
          w = canvasA.width,
          h = canvasA.height,
          l = (Math.min(w, h) / 2 - fontSize - lineWeight / 2) * 0.9,
          copiedBasis = basises.map((b) => [...b]),
          basisLabels = ["X", "Y", "Z"],
          colors = ["red", "blue", "green"];

    ctxA.clearRect(0, 0, w, h);

    ctxA.save();
    ctxA.translate(w / 2, h / 2);
    ctxA.scale(l, -l);
    ctxA.globalAlpha = 0.85;
    ctxA.lineWidth = lineWeight / l;
    for (let [[x, y, z], color] of zip(copiedBasis, colors).sort((a, b) => b[0][2] - a[0][2])) {
        ctxA.beginPath();
        ctxA.strokeStyle = color;
        ctxA.moveTo(0, 0);
        ctxA.lineTo(x, y);
        ctxA.stroke();
    }
    ctxA.restore();

    ctxA.save();
    ctxA.translate(w / 2, h);
    ctxA.font = `bold ${fontSize}px Arial`;
    for (let [i, [label, color]] of zip(basisLabels, colors).entries()) {
        ctxA.fillStyle = color;
        ctxA.fillText(label, (i * 1.5 - 1.75) * fontSize, 0);
    }
    ctxA.restore();
}


// Calculations
function ax(x, y) { return -mu * x / Math.hypot(x, y) ** 3 }
function ay(x, y) { return -mu * y / Math.hypot(x, y) ** 3 }

function nextStep(vx, vy, x, y) {
    // RK4
    const [kvx1, kvy1, kx1, ky1] = calcK(vx, vy, x, y, 0, 0, 0, 0),
          [kvx2, kvy2, kx2, ky2] = calcK(vx, vy, x, y, kvx1 * 0.5, kvy1 * 0.5, kx1 * 0.5, ky1 * 0.5),
          [kvx3, kvy3, kx3, ky3] = calcK(vx, vy, x, y, kvx2 * 0.5, kvy2 * 0.5, kx2 * 0.5, ky2 * 0.5),
          [kvx4, kvy4, kx4, ky4] = calcK(vx, vy, x, y, kvx3, kvy3, kx3, ky3);

    return [
        vx + (kvx1 + 2 * kvx2 + 2 * kvx3 + kvx4) / 6.0,
        vy + (kvy1 + 2 * kvy2 + 2 * kvy3 + kvy4) / 6.0,
        x  + (kx1  + 2 * kx2  + 2 * kx3  + kx4 ) / 6.0,
        y  + (ky1  + 2 * ky2  + 2 * ky3  + ky4 ) / 6.0
    ];
}
function calcK(vx, vy, x, y, dvx, dvy, dx, dy) {
    return [
        ax(x + dx, y + dy) * dt,
        ay(x + dx, y + dy) * dt,
        (vx + dvx) * dt,
        (vy + dvy) * dt
    ];
}

function recalcTrail() {
    trail = [[], []];
    for (let i = 0; i < star1.trX.length; i++) trail[0].push(toImgSpace(...star1.pos(i))), trail[1].push(toImgSpace(...star2.pos(i)));
    trail[0].reverse();
    trail[1].reverse();
}

function toImgSpace(x, y, z) {
    const [[sinRaan, cosRaan], [sinInc, cosInc], [sinArgp, cosArgp]] = [raan, inc, argp].map((angle) => [Math.sin(angle), Math.cos(angle)]);

    const imx = x*(cosRaan*cosArgp -sinRaan*cosInc*sinArgp) -y*(cosRaan*sinArgp +sinRaan*cosInc*cosArgp) +z*sinRaan*sinInc,
          imz = x*(sinRaan*cosArgp +cosRaan*cosInc*sinArgp) -y*(sinRaan*sinArgp -cosRaan*cosInc*cosArgp) -z*cosRaan*sinInc,
          imy = x*sinInc*sinArgp +y*sinInc*cosArgp +z*cosInc;
    
    return [-imx, imy, -imz];
}

function calcBasis() {
    basises = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((basis) => toImgSpace(...basis));
}

function color(tmp) {
    if (tmp < 1667) {
        return "rgb(0, 0, 0)";
    } else if (tmp > 25000) {
        return "rgb(0, 0, 255)";
    }

    const t = 10 ** 3 / tmp

    let xc;
    if (tmp > 4000)
        xc = -3.0258469*t**3 +2.1070379*t**2 +0.2226347*t +0.240390;
    else
        xc = -0.2661239*t**3 -0.2343589*t**2 +0.8776956*t +0.179910;
    
    let yc;
    if (tmp > 4000)
        yc =  3.0817580*xc**3 -5.87338670*xc**2 +3.75112997*xc -0.37001483;
    else if (tmp > 2222)
        yc = -0.9549476*xc**3 -1.37418593*xc**2 +2.09137015*xc -0.16748867;
    else
        yc = -1.1063814*xc**3 -1.34811020*xc**2 +2.18555832*xc -0.20219683;
    
    const y = 1,
          x = y/yc * xc,
          z = y/yc * (1-xc-yc);

    let r =  3.2406*x -1.5372*y -0.4986*z,
        g = -0.9689*x +1.8758*y +0.0415*z,
        b =  0.0557*x -0.2040*y +1.0570*z;
    
    const m = 255 / Math.max(r, g, b);
    
    r = clamp(r*m, 0, 255);
    g = clamp(g*m, 0, 255);
    b = clamp(b*m, 0, 255);
    
    return `rgb(${r}, ${g}, ${b})`;
}

function calcRelFlux() {
    calcArea();
    const relFlux = (star1.flux * star1.visArea + star2.flux * star2.visArea) / maxFlux,
          index = fluxes.findIndex((v) => v === undefined);
    if (index === -1) fluxes.push(relFlux);
    else fluxes[index] = relFlux;
}
function calcArea() {
    const [starA, starB] = star1.radius > star2.radius ? [star1, star2] : [star2, star1];
    const dst = Math.hypot(starA.imgX - starB.imgX, starA.imgY - starB.imgY);
    const aA = Math.PI * starA.radius ** 2,
          aB = Math.PI * starB.radius ** 2;

    if (dst > starA.radius + starB.radius) {
        starA.visArea = aA;
        starB.visArea = aB;
    } else if (dst < starA.radius - starB.radius) {
        if (starA.imgZ < starB.imgZ) {
            starA.visArea = aA;
            starB.visArea = 0;
        } else {
            starA.visArea = aA - aB;
            starB.visArea = aB;
        }
    } else {
        const sqRA  = starA.radius ** 2,
              sqRB  = starB.radius ** 2,
              sqDst = dst ** 2;
        const alpha = Math.acos((sqRA - sqRB + sqDst) / (2 * starA.radius * dst)),
              beta  = Math.acos((sqRB - sqRA + sqDst) / (2 * starB.radius * dst));
        const areaOverlap = 0.5 * (sqRA * (alpha - Math.sin(alpha)) + sqRB * (beta - Math.sin(beta)));

        if (starA.imgZ < starB.imgZ) {
            starA.visArea = aA;
            starB.visArea = aB - areaOverlap;
        } else {
            starA.visArea = aA - areaOverlap;
            starB.visArea = aB;
        }
    }
}

function calcScale() { scale = scaleBase / (star1.radius + star2.radius); }
function calcMu() { mu = G * (star1.mass + star2.mass); }

function calcCoefs() {
    coef1 = -star2.mass / (star1.mass + star2.mass);
    coef2 =  star1.mass / (star1.mass + star2.mass);
}

function calcP() { p = 2 * Math.PI * Math.sqrt(a ** 3 / mu) }
function calcA() { a = Math.cbrt(mu * (p / Math.PI) ** 2 / 4); }
function calcInitVals() {
    r12 = (1-e) * a;
    v0x = 0;
    v0y = Math.sqrt(mu / a * (1+e) / (1-e));
}
function calcOrbitParams() {
    a = e = p = 0; // not implemented
}


// Input/output handlers
function updateM1FromInput() { star1.mass = + ui.input.m1.value * Mo; }
function updateR1FromInput() { star1.radius = + ui.input.r1.value * Ro; }
function updateT1FromInput() { star1.tmp = + ui.input.t1.value; }
function updateC1FromInput() { updateT1FromInput(); star1.color = color(star1.tmp); }
function updateL1FromInput() { star1.lum = + ui.input.l1.value * Lo; }
function updateM2FromInput() { star2.mass = + ui.input.m2.value * Mo; }
function updateR2FromInput() { star2.radius = + ui.input.r2.value * Ro; }
function updateT2FromInput() { star2.tmp = + ui.input.t2.value; }
function updateC2FromInput() { updateT2FromInput(); star2.color = color(star2.tmp); }
function updateL2FromInput() { star2.lum = + ui.input.l2.value * Lo; }
function updateAFromInput() { a = + ui.input.a.value * AU; }
function updateEFromInput() { e = + ui.input.e.value; }
function updatePFromInput() { p = + ui.input.p.value; }
function updateR12FromInput() { r12 = + ui.input.r12.value * AU; }
function updateV0xFromInput() { v0x = + ui.input.v0x.value * 1000 * day; }
function updateV0yFromInput() { v0y = + ui.input.v0y.value * 1000 * day; }
function updateRaanFromInput() { raan = + ui.input.raan.value * Math.PI / 180; }
function updateIncFromInput()  { inc  = + ui.input.inc .value * Math.PI / 180; }
function updateArgpFromInput() { argp = + ui.input.argp.value * Math.PI / 180; }
function updateDtFromInput() { dt = + ui.input.dt.value; }
function updateMaxTrLenFromInput() { maxTrLen = Math.ceil(+ ui.input.maxTrLen.value * p / dt); }
function updateDoShowTFromInput() { doShowT = ui.input.doShowT.checked; }
function updateDoDrawCtrFromInput() { doDrawCtr = ui.input.doDrawCtr.checked; }
function updatePlotStyleFromInput() { plotStyle = ui.input.plotStyle.value; }
function updateGraphYMinFromInput() { graphYMin = + ui.input.graphYMin.value; }
function updateMaxFluxLenFromInput() { maxFluxLen = Math.ceil(+ ui.input.maxFluxLen.value * p / dt); }
function updateDoLogFluxFromInput() { doLogFlux = ui.input.doLogFlux.checked; }
//function updateDstFromInput() { dst = + ui.input.dst.value * ly; }

function updateM1Input() { ui.input.m1.value = (star1.mass / Mo) + ""; }
function updateR1Input() { ui.input.r1.value = (star1.radius / Ro) + ""; }
function updateT1Input() { ui.input.t1.value = star1.tmp + ""; }
function updateL1Input() { ui.input.l1.value = (star1.lum / Lo) + ""; }
function updateM2Input() { ui.input.m2.value = (star2.mass / Mo) + ""; }
function updateR2Input() { ui.input.r2.value = (star2.radius / Ro) + ""; }
function updateT2Input() { ui.input.t2.value = star2.tmp + ""; }
function updateL2Input() { ui.input.l2.value = (star2.lum / Lo) + ""; }
function updateAInput() { ui.input.a.value = (a / AU).toFixed(6); }
function updateEInput() { ui.input.e.value = (e).toFixed(6); }
function updatePInput() { ui.input.p.value = (p).toFixed(6); }
function updateR12Input() { ui.input.r12.value = (r12 / AU).toFixed(6); }
function updateV0xInput() { ui.input.v0x.value = (v0x / 1000 / day).toFixed(6); }
function updateV0yInput() { ui.input.v0y.value = (v0y / 1000 / day).toFixed(6); }
function updateRaanInput() { ui.input.raan.value = (raan * 180 / Math.PI) + ""; }
function updateIncInput()  { ui.input.inc .value = (inc  * 180 / Math.PI) + ""; }
function updateArgpInput() { ui.input.argp.value = (argp * 180 / Math.PI) + ""; }
function updateDtInput() { ui.input.dt.value = dt + ""; }
function updateMaxTrLenInput() { ui.input.maxTrLen.value = (maxFluxLen * dt / p).toFixed(2); }
function updateMaxTrLenOutput() { ui.output.maxTrLen.textContent = (+ ui.input.maxTrLen.value).toFixed(2); }
function updateDoShowTInput() { ui.input.doShowT.checked = doShowT; }
function updateDoDrawCtrInput() { ui.input.doDrawCtr.checked = doDrawCtr; }
function updateMaxFluxLenInput() { ui.input.maxFluxLen.value = (maxFluxLen * dt / p).toFixed(1); }
function updatePlotStyleInput() { ui.input.plotStyle.value = plotStyle; }
function updateGraphYMinInput() { ui.input.graphYMin.value = graphYMin + ""; }
function updateMaxFluxLenOutput() { ui.output.maxFluxLen.textContent = (+ ui.input.maxFluxLen.value).toFixed(1); }
function updateDoLogFluxInput() { ui.input.doLogFlux.checked = doLogFlux; }
//function updateDstInput() { ui.input.dst.value = (dst / ly) + ""; }

function handleM1Input() { updateM1FromInput(); calcCoefs(); calcMu(); if (paramMode === "a") calcP(), updatePInput(); else if (paramMode === "p") calcA(), updateAInput(); calcInitVals(); updateR12Input(); updateV0xInput(); updateV0yInput(); updateMaxTrLenFromInput(); updateMaxFluxLenFromInput(); resetLoop(); }
function handleR1Input() { updateR1FromInput(); calcScale(); resetLoop(); }
function handleT1Input() { updateC1FromInput(); resetLoop(); }
function handleL1Input() { updateL1FromInput(); resetLoop(); }
function handleM2Input() { updateM2FromInput(); calcCoefs(); calcMu(); if (paramMode === "a") calcP(), updatePInput(); else if (paramMode === "p") calcA(), updateAInput(); calcInitVals(); updateR12Input(); updateV0xInput(); updateV0yInput(); updateMaxTrLenFromInput(); updateMaxFluxLenFromInput(); resetLoop(); }
function handleR2Input() { updateR2FromInput(); calcScale(); resetLoop(); }
function handleT2Input() { updateC2FromInput(); resetLoop(); }
function handleL2Input() { updateL2FromInput(); resetLoop(); }
function handleAInput() { updateAFromInput(); paramMode = "a", setActiveInputs("a", "e"), setInactiveInputs("p", "r12", "v0x", "v0y"); calcP(), updatePInput(); calcInitVals(); updateR12Input(); updateV0xInput(); updateV0yInput(); updateMaxTrLenFromInput(); updateMaxFluxLenFromInput(); resetLoop(); }
function handleEInput() { updateEFromInput(); if (paramMode === "initVals") paramMode = "a", setActiveInputs("e", "a"), setInactiveInputs("r12", "v0x", "v0y"); calcInitVals(); updateR12Input(); updateV0xInput(); updateV0yInput(); resetLoop(); }
function handlePInput() { updatePFromInput(); paramMode = "p", setActiveInputs("e", "p"), setInactiveInputs("a", "r12", "v0x", "v0y"); calcA(), updateAInput(); calcInitVals(); updateR12Input(); updateV0xInput(); updateV0yInput(); updateMaxTrLenFromInput(); updateMaxFluxLenFromInput(); resetLoop(); }
function handleR12Input() { updateR12FromInput(); paramMode = "initVals", setActiveInputs("r12", "v0x", "v0y"), setInactiveInputs("a", "e", "p"); calcOrbitParams(), updateAInput(), updateEInput(), updatePInput(); resetLoop(); }
function handleV0xInput() { updateV0xFromInput(); paramMode = "initVals", setActiveInputs("r12", "v0x", "v0y"), setInactiveInputs("a", "e", "p"); calcOrbitParams(), updateAInput(), updateEInput(), updatePInput(); resetLoop(); }
function handleV0yInput() { updateV0yFromInput(); paramMode = "initVals", setActiveInputs("r12", "v0x", "v0y"), setInactiveInputs("a", "e", "p"); calcOrbitParams(), updateAInput(), updateEInput(), updatePInput(); resetLoop(); }
function handleRaanInput() { if (isRunning) fluxes = Array(maxFluxLen), drawLightCurve(); updateRaanFromInput(); calcBasis(), drawBasis(); star1.calcImgPos(), star2.calcImgPos(), recalcTrail(), drawStars(), drawLightCurve(); }
function handleIncInput()  { if (isRunning) fluxes = Array(maxFluxLen), drawLightCurve(); updateIncFromInput() ; calcBasis(), drawBasis(); star1.calcImgPos(), star2.calcImgPos(), recalcTrail(), drawStars(), drawLightCurve(); }
function handleArgpInput() { if (isRunning) fluxes = Array(maxFluxLen), drawLightCurve(); updateArgpFromInput(); calcBasis(), drawBasis(); star1.calcImgPos(), star2.calcImgPos(), recalcTrail(), drawStars(), drawLightCurve(); }
function handleDtInput() { updateDtFromInput(); updateMaxTrLenFromInput(); updateMaxFluxLenFromInput(); resetLoop(); }
function handleMaxTrLenInput() { updateMaxTrLenFromInput(); updateMaxTrLenOutput(); }
function handleDoShowTInput() { updateDoShowTFromInput(); if (!isRunning || isPausing) drawStars(); }
function handleDoDrawCtrInput() { updateDoDrawCtrFromInput(); if (!isRunning || isPausing) drawStars(); }
function handlePlotStyleInput() { updatePlotStyleFromInput(); if (!isRunning || isPausing) drawLightCurve(); }
function handleGraphYMinInput() { updateGraphYMinFromInput(); if (!isRunning || isPausing) drawLightCurve(); }
function handleMaxFluxLenInput() { updateMaxFluxLenFromInput(); updateMaxFluxLenOutput(); fluxes.length = maxFluxLen; if (!isRunning || isPausing) drawLightCurve(); }
function handleDoLogFluxInput() { updateDoLogFluxFromInput(); if (!isRunning || isPausing) drawLightCurve(); }
//function handleDstInput() { if (isRunning) fluxes = []; updateDstFromInput(); }

function setInactiveInputs(...inputs) {
    for (let input of inputs) ui.input[input].classList.add("inactive");
}
function setActiveInputs(...inputs) {
    for (let input of inputs) ui.input[input].classList.remove("inactive");
}

// button handlers
function startLoop() {
    if (isRunning && !isPausing) return;

    intervalId = setInterval(loop, 50);
    isRunning = true;
    isPausing = false;

    ui.button.start.classList.add("hidden");
    ui.button.pause.classList.remove("hidden");
    ui.button.reset.classList.remove("hidden");
}
function pauseLoop() {
    if (!isRunning || isPausing) return;

    clearInterval(intervalId);
    isPausing = true;

    ui.button.start.classList.remove("hidden");
    ui.button.pause.classList.add("hidden");
}
function resetLoop() {
    pauseLoop();
    initLoop();
    drawStars();
    drawLightCurve();

    ui.button.reset.classList.add("hidden");
}
function zoomIn() {
    scaleBase += scaleBaseDelta, calcScale(), drawStars();
}
function zoomOut() {
    if (scaleBase > scaleBaseDelta) scaleBase -= scaleBaseDelta, calcScale(), drawStars();
}


// Utility functions
function clamp(x, min, max) {
    return Math.min(max, Math.max(x, min));
}

function zip(...arrays) {
    const length = Math.min(...arrays.map(arr => arr.length));
    return Array.from({ length }, (_, i) => arrays.map(arr => arr[i]));
}