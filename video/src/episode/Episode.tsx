import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, CalculateMetadataFunction, cancelRender, continueRender, delayRender, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {ease, pop} from '../anim';
import {Sfx, SfxOn} from '../components/Sfx';
import {makeTiming, Timeline} from '../timing';
import {Paper, Typed} from './Paper';
import {HookTaille} from './HookTaille';
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
const Whip: React.FC<{children: React.ReactNode}> = ({children}) => {
	const f = useCurrentFrame();
	const t = ease(f, 0, 7);
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
const MOUVEMENTS: Record<string, {f: number[]; x: number[]; s: number[]; r?: number[]; flou: number}> = {
	glisse: {f: [0, 3, 6, 9], x: [-84, 25, -1, 0], s: [0.975, 0.986, 1, 1], flou: 12},
	rebond: {f: [0, 3, 6, 9, 12], x: [59, 16, -8, 1, 0], s: [1.135, 0.914, 1.019, 0.967, 1], flou: 14},
	secousse: {f: [0, 3, 6, 9, 12], x: [-90, 24, -6, 1, 0], s: [0.92, 0.979, 0.995, 0.998, 1], flou: 10},
	bascule: {f: [0, 1, 2, 3, 4, 5, 7, 9], x: [0, 0, 0, 0, 0, 0, 0, 0], s: [1.4, 1.15, 1.04, 0.98, 0.95, 0.97, 1, 1], r: [-24, -14, -6, -1, 3, 2, 0.5, 0], flou: 14},
};

const Mouvement: React.FC<{type: string; at: number; children: React.ReactNode}> = ({type, at, children}) => {
	const f = useCurrentFrame() - at;
	const m = MOUVEMENTS[type];
	const active = f >= 0 && f <= m.f[m.f.length - 1];
	const x = active ? kf(f, m.f, m.x) : 0;
	const sc = active ? kf(f, m.f, m.s) : 1;
	const r = active && m.r ? kf(f, m.f, m.r) : 0;
	const blur = active ? interpolate(f, [0, 6], [m.flou, 0], {extrapolateRight: 'clamp'}) : 0;
	return (
		<AbsoluteFill style={{transform: `translateX(${x}px) scale(${sc})${r ? ` rotate(${r}deg)` : ''}`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined}}>
			{children}
		</AbsoluteFill>
	);
};

/** Lumière jaune : envahit l'image (sortie) ou s'efface (entrée). */
const Lumiere: React.FC<{from: number; to: number; entree?: boolean}> = ({from, to, entree}) => {
	const f = useCurrentFrame();
	const o = entree ? interpolate(f, [from, to], [0.9, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
		: interpolate(f, [from, to], [0, 0.9], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	if (o <= 0.01) return null;
	return (
		<AbsoluteFill
			style={{
				background: 'radial-gradient(circle at 55% 45%, rgba(255,246,170,1) 0%, rgba(255,226,60,0.95) 45%, rgba(255,208,20,0.85) 100%)',
				opacity: o,
				mixBlendMode: 'screen',
			}}
		/>
	);
};

const Flash: React.FC<{color: string}> = ({color}) => {
	const f = useCurrentFrame();
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
				<path d={el.d} pathLength={1} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - t} />
				{el.tete && t > 0.95 ? (
					<path d={el.tete} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
				) : null}
			</g>
		</svg>
	);
};

const ImageEl: React.FC<{el: Extract<Element, {type: 'image'}>; at: number; fin?: number; src: string; src2?: string}> = ({el, at, fin, src, src2}) => {
	const f = useCurrentFrame();
	if (f < at) return null;
	let transform: string | undefined;
	let clipPath: string | undefined;
	let opacity: number | undefined;
	if (el.depuis) {
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
			style={{position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h, transform, clipPath, opacity}}
		/>
	);
};

const TexteEl: React.FC<{el: Extract<Element, {type: 'texte'}>; at: number; fin?: number; partie: number}> = ({el, at, fin, partie}) => {
	const f = useCurrentFrame();
	if (f < at) return null;
	const s = pop(f, at, el.amorti ?? 9) * (fin !== undefined ? 1 - ease(f, fin, 5) : 1);
	if (s <= 0.01) return null;
	const texte = el.texte.replace('{partie}', String(partie));
	const rot = el.effet === 'pop-balance' ? Math.sin(f / 8) * 6 : 0;
	if (el.fond) {
		return (
			<div style={{position: 'absolute', left: 0, right: 0, top: el.y, display: 'flex', justifyContent: 'center'}}>
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
		<div style={{position: 'absolute', left: 0, right: 0, top: el.y, textAlign: 'center', ...style, transform: `scale(${s}) rotate(${rot}deg)`}}>
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
					<line x1={60} x2={1040} y1={yOf(fam.futur.estimee)} y2={yOf(fam.futur.estimee)} stroke={P5.orange} strokeWidth={4} strokeDasharray="14 12" opacity={0.7} />
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
				<div style={{position: 'absolute', top: 150, left: 0, right: 0, textAlign: 'center', ...P5.caption, fontSize: 70, transform: `scale(${pop(f, 0, 12)})`}}>
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
		...(plan.camera ?? []).slice(1).flatMap((c, i) =>
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
		if (el.type === 'commentaire')
			return <Commentaire key={i} el={el} at={loc(el.a)} envoi={el.envoi !== undefined ? loc(el.envoi) : undefined} />;
		if (el.type === 'tape')
			return (
				<Typed
					key={i}
					text={el.texte.replace('{partie}', String(ep.partie))}
					at={loc(el.a)}
					perLetter={el.parLettre ?? 2}
					y={el.y}
					size={el.taille}
					color={el.couleur}
					stroke={el.contour}
				/>
			);
		return null;
	});

	const content = (
		<AbsoluteFill>
			{plan.famille ? <FamillePlan fam={plan.famille} aOpt={loc(plan.famille.futur.aOptimisee)} aGain={loc(plan.famille.futur.aGain)} /> : null}
			{plan.fond === 'papier' && plan.papiers?.length ? <PhotoPapier files={plan.papiers.map(file)} /> : null}
			{plan.fond === 'papier' && !plan.papiers?.length ? <Paper /> : null}
			{plan.sequence?.length ? <Sequence_ files={plan.sequence.map(file)} /> : null}
			{plan.hookTaille ? <HookTaille cm={plan.hookTaille.cm} carte={loc(plan.hookTaille.carte)} moyenne={loc(plan.hookTaille.moyenne)} /> : null}
			{img ? (
				<Shot
					src={`episodes/${id}/images/${img.fichier}`}
					w={img.w}
					h={img.h}
					cams={cams.length ? cams : [{f: 0, x: img.w / 2, y: img.h / 2, z: 1}]}
					bg={plan.fondCouleur}
					libre={plan.libre}
					derive={ep.deriveCamera !== false}
				>
					{inImage}
				</Shot>
			) : null}
			{onScreen}
			{plan.transition === 'flash' ? <Flash color={P5.yellow} /> : null}
			{plan.transition === 'flash-blanc' ? <Flash color="#fff" /> : null}
			{plan.transition === 'lumiere' ? <Lumiere from={0} to={6} entree /> : null}
			{plan.sortie === 'lumiere' ? <Lumiere from={dur - 8} to={dur} /> : null}
			{sons.map((s, i) => (
				<Sfx key={i} at={s.at} name={s.son as never} volume={s.volume} />
			))}
		</AbsoluteFill>
	);
	let out = content;
	for (const e of plan.effets ?? []) out = <Mouvement type={e.type} at={loc(e.a)}>{out}</Mouvement>;
	if (plan.transition === 'whip') return <Whip>{out}</Whip>;
	if (plan.transition === 'glisse' || plan.transition === 'lumiere') return <Mouvement type="glisse" at={0}>{out}</Mouvement>;
	if (plan.transition === 'rebond') return <Mouvement type="rebond" at={0}>{out}</Mouvement>;
	if (plan.transition === 'bascule') return <Mouvement type="bascule" at={0}>{out}</Mouvement>;
	return out;
};

/* ───────── Sous-titres jaunes, un ou deux mots à la fois ───────── */
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

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
	if (!c || c.from < win.from - 2) return null;
	const s = win.pop ? 0.82 + 0.18 * pop(f, c.from, 10) : 1;
	if (win.condense) {
		// Mot en cours de prononciation surligné (modèle de l'accroche a56d6d55).
		const cur = c.times.reduce((k, t, i) => (f >= t ? i : k), 0);
		return (
			<div style={{position: 'absolute', left: 40, right: 40, top: win.y, textAlign: 'center'}}>
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
							background: c.words.length > 1 && i === cur ? 'rgba(232,40,80,0.92)' : 'transparent',
							boxShadow: c.words.length > 1 && i === cur ? '0 0 18px rgba(232,40,80,0.55)' : 'none',
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
		];
		Promise.all(fonts.map((x) => x.load()))
			.then((loaded) => {
				loaded.forEach((x) => document.fonts.add(x));
				continueRender(handle);
			})
			.catch((e) => cancelRender(e));
	}, [handle]);
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
				{sousTitres ? <Captions windows={windows} /> : null}
			</AbsoluteFill>
		</SfxOn.Provider>
	);
};
