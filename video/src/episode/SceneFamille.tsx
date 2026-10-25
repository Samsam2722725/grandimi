import React from 'react';
import {AbsoluteFill, Img, interpolate, spring, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';
import {GrilleAnimee} from './GrilleAnimee';

/*
 * Scène « famille » de la référence p19-ref (TallUp, 20 s) : personnes détourées debout sur une grille verte.
 * La personne dont on parle passe devant, au centre et en grand ; les autres reculent sur les côtés.
 * Chaque changement de place est un ressort court ; une personne qui entre arrive avec un éclair jaune.
 * Les tailles s'affichent en jaune au-dessus des têtes et suivent la personne.
 */
/** entree : comment la personne arrive quand elle apparaît (zoom = arrive de près et se pose, droite = glisse depuis la droite,
 *  bas = monte du bas en grandissant ; mesuré sur la référence à 0,0 s, 2,3 s et 4,9 s). */
export type Pose = {x: number; h: number; sol: number; z?: number; entree?: 'zoom' | 'droite' | 'bas'};
export type PersonneScene = {id: string; src: string; w: number; h: number};
export type EtapeScene = {f: number; poses: Record<string, Pose>};
export type EtiquetteScene = {personne: string; texte: string; a: number; fin?: number; couleur?: string};

const ressort = (f: number, at: number) => (f < at ? 0 : spring({frame: f - at, fps: 30, config: {damping: 14, stiffness: 190, mass: 0.6}}));
// Changements de place plus lents (~0,5 s) : sur la référence, la mère rapetisse de 1450 à 1340 px entre 2,5 et 3 s.
const glisse = (f: number, at: number) => (f < at ? 0 : spring({frame: f - at, fps: 30, config: {damping: 20, stiffness: 70, mass: 0.8}}));

const poseA = (etapes: EtapeScene[], id: string, f: number): {p: Pose; entree: number} | null => {
	let i = -1;
	for (let k = 0; k < etapes.length; k++) if (etapes[k].f <= f) i = k;
	if (i < 0 || !etapes[i].poses[id]) return null;
	const cible = etapes[i].poses[id];
	let j = i - 1;
	while (j >= 0 && !etapes[j].poses[id]) j--;
	if (j < 0 || j < i - 1) {
		const g = f - etapes[i].f;
		if (cible.entree === 'zoom') {
			// Image 0 : très près et plus bas, puis posée en 4 images.
			const k = interpolate(g, [0, 4], [1, 0], {extrapolateRight: 'clamp'});
			return {p: {...cible, h: cible.h * (1 + 0.6 * k), sol: cible.sol + 700 * k}, entree: etapes[i].f + 5};
		}
		if (cible.entree === 'droite') {
			const t = glisse(f, etapes[i].f);
			return {p: {...cible, x: cible.x + 650 * (1 - t)}, entree: etapes[i].f + 6};
		}
		if (cible.entree === 'bas') {
			const t = glisse(f, etapes[i].f);
			return {p: {...cible, h: cible.h * (0.62 + 0.38 * t), sol: cible.sol + 260 * (1 - t)}, entree: etapes[i].f + 8};
		}
		const t = ressort(f, etapes[i].f);
		return {p: {...cible, h: cible.h * (0.7 + 0.3 * t)}, entree: etapes[i].f};
	}
	const t = glisse(f, etapes[i].f);
	const de = etapes[j].poses[id];
	const m = (a: number, b: number) => a + (b - a) * t;
	return {p: {x: m(de.x, cible.x), h: m(de.h, cible.h), sol: m(de.sol, cible.sol), z: cible.z}, entree: -99};
};

/** Éclair jaune flou qui balaie la tête d'une personne qui entre (images 0,4-0,7 et 2,5-2,7 s de la référence). */
const Eclair: React.FC<{x: number; y: number; f: number; at: number}> = ({x, y, f, at}) => {
	const g = f - at;
	if (g < 0 || g > 7) return null;
	const o = interpolate(g, [0, 1, 7], [0, 1, 0]);
	const dx = interpolate(g, [0, 7], [-160, 220]);
	return (
		<div
			style={{
				position: 'absolute',
				left: x + dx - 200,
				top: y - 90,
				width: 400,
				height: 150,
				borderRadius: '50%',
				background: '#e8ff1a',
				opacity: o * 0.85,
				filter: 'blur(22px)',
				transform: 'rotate(-28deg) skewX(-20deg)',
			}}
		/>
	);
};

export const SceneFamille: React.FC<{
	fond: string;
	personnes: PersonneScene[];
	etapes: EtapeScene[];
	etiquettes: EtiquetteScene[];
	/** Grand mot derrière une personne (« MÈRE » derrière la mère, image 0,5-2 s). */
	mots?: {personne: string; texte: string; a: number; fin: number}[];
}> = ({fond, personnes, etapes, etiquettes, mots = []}) => {
	const f = useCurrentFrame();
	const vues = personnes
		.map((pe) => ({pe, r: poseA(etapes, pe.id, f)}))
		.filter((v) => v.r)
		.sort((a, b) => (a.r!.p.z ?? 0) - (b.r!.p.z ?? 0));
	const tete = (id: string) => {
		const v = vues.find((x) => x.pe.id === id);
		return v ? {x: v.r!.p.x, y: v.r!.p.sol - v.r!.p.h, h: v.r!.p.h} : null;
	};
	return (
		<AbsoluteFill style={{background: '#000', overflow: 'hidden'}}>
			{fond === 'grille' ? (
				<GrilleAnimee />
			) : (
				<Img src={fond} style={{position: 'absolute', inset: 0, width: 1080, height: 1920, transform: `scale(${1.04 + 0.03 * Math.sin(f / 40)})`}} />
			)}
			{mots.map((m, i) => {
				const t = tete(m.personne);
				if (!t || f < m.a || f >= m.fin) return null;
				const s = ressort(f, m.a);
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: 0,
							right: 0,
							top: 430,
							textAlign: 'center',
							fontFamily: FONT,
							fontWeight: 900,
							fontSize: 330,
							letterSpacing: -6,
							lineHeight: 1,
							color: '#f2ff1f',
							WebkitTextStroke: '6px #000',
							paintOrder: 'stroke fill',
							transform: `scale(${0.6 + 0.4 * s})`,
							opacity: Math.min(1, s * 2),
							textShadow: `0 0 ${40 * Math.max(0, 1 - (f - m.a) / 8)}px #f2ff1f`,
						}}
					>
						{m.texte}
					</div>
				);
			})}
			{vues.map(({pe, r}) => {
				const {p} = r!;
				const w = (p.h * pe.w) / pe.h;
				return <Img key={pe.id} src={pe.src} style={{position: 'absolute', left: p.x - w / 2, top: p.sol - p.h, width: w, height: p.h}} />;
			})}
			{vues.map(({pe, r}) => {
				const top = r!.p.sol - r!.p.h;
				return <Eclair key={pe.id} x={r!.p.x} y={top + r!.p.h * 0.06} f={f} at={r!.entree} />;
			})}
			{etiquettes.map((e, i) => {
				const t = tete(e.personne);
				if (!t || f < e.a || (e.fin !== undefined && f >= e.fin)) return null;
				const s = ressort(f, e.a);
				const taille = Math.max(78, t.h * 0.085);
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: t.x - 400,
							width: 800,
							top: t.y - taille * 1.12,
							textAlign: 'center',
							fontFamily: FONT,
							fontWeight: 900,
							fontSize: taille,
							color: e.couleur ?? '#f2ff1f',
							WebkitTextStroke: `${Math.round(taille / 14)}px #000`,
							paintOrder: 'stroke fill',
							transform: `scale(${0.4 + 0.6 * s})`,
							transformOrigin: '50% 100%',
						}}
					>
						{e.texte}
					</div>
				);
			})}
		</AbsoluteFill>
	);
};
