import React from 'react';

/*
 * Dessins vectoriels du format « dessin animé + sous-titres » : bonhomme (membres orange, corps blanc,
 * contour noir épais), toise, étiquette, cadenas, flèches, vertèbres.
 * Tout est dessiné dans le repère 1080×1920 d'un plan ; la caméra (Camera) zoome et glisse dessus.
 */

export const ENCRE = '#121212';
export const O = 7; // épaisseur du contour noir
export const ORANGE = '#ff6a26';
export const VERT = '#20c45a';
export const ROUGE = '#e5322d';
export const GRIS = '#7b7b7b';
export const CYAN = '#2ee8ff';
export const FONT_TAG = "'Poppins', 'Inter', sans-serif";

/** Filtres de halo, à poser une fois par plan. */
export const Defs: React.FC = () => (
	<defs>
		{[
			['halo-vert', VERT, 16],
			['halo-rouge', ROUGE, 16],
			['halo-cyan', CYAN, 14],
			['halo-gris', '#9a9a9a', 10],
			['halo-blanc', '#ffffff', 12],
		].map(([id, c, r]) => (
			<filter key={id as string} id={id as string} x="-60%" y="-60%" width="220%" height="220%">
				<feGaussianBlur in="SourceAlpha" stdDeviation={r as number} result="b" />
				<feFlood floodColor={c as string} floodOpacity="0.95" />
				<feComposite in2="b" operator="in" result="g" />
				<feMerge>
					<feMergeNode in="g" />
					<feMergeNode in="g" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
		))}
		<filter id="ombre" x="-30%" y="-30%" width="160%" height="160%">
			<feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#000" floodOpacity="0.25" />
		</filter>
		<filter id="flou-x" x="-50%" y="-10%" width="200%" height="120%">
			<feGaussianBlur stdDeviation="18 0" />
		</filter>
		<radialGradient id="vignette" cx="50%" cy="48%" r="75%">
			<stop offset="0.45" stopColor="#ffffff" />
			<stop offset="1" stopColor="#c9c9c9" />
		</radialGradient>
	</defs>
);

/** Fond blanc à vignette grise, fixe (hors caméra). */
export const Fond: React.FC<{couleur?: string}> = ({couleur}) => (
	<rect x={-2000} y={-2000} width={5080} height={5920} fill={couleur ?? 'url(#vignette)'} />
);

export type P = [number, number];
/** Segment de membre : de a à b, largeur w, couleur. */
export type Seg = {a: P; b: P; w: number; c: string};

/** Dessine des segments en deux passes (contours puis couleurs) pour un trait propre aux jointures. */
export const Membres: React.FC<{segs: Seg[]; filter?: string}> = ({segs, filter}) => (
	<g filter={filter}>
		{segs.map((s, i) => (
			<line key={`o${i}`} x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} stroke={ENCRE} strokeWidth={s.w + 2 * O} strokeLinecap="round" />
		))}
		{segs.map((s, i) => (
			<line key={`c${i}`} x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} stroke={s.c} strokeWidth={s.w} strokeLinecap="round" />
		))}
	</g>
);

export type Humeur = 'dort' | 'stress' | 'triste' | 'content' | 'sourire';

/** Tête ronde (anneau orange) et visage. rot : rotation du visage (tête couchée). */
export const Tete: React.FC<{x: number; y: number; r: number; humeur: Humeur; rot?: number; anneau?: string}> = ({x, y, r, humeur, rot = 0, anneau = ORANGE}) => {
	const e = r * 0.34; // écart des yeux
	const yy = -r * 0.08;
	const sw = Math.max(5, r * 0.09);
	const yeux =
		humeur === 'dort' ? (
			<>
				<path d={`M ${-e - r * 0.16} ${yy} q ${r * 0.16} ${r * 0.16} ${r * 0.32} 0`} stroke={ENCRE} strokeWidth={sw} fill="none" strokeLinecap="round" />
				<path d={`M ${e - r * 0.16} ${yy} q ${r * 0.16} ${r * 0.16} ${r * 0.32} 0`} stroke={ENCRE} strokeWidth={sw} fill="none" strokeLinecap="round" />
			</>
		) : humeur === 'stress' ? (
			<>
				<circle cx={-e} cy={yy} r={r * 0.15} fill="#fff" stroke={ENCRE} strokeWidth={sw * 0.7} />
				<circle cx={e} cy={yy} r={r * 0.15} fill="#fff" stroke={ENCRE} strokeWidth={sw * 0.7} />
				<circle cx={-e} cy={yy} r={r * 0.06} fill={ENCRE} />
				<circle cx={e} cy={yy} r={r * 0.06} fill={ENCRE} />
			</>
		) : (
			<>
				<circle cx={-e} cy={yy} r={r * 0.08} fill={ENCRE} />
				<circle cx={e} cy={yy} r={r * 0.08} fill={ENCRE} />
				{humeur === 'triste' ? (
					<>
						<path d={`M ${-e - r * 0.16} ${yy - r * 0.2} l ${r * 0.26} ${-r * 0.08}`} stroke={ENCRE} strokeWidth={sw * 0.8} strokeLinecap="round" />
						<path d={`M ${e + r * 0.16} ${yy - r * 0.2} l ${-r * 0.26} ${-r * 0.08}`} stroke={ENCRE} strokeWidth={sw * 0.8} strokeLinecap="round" />
					</>
				) : null}
			</>
		);
	const bouche =
		humeur === 'stress' ? (
			<ellipse cx={0} cy={r * 0.38} rx={r * 0.13} ry={r * 0.17} fill={ENCRE} />
		) : humeur === 'triste' ? (
			<path d={`M ${-r * 0.24} ${r * 0.45} q ${r * 0.24} ${-r * 0.2} ${r * 0.48} 0`} stroke={ENCRE} strokeWidth={sw} fill="none" strokeLinecap="round" />
		) : humeur === 'dort' ? (
			<path d={`M ${-r * 0.12} ${r * 0.36} q ${r * 0.12} ${r * 0.1} ${r * 0.24} 0`} stroke={ENCRE} strokeWidth={sw} fill="none" strokeLinecap="round" />
		) : (
			<path d={`M ${-r * 0.3} ${r * 0.26} q ${r * 0.3} ${r * (humeur === 'content' ? 0.36 : 0.26)} ${r * 0.6} 0`} stroke={ENCRE} strokeWidth={sw} fill="none" strokeLinecap="round" />
		);
	return (
		<g transform={`translate(${x} ${y}) rotate(${rot})`}>
			<circle r={r + O} fill={ENCRE} />
			<circle r={r} fill={anneau} />
			<circle r={r * 0.8} fill="#fff" />
			{yeux}
			{bouche}
		</g>
	);
};

/** Toise verticale : x gauche, de haut à bas, graduations noires. */
export const Toise: React.FC<{x: number; haut: number; bas: number; l?: number; filter?: string; fond?: string}> = ({x, haut, bas, l = 46, filter, fond = '#fff'}) => {
	const ticks = [];
	for (let y = bas - 20, i = 0; y > haut + 10; y -= 22, i++) {
		const long = i % 5 === 0 ? l * 0.62 : l * 0.34;
		ticks.push(<line key={i} x1={x + l} y1={y} x2={x + l - long} y2={y} stroke={ENCRE} strokeWidth={4} />);
	}
	return (
		<g filter={filter}>
			<rect x={x} y={haut} width={l} height={bas - haut} fill={fond} stroke={ENCRE} strokeWidth={O} rx={4} />
			{ticks}
		</g>
	);
};

/** Étiquette de taille (« 1,70 m ») accrochée à la toise. */
export const Etiquette: React.FC<{x: number; y: number; texte: string; couleur: string; taille?: number; filter?: string}> = ({x, y, texte, couleur, taille = 50, filter}) => {
	const w = taille * 0.62 * texte.length + taille * 0.8;
	const h = taille * 1.45;
	return (
		<g filter={filter}>
			<rect x={x} y={y - h / 2} width={w} height={h} rx={taille * 0.18} fill={couleur} stroke={ENCRE} strokeWidth={O * 0.8} />
			<text x={x + w / 2} y={y + taille * 0.36} textAnchor="middle" fontFamily={FONT_TAG} fontWeight={800} fontSize={taille} fill="#fff" stroke={ENCRE} strokeWidth={taille * 0.1} paintOrder="stroke">
				{texte}
			</text>
		</g>
	);
};

/** Cadenas (centre bas du corps en x, y). ouvert : 0 → 1 soulève et pivote l'anse. */
export const Cadenas: React.FC<{x: number; y: number; s?: number; couleur?: string; ouvert?: number; filter?: string}> = ({x, y, s = 1, couleur = ROUGE, ouvert = 0, filter}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`} filter={filter}>
		<g transform={`translate(${28 * ouvert} ${-34 * ouvert}) rotate(${-25 * ouvert} 38 -70)`}>
			<path d="M -38 -70 v -26 a 38 38 0 0 1 76 0 v 26" fill="none" stroke={ENCRE} strokeWidth={30} />
			<path d="M -38 -70 v -26 a 38 38 0 0 1 76 0 v 26" fill="none" stroke="#9aa0a6" strokeWidth={16} />
		</g>
		<rect x={-62} y={-80} width={124} height={92} rx={16} fill={couleur} stroke={ENCRE} strokeWidth={O} />
		<rect x={-50} y={-70} width={100} height={14} rx={7} fill="#fff" opacity={0.28} />
		<circle cx={0} cy={-40} r={11} fill={ENCRE} />
		<rect x={-5} y={-40} width={10} height={26} rx={4} fill={ENCRE} />
	</g>
);

/** Flèche épaisse vers le haut (base au point x, y). */
export const FlecheHaut: React.FC<{x: number; y: number; h: number; l?: number; couleur: string; filter?: string}> = ({x, y, h, l = 70, couleur, filter}) => {
	const t = l * 1.9;
	const p = `M ${x - l / 2} ${y} V ${y - h + t * 0.8} H ${x - t / 2} L ${x} ${y - h} L ${x + t / 2} ${y - h + t * 0.8} H ${x + l / 2} V ${y} Z`;
	return <path d={p} fill={couleur} stroke={ENCRE} strokeWidth={O} strokeLinejoin="round" filter={filter} />;
};

/** Coche verte et croix grise. */
export const Coche: React.FC<{x: number; y: number; s: number; filter?: string}> = ({x, y, s, filter}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`} filter={filter}>
		<path d="M -60 0 L -18 42 L 66 -48" fill="none" stroke={ENCRE} strokeWidth={46} strokeLinecap="round" strokeLinejoin="round" />
		<path d="M -60 0 L -18 42 L 66 -48" fill="none" stroke={VERT} strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" />
	</g>
);
export const Croix: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<path d="M -50 -50 L 50 50 M 50 -50 L -50 50" stroke={ENCRE} strokeWidth={46} strokeLinecap="round" />
		<path d="M -50 -50 L 50 50 M 50 -50 L -50 50" stroke="#5f5f5f" strokeWidth={30} strokeLinecap="round" />
	</g>
);

/** Vertèbre vue de face (gros plan colonne). allume : 0 → 1 (gris → cyan lumineux). */
export const VertebreFace: React.FC<{x: number; y: number; ang: number; w: number; h: number; allume: number}> = ({x, y, ang, w, h, allume}) => {
	const fill = mix('#b8b8b8', '#c9fbff', allume);
	return (
		<g transform={`translate(${x} ${y}) rotate(${ang})`} filter={allume > 0.5 ? 'url(#halo-cyan)' : undefined}>
			<path
				d={`M ${-w / 2 - 34} ${-h * 0.18} q -12 ${h * 0.18} 0 ${h * 0.36} l 44 0 l 0 ${-h * 0.36} z M ${w / 2 + 34} ${-h * 0.18} q 12 ${h * 0.18} 0 ${h * 0.36} l -44 0 l 0 ${-h * 0.36} z`}
				fill={fill}
				stroke={mix(ENCRE, '#0aa9c4', allume)}
				strokeWidth={O * 0.8}
				strokeLinejoin="round"
			/>
			<path
				d={`M ${-w / 2} ${-h / 2 + 14} q 0 -14 14 -14 h ${w - 28} q 14 0 14 14 v ${h - 28} q 0 14 -14 14 h ${-(w - 28)} q -14 0 -14 -14 z`}
				fill={fill}
				stroke={mix(ENCRE, '#0aa9c4', allume)}
				strokeWidth={O}
			/>
			<path d={`M ${-w / 2 + 16} ${-h / 2 + 18} h ${w - 32}`} stroke="#fff" strokeOpacity={0.55} strokeWidth={8} strokeLinecap="round" />
			<path d={`M ${-w / 2 + 20} ${h / 2 - 16} h ${w - 40}`} stroke="#000" strokeOpacity={0.12 * (1 - allume)} strokeWidth={10} strokeLinecap="round" />
		</g>
	);
};

/** Vertèbre vue de profil (corps + apophyse), pour la silhouette et l'écran partagé. */
export const VertebreProfil: React.FC<{x: number; y: number; ang: number; s: number; corps: string; bord: string; filter?: string}> = ({x, y, ang, s, corps, bord, filter}) => (
	<g transform={`translate(${x} ${y}) rotate(${ang}) scale(${s})`} filter={filter} strokeLinejoin="round">
		{/* apophyse épineuse (vers l'arrière et le bas), arc, apophyses articulaires, puis le corps */}
		<path d="M 40 -18 C 70 -22 100 -6 132 22 C 142 32 134 46 120 42 C 96 34 66 22 40 20 Z" fill={corps} stroke={bord} strokeWidth={6} />
		<path d="M 34 -26 L 58 -46 C 66 -50 74 -44 70 -36 L 58 -18 Z M 38 22 L 62 40 C 68 46 60 54 52 50 L 30 32 Z" fill={corps} stroke={bord} strokeWidth={5} />
		<path d="M 10 -24 C 30 -30 50 -26 56 -10 C 60 4 54 18 36 24 C 24 28 14 24 10 18 Z" fill={corps} stroke={bord} strokeWidth={6} />
		<path d="M -62 -30 C -40 -38 -10 -38 16 -30 C 22 -10 22 10 16 30 C -10 38 -40 38 -62 30 C -68 10 -68 -10 -62 -30 Z" fill={corps} stroke={bord} strokeWidth={6} />
		<path d="M -50 -22 C -30 -27 -8 -27 6 -22" fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={6} strokeLinecap="round" />
	</g>
);

/** Disque entre deux vertèbres (profil). */
export const Disque: React.FC<{x: number; y: number; ang: number; s: number; couleur: string}> = ({x, y, ang, s, couleur}) => (
	<g transform={`translate(${x} ${y}) rotate(${ang}) scale(${s})`}>
		<rect x={-58} y={-9} width={72} height={18} rx={9} fill={couleur} stroke="#000" strokeOpacity={0.35} strokeWidth={3} />
	</g>
);

export const mix = (a: string, b: string, t: number) => {
	const k = Math.max(0, Math.min(1, t));
	const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
	const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
	return `rgb(${pa.map((v, i) => Math.round(v + (pb[i] - v) * k)).join(',')})`;
};

/* ---------- Poses du bonhomme ---------- */

/** Couché sur le dos, tête à droite. Pieds en fx, tête en hx, sol en g. */
export const poseDos = (fx: number, hx: number, g: number) => {
	const L = hx - fx;
	const hip = fx + 0.47 * L;
	const sh = fx + 0.8 * L;
	const segs: Seg[] = [
		{a: [fx + 34, g - 78], b: [hip, g - 70], w: 34, c: ORANGE},
		{a: [fx + 6, g - 26], b: [hip, g - 32], w: 38, c: ORANGE},
		{a: [hip - 40, g - 46], b: [sh, g - 48], w: 84, c: '#fff'},
		{a: [hip - 70, g - 50], b: [hip - 70, g - 40], w: 74, c: '#fff'},
		{a: [sh - 6, g - 34], b: [hip - 20, g - 22], w: 30, c: ORANGE},
	];
	return {segs, tete: {x: hx - 58, y: g - 66, r: 60}};
};

/** Couché sur le côté (genoux un peu pliés), tête à droite sur l'oreiller. */
export const poseCote = (fx: number, hx: number, g: number) => {
	const L = hx - fx;
	const hip = fx + 0.47 * L;
	const knee = fx + 0.24 * L;
	const sh = fx + 0.8 * L;
	const segs: Seg[] = [
		{a: [fx + 10, g - 30], b: [knee, g - 40], w: 36, c: ORANGE},
		{a: [knee, g - 40], b: [hip, g - 52], w: 38, c: ORANGE},
		{a: [fx + 34, g - 60], b: [knee + 10, g - 70], w: 34, c: ORANGE},
		{a: [knee + 10, g - 70], b: [hip, g - 64], w: 36, c: ORANGE},
		{a: [hip - 30, g - 62], b: [sh, g - 70], w: 86, c: '#fff'},
		{a: [sh - 10, g - 74], b: [sh + 40, g - 38], w: 30, c: ORANGE},
		{a: [sh + 40, g - 38], b: [hx - 60, g - 36], w: 28, c: ORANGE},
	];
	return {segs, tete: {x: hx - 64, y: g - 92, r: 60}};
};

/** Debout de face. h : taille totale (tête comprise). bras : 'bas' | 'hanches' | 'pointe'. */
export const poseDebout = (cx: number, g: number, h: number, bras: 'bas' | 'hanches' | 'pointe', pointe = 0) => {
	const hip = g - 0.47 * h;
	const sh = g - 0.76 * h;
	const lw = 0.064 * h;
	const segs: Seg[] = [
		{a: [cx - 0.05 * h, hip], b: [cx - 0.06 * h, g - lw / 2], w: lw, c: ORANGE},
		{a: [cx + 0.05 * h, hip], b: [cx + 0.06 * h, g - lw / 2], w: lw, c: ORANGE},
		{a: [cx, sh + 0.04 * h], b: [cx, hip], w: 0.17 * h, c: '#fff'},
	];
	const aw = lw * 0.85;
	const sx = 0.085 * h;
	if (bras === 'hanches') {
		segs.push({a: [cx - sx, sh + 0.02 * h], b: [cx - 0.22 * h, g - 0.6 * h], w: aw, c: ORANGE}, {a: [cx - 0.22 * h, g - 0.6 * h], b: [cx - 0.09 * h, hip + 0.01 * h], w: aw, c: ORANGE});
		segs.push({a: [cx + sx, sh + 0.02 * h], b: [cx + 0.22 * h, g - 0.6 * h], w: aw, c: ORANGE}, {a: [cx + 0.22 * h, g - 0.6 * h], b: [cx + 0.09 * h, hip + 0.01 * h], w: aw, c: ORANGE});
	} else {
		segs.push({a: [cx + sx, sh + 0.02 * h], b: [cx + 0.11 * h, hip - 0.02 * h], w: aw, c: ORANGE});
		if (bras === 'pointe') {
			// bras gauche levé qui pointe vers le bas à gauche (pointe : 0 → 1)
			const hx = cx - 0.13 * h - 0.17 * h * pointe;
			const hy = hip - 0.02 * h - 0.06 * h * pointe;
			segs.push({a: [cx - sx, sh + 0.02 * h], b: [hx, hy], w: aw, c: ORANGE});
		} else {
			segs.push({a: [cx - sx, sh + 0.02 * h], b: [cx - 0.11 * h, hip - 0.02 * h], w: aw, c: ORANGE});
		}
	}
	return {segs, tete: {x: cx, y: g - 0.88 * h, r: 0.115 * h}};
};
