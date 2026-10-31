import React from 'react';
import {AbsoluteFill, Easing, Img, interpolate, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';

/*
 * Écran de résultats Grandimi reconstruit en React, avec la disposition exacte de l'écran de la
 * référence « Steve » (references/p12-steve, image 150 : cartes mesurées en fraction de l'écran).
 * Chaque ligne est un élément séparé : elle peut s'élargir quand une flèche la pointe, comme dans
 * l'original (×1,16 à gauche et à droite, puis retour).
 *
 * Caméra : mêmes repères que l'original (centre en fraction de l'écran au repos, zoom ×1 = écran au repos).
 * Profils mesurés image par image : les zooms avant démarrent vite et ralentissent (vitesse finale 0,6 ×
 * vitesse initiale), les dézooms accélèrent (×1,65) ; les deux s'arrêtent net.
 */

const W = 1080;
const H = 1920;
const OR = '#ff5a1f';
const OR2 = '#ff8c3c';
const CARTE = '#18181a';
const GRIS = '#9a9a9f';

export type DashData = {
	actuelle: string;
	predite: string;
	optimiser: string;
	bulle: string;
	courbe: number[];
	ages: string[];
	rang: string;
	chances: string;
	chancesCm: string;
	croissance: string;
};

/** Lignes animables et leur boîte (fraction de l'écran au repos, mesurée sur l'original). */
export const LIGNES = {
	actuelle: [0.113, 0.112, 0.486, 0.242],
	predite: [0.514, 0.112, 0.889, 0.244],
	optimiser: [0.113, 0.252, 0.887, 0.336],
	courbe: [0.111, 0.348, 0.887, 0.609],
	rang: [0.113, 0.627, 0.889, 0.7],
	chances: [0.113, 0.712, 0.486, 0.868],
	croissance: [0.514, 0.712, 0.887, 0.868],
} as const;
export type Ligne = keyof typeof LIGNES;

export type DashCam = {f: number; cx: number; cy: number; z: number; d: number; courbe: 'avant' | 'arriere'};
export type DashPop = {ligne: Ligne; a: number; d: number; fin: number; dFin: number; echelle: number};
export type DashFleche = {sens: 'bas' | 'haut'; x: number; pointe: number; a: number; d: number; fin: number; dFin: number};

/** Avancement 0 → 1 avec une vitesse qui passe de 1 à r (r < 1 : ralentit ; r > 1 : accélère), arrêt net. */
const profil = (t: number, r: number) => (t + ((r - 1) * t * t) / 2) / (1 + (r - 1) / 2);

const camera = (cams: DashCam[], f: number) => {
	let c = {cx: 0.5, cy: 0.5, z: 1};
	for (const k of cams) {
		if (f < k.f) break;
		const t = Math.min(1, (f - k.f) / k.d);
		const p = profil(t, k.courbe === 'avant' ? 0.6 : 1.65);
		c = {cx: c.cx + (k.cx - c.cx) * p, cy: c.cy + (k.cy - c.cy) * p, z: c.z * Math.pow(k.z / c.z, p)};
	}
	return c;
};

const echelleLigne = (pops: DashPop[], ligne: Ligne, f: number) => {
	let s = 1;
	for (const p of pops) {
		if (p.ligne !== ligne || f < p.a) continue;
		const monte = interpolate(f, [p.a, p.a + p.d], [0, 1], {extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)});
		const descend = interpolate(f, [p.fin, p.fin + p.dFin], [0, 1], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
			easing: Easing.inOut(Easing.quad),
		});
		s = 1 + (p.echelle - 1) * monte * (1 - descend);
	}
	return s;
};

const Bloc: React.FC<{ligne: Ligne; sx: number; fond?: string; children?: React.ReactNode; style?: React.CSSProperties}> = ({
	ligne,
	sx,
	fond = CARTE,
	children,
	style,
}) => {
	const [x0, y0, x1, y1] = LIGNES[ligne];
	return (
		<div
			style={{
				position: 'absolute',
				left: x0 * W,
				top: y0 * H,
				width: (x1 - x0) * W,
				height: (y1 - y0) * H,
				background: fond,
				borderRadius: 30,
				transform: `scaleX(${sx})`,
				overflow: 'hidden',
				...style,
			}}
		>
			<div style={{position: 'absolute', inset: 0, transform: `scaleX(${1 / sx})`}}>{children}</div>
		</div>
	);
};

const Jauge: React.FC<{pct: number}> = ({pct}) => (
	<div style={{position: 'absolute', left: 36, right: 36, bottom: 40, height: 18, borderRadius: 9, background: '#2c2c30'}}>
		<div style={{width: `${pct}%`, height: '100%', borderRadius: 9, background: `linear-gradient(90deg, ${OR}, ${OR2})`}} />
	</div>
);

const Courbe: React.FC<{d: DashData}> = ({d}) => {
	const [x0, y0, x1, y1] = LIGNES.courbe;
	const w = (x1 - x0) * W;
	const h = (y1 - y0) * H;
	const gx = 70;
	const gw = w - 120;
	const gy = 130;
	const gh = h - 230;
	const lo = Math.min(...d.courbe) - 3;
	const hi = Math.max(...d.courbe) + 2;
	const pts = d.courbe.map((v, i) => [gx + (gw * i) / (d.courbe.length - 1), gy + gh * (1 - (v - lo) / (hi - lo))]);
	const ligne = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
	const hl = pts[3];
	return (
		<svg width={w} height={h} style={{position: 'absolute', inset: 0}}>
			<defs>
				<linearGradient id="remplissage" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor={OR} stopOpacity={0.55} />
					<stop offset="1" stopColor={OR} stopOpacity={0.04} />
				</linearGradient>
			</defs>
			<text x={36} y={64} fill={GRIS} fontSize={30} fontWeight={600} fontFamily={FONT}>
				Taille / Âge
			</text>
			<path d={`${ligne} L${pts[pts.length - 1][0]} ${gy + gh} L${pts[0][0]} ${gy + gh} Z`} fill="url(#remplissage)" />
			<line x1={hl[0]} x2={hl[0]} y1={hl[1]} y2={gy + gh} stroke="#ffffff" strokeOpacity={0.35} strokeWidth={3} strokeDasharray="8 8" />
			<path d={ligne} stroke={OR} strokeWidth={7} fill="none" strokeLinejoin="round" />
			{pts.map((p, i) => (
				<circle key={i} cx={p[0]} cy={p[1]} r={i === 3 ? 16 : 10} fill={i === 3 ? '#fff' : OR} stroke={OR} strokeWidth={i === 3 ? 7 : 0} />
			))}
			<g transform={`translate(${hl[0]} ${hl[1] - 58})`}>
				<rect x={-62} y={-24} width={124} height={46} rx={12} fill={OR} />
				<text x={0} y={9} textAnchor="middle" fill="#fff" fontSize={26} fontWeight={700} fontFamily={FONT}>
					{d.bulle}
				</text>
			</g>
			{d.ages.map((a, i) => (
				<text key={i} x={gx + (gw * i) / (d.ages.length - 1)} y={gy + gh + 52} textAnchor="middle" fill={GRIS} fontSize={24} fontFamily={FONT}>
					{a}
				</text>
			))}
		</svg>
	);
};

const IconeRonde: React.FC<{x: number; children: React.ReactNode}> = ({x, children}) => (
	<div
		style={{
			position: 'absolute',
			left: x,
			top: 71,
			width: 100,
			height: 100,
			borderRadius: 50,
			background: CARTE,
			display: 'flex',
			alignItems: 'center',
			justifyContent: 'center',
		}}
	>
		{children}
	</div>
);

const Fleche: React.FC<{fl: DashFleche; f: number}> = ({fl, f}) => {
	if (f < fl.a || f > fl.fin + fl.dFin) return null;
	const L = 200;
	const bas = fl.sens === 'bas';
	const loin = bas ? -L - 40 : H + 40;
	const arrivee = interpolate(f, [fl.a, fl.a + fl.d], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	const depart = interpolate(f, [fl.fin, fl.fin + fl.dFin], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: Easing.in(Easing.cubic),
	});
	// Petit va-et-vient pendant qu'elle pointe (mesuré : ±2 % de l'écran).
	const vient = arrivee >= 1 && depart <= 0 ? Math.sin((f - fl.a - fl.d) / 4) * 14 : 0;
	const pointe = fl.pointe * H;
	const y = loin + (pointe - loin) * arrivee + (loin - pointe) * depart + vient * (bas ? -1 : 1);
	const x = fl.x * W;
	const s = bas ? 1 : -1;
	return (
		<svg width={W} height={H} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
			<g
				stroke="#e8202a"
				strokeWidth={11}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
				style={{filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))'}}
			>
				<line x1={x} x2={x} y1={y - s * L} y2={y - s * 4} />
				<polyline points={`${x - 26},${y - s * 34} ${x},${y} ${x + 26},${y - s * 34}`} />
			</g>
		</svg>
	);
};

export const DashboardGrandimi: React.FC<{
	d: DashData;
	cams: DashCam[];
	pops: DashPop[];
	fleches: DashFleche[];
	ballon?: {src: string; a: number; fin: number; chute?: boolean};
	revele?: number;
	/** Page ouverte dans Safari : barre d'état et barre d'adresse fixes en haut, page décalée dessous. */
	url?: string;
	/** logo : en-tête « GRANDIMI » + icône ; aucun : ni titre ni boutons (diapos format Taller). */
	entete?: 'logo' | 'aucun';
	/** Onglets du bas (le premier est l'onglet actif) ; sans eux : taille / croissance / quotidien. */
	onglets?: string[];
	/** Sans la barre d'état de la page (écran de téléphone : la barre Safari du dessus a déjà la sienne). */
	sansBarreEtat?: boolean;
}> = ({d, cams, pops, fleches, ballon, revele, url, entete, onglets, sansBarreEtat}) => {
	const cacheEtat = Boolean(url || entete || sansBarreEtat);
	const f = useCurrentFrame();
	const c = camera(cams, f);
	const sx = (l: Ligne) => echelleLigne(pops, l, f);
	const b = ballon && f >= ballon.a && f < ballon.fin ? ballon : null;
	// Ballon : apparaît, déborde d'une image (×1,25), se pose (mesuré : images 162-164).
	const bs = b ? (f - b.a === 1 ? 1.25 : 1) : 0;
	// chute : arrive du haut en 4 images avec flou de mouvement, petit rebond (référence p22-ref, 5,73-5,93 s).
	const g = b ? f - b.a : 0;
	const chuteY = b?.chute ? interpolate(g, [0, 4, 6, 8], [-0.62 * H, 0, -0.015 * H, 0], {extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)}) : 0;
	const chuteFlou = b?.chute && g < 4 ? 14 : 0;
	return (
		<AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
			<div
				style={{
					position: 'absolute',
					left: 0,
					top: 0,
					width: W,
					height: H,
					transformOrigin: '0 0',
					transform: `translateY(${url ? 150 : 0}px) translate(${W / 2}px, ${H / 2}px) scale(${c.z}) translate(${-c.cx * W}px, ${-c.cy * H}px)`,
					fontFamily: FONT,
					color: '#fff',
				}}
			>
				{/* Barre d'état (visible dans les zooms, comme sur l'enregistrement d'écran de l'original). */}
				<div style={{position: 'absolute', left: 140, top: 18, fontSize: 30, fontWeight: 700, opacity: cacheEtat ? 0 : 1}}>15:35</div>
				<div style={{position: 'absolute', right: 140, top: 22, display: cacheEtat ? 'none' : 'flex', gap: 10, alignItems: 'flex-end'}}>
					{[10, 15, 20, 25].map((h, i) => (
						<div key={i} style={{width: 6, height: h, borderRadius: 2, background: i < 3 ? '#fff' : '#666'}} />
					))}
					<div style={{width: 44, height: 22, borderRadius: 6, border: '3px solid #bbb', marginLeft: 10}}>
						<div style={{width: '70%', height: '100%', background: '#fff', borderRadius: 2}} />
					</div>
				</div>
				{/* En-tête */}
				{entete === 'aucun' ? null : entete === 'logo' ? (
					<div style={{position: 'absolute', left: 118, top: 84, display: 'flex', alignItems: 'center', gap: 22}}>
						<div style={{fontSize: 76, fontWeight: 900, letterSpacing: -2}}>GRANDIMI</div>
						<div
							style={{
								width: 88,
								height: 88,
								borderRadius: 22,
								background: `linear-gradient(135deg, ${OR} 0%, ${OR2} 100%)`,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'center',
							}}
						>
							<svg width={40} height={64} viewBox="0 0 70 110">
								<circle cx={35} cy={13} r={12} fill="#fff" />
								<path d="M17 30 H53 Q58 30 58 36 V66 H50 V106 H38 V72 H32 V106 H20 V66 H12 V36 Q12 30 17 30 Z" fill="#fff" />
							</svg>
						</div>
					</div>
				) : (
					<div style={{position: 'absolute', left: 122, top: 92, fontSize: 64, fontWeight: 800, letterSpacing: -1}}>Dernier rapport</div>
				)}
				{entete === 'aucun' ? null : (
				<>
				<IconeRonde x={741}>
					<svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
						<path d="M12 19V5M5 12l7-7 7 7" />
					</svg>
				</IconeRonde>
				<IconeRonde x={862}>
					<svg width={46} height={46} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.2}>
						<circle cx={12} cy={12} r={3.2} />
						<path
							d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"
							strokeLinecap="round"
						/>
					</svg>
				</IconeRonde>
				</>
				)}
				{/* Tailles */}
				<Bloc ligne="actuelle" sx={sx('actuelle')}>
					<div style={{position: 'absolute', left: 40, top: 52, fontSize: 32, color: GRIS, fontWeight: 600}}>Taille actuelle</div>
					<div style={{position: 'absolute', left: 40, top: 112, fontSize: 76, fontWeight: 800, letterSpacing: -1}}>{d.actuelle}</div>
				</Bloc>
				<Bloc ligne="predite" sx={sx('predite')} fond={`linear-gradient(135deg, ${OR} 0%, ${OR2} 100%)`}>
					<div style={{position: 'absolute', left: 40, top: 52, fontSize: 32, color: 'rgba(255,255,255,0.88)', fontWeight: 600}}>Taille prédite</div>
					{revele !== undefined && f < revele ? (
						<div
							style={{
								position: 'absolute',
								left: 40,
								top: 112,
								fontSize: 76,
								fontWeight: 800,
								letterSpacing: 2,
								transform: `translateX(${Math.sin(f * 1.7) * 3}px)`,
							}}
						>
							??? cm
						</div>
					) : (
						<div
							style={{
								position: 'absolute',
								left: 40,
								top: 112,
								fontSize: 76,
								fontWeight: 800,
								letterSpacing: -1,
								transformOrigin: '0% 50%',
								transform: `scale(${revele !== undefined && f >= revele ? 1 + 0.25 * Math.max(0, 1 - (f - revele) / 6) : 1})`,
							}}
						>
							{d.predite}
						</div>
					)}
				</Bloc>
				<Bloc ligne="optimiser" sx={sx('optimiser')}>
					<div
						style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, fontWeight: 700}}
					>
						<div style={{whiteSpace: 'nowrap'}}>
							Optimise jusqu'à <span style={{color: OR}}>{d.optimiser}</span> 🧬📈
						</div>
					</div>
				</Bloc>
				<Bloc ligne="courbe" sx={sx('courbe')}>
					<Courbe d={d} />
				</Bloc>
				<Bloc ligne="rang" sx={sx('rang')}>
					<div
						style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 33, fontWeight: 700}}
					>
						<div style={{whiteSpace: 'nowrap'}}>
							Plus grand que <span style={{color: OR}}>{d.rang}</span> des jeunes de ton âge 🌍
						</div>
					</div>
				</Bloc>
				<Bloc ligne="chances" sx={sx('chances')}>
					<div style={{position: 'absolute', left: 36, top: 44, fontSize: 30, color: GRIS, fontWeight: 600}}>Chances taille de rêve</div>
					<div style={{position: 'absolute', left: 36, top: 104, fontSize: 76, fontWeight: 800}}>
						{d.chances}
						<span style={{fontSize: 28, color: GRIS, fontWeight: 600, marginLeft: 12}}>({d.chancesCm})</span>
					</div>
					<Jauge pct={parseFloat(d.chances.replace(',', '.'))} />
				</Bloc>
				<Bloc ligne="croissance" sx={sx('croissance')}>
					<div style={{position: 'absolute', left: 36, top: 44, fontSize: 30, color: GRIS, fontWeight: 600}}>Croissance accomplie</div>
					<div style={{position: 'absolute', left: 36, top: 104, fontSize: 76, fontWeight: 800}}>{d.croissance}</div>
					<Jauge pct={parseFloat(d.croissance.replace(',', '.'))} />
				</Bloc>
				{/* Barre de navigation */}
				{onglets ? null : (
					[
						['taille', 0.21, true],
						['croissance', 0.5, false],
						['quotidien', 0.79, false],
					].map(([nom, x, actif]) => (
						<div
							key={nom as string}
							style={{position: 'absolute', left: (x as number) * W - 90, top: 1735, width: 180, textAlign: 'center', color: actif ? OR : '#8a8a8f'}}
						>
							<div style={{fontSize: 46, lineHeight: 1}}>{nom === 'taille' ? '📏' : nom === 'croissance' ? '📈' : '📅'}</div>
							<div style={{fontSize: 22, fontWeight: 600, marginTop: 10}}>{nom as string}</div>
						</div>
					))
				)}
				<div style={{position: 'absolute', left: W / 2 - 130, top: 1880, width: 260, height: 10, borderRadius: 5, background: '#fff'}} />
				{b ? (
					<Img
						src={b.src}
						style={{
							position: 'absolute',
							left: 0.14 * W,
							top: 0.36 * H,
							width: 0.69 * W,
							height: 0.26 * H,
							objectFit: 'contain',
							transform: b.chute ? `translateY(${chuteY}px)` : `scale(${bs})`,
							filter: chuteFlou ? `blur(${chuteFlou}px)` : undefined,
						}}
					/>
				) : null}
				{fleches.map((fl, i) => (
					<Fleche key={i} fl={fl} f={f} />
				))}
			</div>
			{/* Onglets fixes en bas de l'écran (hors du zoom), comme une vraie appli */}
			{onglets?.length ? <BarreOnglets onglets={onglets} actif={0} /> : null}
			{url ? <BarreSafari url={url} /> : null}
		</AbsoluteFill>
	);
};

const ICONES_ONGLETS: Record<string, string> = {Rapport: '📊', Programme: '📋', Exercices: '🏋️', Routine: '✅', Nutrition: '🥗'};

/** Barre d'onglets du bas de l'appli (Rapport, Programme, Exercices, Routine…) : montre ce que contient le site. */
export const BarreOnglets: React.FC<{onglets: string[]; actif: number}> = ({onglets, actif}) => (
	<div style={{position: 'absolute', left: 0, top: 1705, width: W, height: 215, background: '#0b0b0b', borderTop: '2px solid #1f1f1f', fontFamily: FONT}}>
		{onglets.map((nom, i) => (
			<div key={nom} style={{position: 'absolute', left: ((i + 0.5) / onglets.length) * W - 120, top: 28, width: 240, textAlign: 'center', color: i === actif ? OR : '#9a9aa0'}}>
				<div style={{fontSize: 50, lineHeight: 1}}>{ICONES_ONGLETS[nom] ?? '•'}</div>
				<div style={{fontSize: 28, fontWeight: 700, marginTop: 12}}>{nom}</div>
			</div>
		))}
		<div style={{position: 'absolute', left: W / 2 - 130, top: 178, width: 260, height: 10, borderRadius: 5, background: '#fff'}} />
	</div>
);

/** Barre d'état + barre d'adresse Safari (« comme si on était sur le site »), 1080 × 172 px en haut de l'écran. */
export const BarreSafari: React.FC<{url: string}> = ({url}) => (
	<div style={{position: 'absolute', left: 0, top: 0, width: W, height: 172, background: '#000', fontFamily: FONT, color: '#fff'}}>
			<div style={{position: 'absolute', left: 70, top: 14, fontSize: 32, fontWeight: 700}}>15:35</div>
			<div style={{position: 'absolute', right: 70, top: 20, display: 'flex', gap: 8, alignItems: 'flex-end'}}>
				{[10, 15, 20, 25].map((h, i) => (
					<div key={i} style={{width: 6, height: h, borderRadius: 2, background: '#fff'}} />
				))}
				<div style={{fontSize: 24, fontWeight: 700, marginLeft: 8}}>5G</div>
				<div style={{width: 46, height: 22, borderRadius: 6, border: '3px solid #bbb', marginLeft: 6}}>
					<div style={{width: '75%', height: '100%', background: '#fff', borderRadius: 2}} />
				</div>
			</div>
			<div
				style={{
					position: 'absolute',
					left: 36,
					right: 36,
					top: 66,
					height: 86,
					borderRadius: 28,
					background: '#2c2c2e',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
				}}
			>
				<div style={{position: 'absolute', left: 30, fontSize: 30, fontWeight: 600, color: '#ddd'}}>
					<span style={{fontSize: 22}}>A</span>A
				</div>
				<svg width={22} height={28} viewBox="0 0 22 28" style={{marginRight: 12}}>
					<rect x={2} y={12} width={18} height={14} rx={3} fill="#ddd" />
					<path d="M6 12 V8 a5 5 0 0 1 10 0 V12" fill="none" stroke="#ddd" strokeWidth={3} />
				</svg>
				<div style={{fontSize: 36, fontWeight: 500}}>{url}</div>
				<svg width={34} height={34} viewBox="0 0 24 24" style={{position: 'absolute', right: 30}} fill="none" stroke="#ddd" strokeWidth={2.4} strokeLinecap="round">
					<path d="M20 12a8 8 0 1 1-2.3-5.7" />
					<path d="M20 4v5h-5" />
				</svg>
			</div>
		</div>
);
