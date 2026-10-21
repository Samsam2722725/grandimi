import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Audio, CalculateMetadataFunction, cancelRender, continueRender, delayRender, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame} from 'remotion';

/*
 * Texte animé mot par mot sur fond blanc + illustrations (format « 2 raisons », « signes »…),
 * mouvements recopiés de la référence 7508794377276296491 (voir references/…/fiche.md).
 * Une vidéo = public/textes/<id>/ : ecrans.json → scripts/texte_anime.py <id> → timeline.json.
 */

const FPS = 30;
const COULEURS: Record<string, string> = {violet: '#5b16d6', rouge: '#e3262f', vert: '#22c55e', gris: '#3b3b3b'};
const FONT = "'Poppins', 'Inter', sans-serif";

type Mot = {w: string; style: string | null; f: number};
type Ligne = {t: string; y: number; taille: number; x?: number; align?: 'left' | 'center'; mots: Mot[]; monte?: {a: number; y: number}; chute?: boolean; cache?: boolean};
type Image = {
	f: string;
	a: number;
	fin?: number;
	cx: number;
	top: number;
	w: number;
	anim: 'monte' | 'pop' | 'aucune' | 'droite' | 'gauche' | 'tourne';
	vers?: {a: number; top?: number; cx?: number};
	trajet?: {dx: number; dy: number; rot: number}; // « tourne » : déplacement et rotation jusqu'à la fin de l'écran
	zoom?: number; // grossit doucement jusqu'à la fin de l'écran
	rot?: number;
};
type Ecran = {
	debut: number;
	fin: number;
	lignes: Ligne[];
	images?: Image[];
	icone?: {a: number; cx: number; cy: number; taille: number};
	croix?: {a: number; fin?: number}; // grande croix rouge tracée en deux coups
	regle?: {a: number; x: number; haut: number; bas: number}; // règle violette en pointillés qui grandit
	sortie?: 'haut';
};
type Timeline = {ecrans: Ecran[]; totalFrames: number};

export type TexteAnimeProps = {video: string; musique?: boolean; voix?: boolean; bruitages?: boolean; timeline?: Timeline};

export const calculateTexteAnimeMetadata: CalculateMetadataFunction<TexteAnimeProps> = async ({props}) => {
	const timeline: Timeline = await fetch(staticFile(`textes/${props.video}/timeline.json`)).then((r) => r.json());
	return {durationInFrames: timeline.totalFrames, fps: FPS, props: {...props, timeline}};
};

const usePoppins = () => {
	const [handle] = useState(() => delayRender('Police Poppins'));
	useEffect(() => {
		const fonts = [
			new FontFace('Poppins', `url(${staticFile('fonts/poppins-latin-700-normal.woff2')})`, {weight: '700'}),
			new FontFace('Poppins', `url(${staticFile('fonts/poppins-latin-800-normal.woff2')})`, {weight: '800'}),
		];
		Promise.all(fonts.map((f) => f.load()))
			.then((loaded) => {
				loaded.forEach((f) => document.fonts.add(f));
				continueRender(handle);
			})
			.catch((e) => cancelRender(e));
	}, [handle]);
};

const entree = (f: number, at: number) => spring({frame: f - at, fps: FPS, config: {damping: 14, stiffness: 220, mass: 0.5}});

const LigneView: React.FC<{l: Ligne; f: number}> = ({l, f}) => {
	if (l.cache) return null;
	const y = l.monte ? interpolate(f, [l.monte.a, l.monte.a + 10], [l.y, l.monte.y], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic)}) : l.y;
	const left = l.align === 'left';
	return (
		<div
			style={{
				position: 'absolute',
				top: y,
				left: left ? l.x ?? 120 : 40,
				right: left ? undefined : 40,
				transform: 'translateY(-50%)',
				display: 'flex',
				flexWrap: 'nowrap',
				justifyContent: left ? 'flex-start' : 'center',
				gap: `0 ${l.taille * 0.26}px`,
				fontFamily: FONT,
				fontWeight: 800,
				fontSize: l.taille,
				lineHeight: 1.1,
				letterSpacing: -0.5,
				whiteSpace: 'nowrap',
			}}
		>
			{l.mots.map((mot, i) => {
				// Le titre tombe d'un bloc (tous ses mots en même temps), comme dans l'original.
				const m = l.chute ? {...mot, f: l.mots[0].f} : mot;
				const vis = f >= m.f;
				// Le titre tombe d'en haut avec un rebond ; les autres mots glissent depuis le bas.
				const t = l.chute
					? spring({frame: f - m.f, fps: FPS, config: {damping: 10, stiffness: 260, mass: 0.5}})
					: interpolate(f, [m.f, m.f + 4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
				const dy = (l.chute ? -1.4 : 0.55) * l.taille * (1 - t);
				const flou = Math.abs(1 - t) * (l.chute ? 10 : 7);
				return (
					<span
						key={i}
						style={{
							display: 'inline-block',
							color: m.style ? COULEURS[m.style] : '#111',
							opacity: vis ? Math.min(1, 0.25 + t) : 0,
							transform: `translateY(${dy}px)`,
							filter: vis && flou > 0.4 ? `blur(${flou}px)` : undefined,
							textShadow: '0 4px 10px rgba(0,0,0,0.18)',
						}}
					>
						{m.w}
					</span>
				);
			})}
		</div>
	);
};

const ImageView: React.FC<{im: Image; f: number; dir: string; finEcran: number}> = ({im, f, dir, finEcran}) => {
	if (f < im.a || (im.fin !== undefined && f >= im.fin)) return null;
	const s = entree(f, im.a);
	const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
	let top = im.top;
	let cx = im.cx;
	let scale = 1;
	let opacity = 1;
	let rot = im.rot ?? 0;
	if (im.anim === 'monte' || im.anim === 'tourne') {
		const k = spring({frame: f - im.a, fps: FPS, config: {damping: 13, stiffness: 300, mass: 0.6}});
		top = im.top + (1 - k) * 900;
		opacity = Math.min(1, 0.3 + k);
	} else if (im.anim === 'droite' || im.anim === 'gauche') {
		const k = spring({frame: f - im.a, fps: FPS, config: {damping: 14, stiffness: 260, mass: 0.6}});
		cx = im.cx + (1 - k) * (im.anim === 'droite' ? 800 : -900);
	} else if (im.anim === 'pop') {
		scale = 0.6 + 0.4 * s;
		opacity = Math.min(1, s * 1.8);
	}
	if (im.trajet) {
		const fin = im.fin ?? finEcran;
		const k = interpolate(f, [im.a, fin], [0, 1], clamp);
		cx += im.trajet.dx * k;
		top += im.trajet.dy * k;
		rot += im.trajet.rot * k;
	}
	if (im.vers) {
		const k = interpolate(f, [im.vers.a, im.vers.a + 10], [0, 1], {...clamp, easing: Easing.inOut(Easing.cubic)});
		if (im.vers.top !== undefined) top += (im.vers.top - im.top) * k;
		if (im.vers.cx !== undefined) cx += (im.vers.cx - im.cx) * k;
	}
	if (im.zoom) scale *= interpolate(f, [im.a, finEcran], [1, im.zoom], clamp);
	return (
		<Img
			src={staticFile(`${dir}/images/${im.f}`)}
			style={{position: 'absolute', left: cx - im.w / 2, top, width: im.w, transform: `rotate(${rot}deg) scale(${scale})`, transformOrigin: '50% 50%', opacity}}
		/>
	);
};

/** Grande croix rouge tracée en deux coups d'un bord à l'autre (« sans pilules »). */
const Croix: React.FC<{c: NonNullable<Ecran['croix']>; f: number}> = ({c, f}) => {
	if (f < c.a) return null;
	const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
	const t1 = interpolate(f, [c.a, c.a + 5], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const t2 = interpolate(f, [c.a + 4, c.a + 9], [0, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const op = c.fin !== undefined ? interpolate(f, [c.fin - 10, c.fin], [1, 0], clamp) : 1;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: op}}>
			<line x1={90} y1={-60} x2={990} y2={1650} stroke="#e8102e" strokeWidth={58} strokeLinecap="round" pathLength={1} strokeDasharray={`${t1} 1`} />
			<line x1={990} y1={-60} x2={90} y2={1650} stroke="#e8102e" strokeWidth={58} strokeLinecap="round" pathLength={1} strokeDasharray={`${t2} 1`} />
		</svg>
	);
};

/** Règle violette en pointillés avec flèche, qui grandit du bas vers le haut. */
const Regle: React.FC<{r: NonNullable<Ecran['regle']>; f: number}> = ({r, f}) => {
	if (f < r.a) return null;
	const k = interpolate(f, [r.a, r.a + 14], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	const y = r.bas + (r.haut - r.bas) * k;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
			<line x1={r.x} y1={r.bas} x2={r.x} y2={y} stroke="#5b16d6" strokeWidth={7} strokeDasharray="22 14" />
			<path d={`M ${r.x - 22} ${y + 26} L ${r.x} ${y} L ${r.x + 22} ${y + 26}`} fill="none" stroke="#5b16d6" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
};

/** Icône Grandimi : tombe en tournant puis rebondit (comme l'icône de l'app dans l'original). */
const Icone: React.FC<{ic: NonNullable<Ecran['icone']>; f: number}> = ({ic, f}) => {
	if (f < ic.a) return null;
	const g = spring({frame: f - ic.a, fps: FPS, config: {damping: 13, stiffness: 55, mass: 0.8}});
	const y = ic.cy;
	const rot = -35 * (1 - g);
	const sc = Math.max(0.02, g);
	const z = ic.taille;
	return (
		<div
			style={{
				position: 'absolute',
				left: ic.cx - z / 2,
				top: y - z / 2,
				width: z,
				height: z,
				borderRadius: z * 0.24,
				background: 'linear-gradient(145deg, #ff8a52 0%, #ff5a1f 55%, #e8430e 100%)',
				boxShadow: '0 24px 40px rgba(255,90,31,0.35), inset 0 -10px 24px rgba(0,0,0,0.12)',
				transform: `rotate(${rot}deg) scale(${sc})`,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<div style={{position: 'absolute', inset: '18%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 70%)'}} />
			<svg width={z * 0.5} height={z * 0.62} viewBox="0 0 50 62" style={{position: 'relative'}}>
				<circle cx="25" cy="8" r="7" fill="#fff" />
				<path d="M14 19 h22 a4 4 0 0 1 4 4 v14 a3 3 0 0 1 -6 0 v-9 h-1 v30 a4 4 0 0 1 -8 0 v-17 h-0 v17 a4 4 0 0 1 -8 0 v-30 h-1 v9 a3 3 0 0 1 -6 0 v-14 a4 4 0 0 1 4 -4 z" fill="#fff" />
				<path d="M44 40 L44 6 M40 10 L44 5 L48 10" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" opacity="0.85" />
			</svg>
		</div>
	);
};

const SORTIE = 6; // images de chevauchement entre deux écrans
const EcranView: React.FC<{e: Ecran; dir: string}> = ({e, dir}) => {
	const f = useCurrentFrame() + e.debut; // frames absolues
	const t = interpolate(f, [e.fin, e.fin + SORTIE], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)});
	// « haut » : l'écran part vers le haut en fondu (comme un défilement), sinon simple fondu flou
	const dy = e.sortie === 'haut' ? -260 * t : 0;
	return (
		<AbsoluteFill style={{opacity: 1 - t, filter: t > 0.05 ? `blur(${t * 8}px)` : undefined, transform: `translateY(${dy}px)`}}>
			{(e.images ?? []).map((im, i) => (
				<ImageView key={i} im={im} f={f} dir={dir} finEcran={e.fin} />
			))}
			{e.regle ? <Regle r={e.regle} f={f} /> : null}
			{e.icone ? <Icone ic={e.icone} f={f} /> : null}
			{e.croix ? <Croix c={e.croix} f={f} /> : null}
			{e.lignes.map((l, i) => (
				<LigneView key={i} l={l} f={f} />
			))}
		</AbsoluteFill>
	);
};

export const TexteAnime: React.FC<TexteAnimeProps> = ({video, timeline, musique = true, voix = true, bruitages = true}) => {
	usePoppins();
	if (!timeline) return null;
	const T = timeline;
	const dir = `textes/${video}`;
	const END = T.totalFrames;
	return (
		<AbsoluteFill style={{background: '#fff'}}>
			{voix ? <Audio src={staticFile(`${dir}/voice/voix.wav`)} /> : null}
			{musique ? (
				<Audio
					src={staticFile('sfx/music.wav')}
					loop
					volume={(fr) => interpolate(fr, [0, 10, END - 20, END], [0, 0.13, 0.13, 0], {extrapolateRight: 'clamp'})}
				/>
			) : null}
			{bruitages
				? T.ecrans.flatMap((e, i) =>
						(e.images ?? []).map((im, j) => (
							<Sequence key={`${i}-${j}`} from={im.a} durationInFrames={20} layout="none">
								<Audio src={staticFile('sfx/pop.wav')} volume={0.18} />
							</Sequence>
						)),
					)
				: null}
			{bruitages
				? T.ecrans
						.filter((e) => e.croix)
						.map((e, i) => (
							<Sequence key={`x${i}`} from={e.croix!.a} durationInFrames={30} layout="none">
								<Audio src={staticFile('sfx/wrong.wav')} volume={0.22} />
							</Sequence>
						))
				: null}
			{T.ecrans.map((e, i) => (
				<Sequence key={i} from={e.debut} durationInFrames={Math.max(1, e.fin - e.debut + SORTIE)}>
					<EcranView e={e} dir={dir} />
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
