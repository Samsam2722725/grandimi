import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, CalculateMetadataFunction, cancelRender, continueRender, delayRender, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame} from 'remotion';
import {CYAN, Defs, ENCRE, Membres, O, ORANGE, P, Seg, Tete} from '../dessin/dessin';

/*
 * « Routine en 3 étapes » sans voix off : titre fixe en haut, illustration au milieu, texte en bas.
 * Recopié de la référence v12044gd0000cvjd14vog65heklc13k0 (references/…/fiche.md) : mêmes plans,
 * mêmes coupes, mêmes cadrages, illustrations redessinées en vectoriel (style Grandimi).
 * Une routine = public/routines/<id>/routine.json (+ images/).
 */

const FPS = 30;
const W = 1080;
const BY = 240; // la vidéo d'origine est en 3:4 : bande 1080×1440 centrée, noir autour
const BH = 1440;
const HAUT = 400; // bandeau du titre
const BAS = 1060; // début du texte du bas
const FONT = "'Poppins', 'Inter', sans-serif";

type Plan = {type: 'titre' | 'rapport' | 'saut' | 'cobra' | 'genoux' | 'fente'; de: number; a: number; titre: string; sous?: string; bas?: string; image?: string};
export type RoutineProps = {routine: string; plans?: Plan[]};

export const calculateRoutineMetadata: CalculateMetadataFunction<RoutineProps> = async ({props}) => {
	const r = await fetch(staticFile(`routines/${props.routine}/routine.json`)).then((x) => x.json());
	const fin = Math.max(...r.plans.map((p: Plan) => p.a));
	return {durationInFrames: fin, fps: FPS, props: {...props, plans: r.plans}};
};

const usePoppins = () => {
	const [handle] = useState(() => delayRender('Poppins'));
	useEffect(() => {
		const f = new FontFace('Poppins', `url(${staticFile('fonts/poppins-latin-800-normal.woff2')})`, {weight: '800'});
		f.load()
			.then((l) => {
				document.fonts.add(l);
				continueRender(handle);
			})
			.catch((e) => cancelRender(e));
	}, [handle]);
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const io = Easing.inOut(Easing.cubic);

/** Courbe épaisse à contour noir (tronc arqué), avec la colonne lumineuse dedans. */
const Tronc: React.FC<{d: string; w?: number; colonne?: boolean; f: number}> = ({d, w = 84, colonne = true, f}) => (
	<g>
		<path d={d} fill="none" stroke={ENCRE} strokeWidth={w + 2 * O} strokeLinecap="round" />
		<path d={d} fill="none" stroke="#fff" strokeWidth={w} strokeLinecap="round" />
		{colonne ? (
			<>
				<path d={d} fill="none" stroke={CYAN} strokeWidth={30} strokeLinecap="round" opacity={0.5 + 0.25 * Math.sin(f / 6)} style={{filter: 'blur(9px)'}} />
				<path d={d} fill="none" stroke="#0bb8d6" strokeWidth={18} strokeLinecap="butt" strokeDasharray="14 7" />
			</>
		) : null}
	</g>
);

/** Sol bleu nuit des plans d'étirement (comme le plateau de l'original). */
const Sol: React.FC<{y: number}> = ({y}) => (
	<>
		<defs>
			<linearGradient id="sol" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stopColor="#2a2aa8" />
				<stop offset="1" stopColor="#07072e" />
			</linearGradient>
		</defs>
		<rect x={-2000} y={y} width={5000} height={2000} fill="url(#sol)" />
		<line x1={-2000} y1={y} x2={3000} y2={y} stroke="#6b6bff" strokeWidth={4} opacity={0.7} />
	</>
);

/** Caméra : centre (x, y) et échelle interpolés entre deux clés. */
const cam = (f: number, d: number, a: [number, number, number], b: [number, number, number]) => {
	const k = interpolate(f, [0, d], [0, 1], {...clamp, easing: io});
	const x = a[0] + (b[0] - a[0]) * k;
	const y = a[1] + (b[1] - a[1]) * k;
	const s = a[2] + (b[2] - a[2]) * k;
	const cy = (HAUT + BAS) / 2;
	return `translate(${W / 2 - x * s} ${cy - y * s}) scale(${s})`;
};

/* ---------- 1. Titre : salle de néons, deux bonshommes, flèches de croissance ---------- */

const PlanTitre: React.FC<{f: number; d: number}> = ({f, d}) => {
	const couleurs = ['#ff2d55', '#ffd60a', '#32d7ff', '#b45cff', ORANGE, '#30e07a'];
	const fleches = couleurs.map((c, i) => {
		const x0 = 425 + i * 46;
		const amp = 22 + (i % 3) * 8;
		const pts: string[] = [];
		for (let k = 0; k <= 20; k++) {
			const y = 1330 - k * 38;
			pts.push(`${x0 + amp * Math.sin(k / 3 + i * 1.3 + f / 9)},${y}`);
		}
		const pousse = interpolate(f, [i * 2, i * 2 + 22], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
		const [hx, hy] = pts[20].split(',').map(Number);
		return (
			<g key={i}>
				<polyline points={pts.join(' ')} fill="none" stroke={ENCRE} strokeWidth={50} strokeLinejoin="round" pathLength={1} strokeDasharray={`${pousse} 1`} />
				<polyline points={pts.join(' ')} fill="none" stroke={c} strokeWidth={36} strokeLinejoin="round" pathLength={1} strokeDasharray={`${pousse} 1`} />
				{pousse > 0.97 ? <path d={`M ${hx - 44} ${hy + 30} L ${hx} ${hy - 50} L ${hx + 44} ${hy + 30} Z`} fill={c} stroke={ENCRE} strokeWidth={O} strokeLinejoin="round" /> : null}
			</g>
		);
	});
	const s = interpolate(f, [0, d], [1, 1.06]);
	const neon = (x1: number, y1: number, x2: number, y2: number, k: number) => (
		<g key={k}>
			<line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#2f5bff" strokeWidth={22} opacity={0.6} style={{filter: 'blur(10px)'}} />
			<line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cfe0ff" strokeWidth={5} />
		</g>
	);
	return (
		<svg width={W} height={BH} viewBox={`0 0 ${W} ${BH}`}>
			<Defs />
			<defs>
				<radialGradient id="nuit" cx="50%" cy="85%" r="80%">
					<stop offset="0" stopColor="#1736d6" />
					<stop offset="0.45" stopColor="#06104a" />
					<stop offset="1" stopColor="#020208" />
				</radialGradient>
			</defs>
			<rect width={W} height={BH} fill="url(#nuit)" />
			<g transform={`translate(${W / 2} ${BH / 2}) scale(${s}) translate(${-W / 2} ${-BH / 2})`}>
				{[
					[250, 520, 830, 520],
					[250, 520, 250, 1150],
					[830, 520, 830, 1150],
					[250, 1150, 830, 1150],
					[250, 520, 40, 380],
					[830, 520, 1040, 380],
					[250, 1150, 20, 1320],
					[830, 1150, 1060, 1320],
				].map(([a, b, c, e], k) => neon(a, b, c, e, k))}
				<ellipse cx={540} cy={1300} rx={420} ry={40} fill="#000" opacity={0.35} />
				<Bonhomme pose={debout(240, 1290, 720, f, 0)} humeur="content" />
				<Bonhomme pose={debout(840, 1290, 720, f, 2)} humeur="content" />
				{fleches}
			</g>
		</svg>
	);
};

/* ---------- Poses ---------- */

type Pose = {segs: Seg[]; tete: {x: number; y: number; r: number}; tronc?: string};
const Bonhomme: React.FC<{pose: Pose; humeur: 'content' | 'sourire' | 'dort'; f?: number; arriere?: Seg[]}> = ({pose, humeur, f = 0, arriere}) => (
	<g>
		{arriere ? <Membres segs={arriere} /> : null}
		<Membres segs={pose.segs} />
		{pose.tronc ? <Tronc d={pose.tronc} f={f} /> : null}
		<Tete {...pose.tete} humeur={humeur} />
	</g>
);

const debout = (cx: number, g: number, h: number, f: number, ph: number): Pose => {
	const lw = 0.064 * h;
	const hip = g - 0.47 * h;
	const sh = g - 0.76 * h;
	const b = Math.sin(f / 8 + ph) * 0.02 * h;
	return {
		segs: [
			{a: [cx - 0.05 * h, hip], b: [cx - 0.07 * h, g - lw / 2], w: lw, c: ORANGE},
			{a: [cx + 0.05 * h, hip], b: [cx + 0.07 * h, g - lw / 2], w: lw, c: ORANGE},
			{a: [cx - 0.085 * h, sh + 0.02 * h], b: [cx - 0.12 * h, hip - 0.02 * h + b], w: lw * 0.85, c: ORANGE},
			{a: [cx + 0.085 * h, sh + 0.02 * h], b: [cx + 0.12 * h, hip - 0.02 * h - b], w: lw * 0.85, c: ORANGE},
		],
		tronc: `M ${cx} ${hip} L ${cx} ${sh + 0.04 * h}`,
		tete: {x: cx, y: g - 0.88 * h, r: 0.115 * h},
	};
};

const rad = (d: number) => (d * Math.PI) / 180;
const pt = (o: P, l: number, angDeg: number): P => [o[0] + l * Math.sin(rad(angDeg)), o[1] + l * Math.cos(rad(angDeg))]; // 0° = vers le bas, + = vers la droite

/** Profil qui saute vers la droite. c : flexion 0 → 1, bras : angle des bras, y : hauteur du saut. */
const profilSaut = (x: number, g: number, c: number, bras: number, saut: number, rentre: number) => {
	const T = 150;
	const S = 150;
	const at = 80 * Math.max(c, rentre);
	const as = -75 * Math.max(c, rentre * 1.2);
	const lean = 28 * c + 6;
	const hy = g - saut - (T * Math.cos(rad(at)) + S * Math.cos(rad(as))) - 24;
	const H: P = [x, hy];
	const jambe = (d: number): Seg[] => {
		const K = pt(H, T, at + d);
		const A = pt(K, S, as + d);
		const F: P = [A[0] + 46, A[1] + 6];
		return [
			{a: H, b: K, w: 40, c: ORANGE},
			{a: K, b: A, w: 36, c: ORANGE},
			{a: A, b: F, w: 26, c: ORANGE},
		];
	};
	const Sh = pt(H, -220, -lean); // vers le haut
	const E = pt(Sh, 110, bras);
	const M = pt(E, 100, bras + 25);
	const tete = pt(Sh, -82, -lean - 6);
	return {
		devant: [...jambe(0), {a: Sh, b: E, w: 30, c: ORANGE}, {a: E, b: M, w: 28, c: ORANGE}] as Seg[],
		derriere: [...jambe(-12), {a: Sh, b: pt(Sh, 105, bras - 30), w: 28, c: '#d4561c'}] as Seg[],
		tronc: `M ${H[0]} ${H[1]} L ${Sh[0]} ${Sh[1]}`,
		tete: {x: tete[0], y: tete[1], r: 60},
		tibia: jambe(0)[1],
	};
};

/* ---------- 2. Sauts : haies rouges qui défilent, zoom lent vers les jambes ---------- */

const PlanSaut: React.FC<{f: number; d: number}> = ({f, d}) => {
	const P = 26; // une haie par saut
	const u = (f % P) / P;
	const G = 1000;
	let c = 0;
	let saut = 0;
	let bras = -40;
	let rentre = 0;
	if (u < 0.25) {
		c = interpolate(u, [0, 0.25], [0.55, 1]);
		bras = interpolate(u, [0, 0.25], [20, -50]);
	} else if (u < 0.35) {
		c = interpolate(u, [0.25, 0.35], [1, 0.05]);
		bras = interpolate(u, [0.25, 0.35], [-50, 160]);
	} else if (u < 0.82) {
		const k = (u - 0.35) / 0.47;
		saut = 150 * Math.sin(Math.PI * k);
		rentre = 0.55 * Math.sin(Math.PI * k);
		bras = interpolate(k, [0, 1], [160, 60]);
	} else {
		c = interpolate(u, [0.82, 1], [0.05, 0.55]);
		bras = interpolate(u, [0.82, 1], [60, 20]);
	}
	const x = 470;
	const b = profilSaut(x, G, c, bras, saut, rentre);
	const vitesse = 9;
	const ecart = vitesse * P;
	const haies = [];
	for (let i = -3; i < 8; i++) {
		// la haie passe sous le bonhomme au sommet du saut
		const decal = ((((f - P * 0.585) * vitesse) % ecart) + ecart) % ecart;
		const hx = x + 40 + i * ecart - decal;
		haies.push(
			<g key={i} filter="url(#halo-rouge)">
				<path d={`M ${hx - 55} ${G} C ${hx - 70} ${G - 150} ${hx + 70} ${G - 150} ${hx + 55} ${G}`} fill="none" stroke="#ff2a2a" strokeWidth={14} strokeLinecap="round" />
			</g>,
		);
	}
	const atterrit = u > 0.82 || u < 0.08;
	const ti = b.tibia;
	const fissure = atterrit ? (
		<g stroke="#fff" strokeWidth={5} fill="none" strokeLinecap="round" filter="url(#halo-blanc)">
			<path d={`M ${(ti.a[0] + ti.b[0]) / 2 - 10} ${(ti.a[1] + ti.b[1]) / 2 - 18} l 12 10 l -10 10 l 12 12`} />
		</g>
	) : null;
	return (
		<svg width={W} height={BH} viewBox={`0 0 ${W} ${BH}`}>
			<Defs />
			<rect width={W} height={BH} fill="#000" />
			<g transform={cam(f, d, [500, 700, 0.62], [480, 880, 1.45])}>
				<ellipse cx={x + 20} cy={G + 8} rx={150 - saut * 0.3} ry={16} fill="#ff2a2a" opacity={0.18} />
				{haies}
				<Membres segs={b.derriere} />
				<Membres segs={b.devant} />
				<Tronc d={b.tronc} f={f} w={80} />
				<Tete {...b.tete} humeur="content" />
				{/* os du tibia visibles + micro-fissure à la réception */}
				<line x1={ti.a[0]} y1={ti.a[1]} x2={ti.b[0]} y2={ti.b[1]} stroke="#fff" strokeWidth={9} strokeLinecap="round" opacity={0.85} />
				{fissure}
			</g>
		</svg>
	);
};

/* ---------- 3. Étirements ---------- */

/** a : cobra (couché sur le ventre, buste relevé). */
const PlanCobra: React.FC<{f: number; d: number}> = ({f, d}) => {
	const G = 960;
	const k = 0.75 + 0.25 * Math.sin(f / 9);
	const hip: P = [430, G - 44];
	const sh: P = [670, G - 140 - 120 * k];
	const ctrl: P = [600, G - 40];
	const tete = pt(sh, -95, 25);
	return (
		<svg width={W} height={BH} viewBox={`0 0 ${W} ${BH}`}>
			<Defs />
			<rect width={W} height={BH} fill="#000" />
			<g transform={cam(f, d, [520, 820, 1.25], [560, 800, 1.45])}>
				<Sol y={G} />
				<Membres
					segs={[
						{a: [80, G - 26], b: hip, w: 40, c: '#d4561c'},
						{a: [70, G - 22], b: [hip[0] - 10, hip[1] + 6], w: 40, c: ORANGE},
						{a: sh, b: [sh[0] + 30, G - 24], w: 32, c: ORANGE},
					]}
				/>
				<Tronc d={`M ${hip[0]} ${hip[1]} Q ${ctrl[0]} ${ctrl[1]} ${sh[0]} ${sh[1]}`} f={f} />
				<Tete x={tete[0]} y={tete[1]} r={62} humeur="dort" />
			</g>
		</svg>
	);
};

/** b : sur le dos, genoux contre la poitrine, on se balance. */
const PlanGenoux: React.FC<{f: number; d: number}> = ({f, d}) => {
	const G = 960;
	const rot = 7 * Math.sin(f / 7);
	const hip: P = [460, G - 70];
	const sh: P = [730, G - 84];
	const knee: P = [600, G - 250];
	const ankle: P = [460, G - 300];
	return (
		<svg width={W} height={BH} viewBox={`0 0 ${W} ${BH}`}>
			<Defs />
			<rect width={W} height={BH} fill="#000" />
			<g transform={cam(f, d, [600, 780, 1.4], [580, 800, 1.3])}>
				<Sol y={G} />
				<g transform={`rotate(${rot} ${hip[0]} ${hip[1]})`}>
					<Tronc d={`M ${hip[0]} ${hip[1]} Q 600 ${G - 50} ${sh[0]} ${sh[1]}`} f={f} />
					<Membres
						segs={[
							{a: hip, b: [knee[0] - 16, knee[1] + 10], w: 42, c: '#d4561c'},
							{a: [knee[0] - 16, knee[1] + 10], b: [ankle[0] - 20, ankle[1] + 14], w: 38, c: '#d4561c'},
							{a: hip, b: knee, w: 42, c: ORANGE},
							{a: knee, b: ankle, w: 38, c: ORANGE},
							{a: sh, b: [knee[0] + 30, knee[1] + 40], w: 30, c: ORANGE},
						]}
					/>
					<Tete x={sh[0] + 78} y={sh[1] - 40} r={62} humeur="dort" />
				</g>
			</g>
		</svg>
	);
};

/** c : fente latérale, bras au-dessus de la tête, inclinaison du buste. */
const PlanFente: React.FC<{f: number; d: number}> = ({f, d}) => {
	const G = 1000;
	const k = 0.6 + 0.4 * Math.sin(f / 10);
	const hip: P = [560, G - 300];
	const sh: P = [520 - 50 * k, G - 540];
	const tete: P = [sh[0] - 40 * k, sh[1] - 92];
	const coude: P = [sh[0] + 40 - 60 * k, sh[1] - 170];
	const main: P = [coude[0] - 120 - 40 * k, coude[1] - 60 + 30 * k];
	return (
		<svg width={W} height={BH} viewBox={`0 0 ${W} ${BH}`}>
			<Defs />
			<rect width={W} height={BH} fill="#000" />
			<g transform={cam(f, d, [540, 640, 0.8], [520, 650, 0.9])}>
				<Sol y={G} />
				<Membres
					segs={[
						{a: hip, b: [190, G - 22], w: 42, c: ORANGE},
						{a: hip, b: [760, G - 170], w: 42, c: ORANGE},
						{a: [760, G - 170], b: [790, G - 22], w: 38, c: ORANGE},
						{a: [sh[0] - 50, sh[1] + 30], b: [380, G - 300], w: 30, c: ORANGE},
					]}
				/>
				<Tronc d={`M ${hip[0]} ${hip[1]} Q ${hip[0] + 10} ${(hip[1] + sh[1]) / 2} ${sh[0]} ${sh[1]}`} f={f} />
				<Membres
					segs={[
						{a: [sh[0] + 40, sh[1] + 10], b: coude, w: 30, c: ORANGE},
						{a: coude, b: main, w: 28, c: ORANGE},
					]}
				/>
				<Tete x={tete[0]} y={tete[1]} r={62} humeur="content" />
			</g>
		</svg>
	);
};

/* ---------- Habillage : bandeau du titre, badge Grandimi, texte du bas ---------- */

const Bandeau: React.FC<{titre: string; sous?: string; texture: boolean}> = ({titre, sous, texture}) => (
	<div style={{position: 'absolute', left: 0, top: 0, width: W, height: HAUT, overflow: 'hidden', background: texture ? '#2b2b2b' : '#000'}}>
		{texture ? (
			<svg width={W} height={HAUT} style={{position: 'absolute', inset: 0}}>
				<filter id="grain">
					<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="4" />
					<feColorMatrix values="0 0 0 0 0.12  0 0 0 0 0.12  0 0 0 0 0.12  0 0 0 0.9 0" />
				</filter>
				<rect width={W} height={HAUT} filter="url(#grain)" />
				<rect width={W} height={HAUT} fill="url(#ombreBandeau)" />
				<defs>
					<linearGradient id="ombreBandeau" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0.7" stopColor="#000" stopOpacity="0" />
						<stop offset="1" stopColor="#000" stopOpacity="0.7" />
					</linearGradient>
				</defs>
			</svg>
		) : null}
		<div
			style={{
				position: 'absolute',
				left: texture ? 40 : 60,
				right: texture ? 210 : 60,
				top: 0,
				bottom: 0,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'center',
				justifyContent: 'center',
				textAlign: 'center',
				fontFamily: FONT,
				fontWeight: 800,
				color: '#fff',
				textShadow: '0 5px 0 #000, 0 0 18px rgba(0,0,0,0.8)',
			}}
		>
			<div style={{fontSize: texture ? 110 : 96, lineHeight: 1.04, letterSpacing: -1}}>{titre}</div>
			{sous ? <div style={{fontSize: 54, lineHeight: 1.12, marginTop: 12}}>{sous}</div> : null}
		</div>
	</div>
);

const Badge: React.FC = () => (
	<div style={{position: 'absolute', right: 26, top: 40, width: 170, height: 170, transform: 'rotate(8deg)'}}>
		<div
			style={{
				position: 'absolute',
				right: 10,
				top: 0,
				width: 120,
				height: 120,
				borderRadius: 28,
				background: 'linear-gradient(145deg, #ff8a52 0%, #ff5a1f 55%, #e8430e 100%)',
				boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<svg width={58} height={72} viewBox="0 0 50 62">
				<circle cx="25" cy="8" r="7" fill="#fff" />
				<path d="M14 19 h22 a4 4 0 0 1 4 4 v14 a3 3 0 0 1 -6 0 v-9 h-1 v30 a4 4 0 0 1 -8 0 v-17 h-0 v17 a4 4 0 0 1 -8 0 v-30 h-1 v9 a3 3 0 0 1 -6 0 v-14 a4 4 0 0 1 4 -4 z" fill="#fff" />
			</svg>
		</div>
		<div style={{position: 'absolute', left: -30, top: 70, fontFamily: FONT, fontWeight: 800, fontSize: 30, color: ENCRE, WebkitTextStroke: '8px #fff', paintOrder: 'stroke fill', transform: 'rotate(-14deg)', whiteSpace: 'nowrap'}}>
			grandimi.com
		</div>
		<div style={{position: 'absolute', left: 40, top: 112, fontFamily: FONT, fontWeight: 800, fontSize: 28, color: ENCRE, WebkitTextStroke: '8px #fff', paintOrder: 'stroke fill', transform: 'rotate(-14deg)', whiteSpace: 'nowrap'}}>
			Lien en bio
		</div>
	</div>
);

const TexteBas: React.FC<{texte: string}> = ({texte}) => (
	<div
		style={{
			position: 'absolute',
			left: 0,
			top: BAS,
			width: W,
			height: BH - BAS,
			background: '#0b0b0b',
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
			padding: '0 70px',
			textAlign: 'center',
			fontFamily: FONT,
			fontWeight: 800,
			fontSize: 54,
			lineHeight: 1.28,
			color: '#fff',
			textShadow: '0 3px 0 #000',
		}}
	>
		{texte}
	</div>
);

/* ---------- Montage ---------- */

const Contenu: React.FC<{p: Plan; dir: string}> = ({p, dir}) => {
	const f = useCurrentFrame();
	const d = p.a - p.de;
	if (p.type === 'titre') {
		return (
			<>
				<PlanTitre f={f} d={d} />
				<div style={{position: 'absolute', left: 40, right: 40, top: 40, textAlign: 'center', fontFamily: FONT, fontWeight: 800, color: '#fff', textShadow: '0 5px 0 #000, 0 0 20px #000'}}>
					<div style={{fontSize: 86, lineHeight: 1.06}}>{p.titre}</div>
					{p.sous ? <div style={{fontSize: 58, marginTop: 10}}>{p.sous}</div> : null}
				</div>
			</>
		);
	}
	if (p.type === 'rapport') {
		const s = interpolate(f, [0, d], [1, 1.035]);
		const e = spring({frame: f, fps: FPS, config: {damping: 16, stiffness: 180, mass: 0.6}});
		return (
			<>
				<AbsoluteFill style={{background: '#000'}} />
				<Img
					src={staticFile(`${dir}/images/${p.image}`)}
					style={{position: 'absolute', left: 40, top: 330, width: 1000, transform: `scale(${s * (0.94 + 0.06 * e)})`, transformOrigin: '50% 0%', borderRadius: 24, opacity: Math.min(1, e * 1.5)}}
				/>
				<Bandeau titre={p.titre} texture={false} />
			</>
		);
	}
	const Scene = {saut: PlanSaut, cobra: PlanCobra, genoux: PlanGenoux, fente: PlanFente}[p.type];
	return (
		<>
			<Scene f={f} d={d} />
			<Bandeau titre={p.titre} sous={p.sous} texture />
			<Badge />
			{p.bas ? <TexteBas texte={p.bas} /> : null}
		</>
	);
};

export const Routine: React.FC<RoutineProps> = ({routine, plans}) => {
	usePoppins();
	if (!plans) return null;
	const dir = `routines/${routine}`;
	const fin = Math.max(...plans.map((p) => p.a));
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<Audio src={staticFile('sfx/music.wav')} loop volume={(fr) => interpolate(fr, [0, 6, fin - 10, fin], [0, 0.55, 0.55, 0], clamp)} />
			{plans.slice(1).map((p, i) => (
				<Sequence key={`w${i}`} from={Math.max(0, p.de - 3)} durationInFrames={30} layout="none">
					<Audio src={staticFile('sfx/whoosh.wav')} volume={0.18} />
				</Sequence>
			))}
			{plans.map((p, i) => (
				<Sequence key={i} from={p.de} durationInFrames={p.a - p.de}>
					<div style={{position: 'absolute', left: 0, top: BY, width: W, height: BH, overflow: 'hidden'}}>
						<Contenu p={p} dir={dir} />
					</div>
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
