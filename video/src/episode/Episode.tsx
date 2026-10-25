import React, {useEffect, useState} from 'react';
import {
	AbsoluteFill,
	Audio,
	CalculateMetadataFunction,
	cancelRender,
	continueRender,
	delayRender,
	Easing,
	Img,
	interpolate,
	Sequence,
	staticFile,
	useCurrentFrame,
} from 'remotion';
import {ease, pop} from '../anim';
import {Sfx, SfxOn} from '../components/Sfx';
import {makeTiming, Timeline} from '../timing';
import {Paper, Typed} from './Paper';
import {CarteCommentaire} from './CarteCommentaire';
import {ChargementPlan} from './ChargementPlan';
import {FormulaireGrandimi} from './FormulaireGrandimi';
import {SceneFamille} from './SceneFamille';
import {HookCommentaires} from './HookCommentaires';
import {DashboardGrandimi} from './Dashboard';
import {HookTaille} from './HookTaille';
import {EntreeGlitch, EntreeJauneGlisse, FlashOrangeJaune, SortieGlitch, SortieJaune, SortieRadial, SortieZoomFlou} from './TransitionsSteve';
import {TopoAnime} from './TopoAnime';
import {Cam, Shot} from './Shot';
import {FONT} from '../theme';
import {P5} from './style';
import type {Ancre, Element, Episode as EpisodeData, Famille, Plan} from './types';

export type EpisodeProps = {
	episode: string;
	sousTitres?: boolean;
	voix?: boolean;
	musique?: boolean;
	bruitages?: boolean;
	// Remplis par calculateMetadata à partir de public/episodes/<episode>/.
	data?: EpisodeData;
	timeline?: Timeline;
};

export const calculateEpisodeMetadata: CalculateMetadataFunction<EpisodeProps> = async ({props}) => {
	const base = `episodes/${props.episode}`;
	const [data, timeline] = await Promise.all([
		fetch(staticFile(`${base}/episode.json`)).then((r) => r.json()),
		fetch(staticFile(`${base}/timeline.json`)).then((r) => r.json()),
	]);
	return {durationInFrames: timeline.totalFrames, fps: timeline.fps, props: {...props, data, timeline}};
};

/** Transforme une ancre (« age:1m73-2 », nombre…) en frame absolue. */
const makeResolver = (tl: Timeline) => {
	const T = makeTiming(tl);
	return (a: Ancre, planStart = 0): number => {
		if (typeof a === 'number') return planStart + a;
		if (a === 'fin') return tl.totalFrames;
		const m = a.match(/^([A-Za-z0-9_]+)(?::(.+?)(?:#(\d+))?)?([+-]\d+)?$/);
		if (!m) throw new Error(`Ancre illisible : ${a}`);
		const [, id, word, nth, offset] = m;
		const l = T.line(id);
		const base = !word ? l.from : word === 'fin' ? l.from + l.duration : T.wordAt(id, word, nth ? Number(nth) - 1 : 0);
		return base + (offset ? Number(offset) : 0);
	};
};

/* ───────── Transitions ───────── */
const Whip: React.FC<{vitesse?: number; children: React.ReactNode}> = ({vitesse = 1, children}) => {
	const f = useCurrentFrame();
	const t = ease(f, 0, 7 / vitesse);
	return (
		<AbsoluteFill
			style={{
				transform: `translateY(${(1 - t) * -620}px) scale(${1 + (1 - t) * 0.12})`,
				filter: t < 1 ? `blur(${(1 - t) * 26}px)` : undefined,
			}}
		>
			{children}
		</AbsoluteFill>
	);
};

/** Interpolation par paliers (frames du plan → valeurs), bornée. */
const kf = (f: number, frames: number[], values: number[]) =>
	interpolate(f, frames, values, {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)});

/*
 * Mouvements mesurés sur la référence 7436214342510513439 (10 images/s), convertis en pixels d'écran :
 *   glisse   : entrée par la droite après la lumière jaune (décalage −84 → +25 → 0)
 *   rebond   : dézoom de transition (×1,135 → ×0,914 → ×1,019 → ×0,967 → ×1), léger décalage
 *   secousse : tremblement gauche-droite sur le nom de l'app (−90 → +24 → −6 → 0, ×0,92 → ×1)
 *   bascule  : entrée inclinée qui se redresse (−24° → +3° → 0°, ×1,4 → ×0,95 → ×1), référence 7444371749753408810
 */
/*   etire    : arrivée de l'écran stats, étirement vertical + dézoom ×1,17 → ×1,03 → ×0,986 → ×1 (référence partie 11, 16,3-16,6 s)
 *   radial   : arrivée en flou radial (zoom ×1,3 → ×1), plans topo de la référence partie 11
 */
const MOUVEMENTS: Record<string, {f: number[]; x: number[]; s: number[]; r?: number[]; sy?: number[]; flou: number}> = {
	glisse: {f: [0, 3, 6, 9], x: [-84, 25, -1, 0], s: [0.975, 0.986, 1, 1], flou: 12},
	rebond: {f: [0, 3, 6, 9, 12], x: [59, 16, -8, 1, 0], s: [1.135, 0.914, 1.019, 0.967, 1], flou: 14},
	secousse: {f: [0, 3, 6, 9, 12], x: [-90, 24, -6, 1, 0], s: [0.92, 0.979, 0.995, 0.998, 1], flou: 10},
	etire: {f: [0, 3, 6, 9], x: [0, 0, 0, 0], s: [1.17, 1.03, 0.986, 1], sy: [2.4, 1.15, 1, 1], flou: 16},
	radial: {f: [0, 3, 6], x: [0, 0, 0], s: [1.3, 1.05, 1], flou: 18},
	bascule: {
		f: [0, 1, 2, 3, 4, 5, 7, 9],
		x: [0, 0, 0, 0, 0, 0, 0, 0],
		s: [1.4, 1.15, 1.04, 0.98, 0.95, 0.97, 1, 1],
		r: [-24, -14, -6, -1, 3, 2, 0.5, 0],
		flou: 14,
	},
};

/** vitesse > 1 : même mouvement en moins de frames (rythme « sec »). */
const Mouvement: React.FC<{type: string; at: number; vitesse?: number; children: React.ReactNode}> = ({type, at, vitesse = 1, children}) => {
	const f = (useCurrentFrame() - at) * vitesse;
	const m = MOUVEMENTS[type];
	const active = f >= 0 && f <= m.f[m.f.length - 1];
	const x = active ? kf(f, m.f, m.x) : 0;
	const sc = active ? kf(f, m.f, m.s) : 1;
	const r = active && m.r ? kf(f, m.f, m.r) : 0;
	const sy = active && m.sy ? kf(f, m.f, m.sy) : 1;
	const blur = active ? interpolate(f, [0, 6], [m.flou, 0], {extrapolateRight: 'clamp'}) : 0;
	return (
		<AbsoluteFill
			style={{
				transform: `translateX(${x}px) scale(${sc})${sy !== 1 ? ` scaleY(${sy})` : ''}${r ? ` rotate(${r}deg)` : ''}`,
				filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
			}}
		>
			{children}
		</AbsoluteFill>
	);
};

/** Lumière jaune : envahit l'image (sortie) ou s'efface (entrée). */
/** fort : lumière couvrante jaune-orangé (sans mode « screen »), comme la référence partie 11. */
const Lumiere: React.FC<{from: number; to: number; entree?: boolean; fort?: boolean}> = ({from, to, entree, fort}) => {
	const f = useCurrentFrame();
	const o = entree
		? interpolate(f, [from, to], [0.9, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
		: interpolate(f, [from, to], [0, 0.9], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	if (o <= 0.01) return null;
	return (
		<AbsoluteFill
			style={{
				background: fort
					? 'radial-gradient(circle at 55% 45%, rgba(255,240,120,1) 0%, rgba(255,200,30,0.95) 50%, rgba(255,150,20,0.9) 100%)'
					: 'radial-gradient(circle at 55% 45%, rgba(255,246,170,1) 0%, rgba(255,226,60,0.95) 45%, rgba(255,208,20,0.85) 100%)',
				opacity: o,
				mixBlendMode: fort ? 'normal' : 'screen',
			}}
		/>
	);
};

/** Icône message privé (bulle blanche) avec pastille rouge « +N » qui compte de `de` à `vers`. */
const DM: React.FC<{el: Extract<Element, {type: 'dm'}>; at: number}> = ({el, at}) => {
	const f = useCurrentFrame();
	if (f < at) return null;
	const e = pop(f, at, 11);
	const n = Math.round(el.de + (el.vers - el.de) * Math.min(1, (f - at) / 8));
	const t = el.taille;
	return (
		<div style={{position: 'absolute', left: el.x, top: el.y, width: t, height: t, transform: `scale(${e})`, opacity: Math.min(1, e * 1.5)}}>
			<svg width={t} height={t} viewBox="0 0 100 100" style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
				<path
					d="M14 18 H86 Q92 18 92 24 V66 Q92 72 86 72 H58 L44 88 L40 72 H14 Q8 72 8 66 V24 Q8 18 14 18 Z"
					fill="none"
					stroke="#fff"
					strokeWidth={7}
					strokeLinejoin="round"
				/>
				<line x1={36} x2={64} y1={45} y2={45} stroke="#fff" strokeWidth={7} strokeLinecap="round" />
			</svg>
			<div
				style={{
					position: 'absolute',
					left: t * 0.62,
					top: -t * 0.22,
					background: '#fe2c55',
					color: '#fff',
					fontFamily: FONT,
					fontWeight: 800,
					fontSize: t * 0.24,
					padding: `${t * 0.05}px ${t * 0.1}px`,
					borderRadius: t * 0.2,
				}}
			>
				+{n}
			</div>
		</div>
	);
};

const Pousse: React.FC<{dur: number; de: number; children: React.ReactNode}> = ({dur, de, children}) => {
	const z = 1 + (de * useCurrentFrame()) / Math.max(1, dur);
	return <AbsoluteFill style={{transform: `scale(${z})`}}>{children}</AbsoluteFill>;
};

/** Fond qui passe au noir à la fin (les éléments restent par-dessus, référence partie 11). */
const FonduNoir: React.FC<{from: number; to: number}> = ({from, to}) => {
	const o = interpolate(useCurrentFrame(), [from, to], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return o > 0 ? <AbsoluteFill style={{background: '#000', opacity: o}} /> : null;
};

/** Fondu au blanc (fin de vidéo qui reboucle sur l'accroche dessinée, fond blanc). */
const FonduBlanc: React.FC<{from: number; to: number}> = ({from, to}) => {
	const o = interpolate(useCurrentFrame(), [from, to], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return o > 0 ? <AbsoluteFill style={{background: '#fff', opacity: o}} /> : null;
};

const Flash: React.FC<{color: string; vitesse?: number}> = ({color, vitesse = 1}) => {
	const f = useCurrentFrame() * vitesse;
	const o = interpolate(f, [0, 2, 9], [0, 0.95, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return <AbsoluteFill style={{background: color, opacity: o}} />;
};

/* ───────── Éléments ───────── */
const Trait: React.FC<{el: Extract<Element, {type: 'trait'}>; at: number; fin?: number; w: number; h: number}> = ({el, at, fin, w, h}) => {
	const f = useCurrentFrame();
	const t = ease(f, at, el.duree ?? 10);
	if (f < at || (fin !== undefined && f >= fin)) return null;
	const color = el.couleur ?? P5.yellow;
	const width = el.epaisseur ?? 14;
	return (
		<svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
			<g style={{filter: 'drop-shadow(0 3px 2px rgba(0,0,0,0.55))'}}>
				<path
					d={el.d}
					pathLength={1}
					stroke={color}
					strokeWidth={width}
					fill="none"
					strokeLinecap="round"
					strokeDasharray={1}
					strokeDashoffset={1 - t}
				/>
				{el.tete && t > 0.95 ? (
					<path d={el.tete} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
				) : null}
			</g>
		</svg>
	);
};

const ImageEl: React.FC<{el: Extract<Element, {type: 'image'}>; at: number; fin?: number; src: string; src2?: string}> = ({
	el,
	at,
	fin,
	src,
	src2,
}) => {
	const f = useCurrentFrame();
	if (f < at) return null;
	let transform: string | undefined;
	let clipPath: string | undefined;
	let opacity: number | undefined;
	if (el.grandit) {
		const g = interpolate(f, [at, at + el.grandit.d], [el.grandit.de, 1], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
			easing: Easing.out(Easing.cubic),
		});
		const out = fin !== undefined ? 1 - ease(f, fin, 5) : 1;
		if (out <= 0.01) return null;
		transform = `scale(${g * (1 + Math.max(0, f - at - el.grandit.d) * 0.0008)})`;
		opacity = out;
	} else if (el.depuis) {
		const d = el.depuis.d ?? 8;
		const t = ease(f, at, d);
		const out = fin !== undefined ? 1 - ease(f, fin, 5) : 1;
		if (out <= 0.01) return null;
		const bob = el.rebond && f > at + d ? -Math.abs(Math.sin((f - at - d) / 4)) * 16 : 0;
		transform = `translate(${(1 - t) * (el.depuis.x ?? 0)}px, ${(1 - t) * (el.depuis.y ?? 0) + bob}px)`;
		opacity = Math.min(1, t * 1.6) * out;
	} else if (el.effet === 'revele-bas') {
		clipPath = `inset(${(1 - ease(f, at, 8)) * 100}% 0 0 0)`;
		// Rebond vertical une fois la flèche apparue, comme un sticker animé.
		if (el.rebond && f > at + 8) transform = `translateY(${-Math.abs(Math.sin((f - at - 8) / 4)) * 22}px)`;
	} else if (el.effet) {
		const s = pop(f, at, 9) * (fin !== undefined ? 1 - ease(f, fin, 6) : 1);
		if (s <= 0.01) return null;
		const wob = el.effet === 'pop-balance' ? Math.sin((f - at) / 5) * 3 : 0;
		transform = `scale(${s}) rotate(${wob}deg)`;
	}
	return (
		<Img
			src={src2 && Math.floor((f - at) / (el.periode ?? 4)) % 2 === 1 ? src2 : src}
			style={{
				position: 'absolute',
				left: el.x,
				top: el.y,
				width: el.w,
				height: el.h,
				transform,
				clipPath,
				opacity,
				transformOrigin: el.grandit ? '50% 100%' : undefined,
			}}
		/>
	);
};

const TexteEl: React.FC<{el: Extract<Element, {type: 'texte'}>; at: number; fin?: number; partie: number}> = ({el, at, fin, partie}) => {
	const f = useCurrentFrame();
	if (f < at) return null;
	const sortie = fin !== undefined ? 1 - ease(f, fin, 5) : 1;
	const s = el.effet === 'glitch' || el.effet === 'fondu' ? sortie : pop(f, at, el.amorti ?? 9) * sortie;
	if (s <= 0.01) return null;
	const texte = el.texte.replace('{partie}', String(partie));
	const dx = el.x !== undefined ? el.x - 540 : 0;
	if (el.effet === 'glitch' || el.effet === 'fondu') {
		// glitch : décalages rouge / vert et tranches décalées pendant 6 frames (« ANALYZED », référence partie 11) ;
		// fondu : apparition en fondu avec lueur qui s'intensifie (« Not cooked »).
		const g = f - at;
		const actif = el.effet === 'glitch' && g < 6;
		const dx = actif ? (6 - g) * 4 * (g % 2 ? 1 : -1) : 0;
		const o = el.effet === 'fondu' ? ease(f, at, 6) : 1;
		return (
			<div
				style={{
					position: 'absolute',
					left: dx,
					right: -dx,
					top: el.y,
					textAlign: 'center',
					...P5.caption,
					color: el.couleur ?? P5.yellow,
					fontSize: el.taille,
					fontWeight: el.poids ?? 800,
					WebkitTextStroke: `${el.contour ?? 3}px ${el.contourCouleur ?? '#000'}`,
					textShadow: actif
						? `${dx}px 0 0 rgba(255,0,60,0.9), ${-dx}px 0 0 rgba(0,255,120,0.9)`
						: el.lueur
							? `0 0 18px ${el.lueur}, 0 0 36px ${el.lueur}`
							: P5.caption.textShadow,
					transform: actif ? `translateX(${dx * 0.6}px) skewX(${dx * 0.8}deg)` : undefined,
					clipPath: actif && g % 3 === 1 ? 'inset(0 0 45% 0)' : undefined,
					opacity: o * sortie,
				}}
			>
				{texte}
			</div>
		);
	}
	const rot = el.effet === 'pop-balance' ? Math.sin(f / 8) * 6 : 0;
	if (el.fond) {
		return (
			<div style={{position: 'absolute', left: dx, right: -dx, top: el.y, display: 'flex', justifyContent: 'center'}}>
				<div
					style={{
						...P5.caption,
						color: el.couleur ?? P5.yellow,
						WebkitTextStroke: '0px',
						textShadow: 'none',
						background: el.fond,
						borderRadius: 30,
						padding: '14px 36px 22px',
						fontSize: el.taille,
						transform: `scale(${s}) rotate(${rot}deg)`,
					}}
				>
					{texte}
				</div>
			</div>
		);
	}
	const style: React.CSSProperties =
		el.contour === 0
			? {fontSize: el.taille}
			: {
					...P5.caption,
					color: el.couleur ?? P5.yellow,
					fontSize: el.taille,
					fontWeight: el.poids ?? 800,
					WebkitTextStroke: `${el.contour ?? 6}px ${el.contourCouleur ?? '#000'}`,
					textShadow: el.lueur
						? `0 0 18px ${el.lueur}, 0 0 36px ${el.lueur}`
						: el.contourCouleur
							? '0 8px 14px rgba(0,0,0,0.55)'
							: P5.caption.textShadow,
				};
	return (
		<div style={{position: 'absolute', left: dx, right: -dx, top: el.y, textAlign: 'center', ...style, transform: `scale(${s}) rotate(${rot}deg)`}}>
			{texte}
		</div>
	);
};

/** Photos de papier froissé qui alternent toutes les `saccade` frames. */
const PhotoPapier: React.FC<{files: string[]; saccade?: number}> = ({files, saccade = 7}) => {
	const f = useCurrentFrame();
	const src = files[Math.floor(Math.max(0, f) / saccade) % files.length];
	return <Img src={src} style={{position: 'absolute', inset: 0, width: 1080, height: 1920, objectFit: 'cover'}} />;
};

/** Coup de zoom flou (mesuré sur l'appel de la référence v12044 : flou radial pendant ~4 frames, zoom ×1,16). */
const CoupFlou: React.FC<{at?: number; vitesse?: number; children: React.ReactNode}> = ({at, vitesse = 1, children}) => {
	const f0 = useCurrentFrame();
	if (at === undefined || f0 < at) return <>{children}</>;
	const f = at + (f0 - at) * vitesse;
	const z = 1 + 0.16 * ease(f, at, 8);
	const b = interpolate(f, [at, at + 2, at + 7], [0, 14, 0], {extrapolateRight: 'clamp'});
	return <AbsoluteFill style={{transform: `scale(${z})`, filter: b > 0.3 ? `blur(${b}px)` : undefined}}>{children}</AbsoluteFill>;
};

/** Suite d'images plein écran, une par frame ; la dernière reste affichée. */
const Sequence_: React.FC<{files: string[]}> = ({files}) => {
	const f = useCurrentFrame();
	const src = files[Math.min(files.length - 1, Math.max(0, f))];
	return <Img src={src} style={{position: 'absolute', inset: 0, width: 1080, height: 1920, objectFit: 'cover'}} />;
};

/* ───────── Révélation : compteur ───────── */
const Compteur: React.FC<{el: Extract<Element, {type: 'compteur'}>; at: number; arrivee: number; fin?: number}> = ({el, at, arrivee, fin}) => {
	const f = useCurrentFrame();
	if (f < at || (fin !== undefined && f >= fin + 8)) return null;
	// Défilement qui ralentit à l'approche du chiffre final.
	const t = interpolate(f, [at, arrivee], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	const v = Math.round(el.de + (el.vers - el.de) * t);
	const landed = f >= arrivee;
	const s = landed ? 1 + 0.25 * Math.max(0, 1 - (f - arrivee) / 8) : 0.9 + 0.04 * Math.sin(f * 1.7);
	const out = fin !== undefined ? 1 - ease(f, fin, 8) : 1;
	return (
		<AbsoluteFill style={{opacity: out}}>
			{el.voile !== false ? <AbsoluteFill style={{background: 'rgba(0,0,0,0.62)'}} /> : null}
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: el.y,
					textAlign: 'center',
					...P5.caption,
					fontSize: el.taille,
					fontWeight: 900,
					color: landed ? (el.couleur ?? P5.orange) : '#fff',
					WebkitTextStroke: '0px',
					textShadow: landed ? `0 0 40px ${el.couleur ?? P5.orange}` : '0 6px 0 rgba(0,0,0,0.4)',
					transform: `scale(${s})`,
					fontVariantNumeric: 'tabular-nums',
				}}
			>
				{v}
				<span style={{fontSize: el.taille * 0.45, marginLeft: 12}}>{el.suffixe ?? ' cm'}</span>
			</div>
		</AbsoluteFill>
	);
};

/* ───────── Zone de commentaire qui s'écrit seule ───────── */
const Commentaire: React.FC<{el: Extract<Element, {type: 'commentaire'}>; at: number; envoi?: number}> = ({el, at, envoi}) => {
	const f = useCurrentFrame();
	if (f < at) return null;
	const enter = pop(f, at, 14);
	const per = el.parLettre ?? 2;
	const n = Math.min(el.texte.length, Math.max(0, Math.floor((f - at - 6) / per)));
	const done = n >= el.texte.length;
	const cursor = Math.floor(f / 8) % 2 === 0;
	const sent = envoi !== undefined && f >= envoi ? pop(f, envoi, 10) : 0;
	return (
		<div
			style={{
				position: 'absolute',
				left: 40,
				right: 40,
				top: el.y,
				transform: `translateY(${(1 - enter) * 80}px)`,
				opacity: Math.min(1, enter * 1.4),
				fontFamily: FONT,
			}}
		>
			<div style={{color: '#fff', fontSize: 34, fontWeight: 700, marginBottom: 14, opacity: 0.85, textAlign: 'center'}}>
				💬 Écris en commentaire :
			</div>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 22,
					background: '#fff',
					borderRadius: 60,
					padding: '22px 22px 22px 30px',
					boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
				}}
			>
				<div style={{width: 74, height: 74, borderRadius: 37, background: 'linear-gradient(135deg,#ff8a52,#ff5a1f)', flexShrink: 0}} />
				<div style={{flex: 1, fontSize: 38, fontWeight: 700, color: n ? '#141414' : '#9a9a9a', lineHeight: 1.2}}>
					{n ? el.texte.slice(0, n) : 'Ajouter un commentaire…'}
					{!done && n > 0 && cursor ? <span style={{color: P5.orange}}>|</span> : null}
				</div>
				<div
					style={{
						width: 80,
						height: 80,
						borderRadius: 40,
						background: done ? P5.orange : '#e5e5e5',
						color: '#fff',
						fontSize: 44,
						fontWeight: 900,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexShrink: 0,
						transform: `scale(${1 + 0.25 * sent * Math.max(0, 1 - (f - (envoi ?? 0)) / 10)})`,
					}}
				>
					↑
				</div>
			</div>
		</div>
	);
};

/* ───────── Silhouettes de la famille ───────── */
const K = 5.4; // pixels par cm : silhouettes à l'échelle réelle
const SOL = 1700;
const Silhouette: React.FC<{x: number; cm: number; couleur: string; opacite?: number}> = ({x, cm, couleur, opacite = 1}) => {
	const h = cm * K;
	const top = SOL - h;
	const head = h * 0.065;
	const sh = h * 0.165; // largeur aux épaules
	return (
		<g opacity={opacite} fill={couleur}>
			<circle cx={x} cy={top + head} r={head} />
			<path
				d={`M ${x - sh / 2} ${top + h * 0.17} Q ${x} ${top + h * 0.145} ${x + sh / 2} ${top + h * 0.17}
				   L ${x + sh * 0.42} ${top + h * 0.53} L ${x - sh * 0.42} ${top + h * 0.53} Z`}
			/>
			<rect x={x - sh / 2 - h * 0.038} y={top + h * 0.17} width={h * 0.036} height={h * 0.33} rx={h * 0.018} />
			<rect x={x + sh / 2 + h * 0.002} y={top + h * 0.17} width={h * 0.036} height={h * 0.33} rx={h * 0.018} />
			<rect x={x - sh * 0.4} y={top + h * 0.5} width={sh * 0.37} height={h * 0.5} rx={h * 0.02} />
			<rect x={x + sh * 0.03} y={top + h * 0.5} width={sh * 0.37} height={h * 0.5} rx={h * 0.02} />
		</g>
	);
};

const fmt = (cm: number) => `${Math.floor(cm / 100)}m${String(Math.round(cm % 100)).padStart(2, '0')}`;

const FamillePlan: React.FC<{fam: Famille; aOpt: number; aGain: number}> = ({fam, aOpt, aGain}) => {
	const f = useCurrentFrame();
	const all = [...fam.personnes, {nom: fam.futur.nom, taille: fam.futur.estimee, couleur: P5.orange}];
	const xs = all.map((_, i) => 150 + i * ((1080 - 300) / (all.length - 1)));
	const xPill = xs[xs.length - 1];
	const grow = interpolate(f, [4 * all.length, 4 * all.length + 12], [fam.futur.depart, fam.futur.estimee], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: Easing.out(Easing.cubic),
	});
	const opt = interpolate(f, [aOpt, aOpt + 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.back(1.6))});
	const futurCm = grow + (fam.futur.optimisee - fam.futur.estimee) * opt;
	const yOf = (cm: number) => SOL - cm * K;
	const gain = pop(f, aGain, 10);
	const lignes = [150, 160, 170, 180, 190];
	return (
		<AbsoluteFill style={{background: 'radial-gradient(circle at 50% 35%, #2a1a12 0%, #111 60%)'}}>
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				{lignes.map((c) => (
					<g key={c}>
						<line x1={60} x2={1040} y1={yOf(c)} y2={yOf(c)} stroke="#fff" strokeOpacity={0.09} strokeWidth={2} />
					</g>
				))}
				{all.map((p, i) => {
					const s = pop(f, i * 4, 12);
					const isF = i === all.length - 1;
					const cm = isF ? futurCm : p.taille;
					return (
						<g key={i} transform={`translate(${xs[i]} ${SOL}) scale(${s}) translate(${-xs[i]} ${-SOL})`}>
							<Silhouette x={xs[i]} cm={cm} couleur={isF ? P5.orange : (p.couleur ?? '#cfcfcf')} />
							<text x={xs[i]} y={yOf(cm) - 64} textAnchor="middle" fill={isF ? P5.orange : '#fff'} fontSize={36} fontWeight={800} fontFamily={FONT}>
								{p.nom}
							</text>
							<text x={xs[i]} y={yOf(cm) - 22} textAnchor="middle" fill="#fff" fontSize={40} fontWeight={900} fontFamily={FONT}>
								{fmt(cm)}
							</text>
						</g>
					);
				})}
				{f >= aOpt ? (
					<line
						x1={60}
						x2={1040}
						y1={yOf(fam.futur.estimee)}
						y2={yOf(fam.futur.estimee)}
						stroke={P5.orange}
						strokeWidth={4}
						strokeDasharray="14 12"
						opacity={0.7}
					/>
				) : null}
				{gain > 0.01 ? (
					<g transform={`translate(${xPill} ${yOf(fam.futur.optimisee) - 150}) scale(${gain})`}>
						<rect x={-80} y={-34} width={160} height={68} rx={34} fill={P5.green} />
						<text x={0} y={13} textAnchor="middle" fill="#0b2a12" fontSize={36} fontWeight={900} fontFamily={FONT}>
							{fam.futur.gain}
						</text>
					</g>
				) : null}
			</svg>
			{fam.titre ? (
				<div
					style={{
						position: 'absolute',
						top: 150,
						left: 0,
						right: 0,
						textAlign: 'center',
						...P5.caption,
						fontSize: 70,
						transform: `scale(${pop(f, 0, 12)})`,
					}}
				>
					{fam.titre}
				</div>
			) : null}
		</AbsoluteFill>
	);
};

/* ───────── Plan ───────── */
const PlanView: React.FC<{plan: Plan; start: number; end: number; ep: EpisodeData; id: string; resolve: (a: Ancre, s?: number) => number}> = ({
	plan,
	start,
	end,
	ep,
	id,
	resolve,
}) => {
	const loc = (a: Ancre) => resolve(a, start) - start;
	const vite = ep.rythme === 'sec' ? 2 : 1;
	const dur = end - start;
	const img = plan.image ? ep.images[plan.image] : undefined;
	const file = (name: string) => staticFile(`episodes/${id}/images/${name}`);

	const cams: Cam[] = (plan.camera ?? []).map((c) => {
		const z = c.zone ? ep.zones[c.zone] : undefined;
		if (c.zone && !z) throw new Error(`Zone inconnue : ${c.zone}`);
		const f = c.a === undefined ? 0 : loc(c.a);
		const d = c.duree === 'fin' ? Math.max(8, dur - f) : c.duree;
		return {f, x: z?.x ?? c.x ?? 0, y: z?.y ?? c.y ?? 0, z: z?.z ?? c.z ?? 1, dur: d, lineaire: c.lineaire};
	});
	const sons: {at: number; son: string; volume: number}[] = [
		...(plan.sons ?? []).map((s) => ({at: loc(s.a), son: s.son, volume: s.volume ?? 0.5})),
		// Chaque mouvement de caméra (sauf le premier) a son petit whoosh, sauf si son: null.
		...(plan.camera ?? [])
			.slice(1)
			.flatMap((c, i) =>
				c.son === null || (ep.sonsMouvements === false && !c.son) ? [] : [{at: cams[i + 1].f, son: c.son ?? 'whoosh', volume: c.volume ?? 0.22}],
			),
		...(ep.sonsMouvements === false ? [] : (plan.effets ?? []).map((e) => ({at: loc(e.a), son: 'whoosh', volume: 0.3}))),
		...(plan.elements ?? []).flatMap((el) => {
			if (!el.son) return [];
			if (el.type === 'tape') {
				const per = el.parLettre ?? 2;
				const n = el.texte.replace('{partie}', String(ep.partie)).length;
				return Array.from({length: n}, (_, i) => ({at: loc(el.a) + i * per, son: el.son as string, volume: el.volume ?? 0.5}));
			}
			return [{at: loc(el.a), son: el.son, volume: el.volume ?? 0.5}];
		}),
	];

	const inImage = (plan.elements ?? []).map((el, i) => {
		if (el.type === 'image' && !el.ecran)
			return <ImageEl key={i} el={el} at={loc(el.a)} fin={el.fin !== undefined ? loc(el.fin) : undefined} src={file(el.fichier)} />;
		if (el.type === 'trait' && img)
			return <Trait key={i} el={el} at={loc(el.a)} fin={el.fin !== undefined ? loc(el.fin) : undefined} w={img.w} h={img.h} />;
		return null;
	});
	const onScreen = (plan.elements ?? []).map((el, i) => {
		if (el.type === 'image' && el.ecran)
			return <ImageEl key={i} el={el} at={loc(el.a)} fin={el.fin !== undefined ? loc(el.fin) : undefined} src={file(el.fichier)} />;
		if (el.type === 'texte')
			return <TexteEl key={i} el={el} at={loc(el.a)} fin={el.fin !== undefined ? loc(el.fin) : undefined} partie={ep.partie} />;
		if (el.type === 'compteur')
			return <Compteur key={i} el={el} at={loc(el.a)} arrivee={loc(el.arrivee)} fin={el.fin !== undefined ? loc(el.fin) : undefined} />;
		if (el.type === 'dm') return <DM key={i} el={el} at={loc(el.a)} />;
		if (el.type === 'chargement')
			return (
				<ChargementPlan
					key={i}
					at={loc(el.a)}
					fin={loc(el.fin)}
					etapes={el.etapes.map((e) => ({texte: e.texte, a: loc(e.a)}))}
					x={el.x ?? 575}
					y={el.y ?? 560}
					w={el.w ?? 470}
					h={el.h ?? 1000}
					titre={el.titre}
				/>
			);
		if (el.type === 'formulaire')
			return <FormulaireGrandimi key={i} fin={loc(el.fin)} ecrans={el.ecrans.map((e) => ({...e, a: loc(e.a)}))} />;
		if (el.type === 'commentaire') return <Commentaire key={i} el={el} at={loc(el.a)} envoi={el.envoi !== undefined ? loc(el.envoi) : undefined} />;
		if (el.type === 'tape')
			return (
				<Sequence key={i} from={0} durationInFrames={el.fin !== undefined ? Math.max(1, loc(el.fin)) : dur} layout="none">
					<Typed
						key={i}
						text={el.texte.replace('{partie}', String(ep.partie))}
						at={loc(el.a)}
						perLetter={el.parLettre ?? 2}
						y={el.y}
						size={el.taille}
						color={el.couleur}
						stroke={el.contour}
						curseur={el.curseur}
						fond={el.fond}
						police={el.police}
						poids={el.poids}
					/>
				</Sequence>
			);
		return null;
	});

	const content = (
		<AbsoluteFill>
			{plan.scene ? (
				<SceneFamille
					fond={plan.scene.fond === 'grille' ? 'grille' : file(plan.scene.fond)}
					personnes={plan.scene.personnes.map((p) => ({id: p.id, src: file(p.fichier), w: p.w, h: p.h}))}
					etapes={plan.scene.etapes.map((e) => ({f: loc(e.a), poses: e.poses}))}
					etiquettes={plan.scene.etiquettes.map((e) => ({...e, a: loc(e.a), fin: e.fin !== undefined ? loc(e.fin) : undefined}))}
					mots={(plan.scene.mots ?? []).map((m) => ({...m, a: loc(m.a), fin: loc(m.fin)}))}
				/>
			) : null}
			{plan.famille ? <FamillePlan fam={plan.famille} aOpt={loc(plan.famille.futur.aOptimisee)} aGain={loc(plan.famille.futur.aGain)} /> : null}
			{plan.dashboard ? (
				<DashboardGrandimi
					d={plan.dashboard.donnees}
					cams={plan.dashboard.cams.map((c) => ({...c, f: loc(c.a)}))}
					pops={plan.dashboard.pops.map((p) => ({...p, a: loc(p.a), fin: loc(p.fin)}))}
					fleches={plan.dashboard.fleches.map((fl) => ({...fl, a: loc(fl.a), fin: loc(fl.fin)}))}
					revele={plan.dashboard.revele !== undefined ? loc(plan.dashboard.revele) : undefined}
					url={plan.dashboard.url}
					entete={plan.dashboard.entete}
					ballon={
						plan.dashboard.ballon
							? {src: file(plan.dashboard.ballon.fichier), a: loc(plan.dashboard.ballon.a), fin: loc(plan.dashboard.ballon.fin)}
							: undefined
					}
				/>
			) : null}
			{plan.fond === 'papier' && plan.papiers?.length ? <PhotoPapier files={plan.papiers.map(file)} /> : null}
			{plan.fond === 'papier' && !plan.papiers?.length ? <Paper /> : null}
			{plan.hookCommentaires ? (
				<HookCommentaires
					actuelle={plan.hookCommentaires.actuelle}
					cible={plan.hookCommentaires.cible}
					potentiel={loc(plan.hookCommentaires.potentiel)}
					commentaires={loc(plan.hookCommentaires.commentaires)}
					bulles={plan.hookCommentaires.bulles}
				/>
			) : null}
			{plan.fond === 'topo' ? (
				<CoupFlou at={plan.topo?.coup !== undefined ? loc(plan.topo.coup) : undefined} vitesse={vite}>
					<TopoAnime zoomDe={plan.topo?.zoomDe} d={plan.topo?.d} />
				</CoupFlou>
			) : null}
			{(plan.effets ?? [])
				.filter((e) => e.type === 'flash')
				.map((e, i) => (
					<Sequence key={`flash-${i}`} from={loc(e.a)} durationInFrames={12} layout="none">
						{e.couleur === 'orange-jaune' ? <FlashOrangeJaune /> : <Flash color={e.couleur ?? P5.yellow} vitesse={vite} />}
					</Sequence>
				))}
			{plan.sortie === 'noir' ? <FonduNoir from={dur - 4} to={dur - 2} /> : null}
			{plan.sequence?.length ? <Sequence_ files={plan.sequence.map(file)} /> : null}
			{plan.hookTaille ? (
				<HookTaille
					cm={plan.hookTaille.cm}
					carte={loc(plan.hookTaille.carte)}
					moyenne={loc(plan.hookTaille.moyenne)}
					france={plan.hookTaille.france !== undefined ? loc(plan.hookTaille.france) : undefined}
					question={plan.hookTaille.question !== undefined ? loc(plan.hookTaille.question) : undefined}
					direct={plan.hookTaille.direct}
					regle={plan.hookTaille.regle !== undefined ? loc(plan.hookTaille.regle) : undefined}
					potentiel={plan.hookTaille.potentiel !== undefined ? loc(plan.hookTaille.potentiel) : undefined}
					finale={plan.hookTaille.finale !== undefined ? loc(plan.hookTaille.finale) : undefined}
				/>
			) : null}
			{img ? (
				<Shot
					src={`episodes/${id}/images/${img.fichier}`}
					w={img.w}
					h={img.h}
					cams={cams.length ? cams : [{f: 0, x: img.w / 2, y: img.h / 2, z: 1}]}
					bg={plan.fondCouleur}
					libre={plan.libre}
					derive={ep.deriveCamera !== false}
					flouMouvement={ep.rythme === 'sec'}
				>
					{inImage}
				</Shot>
			) : null}
			{onScreen}
			{plan.transition === 'flash' ? <Flash color={P5.yellow} vitesse={vite} /> : null}
			{plan.transition === 'flash-blanc' ? <Flash color="#fff" vitesse={vite} /> : null}
			{plan.transition === 'lumiere' || plan.transition === 'lumiere-rouge' ? <Lumiere from={0} to={Math.round(6 / vite)} entree /> : null}
			{plan.transition === 'lumiere-rouge' ? <Flash color="#ff1a1a" vitesse={vite} /> : null}
			{plan.sortie === 'lumiere' || plan.sortie === 'lumiere-forte' ? (
				<Lumiere from={dur - Math.round(8 / vite)} to={dur} fort={plan.sortie === 'lumiere-forte'} />
			) : null}
			{plan.sortie === 'blanc' ? <FonduBlanc from={dur - 4} to={dur - 1} /> : null}
			{plan.sortie === 'jaune' ? <SortieJaune dur={dur} /> : null}
			{plan.sortie === 'glitch' ? <SortieGlitch dur={dur} /> : null}
			{sons.map((s, i) => (
				<Sfx key={i} at={s.at} name={s.son as never} volume={s.volume} />
			))}
		</AbsoluteFill>
	);
	let out = content;
	for (const e of plan.effets ?? [])
		if (e.type === 'secousse')
			out = (
				<Mouvement type={e.type} at={loc(e.a)}>
					{out}
				</Mouvement>
			);
	if (plan.pousse) out = <Pousse dur={dur} de={plan.pousse}>{out}</Pousse>;
	if (plan.sortie === 'zoom-flou') out = <SortieZoomFlou dur={dur}>{out}</SortieZoomFlou>;
	if (plan.sortie === 'radial-fin') out = <SortieRadial dur={dur}>{out}</SortieRadial>;
	if (plan.transition === 'jaune-glisse') return <EntreeJauneGlisse>{out}</EntreeJauneGlisse>;
	if (plan.transition === 'glitch') return <EntreeGlitch>{out}</EntreeGlitch>;
	if (plan.transition === 'whip') return <Whip vitesse={vite}>{out}</Whip>;
	if (plan.transition === 'glisse' || plan.transition === 'lumiere')
		return (
			<Mouvement type="glisse" at={0} vitesse={vite}>
				{out}
			</Mouvement>
		);
	if (plan.transition === 'rebond')
		return (
			<Mouvement type="rebond" at={0} vitesse={vite}>
				{out}
			</Mouvement>
		);
	if (plan.transition === 'bascule')
		return (
			<Mouvement type="bascule" at={0} vitesse={vite}>
				{out}
			</Mouvement>
		);
	if (plan.transition === 'etire')
		return (
			<Mouvement type="etire" at={0} vitesse={vite}>
				{out}
			</Mouvement>
		);
	if (plan.transition === 'radial')
		return (
			<Mouvement type="radial" at={0} vitesse={vite}>
				{out}
			</Mouvement>
		);
	return out;
};

/* ───────── Sous-titres jaunes, un ou deux mots à la fois ───────── */
const norm = (s: string) =>
	s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]/g, '');

const chunkWords = (tl: Timeline, keywords: string[], maxWords = 2, maxChars = 14) =>
	tl.lines.flatMap((l) => {
		const out: {from: number; words: string[]; times: number[]}[] = [];
		let cur: {f: number; w: string}[] = [];
		const push = () => cur.length && out.push({from: cur[0].f, words: cur.map((x) => x.w), times: cur.map((x) => x.f)});
		for (const wd of l.words) {
			const len = cur.map((x) => x.w).join(' ').length + wd.w.length;
			if (cur.length && (cur.length >= maxWords || len > maxChars || keywords.includes(norm(wd.w)))) {
				push();
				cur = [];
			}
			cur.push(wd);
			if (/[,.:;?!]$/.test(wd.w) || keywords.includes(norm(wd.w))) {
				push();
				cur = [];
			}
		}
		push();
		return out;
	});

type Fenetre = {
	from: number;
	to: number;
	upper?: boolean;
	y: number;
	size: number;
	chunks: {from: number; words: string[]; times: number[]}[];
	keywords: string[];
	verts: string[];
	police?: string;
	couleur?: string;
	reprise?: boolean;
	condense?: boolean;
	weight: number;
	stroke: number;
	pop: boolean;
};

const Captions: React.FC<{windows: Fenetre[]}> = ({windows}) => {
	const f = useCurrentFrame();
	const win = windows.find((x) => f >= x.from && f < x.to);
	if (!win) return null;
	const {chunks, keywords} = win;
	const idx = chunks.findIndex((c, i) => f >= c.from && (i + 1 >= chunks.length || f < chunks[i + 1].from));
	const c = chunks[idx];
	if (!c || (c.from < win.from - 2 && !win.reprise)) return null;
	const s = win.pop ? 0.82 + 0.18 * pop(f, c.from, 10) : 1;
	if (win.condense) {
		// Mot en cours de prononciation surligné (modèle de l'accroche a56d6d55).
		const cur = c.times.reduce((k, t, i) => (f >= t ? i : k), 0);
		const entree = 0.86 + 0.14 * pop(f, c.from, 12); // chaque groupe de mots arrive avec un petit rebond
		return (
			<div style={{position: 'absolute', left: 40, right: 40, top: win.y, textAlign: 'center', transform: `scale(${entree})`}}>
				{c.words.map((word, i) => (
					<span
						key={i}
						style={{
							fontFamily: "'Barlow Condensed', " + FONT,
							fontWeight: 800,
							fontSize: win.size,
							textTransform: 'uppercase',
							color: '#fff',
							WebkitTextStroke: `${win.stroke}px #000`,
							paintOrder: 'stroke fill',
							display: 'inline-block',
							margin: '0 6px',
							padding: '0 14px',
							borderRadius: 18,
							lineHeight: 1.1,
							// Pastille du mot prononcé : apparaît en 4 frames (fondu + léger zoom) au lieu de sauter.
							background: c.words.length > 1 && i === cur ? `rgba(232,40,80,${0.92 * ease(f, c.times[i], 4)})` : 'transparent',
							boxShadow: c.words.length > 1 && i === cur ? `0 0 18px rgba(232,40,80,${0.55 * ease(f, c.times[i], 4)})` : 'none',
							transform: c.words.length > 1 && i === cur ? `scale(${0.94 + 0.06 * ease(f, c.times[i], 4)})` : undefined,
						}}
					>
						{word.replace(/[,.:;?!]$/, '')}
					</span>
				))}
			</div>
		);
	}
	return (
		<div style={{position: 'absolute', left: 40, right: 40, top: win.y, textAlign: 'center', transform: `scale(${s})`}}>
			{c.words.map((word, i) => {
				const key = keywords.includes(norm(word));
				const vert = win.verts.includes(norm(word));
				return (
					<span
						key={i}
						style={{
							...P5.caption,
							fontSize: win.size,
							fontWeight: win.weight,
							WebkitTextStroke: `${win.stroke}px #000`,
							textTransform: win.upper ? 'uppercase' : 'none',
							display: 'inline-block',
							margin: '0 12px',
							...(win.police
								? {
										fontFamily: `'${win.police}', sans-serif`,
										color: win.couleur ?? P5.yellow,
										letterSpacing: 0,
										margin: '0 9px',
										textShadow: '0 2px 3px rgba(0,0,0,0.45)',
									}
								: {}),
							...(vert
								? {color: win.police ? '#24ef3c' : '#3dff52', textShadow: win.police ? '0 2px 3px rgba(0,0,0,0.45)' : '0 0 14px rgba(40,255,70,0.8)'}
								: {}),
							...(key
								? {color: '#fff', WebkitTextStroke: '0px', background: P5.orange, borderRadius: 22, padding: '6px 26px 12px', textShadow: 'none'}
								: {}),
						}}
					>
						{word.replace(/[,.:;?!]$/, '')}
					</span>
				);
			})}
		</div>
	);
};

/** Polices des accroches dessinées (Poppins pour le chiffre, Barlow Condensed pour les sous-titres). */
const usePolices = () => {
	const [handle] = useState(() => delayRender('Polices'));
	useEffect(() => {
		const fonts = [
			new FontFace('Poppins', `url(${staticFile('fonts/poppins-latin-800-normal.woff2')})`, {weight: '800'}),
			new FontFace('Barlow Condensed', `url(${staticFile('fonts/barlow-condensed-latin-800-normal.woff2')})`, {weight: '800'}),
			new FontFace('Fredoka', `url(${staticFile('fonts/fredoka-latin-700-normal.woff2')})`, {weight: '700'}),
			...[600, 700, 800, 900].map(
				(w) => new FontFace('Montserrat', `url(${staticFile(`fonts/montserrat-latin-${w}-normal.woff2`)})`, {weight: String(w)}),
			),
		];
		Promise.all(fonts.map((x) => x.load()))
			.then((loaded) => {
				loaded.forEach((x) => document.fonts.add(x));
				continueRender(handle);
			})
			.catch((e) => cancelRender(e));
	}, [handle]);
};

/** Titre fixe style texte TikTok : blanc, contour noir fin, émojis en couleur. */
const TitreFixe: React.FC<{texte: string; de: number; a: number; y: number; taille: number}> = ({texte, de, a, y, taille}) => {
	const f = useCurrentFrame();
	if (f < de || f >= a) return null;
	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				right: 0,
				top: y,
				textAlign: 'center',
				fontFamily: `${FONT}, 'Noto Color Emoji'`,
				fontWeight: 800,
				fontSize: taille,
				color: '#fff',
				WebkitTextStroke: `${Math.round(taille / 16)}px #000`,
				paintOrder: 'stroke fill',
				letterSpacing: -1,
				whiteSpace: 'nowrap',
			}}
		>
			{texte}
		</div>
	);
};

/* ───────── Composition ───────── */
export const Episode: React.FC<EpisodeProps> = ({episode, data, timeline, sousTitres = true, voix = true, musique = true, bruitages = true}) => {
	usePolices();
	if (!data || !timeline) return null;
	const resolve = makeResolver(timeline);
	const END = timeline.totalFrames;
	const starts = data.plans.map((p) => resolve(p.debut));
	const keywords = data.sousTitres.motsCles.map(norm);
	const windows: Fenetre[] = data.sousTitres.fenetres.map((w) => ({
		from: resolve(w.de),
		to: resolve(w.a),
		y: w.y,
		size: w.taille,
		upper: w.majuscules,
		weight: w.poids ?? 800,
		stroke: w.contour ?? 6,
		keywords: w.motsCles === false ? [] : keywords,
		pop: w.pop !== false,
		condense: w.style === 'condense',
		verts: (w.verts ?? []).map(norm),
		police: w.police,
		reprise: w.reprise,
		couleur: w.couleur,
		chunks: chunkWords(timeline, w.motsCles === false ? [] : keywords, w.motsMax, w.carMax),
	}));
	const vol = data.musique?.volume ?? 0.08;
	return (
		<SfxOn.Provider value={bruitages}>
			<AbsoluteFill style={{background: '#000'}}>
				{musique && data.musique ? (
					<Audio
						src={staticFile(data.musique.fichier)}
						volume={(f) => interpolate(f, [0, 8, END - 25, END], [0, vol, vol, 0], {extrapolateRight: 'clamp'})}
					/>
				) : null}
				{voix && timeline.audio ? <Audio src={staticFile(`episodes/${episode}/${timeline.audio}`)} /> : null}
				{voix &&
					!timeline.audio &&
					timeline.lines.map((l) => (
						<Sequence key={l.id} from={l.from} durationInFrames={l.duration + 10} layout="none">
							<Audio src={staticFile(`episodes/${episode}/voice/${l.id}.wav`)} />
						</Sequence>
					))}
				{data.plans.map((p, i) => {
					const to = i + 1 < starts.length ? starts[i + 1] : END;
					return (
						<Sequence key={p.nom} name={p.nom} from={starts[i]} durationInFrames={to - starts[i]}>
							<PlanView plan={p} start={starts[i]} end={to} ep={data} id={episode} resolve={resolve} />
						</Sequence>
					);
				})}
				{data.carteCommentaire
					? [data.carteCommentaire, ...(data.carteCommentaire.retour ? [{...data.carteCommentaire, ...data.carteCommentaire.retour}] : [])].map((c, k) => (
							<CarteCommentaire
								key={k}
								nom={c.nom}
								texte={c.texte}
								de={resolve(c.de)}
								a={resolve(c.a)}
								haut={c.haut}
								x={c.x}
								y={c.y}
								ligne={c.ligne}
								w={c.w}
								reponse={c.reponse}
								photo={c.photo ? staticFile(`episodes/${episode}/images/${c.photo}`) : undefined}
							/>
						))
					: null}
				{data.titre ? (
					<TitreFixe
						texte={data.titre.texte}
						de={data.titre.de !== undefined ? resolve(data.titre.de) : 0}
						a={data.titre.a !== undefined ? resolve(data.titre.a) : END}
						y={data.titre.y ?? 300}
						taille={data.titre.taille ?? 92}
					/>
				) : null}
				{sousTitres ? <Captions windows={windows} /> : null}
			</AbsoluteFill>
		</SfxOn.Provider>
	);
};
