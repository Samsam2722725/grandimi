import React, {useMemo} from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

/*
 * Fond topographique animé : courbes de niveau d'un bruit 3D (x, y, temps) qui évolue à chaque frame,
 * comme les fonds vidéo des références (lignes blanches qui ondulent sur gris foncé, mesuré : ~10 de
 * différence moyenne par frame). `zoomDe` : la caméra part de ce zoom et arrive à 1 en `d` frames
 * (plan de la figurine qui grandit).
 */

// Bruit simplex 3D (S. Gustavson), permutation fixe pour un rendu déterministe.
const grad3 = [
	[1, 1, 0],
	[-1, 1, 0],
	[1, -1, 0],
	[-1, -1, 0],
	[1, 0, 1],
	[-1, 0, 1],
	[1, 0, -1],
	[-1, 0, -1],
	[0, 1, 1],
	[0, -1, 1],
	[0, 1, -1],
	[0, -1, -1],
];
const perm = (() => {
	const p: number[] = [];
	let s = 1337;
	const base = Array.from({length: 256}, (_, i) => i);
	for (let i = 255; i > 0; i--) {
		s = (s * 16807) % 2147483647;
		const j = s % (i + 1);
		[base[i], base[j]] = [base[j], base[i]];
	}
	for (let i = 0; i < 512; i++) p.push(base[i & 255]);
	return p;
})();
const F3 = 1 / 3;
const G3 = 1 / 6;
const simplex = (xin: number, yin: number, zin: number) => {
	const s = (xin + yin + zin) * F3;
	const i = Math.floor(xin + s);
	const j = Math.floor(yin + s);
	const k = Math.floor(zin + s);
	const t = (i + j + k) * G3;
	const x0 = xin - (i - t);
	const y0 = yin - (j - t);
	const z0 = zin - (k - t);
	let i1, j1, k1, i2, j2, k2;
	if (x0 >= y0) {
		if (y0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 1, 0];
		else if (x0 >= z0) [i1, j1, k1, i2, j2, k2] = [1, 0, 0, 1, 0, 1];
		else [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 1, 0, 1];
	} else if (y0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 0, 1, 0, 1, 1];
	else if (x0 < z0) [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 0, 1, 1];
	else [i1, j1, k1, i2, j2, k2] = [0, 1, 0, 1, 1, 0];
	const pts = [
		[x0, y0, z0, 0, 0, 0],
		[x0 - i1 + G3, y0 - j1 + G3, z0 - k1 + G3, i1, j1, k1],
		[x0 - i2 + 2 * G3, y0 - j2 + 2 * G3, z0 - k2 + 2 * G3, i2, j2, k2],
		[x0 - 1 + 3 * G3, y0 - 1 + 3 * G3, z0 - 1 + 3 * G3, 1, 1, 1],
	];
	let n = 0;
	const ii = i & 255;
	const jj = j & 255;
	const kk = k & 255;
	for (const [x, y, z, a, b, c] of pts) {
		let tt = 0.6 - x * x - y * y - z * z;
		if (tt < 0) continue;
		const g = grad3[perm[ii + a + perm[jj + b + perm[kk + c]]] % 12];
		tt *= tt;
		n += tt * tt * (g[0] * x + g[1] * y + g[2] * z);
	}
	return 32 * n;
};

const W = 1080;
const H = 1920;
const CELL = 12;
const NX = W / CELL + 1;
const NY = H / CELL + 1;
const NIVEAUX = 32;

/** Segments des courbes de niveau (carrés de marche), regroupés en un chemin SVG par épaisseur. */
const courbes = (t: number, zoom: number) => {
	const v = new Float32Array(NX * NY);
	const cx = W / 2;
	const cy = H / 2;
	for (let j = 0; j < NY; j++)
		for (let i = 0; i < NX; i++) {
			const px = cx + (i * CELL - cx) / zoom;
			const py = cy + (j * CELL - cy) / zoom;
			const x = px / 650;
			const y = py / 650;
			// Deux octaves + léger étirement en diagonale, comme les reliefs des références.
			// Pente douce (lignes empilées en diagonale, comme les références) déformée par deux octaves de bruit.
			v[j * NX + i] = (py + px * 0.35) / 900 + simplex(x, y, t) * 0.55 + simplex(x * 2.6, y * 2.6, t * 1.4 + 7) * 0.1;
		}
	const fins: string[] = [];
	const gras: string[] = [];
	for (let l = 0; l < NIVEAUX; l++) {
		const lev = -0.6 + (3.4 * (l + 0.5)) / NIVEAUX;
		const out = l % 7 === 3 ? gras : fins;
		for (let j = 0; j < NY - 1; j++)
			for (let i = 0; i < NX - 1; i++) {
				const a = v[j * NX + i];
				const b = v[j * NX + i + 1];
				const c = v[(j + 1) * NX + i + 1];
				const d = v[(j + 1) * NX + i];
				const idx = (a > lev ? 8 : 0) | (b > lev ? 4 : 0) | (c > lev ? 2 : 0) | (d > lev ? 1 : 0);
				if (idx === 0 || idx === 15) continue;
				const x = i * CELL;
				const y = j * CELL;
				const top = [x + (CELL * (lev - a)) / (b - a), y];
				const right = [x + CELL, y + (CELL * (lev - b)) / (c - b)];
				const bottom = [x + (CELL * (lev - d)) / (c - d), y + CELL];
				const left = [x, y + (CELL * (lev - a)) / (d - a)];
				const seg = (p: number[], q: number[]) => out.push(`M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${q[0].toFixed(1)} ${q[1].toFixed(1)}`);
				switch (idx) {
					case 1:
					case 14:
						seg(left, bottom);
						break;
					case 2:
					case 13:
						seg(bottom, right);
						break;
					case 3:
					case 12:
						seg(left, right);
						break;
					case 4:
					case 11:
						seg(top, right);
						break;
					case 5:
						seg(left, top);
						seg(bottom, right);
						break;
					case 6:
					case 9:
						seg(top, bottom);
						break;
					case 7:
					case 8:
						seg(left, top);
						break;
					case 10:
						seg(left, bottom);
						seg(top, right);
						break;
				}
			}
	}
	return {fins: fins.join(''), gras: gras.join('')};
};

export const TopoAnime: React.FC<{zoomDe?: number; d?: number; vitesse?: number}> = ({zoomDe = 1, d = 18, vitesse = 1}) => {
	const f = useCurrentFrame();
	const zoom = interpolate(f, [0, d], [zoomDe, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)}) * (1 + f * 0.0008);
	const {fins, gras} = useMemo(() => courbes(f * 0.018 * vitesse, zoom), [f, zoom, vitesse]);
	return (
		<AbsoluteFill style={{background: 'radial-gradient(ellipse 90% 70% at 50% 45%, #2b2b2b 0%, #1d1d1d 70%, #151515 100%)'}}>
			<svg width={W} height={H} style={{position: 'absolute', inset: 0}}>
				<path d={fins} stroke="#f2f2f2" strokeOpacity={0.82} strokeWidth={3.2} strokeLinecap="round" fill="none" />
				<path d={gras} stroke="#ffffff" strokeWidth={6} strokeLinecap="round" fill="none" />
			</svg>
		</AbsoluteFill>
	);
};
