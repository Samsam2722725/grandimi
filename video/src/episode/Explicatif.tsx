import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';

/*
 * Vidéo « explicative » recopiée de la référence p25-ref (36 s, mur gris chaud, bonshommes-gélules) :
 * en-tête (« ▪ RÉPONSE »), phrase qui s'écrit mot par mot en haut à gauche (mots-clés en gras noir),
 * bonshommes à l'échelle posés sur un sol carrelé, pastilles de taille au-dessus des têtes, noms en dessous.
 * Cinq scènes : la question, Michael Jordan (Letterman, le livreur de lait), la science (grands-parents,
 * gènes non utilisés, le bon mélange), sa fourchette (prédiction Grandimi), à toi (envoie, commente).
 * Toutes les mesures (positions, tailles, polices, couleurs) viennent de l'original, ramené en 1080 × 1920.
 * Tous les moments sont des numéros d'image (absolus) calculés depuis la voix ; t[nom] dans `ancres`.
 */
const W = 1080;
const ROUGE = '#c02c26';
const NOIR = '#111111';
const SOMBRE = '#2d2a28';
const TEXTE_GRIS = '#8b8885';
const NOM = '#3a3532';
const GRIS_MERE = '#8f8a87';
const GRIS_PERE = '#76716c';
const GRIS_LAITIER = '#8f8f97';
const LIGNE_CLAIRE = '#c8c4c0';
const TITRE = "'Anton', 'Barlow Condensed', sans-serif";

export type MotExplicatif = {w: string; f: number; gras?: boolean};
export type PhraseExplicatif = {titre: string; de: number; a: number; mots: MotExplicatif[]};

const ressort = (f: number, at: number, k = 190, d = 14) => (f < at ? 0 : spring({frame: f - at, fps: 30, config: {damping: d, stiffness: k, mass: 0.6}}));
const fondu = (f: number, at: number, d = 6) => interpolate(f, [at, at + d], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
const deg = (a: number) => (a * Math.PI) / 180;

/** Bras en deux segments (épaule → coude → main), angles mesurés depuis la verticale vers le bas, positifs vers la droite. */
const Bras: React.FC<{a1: number; a2: number; couleur: string; leve: number}> = ({a1, a2, couleur, leve}) => {
	const S = {x: 0.046, y: 0.165};
	const E = {x: S.x + 0.17 * Math.sin(deg(a1)), y: S.y + 0.17 * Math.cos(deg(a1))};
	const H = {x: E.x + 0.175 * Math.sin(deg(a2)), y: E.y + 0.175 * Math.cos(deg(a2))};
	return (
		<g>
			<path d={`M${S.x},${S.y} L${E.x},${E.y} L${H.x},${H.y}`} stroke={couleur} strokeWidth={0.058} strokeLinecap="round" strokeLinejoin="round" fill="none" />
			<circle cx={H.x} cy={H.y} r={0.038 + 0.012 * leve} fill={couleur} />
		</g>
	);
};

/**
 * Bonhomme-gélule de l'original, en unités de hauteur (0 = haut de la tête, 1 = bas des pieds, x = 0 au centre de la tête) :
 * tête ronde collée au tronc évasé aux épaules, jambe avant, jambe et bras arrière plus clairs, main en boule
 * sur la hanche, pied avant en gélule tourné vers la droite. Visage « content » (lui) ou « neutre » (les autres).
 * bras : 0 = le long du corps, 1 = levé ; brasArr : 0 = caché, 1 = sorti à l'horizontale (« comment ? »).
 */
const Bonhomme: React.FC<{
	x: number;
	sol: number;
	h: number;
	couleur: string;
	pieds?: string;
	visage?: 'content' | 'neutre';
	chignon?: boolean;
	bras?: number;
	pose?: [number, number];
	brasArr?: number;
	num?: string;
	bouteille?: boolean;
	opacite?: number;
	anneau?: number;
	point?: number;
	points2?: number;
	ombre?: boolean;
}> = ({x, sol, h, couleur, pieds, visage = 'neutre', chignon, bras = 0, pose = [140, 155], brasArr = 0, num, bouteille, opacite = 1, anneau = 0, point = 0, points2 = 0, ombre = true}) => {
	if (h < 4) return null;
	const pied = pieds ?? couleur;
	const r = 0.072;
	const bl = '#fff';
	const a1 = pose[0] * bras;
	const a2 = pose[1] * bras;
	const b1 = 40 * brasArr;
	const b2 = 88 * brasArr;
	return (
		<g opacity={opacite}>
			{ombre ? <ellipse cx={x + 0.03 * h} cy={sol - 0.012 * h} rx={0.2 * h} ry={0.022 * h} fill="#dcd8d3" /> : null}
			<g transform={`translate(${x} ${sol - h}) scale(${h})`}>
				{/* membres arrière, plus clairs */}
				<g opacity={0.62}>
					<path d="M-0.054,0.47 L0.036,0.47 L0.02,0.95 L-0.074,0.95 Z" fill={couleur} />
					<rect x={-0.066} y={0.925} width={0.14} height={0.075} rx={0.0375} fill={pied} />
					{brasArr > 0.01 ? <Bras a1={b1} a2={b2} couleur={couleur} leve={brasArr} /> : null}
				</g>
				{/* jambe avant */}
				<path d="M-0.046,0.47 L0.06,0.47 L0.064,0.95 L-0.03,0.95 Z" fill={couleur} />
				<rect x={-0.017} y={0.925} width={0.14} height={0.075} rx={0.0375} fill={pied} />
				{/* tronc et tête */}
				<path d="M-0.088,0.158 Q-0.088,0.112 -0.045,0.112 L0.047,0.112 Q0.09,0.112 0.09,0.158 L0.066,0.5 Q0.004,0.512 -0.06,0.5 Z" fill={couleur} />
				<circle cx={0} cy={r} r={r} fill={couleur} />
				{chignon ? <circle cx={-0.068} cy={0.024} r={0.035} fill={couleur} /> : null}
				{bouteille ? (
					<g>
						<rect x={-0.098} y={0.395} width={0.04} height={0.085} rx={0.008} fill="#fff" stroke="#333" strokeWidth={0.005} />
						<rect x={-0.09} y={0.383} width={0.024} height={0.014} fill="#333" />
					</g>
				) : null}
				{/* bras avant (au repos, seule la main dépasse sur la hanche) */}
				<Bras a1={a1} a2={a2} couleur={couleur} leve={bras} />
				{anneau > 0 ? <circle cx={0} cy={0.24} r={0.047 * anneau} fill="none" stroke={ROUGE} strokeWidth={0.01} /> : null}
				{point > 0 ? <circle cx={0} cy={0.24} r={0.047 * point} fill={ROUGE} /> : null}
				{points2 > 0 ? (
					<>
						<circle cx={-0.035} cy={0.235} r={0.03 * points2} fill={ROUGE} />
						<circle cx={0.035} cy={0.235} r={0.03 * points2} fill={ROUGE} />
					</>
				) : null}
				{/* visage, décalé vers la droite comme dans l'original */}
				{visage === 'content' ? (
					<g stroke={bl} strokeWidth={0.07 * r} strokeLinecap="round" fill="none">
						<line x1={-0.21 * r} x2={0.03 * r} y1={r - 0.46 * r} y2={r - 0.46 * r} />
						<line x1={0.46 * r} x2={0.7 * r} y1={r - 0.46 * r} y2={r - 0.46 * r} />
						<path d={`M${-0.15 * r},${r - 0.13 * r} Q${-0.03 * r},${r - 0.24 * r} ${0.09 * r},${r - 0.13 * r}`} />
						<path d={`M${0.45 * r},${r - 0.13 * r} Q${0.57 * r},${r - 0.24 * r} ${0.69 * r},${r - 0.13 * r}`} />
						<path d={`M${0.02 * r},${r + 0.36 * r} Q${0.26 * r},${r + 0.56 * r} ${0.5 * r},${r + 0.36 * r}`} strokeWidth={0.08 * r} />
					</g>
				) : (
					<g>
						<g stroke={bl} strokeWidth={0.06 * r} strokeLinecap="round">
							<line x1={-0.2 * r} x2={0.03 * r} y1={r - 0.5 * r} y2={r - 0.5 * r} />
							<line x1={0.47 * r} x2={0.72 * r} y1={r - 0.5 * r} y2={r - 0.5 * r} />
							<line x1={0.13 * r} x2={0.39 * r} y1={r + 0.33 * r} y2={r + 0.33 * r} />
						</g>
						<circle cx={-0.04 * r} cy={r - 0.18 * r} r={(chignon ? 0.1 : 0.13) * r} fill={bl} />
						<circle cx={0.54 * r} cy={r - 0.18 * r} r={(chignon ? 0.1 : 0.13) * r} fill={bl} />
					</g>
				)}
			</g>
			{num ? (
				<text x={x + 0.004 * h} y={sol - h + 0.29 * h} textAnchor="middle" fill="#fff" fontFamily={TITRE} fontSize={0.072 * h}>
					{num}
				</text>
			) : null}
		</g>
	);
};

/** Pastille arrondie (taille au-dessus d'une tête, légendes) : Inter 800 28 px, 12 × 20 px de marge, comme l'original. */
const Pastille: React.FC<{x: number; y: number; texte: string; fond?: string; taille?: number; marge?: [number, number]; f: number; at: number}> = ({
	x,
	y,
	texte,
	fond = SOMBRE,
	taille = 28,
	marge,
	f,
	at,
}) => {
	if (f < at) return null;
	const s = ressort(f, at, 260, 12);
	return (
		<div style={{position: 'absolute', left: x - 500, width: 1000, top: y, display: 'flex', justifyContent: 'center', transform: `scale(${s})`, transformOrigin: '50% 50%'}}>
			<div
				style={{
					background: fond,
					color: '#fff',
					borderRadius: taille * 2,
					padding: marge ? `${marge[0]}px ${marge[1]}px` : `${taille * 0.43}px ${taille * 0.72}px`,
					fontFamily: FONT,
					fontWeight: 800,
					fontSize: taille,
					lineHeight: 1.2,
					whiteSpace: 'nowrap',
				}}
			>
				{texte}
			</div>
		</div>
	);
};

/** Bulle de dialogue blanche à contour noir et petite queue en bas (« le livreur de lait… »). */
const Bulle: React.FC<{x: number; y: number; texte: string; f: number; at: number}> = ({x, y, texte, f, at}) => {
	if (f < at) return null;
	const s = ressort(f, at, 260, 12);
	return (
		<div style={{position: 'absolute', left: x - 500, width: 1000, top: y, display: 'flex', justifyContent: 'center', transform: `scale(${s})`}}>
			<div
				style={{
					position: 'relative',
					background: '#fff',
					border: `3px solid ${NOIR}`,
					borderRadius: 18,
					padding: '26px 34px',
					fontFamily: FONT,
					fontWeight: 700,
					fontSize: 26,
					lineHeight: 1.2,
					color: NOIR,
					whiteSpace: 'nowrap',
					boxShadow: '0 6px 14px rgba(0,0,0,0.12)',
				}}
			>
				{texte}
				<div style={{position: 'absolute', left: '50%', bottom: -14, width: 24, height: 24, background: '#fff', borderRight: `3px solid ${NOIR}`, borderBottom: `3px solid ${NOIR}`, transform: 'translateX(-50%) rotate(45deg)'}} />
			</div>
		</div>
	);
};

const Nom: React.FC<{x: number; y: number; texte: string; couleur?: string; taille?: number; f: number; at?: number}> = ({x, y, texte, couleur = NOM, taille = 25, f, at = 0}) =>
	f < at ? null : (
		<div style={{position: 'absolute', left: x - 300, width: 600, top: y, textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: taille, lineHeight: 1, color: couleur, opacity: at <= 0 ? 1 : fondu(f, at, 5)}}>
			{texte}
		</div>
	);

/** Sol : ligne noire coupée par les ombres, carrelage clair en perspective dessous. */
const Sol: React.FC<{y: number}> = ({y}) => (
	<svg width={W} height={1920} style={{position: 'absolute', inset: 0}}>
		<rect x={0} y={y} width={W} height={1920 - y} fill="url(#carrelage)" />
		<defs>
			<linearGradient id="carrelage" x1="0" x2="0" y1="0" y2="1">
				<stop offset="0" stopColor="#dbd6d1" />
				<stop offset="1" stopColor="#c9c4bf" />
			</linearGradient>
		</defs>
		{Array.from({length: 15}, (_, i) => (
			<line key={i} x1={540 + (i - 7) * 150} x2={540 + (i - 7) * 420} y1={y} y2={1920} stroke="#cdc8c3" strokeWidth={2} />
		))}
		{[0.06, 0.15, 0.27, 0.43, 0.64, 0.9].map((k) => (
			<line key={k} x1={0} x2={W} y1={y + k * (1920 - y)} y2={y + k * (1920 - y)} stroke="#cdc8c3" strokeWidth={2} />
		))}
		<line x1={0} x2={W} y1={y} y2={y} stroke={NOIR} strokeWidth={4} />
	</svg>
);

/** debut : image absolue où commence le plan (les moments de `t` et des phrases sont absolus) ; fin : dernière image de la vidéo. */
export const Explicatif: React.FC<{phrases: PhraseExplicatif[]; t: Record<string, number>; v: Record<string, string>; fin: number; debut?: number}> = ({
	phrases,
	t,
	v,
	fin,
	debut = 0,
}) => {
	const f = useCurrentFrame() + debut;
	const bornes = [0, t.mj, t.sci, t.range, t.send, fin];
	const sceneDe = (g: number) => (g < t.mj ? 1 : g < t.sci ? 2 : g < t.range ? 3 : g < t.send ? 4 : 5);
	const scene = sceneDe(f);
	const ph = phrases.filter((p) => f >= p.de && f < p.a).pop();
	// L'en-tête est là dès la première image, avant le premier mot (comme l'original).
	const entete = (ph ?? phrases.find((p) => p.de > f) ?? phrases[phrases.length - 1])?.titre;

	/** Contenu d'une scène à l'image g (zoom lent continu compris, comme l'original : ≈ 5 % par scène autour de (540, 1186)). */
	const rendre = (sc: number, g: number): React.ReactNode => {
		const zoom = 1 + 0.05 * Math.min(1, (g - bornes[sc - 1]) / Math.max(1, bornes[sc] - bornes[sc - 1]));
		let contenu: React.ReactNode = null;
		let sol = 1521;
		if (sc === 1) {
			const K = 2.84; // pixels par cm
			const S1 = 1531;
			const leve = ressort(g, t.how, 150, 13);
			const yLui = S1 - 185 * K;
			contenu = (
				<>
					<div style={{position: 'absolute', left: 0, right: 0, top: 388, textAlign: 'center'}}>
						<div style={{fontFamily: TITRE, fontSize: 82, lineHeight: 1, color: ROUGE, wordSpacing: -6, transform: 'scaleX(1.25)'}}>COMMENT IL FAIT {v.lui.toUpperCase()} ?</div>
					</div>
					<div style={{position: 'absolute', left: 0, right: 0, top: 494, textAlign: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 35, lineHeight: 1, color: NOIR}}>
						MÈRE {v.mere.toUpperCase()} · PÈRE {v.pere.toUpperCase()} · IL A {v.age} ANS
					</div>
					<svg width={W} height={1920} style={{position: 'absolute', inset: 0}}>
						{g >= t.lui ? <line x1={322} x2={862} y1={yLui - 10} y2={yLui - 10} stroke={ROUGE} strokeWidth={3} strokeDasharray="12 7" opacity={fondu(g, t.lui, 8)} /> : null}
						<Bonhomme x={178} sol={S1} h={168 * K} couleur={GRIS_MERE} chignon />
						<Bonhomme x={388} sol={S1} h={178 * K} couleur={GRIS_PERE} />
						<Bonhomme x={719} sol={S1} h={185 * K} couleur={NOIR} pieds={ROUGE} visage="content" bras={leve} brasArr={leve} />
					</svg>
					<Pastille x={176} y={S1 - 168 * K - 114} texte={v.mere} f={g} at={t.mere} />
					<Pastille x={388} y={S1 - 178 * K - 114} texte={v.pere} f={g} at={t.pere} />
					<Pastille x={719} y={S1 - 185 * K - 114} texte={v.lui} fond={ROUGE} f={g} at={t.lui} />
					<Pastille x={910} y={yLui - 10 - 29} texte={v.ecart} fond={ROUGE} f={g} at={t.lui + 6} />
					<Nom x={178} y={1555} texte="MÈRE" f={g} />
					<Nom x={388} y={1555} texte="PÈRE" f={g} />
					<Nom x={719} y={1555} texte={`LUI · ${v.age}`} f={g} />
				</>
			);
		} else if (sc === 2) {
			const K = 2.67;
			const S2 = 1527;
			sol = 1516;
			const entre = interpolate(g, [t.livreur - 12, t.livreur + 6], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
			contenu = (
				<>
					<svg width={W} height={1920} style={{position: 'absolute', inset: 0}}>
						<Bonhomme x={152} sol={S2} h={178 * K} couleur={GRIS_PERE} />
						<Bonhomme x={337} sol={S2} h={165 * K} couleur={GRIS_MERE} chignon />
						<Bonhomme x={561} sol={S2} h={198 * K} couleur={ROUGE} pieds={NOIR} num="23" />
						{g >= t.livreur - 12 ? <Bonhomme x={878 + 380 * entre * entre} sol={S2} h={201 * K} couleur={GRIS_LAITIER} bouteille /> : null}
					</svg>
					<Pastille x={152} y={S2 - 178 * K - 114} texte={v.mjPere} f={g} at={t.mjPere} />
					<Pastille x={337} y={S2 - 165 * K - 114} texte={v.mjMere} f={g} at={t.mjMere} />
					<Pastille x={561} y={S2 - 198 * K - 114} texte={v.mj} fond={ROUGE} f={g} at={t.mjTaille} />
					<Pastille x={540} y={443} texte="LETTERMAN · 1989" fond={NOIR} taille={30} f={g} at={t.letterman} />
					<Bulle x={540} y={548} texte={`« le livreur de lait fait environ ${v.livreur} »`} f={g} at={t.livreur} />
					<Pastille x={540} y={712} texte="IL PLAISANTAIT" fond={ROUGE} f={g} at={t.blague} />
					<Pastille x={878} y={S2 - 201 * K - 114} texte={`LIVREUR ${v.livreur}`} f={g} at={t.blague} />
					<Nom x={152} y={1551} texte="PÈRE" f={g} />
					<Nom x={337} y={1551} texte="MÈRE" f={g} />
					<Nom x={561} y={1551} texte="MICHAEL JORDAN" couleur={ROUGE} f={g} />
				</>
			);
		} else if (sc === 3) {
			const KP = 1.81; // parents, sur leur estrade
			const P = 1257;
			const GP = 866; // estrades des grands-parents
			const SL = 1621;
			sol = 1616;
			const gp = ressort(g, t.grandsParents, 150, 13);
			const vol = interpolate(g, [t.chance, t.chance + 12], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
			const leve = ressort(g, t.chance + 12, 150, 13);
			const anneau = (d: number) => (g >= t.gene + d ? ressort(g, t.gene + d, 220, 12) : 0);
			contenu = (
				<>
					<svg width={W} height={1920} style={{position: 'absolute', inset: 0}}>
						<line x1={292} x2={790} y1={P} y2={P} stroke={LIGNE_CLAIRE} strokeWidth={3} />
						<line x1={540} x2={540} y1={P} y2={1170} stroke={LIGNE_CLAIRE} strokeWidth={3} />
						{gp > 0.01 ? (
							<g opacity={Math.min(1, gp)}>
								<line x1={128} x2={315} y1={GP} y2={GP} stroke={LIGNE_CLAIRE} strokeWidth={3} />
								<line x1={225} x2={292} y1={GP} y2={888} stroke={LIGNE_CLAIRE} strokeWidth={3} />
								<line x1={768} x2={955} y1={GP} y2={GP} stroke={LIGNE_CLAIRE} strokeWidth={3} />
								<line x1={855} x2={788} y1={GP} y2={888} stroke={LIGNE_CLAIRE} strokeWidth={3} />
								<Bonhomme x={128} sol={855} h={221} couleur={GRIS_PERE} />
								<Bonhomme x={311} sol={855} h={255} couleur={GRIS_PERE} point={1} />
								<Bonhomme x={768} sol={855} h={255} couleur={GRIS_PERE} point={1} />
								<Bonhomme x={953} sol={855} h={221} couleur={GRIS_PERE} />
							</g>
						) : null}
						<Bonhomme x={292} sol={P - 9} h={178 * KP} couleur={GRIS_PERE} anneau={anneau(0)} />
						<Bonhomme x={790} sol={P - 9} h={168 * KP} couleur={GRIS_PERE} chignon anneau={anneau(4)} />
						<Bonhomme x={539} sol={SL} h={393} couleur={NOIR} pieds={ROUGE} visage="content" bras={leve} points2={vol >= 1 ? 1 : 0} />
					</svg>
					{gp > 0.01 ? <Nom x={540} y={674} texte="GRANDS-PARENTS" taille={24} f={g} at={t.grandsParents} /> : null}
					<Nom x={292} y={1280} texte="PÈRE" taille={21} f={g} />
					<Nom x={790} y={1280} texte="MÈRE" taille={21} f={g} />
					<Pastille x={540} y={1027} texte="GÈNES DE GRANDE TAILLE NON UTILISÉS" fond={NOIR} f={g} at={t.gene} />
					<Pastille x={540} y={1127} texte="LE BON MÉLANGE" fond={ROUGE} f={g} at={t.chance} />
					{/* gènes qui descendent des parents vers lui, au-dessus des pastilles */}
					<svg width={W} height={1920} style={{position: 'absolute', inset: 0}}>
						{g >= t.chance && vol < 1 ? (
							<>
								<circle cx={interpolate(vol, [0, 1], [292, 539 - 0.035 * 393])} cy={interpolate(vol, [0, 1], [P - 9 - 178 * KP + 0.24 * 178 * KP, SL - 393 + 0.235 * 393])} r={12} fill={ROUGE} />
								<circle cx={interpolate(vol, [0, 1], [790, 539 + 0.035 * 393])} cy={interpolate(vol, [0, 1], [P - 9 - 168 * KP + 0.24 * 168 * KP, SL - 393 + 0.235 * 393])} r={12} fill={ROUGE} />
							</>
						) : null}
					</svg>
				</>
			);
		} else if (sc === 4) {
			const K = 3.07;
			const S4 = 1533;
			sol = 1522;
			contenu = (
				<>
					<svg width={W} height={1920} style={{position: 'absolute', inset: 0}}>
						<Bonhomme x={189} sol={S4} h={178 * K} couleur={GRIS_PERE} />
						<Bonhomme x={540} sol={S4} h={185 * K} couleur={NOIR} pieds={ROUGE} visage="content" />
						<Bonhomme x={897} sol={S4} h={168 * K} couleur={GRIS_MERE} chignon />
					</svg>
					<Pastille x={540} y={S4 - 185 * K - 98} texte={`LUI · ${v.lui} À ${v.age} ANS`} fond={NOIR} f={g} at={t.range + 4} />
					<Pastille x={540} y={S4 - 185 * K - 168} texte={`GRANDIMI : ${v.prevue}`} fond={ROUGE} taille={24} f={g} at={t.prevue} />
					<Nom x={189} y={1554} texte={`PÈRE ${v.pere}`} taille={27} f={g} />
					<Nom x={897} y={1554} texte={`MÈRE ${v.mere}`} taille={27} f={g} />
				</>
			);
		} else {
			const S5 = 1528;
			sol = 1519;
			const leve = 0.97 + 0.03 * Math.sin((g - t.send) / 7);
			const commentaire = v.commentaire;
			const n = g < t.ecris ? 0 : Math.min(commentaire.length, Math.floor((g - t.ecris) / 2.2));
			const monte = g >= t.ecris ? ressort(g, t.ecris, 200, 16) : 0;
			contenu = (
				<>
					<svg width={W} height={1920} style={{position: 'absolute', inset: 0}}>
						<Bonhomme x={540} sol={S5} h={185 * 1.95} couleur={NOIR} pieds={ROUGE} visage="content" bras={leve} pose={[168, 178]} />
					</svg>
					<Pastille x={540} y={478 - 12 * monte} texte="ENVOIE ÇA" fond={ROUGE} taille={40} marge={[8, 44]} f={g} at={t.send + 2} />
					<Pastille x={540} y={570 - 12 * monte} texte="AU POTE PLUS GRAND QUE SON PÈRE" fond={NOIR} taille={26} marge={[15, 38]} f={g} at={t.pote} />
					{g >= t.ecris ? (
						<div
							style={{
								position: 'absolute',
								left: 129,
								width: 825,
								top: 684,
								height: 120,
								boxSizing: 'border-box',
								borderRadius: 20,
								border: `3px solid ${NOIR}`,
								background: '#fff',
								fontFamily: FONT,
								fontWeight: 600,
								fontSize: 38,
								color: NOIR,
								lineHeight: '114px',
								paddingLeft: 40,
								transform: `scale(${ressort(g, t.ecris, 240, 14)})`,
								boxShadow: '0 8px 18px rgba(0,0,0,0.12)',
							}}
						>
							{commentaire.slice(0, n)}
							{Math.floor(g / 8) % 2 ? '|' : ''}
						</div>
					) : null}
					<Pastille x={540} y={872} texte="🔗 GRANDIMI.COM" fond={ROUGE} taille={28} f={g} at={t.site} />
				</>
			);
		}
		return (
			<AbsoluteFill style={{transform: `scale(${zoom})`, transformOrigin: '540px 1186px'}}>
				<Sol y={sol} />
				{contenu}
			</AbsoluteFill>
		);
	};

	// Changement de scène : fondu enchaîné de 5 images, comme l'original.
	const debutScene = bornes[scene - 1];
	const fonduScene = scene > 1 && f < debutScene + 5 && debutScene - debut >= 5 ? 1 - (f - debutScene) / 5 : 0;

	return (
		<AbsoluteFill style={{background: 'radial-gradient(ellipse 72% 62% at 50% 50%, #f3f1ed 0%, #eeece8 45%, #dcdad6 82%, #c3c1bd 100%)', overflow: 'hidden'}}>
			{rendre(scene, f)}
			{fonduScene > 0 ? <AbsoluteFill style={{opacity: fonduScene}}>{rendre(scene - 1, debutScene - 1)}</AbsoluteFill> : null}
			{/* barre de progression rouge en haut, sur un rail gris */}
			<div style={{position: 'absolute', left: 0, top: 0, height: 8, width: W, background: 'rgba(120,110,105,0.28)'}} />
			<div style={{position: 'absolute', left: 0, top: 0, height: 8, width: (W * f) / fin, background: ROUGE}} />
			{/* en-tête + phrase écrite mot par mot */}
			{entete ? (
				<div style={{position: 'absolute', left: 110, right: 90, top: 232, fontFamily: FONT}}>
					<div style={{display: 'flex', alignItems: 'center', fontSize: 25, lineHeight: 1, fontWeight: 600, letterSpacing: 9, color: '#5f5a56'}}>
						<div style={{width: 10, height: 10, background: ROUGE, marginRight: 18}} />
						{entete}
					</div>
					<div style={{marginTop: 3, fontSize: 56, lineHeight: 1.45, color: TEXTE_GRIS, fontWeight: 500, letterSpacing: -0.3}}>
						{(ph?.mots ?? []).map((m, i) =>
							f >= m.f ? (
								<span key={i} style={{color: m.gras ? NOIR : TEXTE_GRIS, fontWeight: m.gras ? 700 : 500, opacity: fondu(f, m.f, 3)}}>
									{m.w}{' '}
								</span>
							) : null,
						)}
					</div>
				</div>
			) : null}
		</AbsoluteFill>
	);
};
