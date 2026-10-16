import React from 'react';
import {AbsoluteFill, Audio, CalculateMetadataFunction, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {ease, pop} from '../anim';
import {Sfx, SfxOn} from '../components/Sfx';
import {makeTiming, Timeline} from '../timing';
import {Paper, Typed} from './Paper';
import {Cam, Shot} from './Shot';
import {P5} from './style';
import type {Ancre, Element, Episode as EpisodeData, Plan} from './types';

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
 */
const MOUVEMENTS = {
	glisse: {f: [0, 3, 6, 9], x: [-84, 25, -1, 0], s: [0.975, 0.986, 1, 1], flou: 12},
	rebond: {f: [0, 3, 6, 9, 12], x: [59, 16, -8, 1, 0], s: [1.135, 0.914, 1.019, 0.967, 1], flou: 14},
	secousse: {f: [0, 3, 6, 9, 12], x: [-90, 24, -6, 1, 0], s: [0.92, 0.979, 0.995, 0.998, 1], flou: 10},
};

const Mouvement: React.FC<{type: keyof typeof MOUVEMENTS; at: number; children: React.ReactNode}> = ({type, at, children}) => {
	const f = useCurrentFrame() - at;
	const m = MOUVEMENTS[type];
	const active = f >= 0 && f <= m.f[m.f.length - 1];
	const x = active ? kf(f, m.f, m.x) : 0;
	const sc = active ? kf(f, m.f, m.s) : 1;
	const blur = active ? interpolate(f, [0, 6], [m.flou, 0], {extrapolateRight: 'clamp'}) : 0;
	return (
		<AbsoluteFill style={{transform: `translateX(${x}px) scale(${sc})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined}}>
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

const ImageEl: React.FC<{el: Extract<Element, {type: 'image'}>; at: number; fin?: number; src: string}> = ({el, at, fin, src}) => {
	const f = useCurrentFrame();
	if (f < at) return null;
	let transform: string | undefined;
	let clipPath: string | undefined;
	if (el.effet === 'revele-bas') {
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
			src={src}
			style={{position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h, transform, clipPath}}
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
					textShadow: el.contourCouleur ? '0 8px 14px rgba(0,0,0,0.55)' : P5.caption.textShadow,
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
		return {f, x: z?.x ?? c.x ?? 0, y: z?.y ?? c.y ?? 0, z: z?.z ?? c.z ?? 1, dur: d};
	});
	const sons: {at: number; son: string; volume: number}[] = [
		...(plan.sons ?? []).map((s) => ({at: loc(s.a), son: s.son, volume: s.volume ?? 0.5})),
		// Chaque mouvement de caméra (sauf le premier) a son petit whoosh, sauf si son: null.
		...(plan.camera ?? []).slice(1).flatMap((c, i) =>
			c.son === null ? [] : [{at: cams[i + 1].f, son: c.son ?? 'whoosh', volume: c.volume ?? 0.22}],
		),
		...(plan.effets ?? []).map((e) => ({at: loc(e.a), son: 'whoosh', volume: 0.3})),
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
			{plan.fond === 'papier' && plan.papiers?.length ? <PhotoPapier files={plan.papiers.map(file)} /> : null}
			{plan.fond === 'papier' && !plan.papiers?.length ? <Paper /> : null}
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
	return out;
};

/* ───────── Sous-titres jaunes, un ou deux mots à la fois ───────── */
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

const chunkWords = (tl: Timeline, keywords: string[], maxWords = 2, maxChars = 14) =>
	tl.lines.flatMap((l) => {
		const out: {from: number; words: string[]}[] = [];
		let cur: {f: number; w: string}[] = [];
		const push = () => cur.length && out.push({from: cur[0].f, words: cur.map((x) => x.w)});
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
	chunks: {from: number; words: string[]}[];
	keywords: string[];
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

/* ───────── Composition ───────── */
export const Episode: React.FC<EpisodeProps> = ({episode, data, timeline, sousTitres = true, voix = true, musique = true, bruitages = true}) => {
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
