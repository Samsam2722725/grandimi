import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {ease, pop} from '../anim';
import {Sfx, SfxOn} from '../components/Sfx';
import {makeTiming, Timeline} from '../timing';
import {Paper, Typed} from './Paper';
import {Cam, Shot} from './Shot';
import {P5} from './style';
import tl from './timeline.json';

const T = makeTiming(tl as Timeline);
const w = T.wordAt;
const L = T.line;
const END = tl.totalFrames;

// Dimensions des captures préparées par scripts/prep_partie5.py.
const UI = {w: 1170, h: 2072};
const PHOTO = {w: 1170, h: 1954};
const BALLON = {x: 238, y: 851, w: 641, h: 569};
const FLECHE = {x: 481, y: 1570, w: 208, h: 355};

// Début de chaque plan, en frames absolues.
const S = {
	hook: 0,
	partie: L('partie').from - 3,
	ui1: L('dan').from - 3,
	routine: w('habitudes', 'bonnes') - 3,
	anat: w('habitudes', '1m85') - 4,
	ui2: w('optim', '4') - 4,
	sourire: L('foutu').from - 3,
	cta: L('cta').from - 3,
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

const Flash: React.FC<{color?: string}> = ({color = P5.yellow}) => {
	const f = useCurrentFrame();
	const o = interpolate(f, [0, 2, 9], [0, 0.95, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return <AbsoluteFill style={{background: color, opacity: o}} />;
};

/* ───────── Annotations dessinées à la main ───────── */
const Draw: React.FC<{d: string; at: number; color?: string; width?: number; dur?: number; head?: string}> = ({
	d,
	at,
	color = P5.yellow,
	width = 14,
	dur = 10,
	head,
}) => {
	const f = useCurrentFrame();
	const t = ease(f, at, dur);
	if (f < at) return null;
	return (
		<svg width={UI.w} height={UI.h} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
			<g style={{filter: 'drop-shadow(0 3px 2px rgba(0,0,0,0.55))'}}>
				<path d={d} pathLength={1} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - t} />
				{head && t > 0.95 ? (
					<path d={head} stroke={color} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" />
				) : null}
			</g>
		</svg>
	);
};

/* ───────── Sous-titres jaunes, un ou deux mots à la fois ───────── */
const KEYWORDS = ['age', 'taille', 'parents'];
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

const CHUNKS = T.lines.flatMap((l) => {
	const out: {from: number; words: string[]}[] = [];
	let cur: {f: number; w: string}[] = [];
	const push = () => cur.length && out.push({from: cur[0].f, words: cur.map((x) => x.w)});
	for (const wd of l.words) {
		const len = cur.map((x) => x.w).join(' ').length + wd.w.length;
		if (cur.length && (cur.length >= 2 || len > 14 || KEYWORDS.includes(norm(wd.w)))) {
			push();
			cur = [];
		}
		cur.push(wd);
		if (/[,.:;?!]$/.test(wd.w) || KEYWORDS.includes(norm(wd.w))) {
			push();
			cur = [];
		}
	}
	push();
	return out;
});

const Captions: React.FC<{windows: {from: number; to: number; upper?: boolean; y: number; size: number}[]}> = ({windows}) => {
	const f = useCurrentFrame();
	const win = windows.find((x) => f >= x.from && f < x.to);
	if (!win) return null;
	const idx = CHUNKS.findIndex((c, i) => f >= c.from && (i + 1 >= CHUNKS.length || f < CHUNKS[i + 1].from));
	const c = CHUNKS[idx];
	if (!c || c.from < win.from - 2) return null;
	const s = 0.82 + 0.18 * pop(f, c.from, 10);
	return (
		<div style={{position: 'absolute', left: 40, right: 40, top: win.y, textAlign: 'center', transform: `scale(${s})`}}>
			{c.words.map((word, i) => {
				const txt = word.replace(/[,.:;?!]$/, '');
				const key = KEYWORDS.includes(norm(word));
				return (
					<span
						key={i}
						style={{
							...P5.caption,
							fontSize: win.size,
							textTransform: win.upper ? 'uppercase' : 'none',
							display: 'inline-block',
							margin: '0 12px',
							...(key
								? {
										color: '#fff',
										WebkitTextStroke: '0px',
										background: P5.orange,
										borderRadius: 22,
										padding: '6px 26px 12px',
										textShadow: 'none',
									}
								: {}),
						}}
					>
						{txt}
					</span>
				);
			})}
		</div>
	);
};

/* ───────── Plans ───────── */
const Hook: React.FC = () => <Shot src="p5/hook.png" {...PHOTO} cams={[{f: 0, x: 585, y: 977, z: 1}]} />;

const Partie: React.FC = () => (
	<AbsoluteFill>
		<Paper />
		<Typed text="PARTIE 5" at={2} perLetter={2} y={830} size={210} />
		<Sfx at={0} name="whoosh" volume={0.4} />
		{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
			<Sfx key={i} at={2 + i * 2} name="tick" volume={0.5} />
		))}
	</AbsoluteFill>
);

const Ui1: React.FC = () => {
	const f = useCurrentFrame();
	const at = (abs: number) => abs - S.ui1;
	const quinze = at(w('age', '15'));
	const m173 = at(w('age', '1m73'));
	const site = at(w('grandimi', 'Grandimi'));
	const m181 = at(w('grandimi', '1m81'));
	const cams: Cam[] = [
		{f: 0, x: 585, y: 1036, z: 1},
		{f: m173 - 2, x: 330, y: 245, z: 2.1},
		{f: site - 2, x: 585, y: 2000, z: 2.0},
		{f: m181 - 3, x: 690, y: 270, z: 1.55},
	];
	const b = pop(f, quinze, 9) * (1 - ease(f, m173 - 6, 6));
	const wob = Math.sin((f - quinze) / 5) * 3;
	return (
		<Whip>
			<Shot src="p5/ui.png" {...UI} cams={cams}>
				{f >= quinze && b > 0.01 ? (
					<Img
						src={staticFile('p5/ballon_15.png')}
						style={{
							position: 'absolute',
							left: BALLON.x,
							top: BALLON.y,
							width: BALLON.w,
							height: BALLON.h,
							transform: `scale(${b}) rotate(${wob}deg)`,
						}}
					/>
				) : null}
				<Draw at={m181 + 2} d="M 400 190 C 480 60, 640 70, 700 205" head="M 650 190 L 702 210 L 712 150" dur={9} />
			</Shot>
			<Sfx at={0} name="whoosh" volume={0.4} />
			<Sfx at={quinze} name="pop" volume={0.6} />
			<Sfx at={m173 - 2} name="whoosh" volume={0.22} />
			<Sfx at={site - 2} name="whoosh" volume={0.22} />
			<Sfx at={m181 - 3} name="whoosh" volume={0.22} />
			<Sfx at={m181 + 2} name="sparkle" volume={0.4} />
		</Whip>
	);
};

const Routine: React.FC = () => {
	const dur = S.anat - S.routine;
	return (
		<Whip>
			<Shot
				src="p5/routine.png"
				{...UI}
				cams={[
					{f: 0, x: 585, y: 640, z: 1.3, dur: 1},
					{f: 6, x: 585, y: 1350, z: 1.3, dur: Math.max(8, dur - 6)},
				]}
			/>
			<Sfx at={0} name="whoosh" volume={0.4} />
		</Whip>
	);
};

const Anatomie: React.FC = () => {
	const f = useCurrentFrame();
	const m185 = w('habitudes', '1m85') - S.anat;
	const s = pop(f, m185, 9);
	return (
		<AbsoluteFill>
			<Shot
				src="p5/anatomie.png"
				{...PHOTO}
				bg="#1a1a1a"
				cams={[
					{f: 0, x: 585, y: 1250, z: 1, dur: 1},
					{f: 1, x: 585, y: 1210, z: 1.32, dur: 18},
				]}
			/>
			{f >= m185 ? (
				<div
					style={{
						position: 'absolute',
						left: 0,
						right: 0,
						top: 250,
						textAlign: 'center',
						...P5.caption,
						color: P5.pink,
						fontSize: 230,
						WebkitTextStroke: '12px #000',
						transform: `scale(${s})`,
					}}
				>
					1m85
				</div>
			) : null}
			<Flash color="#fff" />
			<Sfx at={m185} name="slam" volume={0.6} />
		</AbsoluteFill>
	);
};

const Ui2: React.FC = () => {
	const f = useCurrentFrame();
	const at = (abs: number) => abs - S.ui2;
	const pct = at(w('pct', '67'));
	const fini = at(w('fini', '95'));
	const cams: Cam[] = [
		{f: 0, x: 540, y: 449, z: 2.2, dur: 1},
		{f: pct - 4, x: 585, y: 1300, z: 1.9},
		{f: fini - 4, x: 640, y: 1640, z: 1.45},
	];
	const reveal = ease(f, fini + 2, 8);
	return (
		<Whip>
			<Shot src="p5/ui.png" {...UI} cams={cams}>
				<Draw at={4} d="M 470 412 C 560 380, 680 400, 690 450 C 700 510, 520 520, 462 480 C 420 450, 470 405, 560 402" dur={10} width={10} />
				<Draw at={pct + 2} d="M 520 1252 C 640 1225, 780 1250, 760 1305 C 740 1355, 560 1350, 530 1310 C 505 1275, 560 1240, 650 1240" dur={10} width={10} />
				{f >= fini + 2 ? (
					<Img
						src={staticFile('p5/fleche_rouge.png')}
						style={{
							position: 'absolute',
							left: FLECHE.x,
							top: FLECHE.y,
							width: FLECHE.w,
							height: FLECHE.h,
							clipPath: `inset(${(1 - reveal) * 100}% 0 0 0)`,
						}}
					/>
				) : null}
			</Shot>
			<Sfx at={0} name="whoosh" volume={0.4} />
			<Sfx at={pct - 4} name="whoosh" volume={0.22} />
			<Sfx at={pct + 2} name="pop" volume={0.5} />
			<Sfx at={fini - 4} name="whoosh" volume={0.22} />
			<Sfx at={fini + 2} name="ding" volume={0.5} />
		</Whip>
	);
};

const Sourire: React.FC = () => {
	const f = useCurrentFrame();
	const loin = w('foutu', 'loin') - S.sourire;
	const s = pop(f, loin, 10);
	return (
		<AbsoluteFill>
			<Shot src="p5/sourire.png" {...PHOTO} cams={[{f: 0, x: 585, y: 900, z: 1.0, dur: 1}, {f: 1, x: 585, y: 980, z: 1.12, dur: 60}]} />
			{f >= loin ? (
				<div style={{position: 'absolute', left: 0, right: 0, top: 1060, display: 'flex', justifyContent: 'center'}}>
					<div
						style={{
							...P5.caption,
							color: P5.green,
							WebkitTextStroke: '0px',
							textShadow: 'none',
							background: '#000',
							borderRadius: 30,
							padding: '14px 36px 22px',
							fontSize: 96,
							transform: `scale(${s})`,
						}}
					>
						LOIN D'ÊTRE FOUTU
					</div>
				</div>
			) : null}
			<Flash />
			<Sfx at={0} name="whoosh" volume={0.45} />
			<Sfx at={loin} name="slam" volume={0.55} />
		</AbsoluteFill>
	);
};

const Cta: React.FC = () => {
	const f = useCurrentFrame();
	const regle = w('cta', 'taille') - S.cta;
	const r = pop(f, regle, 9);
	return (
		<AbsoluteFill>
			<Shot src="p5/topo.png" {...PHOTO} bg="#1a1a1a" cams={[{f: 0, x: 560, y: 977, z: 1.0, dur: 1}, {f: 1, x: 610, y: 940, z: 1.25, dur: END - S.cta}]} />
			{f >= regle ? (
				<div
					style={{
						position: 'absolute',
						left: 0,
						right: 0,
						top: 1150,
						textAlign: 'center',
						fontSize: 220,
						transform: `scale(${r}) rotate(${Math.sin(f / 8) * 6}deg)`,
					}}
				>
					📏
				</div>
			) : null}
			<Flash color="#fff" />
			<Sfx at={0} name="whoosh" volume={0.4} />
			<Sfx at={regle} name="pop" volume={0.5} />
		</AbsoluteFill>
	);
};

const PLANS: {from: number; C: React.FC}[] = [
	{from: S.hook, C: Hook},
	{from: S.partie, C: Partie},
	{from: S.ui1, C: Ui1},
	{from: S.routine, C: Routine},
	{from: S.anat, C: Anatomie},
	{from: S.ui2, C: Ui2},
	{from: S.sourire, C: Sourire},
	{from: S.cta, C: Cta},
];

export const PARTIE5_FRAMES = END;

/** Chaque élément peut être coupé pour exporter les pistes séparément (kit de montage). */
export type Partie5Props = {sousTitres?: boolean; voix?: boolean; musique?: boolean; bruitages?: boolean};

export const Partie5: React.FC<Partie5Props> = ({sousTitres = true, voix = true, musique = true, bruitages = true}) => (
	<SfxOn.Provider value={bruitages}>
		<AbsoluteFill style={{background: '#000'}}>
			{musique ? <Audio
				src={staticFile('sfx/music.wav')}
				volume={(f) => interpolate(f, [0, 8, END - 25, END], [0, 0.08, 0.08, 0], {extrapolateRight: 'clamp'})}
			/> : null}
			{voix && T.lines.map((l) => (
				<Sequence key={l.id} from={l.from} durationInFrames={l.duration + 10} layout="none">
					<Audio src={staticFile(`p5/voice/${l.id}.wav`)} />
				</Sequence>
			))}
			{PLANS.map((p, i) => {
				const to = i + 1 < PLANS.length ? PLANS[i + 1].from : END;
				return (
					<Sequence key={i} from={p.from} durationInFrames={to - p.from}>
						<p.C />
					</Sequence>
				);
			})}
			{sousTitres ? (
				<Captions
					windows={[
						{from: S.sourire, to: w('foutu', 'loin'), y: 1080, size: 92, upper: true},
						{from: S.cta, to: END, y: 860, size: 100, upper: true},
					]}
				/>
			) : null}
		</AbsoluteFill>
	</SfxOn.Provider>
);
