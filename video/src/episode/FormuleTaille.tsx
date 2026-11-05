import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {ease} from '../anim';
import {FONT} from '../theme';
import {BLEU, BLEU_CLAIR, Bonhomme, bosse, Eclats, ENCRE, Fond, ORANGE, ressort, secousse} from './HookTaille';

/*
 * Suite dessinée de l'accroche bonhomme : « Il va falloir que tu prennes la taille de ta mère… divise par 2…
 * simple estimation… rends-toi sur grandimi.com ». Copie de la référence 7593430123248979222 (5,2-18,5 s),
 * positions mesurées en 1080 × 1920. Plans : parents + barres → carte de calcul → calculatrice → chute et
 * gros plan pensif → fiche « ? » → gros plan « ≈ » → carte du site + bonhomme au téléphone.
 * Toutes les ancres sont des images locales au plan (0 = début du plan « Il va falloir… »).
 */

export type FormuleT = {
	nombres: number;
	carte: number;
	ajout170: number;
	ajout13: number;
	somme: number;
	vert: number;
	fusion: number;
	divise: number;
	resultat: number;
	calc: number;
	tapeDe: number;
	tapeA: number;
	egal: number;
	chute: number;
	zoom: number;
	fiole: number;
	bulle: number;
	question: number;
	fiche: number;
	morphDe: number;
	morphA: number;
	pense: number;
	site: number;
	telephone: number;
	valide: number;
};

const POP = "'Poppins', " + FONT;
const GRIS = '#3d4148';
const VERT = '#1fcc3a';
const TEAL = '#1aa39b';
const ROUX = '#ea6a1f';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
/** Coup de zoom de sortie (fin de plan) : 1 → `z` avec flou, sur `d` images avant `fin`. */
const sortie = (f: number, fin: number, d = 5, z = 1.35) => ({
	s: interpolate(f, [fin - d, fin], [1, z], {...clamp, easing: Easing.in(Easing.quad)}),
	b: interpolate(f, [fin - d, fin], [0, 18], clamp),
});
/** Arrivée d'un plan : `z` → 1 avec flou. */
const entree = (g: number, d = 6, z = 1.18) => ({
	s: interpolate(g, [0, d], [z, 1], {...clamp, easing: Easing.out(Easing.cubic)}),
	b: interpolate(g, [0, d - 1], [14, 0], clamp),
});
const style = (s: number, b: number, origin = '50% 50%', extra = '') => ({
	transformOrigin: origin,
	transform: `${extra} scale(${s})`,
	filter: b > 0.4 ? `blur(${b}px)` : undefined,
});

/* ───────── Personnages ───────── */

/** Bonhomme de la référence (tête ronde, t-shirt blanc, short gris). `hanches` : mains sur les hanches ;
 *  `tel` (0 → 1) : tient un téléphone devant lui. `regard` décale les pupilles, `plisse` ferme les yeux à moitié. */
const Gars: React.FC<{x: number; cy: number; r: number; f: number; hanches?: number; tel?: number; telOk?: number; regard?: [number, number]; plisse?: number; sourcil?: number}> = ({
	x,
	cy: cy0,
	r,
	f,
	hanches = 1,
	tel = 0,
	telOk = 0,
	regard = [0, 0],
	plisse = 0,
	sourcil = 1,
}) => {
	const u = r / 118;
	const souffle = Math.sin(f / 8) * 4 * u;
	const cy = cy0 + souffle;
	const neck = cy + r;
	const hip = neck + 330 * u - souffle * 0.5;
	const sol = cy0 + 782 * u;
	const sw = 9 * u;
	const blink = f % 52 >= 47 && f % 52 < 50 ? 0.12 : 1 - 0.55 * plisse;
	const bras = (s: number) => {
		const sh = {x: x + s * 70 * u, y: neck + 45 * u};
		const coude = {x: x + s * (200 - 120 * (1 - hanches)) * u, y: hip - 90 * u + 120 * (1 - hanches) * u};
		const main = {x: x + s * (92 + 20 * (1 - hanches)) * u, y: hip - 10 * u + 60 * (1 - hanches) * u};
		return (
			<g>
				<path d={`M${sh.x},${sh.y} L${coude.x},${coude.y} L${main.x},${main.y}`} fill="none" />
				<circle cx={main.x} cy={main.y} r={13 * u} fill={ENCRE} stroke="none" />
			</g>
		);
	};
	const telX = x + 40 * u;
	const telY = neck + 150 * u;
	const rx = regard[0] * 8 * u;
	const ry = regard[1] * 8 * u;
	return (
		<g strokeLinecap="round" strokeLinejoin="round" stroke={ENCRE} strokeWidth={sw}>
			<ellipse cx={x} cy={sol + 6 * u} rx={140 * u} ry={14 * u} fill="#000" opacity={0.08} stroke="none" />
			<path d={`M${x - 45 * u},${hip + 60 * u} L${x - 50 * u},${sol - 8 * u} L${x - 95 * u},${sol - 8 * u}`} fill="none" />
			<path d={`M${x + 40 * u},${hip + 60 * u} L${x + 45 * u},${sol - 8 * u} L${x + 90 * u},${sol - 8 * u}`} fill="none" />
			<path
				d={`M${x - 80 * u},${hip - 20 * u} L${x + 75 * u},${hip - 20 * u} L${x + 82 * u},${hip + 140 * u} L${x + 8 * u},${hip + 140 * u} L${x},${hip + 62 * u} L${x - 12 * u},${hip + 140 * u} L${x - 87 * u},${hip + 140 * u} Z`}
				fill="#8d8d8d"
			/>
			<path d={`M${x - 70 * u},${neck + 22 * u} Q${x},${neck + 8 * u} ${x + 70 * u},${neck + 22 * u} L${x + 78 * u},${hip} L${x - 82 * u},${hip} Z`} fill="#fff" />
			<path d={`M${x - 20 * u},${neck + 14 * u} Q${x},${neck + 40 * u} ${x + 20 * u},${neck + 14 * u}`} fill="none" strokeWidth={sw * 0.6} />
			{bras(-1)}
			{tel > 0.01 ? (
				<g>
					<path d={`M${x + 70 * u},${neck + 45 * u} L${x + 130 * u},${hip - 60 * u} L${telX + 20 * u},${telY + 50 * u}`} fill="none" />
					<g transform={`translate(${telX} ${telY}) scale(${tel}) rotate(-8)`}>
						<rect x={-38 * u} y={-62 * u} width={76 * u} height={124 * u} rx={14 * u} fill="#1b1b1b" strokeWidth={sw * 0.6} />
						<rect x={-31 * u} y={-54 * u} width={62 * u} height={108 * u} rx={9 * u} fill={ORANGE} stroke="none" />
						<path
							d={`M${-14 * u},${2 * u} L${-3 * u},${14 * u} L${16 * u},${-12 * u}`}
							stroke="#fff"
							strokeWidth={7 * u}
							fill="none"
							opacity={telOk}
							pathLength={1}
							strokeDasharray={1}
							strokeDashoffset={1 - telOk}
						/>
					</g>
					<circle cx={telX + 20 * u} cy={telY + 50 * u} r={13 * u} fill={ENCRE} stroke="none" />
				</g>
			) : (
				bras(1)
			)}
			<circle cx={x} cy={cy} r={r} fill="#fff" strokeWidth={sw * 1.15} />
			<ellipse cx={x - 30 * u + rx} cy={cy - 4 * u + ry} rx={10 * u} ry={12 * u * blink} fill={ENCRE} stroke="none" />
			<ellipse cx={x + 38 * u + rx} cy={cy - 4 * u + ry} rx={10 * u} ry={12 * u * blink} fill={ENCRE} stroke="none" />
			{plisse > 0.05 ? (
				<g strokeWidth={sw * 0.55}>
					<path d={`M${x - 46 * u},${cy - 10 * u} L${x - 14 * u},${cy - 10 * u}`} />
					<path d={`M${x + 22 * u},${cy - 10 * u} L${x + 54 * u},${cy - 10 * u}`} />
				</g>
			) : null}
			<path d={`M${x - 46 * u},${cy - 38 * u} L${x - 18 * u},${cy - 40 * u}`} strokeWidth={sw * 0.55} opacity={sourcil} />
			<path d={`M${x + 24 * u},${cy - 42 * u} L${x + 50 * u},${cy - 38 * u}`} strokeWidth={sw * 0.55} opacity={sourcil} />
			<path d={`M${x - 8 * u},${cy + 44 * u} Q${x + 10 * u},${cy + 54 * u} ${x + 30 * u},${cy + 42 * u}`} fill="none" strokeWidth={sw * 0.65} />
		</g>
	);
};

/** La mère (cheveux roux au carré, robe turquoise). Tête au centre (x, cy), rayon r, pieds sur `sol`. */
const Mere: React.FC<{x: number; cy: number; r: number; sol: number; f: number}> = ({x, cy: cy0, r, sol, f}) => {
	const bob = Math.sin(f / 9) * 4;
	const cy = cy0 + bob;
	const sw = 7;
	const neck = cy + r;
	const hem = sol - 210;
	const blink = f % 61 >= 56 && f % 61 < 59 ? 0.12 : 1;
	return (
		<g stroke={ENCRE} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
			<ellipse cx={x} cy={sol + 6} rx={120} ry={12} fill="#000" opacity={0.08} stroke="none" />
			{/* jambes et pieds */}
			<path d={`M${x - 35},${hem - 10} L${x - 40},${sol - 10}`} fill="none" />
			<path d={`M${x + 30},${hem - 10} L${x + 34},${sol - 10}`} fill="none" />
			<ellipse cx={x - 52} cy={sol - 8} rx={26} ry={11} fill={TEAL} strokeWidth={5} />
			<ellipse cx={x + 46} cy={sol - 8} rx={26} ry={11} fill={TEAL} strokeWidth={5} />
			{/* cheveux arrière */}
			<path
				d={`M${x - r * 1.18},${cy + r * 0.85} Q${x - r * 1.35},${cy - r * 1.35} ${x},${cy - r * 1.22} Q${x + r * 1.35},${cy - r * 1.35} ${x + r * 1.18},${cy + r * 0.85} Q${x},${cy + r * 1.05} ${x - r * 1.18},${cy + r * 0.85} Z`}
				fill={ROUX}
			/>
			{/* robe */}
			<path
				d={`M${x - 58},${neck + 8} Q${x},${neck + 28} ${x + 58},${neck + 8} L${x + 62},${neck + 150} Q${x + 72},${neck + 190} ${x + 120},${hem} L${x - 120},${hem} Q${x - 72},${neck + 190} ${x - 62},${neck + 150} Z`}
				fill={TEAL}
			/>
			<path d={`M${x - 40},${neck + 150} Q${x},${neck + 165} ${x + 40},${neck + 150}`} fill="none" strokeWidth={4} opacity={0.6} />
			{/* bras : gauche le long du corps, droit vers la main du père */}
			<path d={`M${x - 62},${neck + 30} Q${x - 105},${neck + 160} ${x - 100},${neck + 320}`} fill="none" />
			<path d={`M${x + 62},${neck + 30} Q${x + 110},${neck + 170} ${x + 158},${neck + 300}`} fill="none" />
			{/* tête */}
			<circle cx={x} cy={cy} r={r} fill="#fff" strokeWidth={sw * 1.1} />
			{/* frange */}
			<path d={`M${x - r * 1.02},${cy - r * 0.05} Q${x - r * 0.9},${cy - r * 1.05} ${x + r * 0.1},${cy - r * 1.02} Q${x + r * 0.95},${cy - r * 0.95} ${x + r * 1.02},${cy - r * 0.1} Q${x + r * 0.5},${cy - r * 0.75} ${x - r * 0.2},${cy - r * 0.55} Q${x - r * 0.7},${cy - r * 0.45} ${x - r * 1.02},${cy - r * 0.05} Z`} fill={ROUX} />
			<ellipse cx={x - 32} cy={cy + 2} rx={9} ry={12 * blink} fill={ENCRE} stroke="none" />
			<ellipse cx={x + 30} cy={cy + 2} rx={9} ry={12 * blink} fill={ENCRE} stroke="none" />
			<path d={`M${x - 46},${cy - 12} L${x - 52},${cy - 20}`} strokeWidth={4} />
			<path d={`M${x + 44},${cy - 12} L${x + 50},${cy - 20}`} strokeWidth={4} />
			<path d={`M${x - 14},${cy + 40} Q${x},${cy + 50} ${x + 16},${cy + 40}`} fill="none" strokeWidth={5} />
		</g>
	);
};

/** Le père (cheveux bruns, t-shirt bleu clair, pantalon sombre). */
const Pere: React.FC<{x: number; cy: number; r: number; sol: number; f: number}> = ({x, cy: cy0, r, sol, f}) => {
	const bob = Math.sin(f / 9 + 1.3) * 4;
	const cy = cy0 + bob;
	const sw = 7;
	const neck = cy + r;
	const taille = neck + 330;
	const blink = f % 57 >= 20 && f % 57 < 23 ? 0.12 : 1;
	return (
		<g stroke={ENCRE} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
			<ellipse cx={x} cy={sol + 6} rx={120} ry={12} fill="#000" opacity={0.08} stroke="none" />
			{/* pantalon */}
			<path d={`M${x - 74},${taille} L${x + 74},${taille} L${x + 70},${sol - 20} L${x + 14},${sol - 20} L${x},${taille + 80} L${x - 14},${sol - 20} L${x - 70},${sol - 20} Z`} fill="#2b2f36" />
			<ellipse cx={x - 50} cy={sol - 12} rx={34} ry={13} fill="#2b2f36" strokeWidth={5} />
			<ellipse cx={x + 50} cy={sol - 12} rx={34} ry={13} fill="#2b2f36" strokeWidth={5} />
			{/* t-shirt */}
			<path
				d={`M${x - 70},${neck + 12} Q${x},${neck + 30} ${x + 70},${neck + 12} L${x + 130},${neck + 70} L${x + 108},${neck + 135} L${x + 78},${neck + 112} L${x + 80},${taille + 6} L${x - 80},${taille + 6} L${x - 78},${neck + 112} L${x - 108},${neck + 135} L${x - 130},${neck + 70} Z`}
				fill="#a9d3f2"
			/>
			<path d={`M${x - 22},${neck + 18} Q${x},${neck + 42} ${x + 22},${neck + 18}`} fill="none" strokeWidth={5} />
			{/* bras */}
			<path d={`M${x + 102},${neck + 128} Q${x + 112},${neck + 230} ${x + 104},${neck + 330}`} fill="none" />
			<path d={`M${x - 102},${neck + 128} Q${x - 140},${neck + 220} ${x - 205},${neck + 278}`} fill="none" />
			<circle cx={x - 210} cy={neck + 282} r={14} fill="#fff" />
			{/* tête */}
			<circle cx={x} cy={cy} r={r} fill="#fff" strokeWidth={sw * 1.1} />
			<path
				d={`M${x - r * 1.0},${cy - r * 0.15} Q${x - r * 1.08},${cy - r * 1.1} ${x},${cy - r * 1.08} Q${x + r * 1.08},${cy - r * 1.1} ${x + r * 1.0},${cy - r * 0.15} Q${x + r * 0.7},${cy - r * 0.6} ${x + r * 0.1},${cy - r * 0.55} Q${x - r * 0.5},${cy - r * 0.62} ${x - r * 1.0},${cy - r * 0.15} Z`}
				fill="#3a2a20"
			/>
			<ellipse cx={x - 32} cy={cy + 6} rx={9} ry={12 * blink} fill={ENCRE} stroke="none" />
			<ellipse cx={x + 32} cy={cy + 6} rx={9} ry={12 * blink} fill={ENCRE} stroke="none" />
			<path d={`M${x - 16},${cy + 46} Q${x},${cy + 56} ${x + 16},${cy + 46}`} fill="none" strokeWidth={5} />
		</g>
	);
};

/** Règle fine (graduations), sur toute la hauteur [y0, y1]. */
const RegleFine: React.FC<{x: number; y0: number; y1: number; cote: 1 | -1; ep?: number}> = ({x, y0, y1, cote, ep = 4}) => {
	const t = [];
	for (let y = y1, i = 0; y > y0; y -= 22, i++) t.push(<line key={i} x1={x} x2={x + cote * (i % 5 === 0 ? 40 : 22)} y1={y} y2={y} />);
	return (
		<g stroke="#555" strokeWidth={ep}>
			<line x1={x} x2={x} y1={y0} y2={y1} />
			{t}
		</g>
	);
};

/** Chiffres qui défilent (flou vertical) puis se posent. */
const Roule: React.FC<{texte: string; x: number; y: number; taille: number; couleur: string; flou: number; anchor?: 'start' | 'middle' | 'end'; id: string}> = ({
	texte,
	x,
	y,
	taille,
	couleur,
	flou,
	anchor = 'middle',
	id,
}) => (
	<g>
		{flou > 0.3 ? (
			<defs>
				<filter id={id} x="-20%" y="-50%" width="140%" height="200%">
					<feGaussianBlur stdDeviation={`0 ${flou}`} />
				</filter>
			</defs>
		) : null}
		<text x={x} y={y} textAnchor={anchor} fontFamily={POP} fontWeight={700} fontSize={taille} fill={couleur} filter={flou > 0.3 ? `url(#${id})` : undefined} letterSpacing={-4}>
			{texte}
		</text>
	</g>
);

const Particules: React.FC<{cx: number; cy: number; f: number; at: number; couleur: string; n?: number; rayon?: number}> = ({cx, cy, f, at, couleur, n = 10, rayon = 220}) => {
	const t = (f - at) / 13;
	if (t < 0 || t > 1) return null;
	const d = Easing.out(Easing.cubic)(t);
	return (
		<g stroke={couleur} strokeWidth={9} strokeLinecap="round">
			{Array.from({length: n}, (_, i) => {
				const a = (i / n) * Math.PI * 2 + 0.5;
				const r0 = 40 + rayon * d;
				const r1 = r0 + 40 * (1 - t);
				return <line key={i} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * r1} y2={cy + Math.sin(a) * r1} opacity={1 - t} />;
			})}
		</g>
	);
};

/* ───────── Composant principal ───────── */

export const FormuleTaille: React.FC<{t: FormuleT; mere?: number; pere?: number; ajout?: number; site?: string}> = ({t, mere = 157, pere = 170, ajout = 13, site}) => {
	const f = useCurrentFrame();
	const somme = mere + pere;
	const total = somme + ajout;
	const resultat = Math.round(total / 2);

	/* ── 1. Les parents et leurs barres ── */
	if (f < t.carte) {
		const e = entree(f, 6, 1.12);
		const so = sortie(f, t.carte, 4, 1.25);
		const SOL = 1593;
		const TOP = 553;
		const o = ressort(f, 3, 12, 120);
		const b = ressort(f, 6, 12, 120);
		const n1 = ressort(f, t.nombres, 10, 210);
		const n2 = ressort(f, t.nombres + 2, 10, 210);
		const plus = ressort(f, t.nombres + 5, 9, 240);
		const pousse = 1 + f * 0.0011;
		const barre = (x: number, w: number, k: number, c: string) => {
			const top = SOL - (SOL - TOP) * k;
			return (
				<g>
					<rect x={x} y={top} width={w} height={Math.max(0, SOL - top)} fill={c} />
					<rect x={x + 10} y={top + 8} width={16} height={Math.max(0, SOL - top - 16)} fill="#fff" opacity={0.18} />
				</g>
			);
		};
		const nombre = (v: number, x: number, k: number, c: string, anchor: 'start' | 'end') => (
			<g transform={`translate(${x} ${TOP - 8}) scale(${0.4 + 0.6 * k}) translate(${-x} ${-(TOP - 8)})`} opacity={Math.min(1, k * 1.6)}>
				<text x={x} y={TOP - 8} textAnchor={anchor} fontFamily={POP} fontWeight={800} fontSize={150} fill={c} letterSpacing={-8}>
					{v}
					<tspan fontSize={40} fontWeight={600} fill="#888" letterSpacing={0} dx={12}>
						cm
					</tspan>
				</text>
			</g>
		);
		return (
			<AbsoluteFill>
				<Fond />
				<AbsoluteFill style={style(e.s * so.s * pousse, e.b + so.b, '50% 55%')}>
					<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
						<RegleFine x={48} y0={460} y1={SOL} cote={1} />
						<RegleFine x={1040} y0={460} y1={SOL} cote={-1} />
						{barre(49, 100, o, ORANGE)}
						{barre(945, 103, b, BLEU)}
						<Mere x={351} cy={810} r={108} sol={SOL} f={f} />
						<Pere x={716} cy={756} r={115} sol={SOL} f={f} />
						{nombre(mere, 49, n1, ORANGE, 'start')}
						{nombre(pere, 1040, n2, BLEU, 'end')}
						{plus > 0.01 ? (
							<text x={540} y={515} textAnchor="middle" fontFamily={POP} fontWeight={800} fontSize={170} fill={BLEU} transform={`translate(540 470) scale(${plus}) rotate(${(1 - Math.min(1, plus)) * 90}) translate(-540 -470)`}>
								+
							</text>
						) : null}
					</svg>
				</AbsoluteFill>
			</AbsoluteFill>
		);
	}

	/* ── 2. La carte de calcul ── */
	if (f < t.calc) {
		const g = f - t.carte;
		const e = entree(g, 6, 1.2);
		const so = sortie(f, t.calc, 4, 1.3);
		const carte = ressort(g, 0, 11, 200);
		const pousse = 1 + g * 0.0009;
		const X0 = 289;
		const Y0 = 594;
		const W = 543;
		const H = 526;
		const avantSomme = f < t.somme;
		const a170 = ressort(f, t.ajout170, 11, 190);
		const a13 = ressort(f, t.ajout13, 11, 190);
		const effondre = ease(f, t.somme - 1, 5);
		const roule327 = interpolate(f, [t.somme, t.somme + 6], [10, 0], clamp);
		const vert = ressort(f, t.vert, 10, 170);
		const frac = ressort(f, t.vert + 7, 11, 200);
		const fusion = ease(f, t.fusion, 6);
		const roule340 = f >= t.fusion ? interpolate(f, [t.fusion, t.fusion + 7], [12, 0], clamp) : 0;
		const div = ressort(f, t.divise, 10, 220);
		const res = ressort(f, t.resultat, 10, 170);
		const coup = bosse(f, t.resultat, 7) + bosse(f, t.fusion + 4, 6) * 0.6 + bosse(f, t.somme + 4, 6) * 0.5;
		const DROITE = 770;
		return (
			<AbsoluteFill>
				<Fond />
				<AbsoluteFill style={style(e.s * so.s * pousse * (1 + 0.03 * coup), e.b + so.b, '50% 45%', `translate(${secousse(f, t.resultat, 6)}px, 0)`)}>
					<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
						<g transform={`translate(${X0 + W / 2} ${Y0 + H / 2}) scale(${0.6 + 0.4 * carte}) translate(${-(X0 + W / 2)} ${-(Y0 + H / 2)})`}>
							<defs>
								<linearGradient id="carteFond" x1="0" y1="0" x2="0" y2="1">
									<stop offset="0" stopColor="#f6f7f9" />
									<stop offset="1" stopColor="#dcdfe3" />
								</linearGradient>
							</defs>
							<rect x={X0 + 10} y={Y0 + 18} width={W} height={H} rx={54} fill="#000" opacity={0.12} />
							<rect x={X0} y={Y0} width={W} height={H} rx={54} fill="url(#carteFond)" stroke="#9ea3a9" strokeWidth={8} />
							<path d={`M${X0 + 40},${Y0 + 28} Q${X0 + 28},${Y0 + 28} ${X0 + 26},${Y0 + 60}`} stroke="#fff" strokeWidth={10} strokeLinecap="round" fill="none" opacity={0.9} />
							{avantSomme || effondre < 1 ? (
								<g opacity={1 - effondre} transform={`translate(0 ${-60 * effondre})`}>
									<text x={DROITE} y={770} textAnchor="end" fontFamily={POP} fontWeight={700} fontSize={185} fill={ORANGE} letterSpacing={-6}>
										{mere}
									</text>
									{a170 > 0.01 ? (
										<g transform={`translate(0 ${(1 - Math.min(1, a170)) * 260 - 100 * effondre})`} opacity={Math.min(1, a170 * 1.5)}>
											<text x={330} y={905} fontFamily={POP} fontWeight={800} fontSize={150} fill={ORANGE}>
												+
											</text>
											<text x={DROITE} y={918} textAnchor="end" fontFamily={POP} fontWeight={700} fontSize={185} fill={BLEU} letterSpacing={-6}>
												{pere}
											</text>
										</g>
									) : null}
									{a13 > 0.01 ? (
										<g transform={`translate(0 ${(1 - Math.min(1, a13)) * 260 - 200 * effondre})`} opacity={Math.min(1, a13 * 1.5)}>
											<text x={330} y={1058} fontFamily={POP} fontWeight={800} fontSize={150} fill={ORANGE}>
												+
											</text>
											<text x={630} y={1070} textAnchor="end" fontFamily={POP} fontWeight={700} fontSize={185} fill={ORANGE} letterSpacing={-6}>
												{ajout}
											</text>
										</g>
									) : null}
								</g>
							) : null}
							{!avantSomme ? (
								<g>
									<g opacity={1 - fusion * 0} transform={`translate(${-60 * frac * 0} 0)`}>
										<Roule texte={String(f >= t.fusion + 3 ? total : somme)} x={560} y={862} taille={220} couleur={GRIS} flou={Math.max(roule327, roule340)} id="roule" />
									</g>
									{frac > 0.01 ? (
										<g>
											<line x1={540 - 220 * Math.min(1, frac)} x2={540 + 220 * Math.min(1, frac)} y1={905} y2={905} stroke={GRIS} strokeWidth={9} strokeLinecap="round" />
											{f < t.divise ? (
												<text x={540} y={1066} textAnchor="middle" fontFamily={POP} fontWeight={700} fontSize={150} fill={GRIS} transform={`translate(540 1010) scale(${frac * (1 - ease(f, t.divise - 3, 3))}) translate(-540 -1010)`}>
													2
												</text>
											) : (
												<g transform={`translate(540 1000) scale(${div})`} fill={GRIS}>
													<rect x={-46} y={-8} width={92} height={16} rx={8} />
													<circle cx={0} cy={-42} r={14} />
													<circle cx={0} cy={42} r={14} />
												</g>
											)}
										</g>
									) : null}
									{vert > 0.01 && fusion < 1 ? (
										<g
											transform={`translate(${(1 - Math.min(1, vert)) * 360 - 170 * fusion} ${-20 * fusion}) translate(790 760) scale(${1 - 0.7 * fusion}) translate(-790 -760)`}
											opacity={1 - fusion}
										>
											<text x={700} y={820} fontFamily={POP} fontWeight={800} fontSize={170} fill={VERT} stroke="#fff" strokeWidth={6} paintOrder="stroke" letterSpacing={-6}>
												+{ajout}
											</text>
										</g>
									) : null}
									<Particules cx={880} cy={700} f={f} at={t.vert} couleur={VERT} n={8} rayon={150} />
									<Particules cx={640} cy={780} f={f} at={t.fusion + 3} couleur={VERT} n={10} rayon={200} />
								</g>
							) : null}
						</g>
						{res > 0.01 ? (
							<g transform={`translate(553 1400) scale(${res}) translate(-553 -1400)`}>
								<text x={553} y={1525} textAnchor="middle" fontFamily={POP} fontWeight={800} fontSize={380} fill={BLEU} letterSpacing={-14}>
									{resultat}
								</text>
							</g>
						) : null}
						<Eclats cx={553} cy={1400} f={f} at={t.resultat + 2} />
					</svg>
				</AbsoluteFill>
			</AbsoluteFill>
		);
	}

	/* ── 3. La calculatrice ── */
	if (f < t.chute) {
		const g = f - t.calc;
		const e = entree(g, 6, 1.2);
		const pousse = 1 + g * 0.0012;
		const chaine = `${mere}+${pere}+${ajout}÷2`;
		const n = Math.max(0, Math.min(chaine.length, Math.floor(((f - t.tapeDe) / Math.max(1, t.tapeA - t.tapeDe)) * chaine.length + 0.0001) + (f >= t.tapeDe ? 1 : 0)));
		const fini = f >= t.egal;
		const appui = f >= t.tapeDe && f < t.egal + 3 ? Math.abs(Math.sin((f - t.tapeDe) * 0.9)) : 0;
		const bras = ease(f, t.calc + 1, 7);
		const mainY = 1000 + 70 * appui + (fini ? 150 * bosse(f, t.egal - 2, 6) : 0);
		const touches = ['7', '2', '3', '+', '4', '5', '6', '=', '1', '2', '0', '='];
		const touche = f >= t.tapeDe && f < t.egal ? Math.floor((f - t.tapeDe) * 0.9) % 11 : fini && f < t.egal + 3 ? 11 : -1;
		const eclat = bosse(f, t.egal, 10);
		return (
			<AbsoluteFill>
				<Fond />
				<AbsoluteFill style={style(e.s * pousse, e.b, '45% 50%')}>
					<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
						<g transform="translate(1458 0) scale(-1 1)">
							<Bonhomme x={729} sol={1963} h={1607} f={f} bras={bras} mainY={mainY} regard={0} surpris={0} ecrase={0} />
						</g>
						<g>
							<rect x={129} y={782} width={365} height={472} rx={34} fill="#000" opacity={0.15} />
							<rect x={121} y={770} width={365} height={472} rx={34} fill="#3a3d43" stroke="#1f2124" strokeWidth={7} />
							<rect x={150} y={800} width={307} height={92} rx={14} fill="#26282c" />
							<text x={442} y={866} textAnchor="end" fontFamily={POP} fontWeight={600} fontSize={fini ? 54 : 40} fill={fini ? BLEU_CLAIR : '#fff'}>
								{fini ? resultat : chaine.slice(0, n)}
							</text>
							{touches.map((k, i) => {
								const cx = 178 + (i % 4) * 66;
								const cy = 948 + Math.floor(i / 4) * 64;
								const actif = i === touche;
								return (
									<g key={i}>
										<rect x={cx - 26} y={cy - 26} width={52} height={50} rx={10} fill={actif ? '#8a9099' : k === '=' || k === '+' ? '#4a6e95' : '#55595f'} />
										<text x={cx} y={cy + 12} textAnchor="middle" fontFamily={POP} fontWeight={600} fontSize={30} fill="#fff">
											{k}
										</text>
									</g>
								);
							})}
							<rect x={152} y={1150} width={250} height={56} rx={12} fill={BLEU} />
							<rect x={414} y={1150} width={44} height={56} rx={10} fill="#4a6e95" />
						</g>
						{eclat > 0 ? (
							<g transform={`translate(300 1205) rotate(${g * 6}) scale(${eclat * 1.6})`}>
								<path d="M0,-70 L12,-12 L70,0 L12,12 L0,70 L-12,12 L-70,0 L-12,-12 Z" fill={BLEU_CLAIR} stroke="#fff" strokeWidth={5} />
							</g>
						) : null}
					</svg>
				</AbsoluteFill>
			</AbsoluteFill>
		);
	}

	/* ── 4. Chute de la calculatrice, recul, puis gros plan pensif ── */
	if (f < t.fiche) {
		const g = f - t.chute;
		if (f < t.zoom) {
			// La calculatrice tombe pendant que la caméra recule : bonhomme à gauche, barre bleue à droite.
			const recul = interpolate(g, [0, 8], [1.9, 1], {...clamp, easing: Easing.out(Easing.cubic)});
			const flou = interpolate(g, [0, 5], [10, 0], clamp);
			const so = sortie(f, t.zoom, 4, 1.7);
			const chute = Math.min(1, g / 11);
			const barre = ressort(g, 2, 13, 140);
			return (
				<AbsoluteFill>
					<Fond />
					<AbsoluteFill style={style(recul * so.s, flou + so.b, '38% 40%')}>
						<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
							<RegleFine x={724} y0={-40} y1={1769} cote={1} ep={5} />
							<rect x={724} y={1769 - (1769 - 580) * barre} width={208} height={Math.max(0, (1769 - 580) * barre)} fill={BLEU} />
							<line x1={600} x2={1080} y1={1769} y2={1769} stroke="#555" strokeWidth={5} />
							<Gars x={405} cy={650} r={165} f={f} hanches={0} regard={[1, -0.3]} />
							{chute < 1 ? (
								<g
									transform={`translate(${-180 * chute} ${1100 * chute * chute}) rotate(${-50 * chute} 300 1000)`}
									opacity={1 - Math.max(0, chute - 0.8) * 5}
								>
									<rect x={121} y={770} width={365} height={472} rx={34} fill="#3a3d43" stroke="#1f2124" strokeWidth={7} />
									<rect x={150} y={800} width={307} height={92} rx={14} fill="#26282c" />
									<text x={442} y={866} textAnchor="end" fontFamily={POP} fontWeight={600} fontSize={54} fill={BLEU_CLAIR}>
										{resultat}
									</text>
									<rect x={152} y={1150} width={250} height={56} rx={12} fill={BLEU} />
								</g>
							) : null}
						</svg>
					</AbsoluteFill>
				</AbsoluteFill>
			);
		}
		// Gros plan, mains sur les hanches ; fiole « = ? » puis bulle de pensée.
		const z = f - t.zoom;
		const e = entree(z, 6, 0.75);
		const so = sortie(f, t.fiche, 4, 0.7);
		const pousse = 1 + z * 0.0012;
		const fiole = ressort(f, t.fiole, 10, 200) * (1 - ease(f, t.question + 6, 6));
		const bulle = ressort(f, t.bulle, 10, 170);
		const q = ressort(f, t.question, 9, 240);
		const regard: [number, number] = f >= t.bulle ? [0.8, -1] : [0.6, 0];
		return (
			<AbsoluteFill>
				<Fond />
				<AbsoluteFill style={style(e.s * so.s * pousse, e.b + so.b, '35% 40%', `translate(${-260 * ease(f, t.fiche - 4, 4)}px, 0)`)}>
					<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
						<RegleFine x={958} y0={-40} y1={1960} cote={1} ep={6} />
						<rect x={960} y={1445} width={93} height={520} fill={BLEU} />
						<Gars x={378} cy={770} r={256} f={f} hanches={1} regard={regard} />
						{fiole > 0.01 ? (
							<g transform={`translate(740 680) scale(${fiole}) translate(-740 -680)`}>
								<g transform="rotate(-12 690 600)">
									<path d="M660,505 L660,560 L612,672 Q606,690 626,690 L758,690 Q778,690 772,672 L724,560 L724,505 Z" fill="#9fd3fb" stroke="#4aa3e8" strokeWidth={6} strokeLinejoin="round" />
									<path d="M630,640 L754,640 L772,672 Q778,690 758,690 L626,690 Q606,690 612,672 Z" fill={BLEU} />
									<rect x={648} y={492} width={88} height={18} rx={6} fill="#4aa3e8" />
								</g>
								<text x={818} y={590} textAnchor="middle" fontFamily={POP} fontWeight={700} fontSize={70} fill="#4a4a4a">
									=
								</text>
								<path d="M810,690 L860,718 L860,780 L810,808 L760,780 L760,718 Z" fill={BLEU} stroke="#1a6fc0" strokeWidth={6} strokeLinejoin="round" transform="translate(0 -10) scale(1.15) translate(-105 -95)" />
								<text x={810} y={792} textAnchor="middle" fontFamily={POP} fontWeight={800} fontSize={110} fill={ENCRE}>
									?
								</text>
							</g>
						) : null}
						{bulle > 0.01 ? (
							<g transform={`translate(560 380) scale(${bulle}) translate(-560 -380)`}>
								<circle cx={430} cy={452} r={18} fill="#cfe6f7" />
								<circle cx={464} cy={402} r={30} fill="#cfe6f7" />
								<ellipse cx={580} cy={250} rx={150} ry={112} fill="#cfe6f7" />
								{q > 0.01 ? (
									<text x={584} y={305} textAnchor="middle" fontFamily={POP} fontWeight={600} fontSize={150 * Math.min(1.1, q)} fill={ENCRE}>
										?
									</text>
								) : null}
							</g>
						) : null}
					</svg>
				</AbsoluteFill>
			</AbsoluteFill>
		);
	}

	/* ── 5. La fiche « ? » (silhouette qui change) ── */
	if (f < t.pense) {
		const g = f - t.fiche;
		const e = entree(g, 6, 1.25);
		const glisse = ressort(g, 0, 11, 150);
		const pousse = 1 + g * 0.001;
		const morph = f >= t.morphDe && f < t.morphA ? Math.floor((f - t.morphDe) / 4) % 4 : 0;
		const vites = f >= t.morphDe && f < t.morphA + 3;
		// Sortie : la fiche part à droite, la caméra fonce sur le bonhomme.
		const out = ease(f, t.pense - 6, 6);
		const flotte = Math.sin(g / 11) * 1.2;
		return (
			<AbsoluteFill>
				<Fond />
				<AbsoluteFill style={style(e.s * pousse * (1 + 1.6 * out * out), e.b + 10 * out, '21% 50%')}>
					<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
						<Gars x={230} cy={842} r={103} f={f} hanches={1} regard={[0.7, -0.2]} />
						<g
							transform={`translate(${(1 - Math.min(1, glisse)) * 760 + 500 * out} 0) rotate(${(1 - Math.min(1, glisse)) * 10 + flotte} 740 620)`}
							opacity={1 - out}
						>
							<rect x={392} y={138} width={732} height={998} rx={42} fill="#000" opacity={0.1} />
							<rect x={378} y={122} width={732} height={998} rx={42} fill="#1e88e5" stroke="#1565c0" strokeWidth={6} />
							<rect x={408} y={196} width={672} height={896} rx={22} fill="#fff" />
							{/* pince */}
							<circle cx={729} cy={96} r={44} fill="#9e9e9e" stroke="#666" strokeWidth={7} />
							<circle cx={729} cy={96} r={18} fill="#fff" stroke="#666" strokeWidth={5} />
							<path d="M566,150 Q566,128 590,128 L868,128 Q892,128 892,150 L906,262 L552,262 Z" fill="#a8a8a8" stroke="#666" strokeWidth={7} strokeLinejoin="round" />
							{/* bandeau */}
							<path d="M430,318 L1060,318 L1040,346 L1060,374 L430,374 L450,346 Z" fill="#1e88e5" />
							<path d="M500,346 Q540,330 580,346 Q620,362 660,346 M700,346 Q760,322 820,346 Q860,360 900,346 M930,346 Q960,334 990,346" stroke="#fff" strokeWidth={8} fill="none" strokeLinecap="round" />
							{/* silhouette */}
							<g transform={`translate(790 760) scale(${vites ? 1 + 0.04 * Math.sin(f * 1.7) : 1} ${vites ? 1 - 0.03 * Math.sin(f * 1.7) : 1}) translate(-790 -760)`}>
								{morph === 1 ? <circle cx={890} cy={500} r={48} fill="#1e88e5" /> : null}
								{morph === 3 ? <path d="M672,560 Q660,720 690,800 L890,800 Q920,720 908,560 Z" fill="#1e88e5" /> : null}
								<circle cx={790} cy={560} r={112} fill="#1e88e5" />
								{morph === 2 ? <path d="M700,490 L720,420 L750,470 L780,405 L810,465 L845,415 L860,480 Z" fill="#1e88e5" /> : null}
								<path d="M594,1040 Q594,720 790,700 Q986,720 986,1040 Z" fill="#1e88e5" />
								<text x={790} y={985} textAnchor="middle" fontFamily={POP} fontWeight={800} fontSize={230} fill="#fff">
									?
								</text>
							</g>
							{vites ? (
								<g stroke="#1e88e5" strokeWidth={10} strokeLinecap="round" opacity={0.8}>
									<line x1={520 - (f % 4) * 10} x2={580 - (f % 4) * 10} y1={560} y2={548} />
									<line x1={500 - (f % 3) * 10} x2={570 - (f % 3) * 10} y1={720} y2={730} />
									<line x1={1010 + (f % 4) * 10} x2={1060 + (f % 4) * 10} y1={640} y2={620} />
								</g>
							) : null}
						</g>
					</svg>
				</AbsoluteFill>
			</AbsoluteFill>
		);
	}

	/* ── 6. Gros plan « ≈ » ── */
	if (f < t.site) {
		const g = f - t.pense;
		const e = entree(g, 7, 0.55);
		const pousse = 1 + g * 0.0013;
		const approx = ease(f, t.pense + 5, 8);
		const cube = ressort(f, t.pense + 8, 10, 200);
		const plisse = bosse(f, t.pense + 18, 14) > 0.3 ? 1 : 0;
		// Sortie en bascule (la tête penche) juste avant le site.
		const bascule = ease(f, t.site - 6, 6);
		return (
			<AbsoluteFill>
				<Fond />
				<AbsoluteFill style={style(e.s * pousse * (1 + 0.15 * bascule), e.b + 14 * bascule, '30% 45%', `rotate(${16 * bascule * bascule}deg)`)}>
					<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
						<Gars x={338} cy={764} r={194} f={f} hanches={1} regard={[0.4, -0.6]} plisse={plisse} />
						<g stroke={BLEU} strokeWidth={22} strokeLinecap="round" fill="none">
							<path d="M240,395 Q275,365 300,392 Q325,420 360,390" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - approx} />
							<path d="M240,445 Q275,415 300,442 Q325,470 360,440" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ease(f, t.pense + 8, 8)} />
						</g>
						{cube > 0.01 ? (
							<g transform={`translate(930 790) scale(${cube}) rotate(${(1 - Math.min(1, cube)) * -25}) translate(-930 -790)`}>
								<rect x={862} y={718} width={150} height={146} rx={12} fill="#000" opacity={0.08} transform="translate(8 10)" />
								<rect x={858} y={712} width={150} height={146} rx={12} fill="#3d9cf0" stroke="#1a6fc0" strokeWidth={6} />
								<path d="M858,740 L900,712 L1008,712 L1008,740 Z" fill="#7fc0fa" />
								<text x={933} y={835} textAnchor="middle" fontFamily={POP} fontWeight={800} fontSize={130} fill={ENCRE}>
									?
								</text>
							</g>
						) : null}
					</svg>
				</AbsoluteFill>
			</AbsoluteFill>
		);
	}

	/* ── 7. Carte du site + bonhomme au téléphone ── */
	const g = f - t.site;
	const e = entree(g, 5, 1.2);
	const carte = ressort(g, 0, 12, 170);
	const barre = ressort(g, 4, 13, 120);
	const ok = ease(f, t.valide, 6);
	const pousse = 1 + g * 0.0012;
	const SOL = 1588;
	const TOPB = 770;
	const ticks = [];
	for (let y = SOL - 20, i = 0; y > SOL - (SOL - TOPB) * barre + 10; y -= 26, i++)
		ticks.push(<line key={i} x1={491} x2={491 + (i % 5 === 0 ? 30 : 16)} y1={y} y2={y} stroke="#fff" strokeWidth={4} opacity={0.7} />);
	return (
		<AbsoluteFill>
			<Fond />
			<AbsoluteFill style={style(e.s * pousse, e.b, '50% 45%')}>
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
					<line x1={420} x2={1040} y1={SOL} y2={SOL} stroke="#555" strokeWidth={5} />
					<rect x={491} y={SOL - (SOL - TOPB) * barre} width={162} height={Math.max(0, (SOL - TOPB) * barre)} fill={BLEU} />
					{ticks}
					<Gars x={216} cy={869} r={121} f={f} hanches={1} regard={[0.3, 0.4]} />
					<g transform={`translate(0 ${(1 - Math.min(1, carte)) * -760})`}>
						<rect x={92} y={199} width={918} height={575} rx={26} fill="#000" opacity={0.18} />
						<rect x={86} y={189} width={918} height={575} rx={26} fill="#fff" stroke="#c9c9c9" strokeWidth={4} />
						<rect x={86} y={189} width={918} height={96} rx={26} fill="#ececec" />
						<rect x={86} y={250} width={918} height={35} fill="#ececec" />
						<circle cx={132} cy={237} r={11} fill="#ff5f57" />
						<circle cx={170} cy={237} r={11} fill="#febc2e" />
						<circle cx={208} cy={237} r={11} fill="#28c840" />
						<rect x={262} y={209} width={700} height={56} rx={28} fill="#fff" />
						<text x={612} y={247} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontSize={36} fill="#222">
							grandimi.com
						</text>
						<clipPath id="siteClip">
							<rect x={86} y={285} width={918} height={479} rx={0} />
						</clipPath>
						<g clipPath="url(#siteClip)">
							<image href={site} x={296} y={285} width={498} height={1078} preserveAspectRatio="xMidYMin slice" />
						</g>
						<rect x={86} y={189} width={918} height={575} rx={26} fill="none" stroke="#c9c9c9" strokeWidth={4} />
					</g>
				</svg>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
