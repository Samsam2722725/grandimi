import React, {useEffect, useState} from 'react';
import {PhoneExercice, PhoneNutrition} from './Phones';
import {AbsoluteFill, Audio, CalculateMetadataFunction, cancelRender, continueRender, delayRender, Easing, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame} from 'remotion';

/*
 * Texte cinétique sur fond blanc / orange (format « ce footballeur a grandi de 8 pouces… »).
 * Une vidéo = public/textes/<id>/ : cine.json (écrans, mots datés en secondes), images/, voice/voix.wav.
 * npx remotion render Cinetique out/x.mp4 --props='{"video":"mctominay-1"}'
 */
const FPS = 30;
const SAFE = 0.86; // contenu rétréci : TikTok/Instagram zooment et rognent les bords
const COUL: Record<string, string> = {violet: '#ff5a1f', rouge: '#d4142a', blanc: '#ffffff', gris: '#555555', noir: '#0b0b0b'};
const SANS = "'Plus Jakarta Sans', sans-serif";
const SERIF = "'DM Serif Display', serif";

type Mot = {w: string; a: number; k?: string; boite?: boolean; petit?: boolean; s?: number; lettres?: number; rev?: number};
type El = {
	t: 'ligne' | 'phone' | 'img' | 'fleche' | 'chevron' | 'courbe' | 'icone';
	[k: string]: any;
};
type Scene = {de: number; fin: number; fond: 'blanc' | 'violetA' | 'violetB' | 'vignette'; sortie?: 'barre' | 'iris' | 'flou'; son?: {a: number; f: string; v: number}[]; els: El[]};
type Son = {a: number; f: string; v: number};
type Cine = {fps: number; duree: number; scenes: Scene[]; sons?: Son[]};
export type CinetiqueProps = {video: string; cine?: Cine; musique?: boolean; bruitages?: boolean};

export const calculateCinetiqueMetadata: CalculateMetadataFunction<CinetiqueProps> = async ({props}) => {
	const cine: Cine = await fetch(staticFile(`textes/${props.video}/cine.json`)).then((r) => r.json());
	return {durationInFrames: Math.round(cine.duree * FPS) + 6, fps: FPS, props: {...props, cine}};
};

const useFonts = () => {
	const [handle] = useState(() => delayRender('Polices'));
	useEffect(() => {
		const fonts = [
			new FontFace('Plus Jakarta Sans', `url(${staticFile('fonts/plus-jakarta-sans-latin-800-normal.woff2')})`, {weight: '800'}),
			new FontFace('DM Serif Display', `url(${staticFile('fonts/dm-serif-display-latin-400-normal.woff2')})`, {weight: '400', style: 'normal'}),
			new FontFace('DM Serif Display', `url(${staticFile('fonts/dm-serif-display-latin-400-italic.woff2')})`, {weight: '400', style: 'italic'}),
		];
		Promise.all(fonts.map((f) => f.load()))
			.then((l) => {
				l.forEach((f) => document.fonts.add(f));
				continueRender(handle);
			})
			.catch((e) => cancelRender(e));
	}, [handle]);
};

const sec = (s: number) => Math.round(s * FPS);
const pop = (f: number, at: number) => spring({frame: f - at, fps: FPS, config: {damping: 13, stiffness: 240, mass: 0.55}});

const MotView: React.FC<{m: Mot; f: number; taille: number}> = ({m, f, taille}) => {
	const at = sec(m.a);
	const p = interpolate(f, [at, at + 10], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	const ks = (m.k ?? 'sans').split(' ');
	const serif = ks.some((k) => k.startsWith('serif'));
	const italic = ks.includes('serif-i');
	const couleur = COUL[ks.find((k) => COUL[k]) ?? 'noir'];
	const size = taille * (m.s ?? 1) * (m.petit ? 0.7 : 1);
	const rev = m.rev ? interpolate(f, [at, at + m.rev], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
	const special = !!(m.lettres || m.rev);
	const contenu = m.lettres
		? m.w.split('').map((c, i, tab) => {
				const d0 = at + (i * sec(m.lettres!)) / tab.length;
				return (
					<span key={i} style={{opacity: interpolate(f, [d0, d0 + 3], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
						{c}
					</span>
				);
			})
		: m.w;
	return (
		<span style={{display: 'inline-block', position: 'relative', clipPath: special ? undefined : 'inset(-45% -15% -6% -15%)'}}>
		<span
			style={{
				display: 'inline-block',
				position: 'relative',
				fontFamily: serif ? SERIF : SANS,
				fontStyle: italic ? 'italic' : 'normal',
				fontWeight: serif ? 400 : 800,
				fontSize: size,
				lineHeight: 1.05,
				color: couleur,
				opacity: special ? (f >= at ? 1 : 0) : Math.min(1, p * 3),
				filter: special ? undefined : `blur(${(1 - p) * 3}px)`,
				clipPath: m.rev ? `inset(-20% ${(1 - rev) * 100}% -20% 0)` : undefined,
				transform: special ? undefined : `translateY(${(1 - p) * 125}%)`,
				whiteSpace: 'nowrap',
				padding: m.boite ? `${size * 0.08}px ${size * 0.22}px` : 0,
				letterSpacing: serif ? 0 : -0.01 * size,
				WebkitTextStroke: serif ? `${size * 0.012}px ${couleur}` : undefined,
			}}
		>
			{m.boite ? <span style={{position: 'absolute', inset: 0, background: '#c3273f', transform: `scaleX(${p})`, transformOrigin: 'left', zIndex: -1}} /> : null}
			{contenu}
		</span>
		</span>
	);
};

const LigneView: React.FC<{e: El; f: number}> = ({e, f}) => {
	const gauche = e.al === 'gauche';
	const dy = e.desde ? (1 - interpolate(f, [sec(e.desde.a), sec(e.desde.a) + sec(e.desde.d)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)})) * e.desde.dy : 0;
	const pale = e.pale ? interpolate(f, [sec(e.pale), sec(e.pale) + 6], [1, 0.14], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
	return (
		<div
			style={{
				position: 'absolute',
				top: e.y + dy,
				left: gauche ? e.x ?? 70 : 0,
				right: gauche ? undefined : 0,
				transform: 'translateY(-50%)',
				display: 'flex',
				alignItems: 'baseline',
				justifyContent: gauche ? 'flex-start' : 'center',
				gap: e.taille * 0.24,
				opacity: pale,
			}}
		>
			{(e.mots as Mot[]).map((m, i) => (
				<MotView key={i} m={m} f={f} taille={e.taille} />
			))}
		</div>
	);
};

const ImgView: React.FC<{e: El; f: number; dir: string}> = ({e, f, dir}) => {
	const at = sec(e.a);
	if (f < at) return null;
	if (e.fin && f > sec(e.fin) + 8) return null;
	const k = f - at;
	let transform = '';
	let opacity = 1;
	let filter = 'none';
	if (e.anim === 'monte') {
		const p = interpolate(k, [0, 12], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
		transform = `translateY(${(1 - p) * 520}px)`;
		filter = `blur(${(1 - p) * 14}px)`;
		opacity = Math.min(1, p * 2);
	} else if (e.anim === 'diag') {
		const p = interpolate(k, [0, 15], [0, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
		transform = `translate(${-(1 - p) * 640}px, ${(1 - p) * 720}px)`;
		filter = `blur(${(1 - p) * 16}px)`;
		opacity = Math.min(1, k / 2);
	} else if (e.anim === 'pop') {
		const p = pop(f, at);
		transform = `scale(${0.55 + 0.45 * p})`;
		opacity = Math.min(1, k / 4);
	}
	if (e.sort && f >= sec(e.sort)) {
		const q = interpolate(f, [sec(e.sort), sec(e.sort) + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.quad)});
		transform = `translate(${-q * 90}px, ${q * 460}px)`;
		filter = `blur(${q * 12}px)`;
	}
	if (e.fin) opacity *= interpolate(f, [sec(e.fin) - 6, sec(e.fin) + 8], [1, e.fondu ?? 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return <Img src={staticFile(`${dir}/images/${e.f}`)} style={{position: 'absolute', left: e.x, top: e.y, width: e.w, borderRadius: e.rayon ?? 0, transform, opacity, filter, transformOrigin: '50% 60%'}} />;
};

const PhoneView: React.FC<{e: El; f: number; dir: string}> = ({e, f, dir}) => {
	const at = sec(e.a);
	if (f < at) return null;
	const p = pop(f, at);
	const sc = e.w / 445;
	return (
		<div style={{position: 'absolute', left: e.x, top: e.y, width: 445, height: 920, transformOrigin: '50% 60%', transform: `scale(${sc * (0.55 + 0.45 * p)})`, opacity: Math.min(1, (f - at) / 4), marginLeft: -(445 - e.w) / 2, marginTop: -(920 - 920 * sc) / 2}}>
			{e.ecran === 'nutrition' ? <PhoneNutrition dir={dir} /> : <PhoneExercice dir={dir} />}
		</div>
	);
};

const IconeView: React.FC<{e: El; f: number; dir: string}> = ({e, f, dir}) => {
	const at = sec(e.a);
	if (f < at) return null;
	const p = pop(f, at);
	const rot = interpolate(f, [at, at + 16], [-50, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	return (
		<Img
			src={staticFile(`${dir}/images/${e.f}`)}
			style={{position: 'absolute', left: e.cx - e.w / 2, top: e.cy - e.w / 2, width: e.w, transform: `scale(${0.2 + 0.8 * p}) rotate(${rot}deg)`, filter: 'drop-shadow(0 26px 30px rgba(190,70,10,0.35))', opacity: Math.min(1, (f - at) / 3)}}
		/>
	);
};

const FlecheView: React.FC<{e: El; f: number}> = ({e, f}) => {
	const p = interpolate(f, [sec(e.a), sec(e.a) + sec(e.d)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	if (f < sec(e.a)) return null;
	const y = e.y0 + (e.y1 - e.y0) * p;
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
			<line x1={e.x} y1={e.y0} x2={e.x} y2={y + 18} stroke="#fff" strokeWidth={9} strokeLinecap="butt" />
			<path d={`M${e.x - 22} ${y + 34} L${e.x} ${y} L${e.x + 22} ${y + 34}`} fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
		</svg>
	);
};

const ChevronView: React.FC<{e: El; f: number}> = ({e, f}) => {
	if (f < sec(e.a)) return null;
	const ease = (a: number, d: number) => interpolate(f, [sec(a), sec(a + d)], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	const p1 = ease(e.a, e.d);
	const p2 = ease(e.a + e.d * 0.8, e.d);
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
			<line x1={0} y1={1920} x2={1080 * p1} y2={1920 - 1920 * p1} stroke="#e8121f" strokeWidth={78} />
			<line x1={0} y1={0} x2={1080 * p2} y2={1920 * p2} stroke="#e8121f" strokeWidth={78} />
		</svg>
	);
};

const COURBE: [number, number][] = [
	[110, 1470],
	[300, 1440],
	[420, 1445],
	[560, 1380],
	[700, 1330],
	[830, 1300],
	[960, 1180],
];
const CourbeView: React.FC<{e: El; f: number}> = ({e, f}) => {
	if (f < sec(e.a)) return null;
	const p = interpolate(f, [sec(e.a), sec(e.a) + sec(e.d)], [0, 1], {extrapolateRight: 'clamp', easing: Easing.inOut(Easing.quad)});
	const pts = COURBE.map(([x, y]) => `${x},${y}`).join(' ');
	return (
		<svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
			<polyline points={pts} fill="none" stroke="#2b5b84" strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
		</svg>
	);
};

const Fond: React.FC<{fond: Scene['fond']}> = ({fond}) => {
	if (fond === 'violetA')
		return (
			<AbsoluteFill style={{background: '#e8500c'}}>
				<AbsoluteFill style={{background: 'radial-gradient(circle 260px at 50% 47%, rgba(255,190,130,0.42), rgba(232,80,12,0) 100%)'}} />
			</AbsoluteFill>
		);
	if (fond === 'violetB') return <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, #ff5a1f 55%, #ff8d52 100%)'}} />;
	if (fond === 'vignette') return <AbsoluteFill style={{background: 'radial-gradient(ellipse 60% 50% at 50% 50%, #ffffff 40%, #b4b4b4 100%)'}} />;
	return <AbsoluteFill style={{background: '#fff'}} />;
};

const SceneView: React.FC<{s: Scene; dir: string}> = ({s, dir}) => {
	const f = useCurrentFrame() + sec(s.de);
	const n = sec(s.fin) - sec(s.de);
	const k = f - sec(s.de);
	let clip: React.CSSProperties = {};
	if (s.sortie === 'barre') {
		const p = interpolate(k, [n - 8, n], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
		clip = {clipPath: `inset(0 ${p * 46}% 0 ${p * 46}%)`};
	}
	if (s.sortie === 'iris') {
		const p = interpolate(k, [n - 9, n], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
		clip = {clipPath: `circle(${(1 - p) * 1400}px at 300px 1200px)`};
	}
	if (s.sortie === 'flou') {
		const p = interpolate(k, [n - 7, n], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		clip = {filter: `blur(${p * 10}px)`, opacity: 1 - p * 0.9};
	}
	return (
		<AbsoluteFill style={clip}>
			<Fond fond={s.fond} />
			<AbsoluteFill style={{transform: `scale(${SAFE})`, transformOrigin: '540px 940px'}}>
			{s.els.filter((e) => e.t !== 'chevron').map((e, i) => {
				if (e.t === 'ligne') return <LigneView key={i} e={e} f={f} />;
				if (e.t === 'img') return <ImgView key={i} e={e} f={f} dir={dir} />;
				if (e.t === 'phone') return <PhoneView key={i} e={e} f={f} dir={dir} />;
				if (e.t === 'icone') return <IconeView key={i} e={e} f={f} dir={dir} />;
				if (e.t === 'fleche') return <FlecheView key={i} e={e} f={f} />;
				if (e.t === 'chevron') return <ChevronView key={i} e={e} f={f} />;
				if (e.t === 'courbe') return <CourbeView key={i} e={e} f={f} />;
				return null;
			})}
			</AbsoluteFill>
			{s.els.filter((e) => e.t === 'chevron').map((e, i) => (
				<ChevronView key={`x${i}`} e={e} f={f} />
			))}
		</AbsoluteFill>
	);
};

export const Cinetique: React.FC<CinetiqueProps> = ({video, cine, musique = true, bruitages = true}) => {
	useFonts();
	if (!cine) return null;
	const dir = `textes/${video}`;
	return (
		<AbsoluteFill style={{background: '#fff'}}>
			<Audio src={staticFile(`${dir}/voice/voix.wav`)} />
			{musique ? <Audio src={staticFile('sfx/music.wav')} volume={(fr) => 0.06 * interpolate(fr, [0, 20, sec(cine.duree) - 40, sec(cine.duree)], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})} loop /> : null}
			{bruitages
				? (cine.sons ?? []).map((x, j) => (
						<Sequence key={`s${j}`} from={sec(x.a)} durationInFrames={30}>
							<Audio src={staticFile(`sfx/${x.f}.wav`)} volume={x.v} />
						</Sequence>
					))
				: null}
			{cine.scenes.map((s, i) => (
				<Sequence key={i} from={sec(s.de)} durationInFrames={sec(s.fin) - sec(s.de) + (i + 1 === cine.scenes.length ? 6 : 0)}>
					<SceneView s={s} dir={dir} />
					{bruitages
						? (s.son ?? []).map((x, j) => (
								<Sequence key={j} from={sec(x.a) - sec(s.de)}>
									<Audio src={staticFile(`sfx/${x.f}.wav`)} volume={x.v} />
								</Sequence>
							))
						: null}
				</Sequence>
			))}
		</AbsoluteFill>
	);
};
