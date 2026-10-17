import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {clamp01, ease, pop, shake} from './anim';
import {Person, mixPose, Pose} from './components/Person';
import {
	Bed,
	Blanket,
	Bone,
	Heart,
	Moon,
	Pain,
	Plate,
	Particles,
	Ruler,
	Signpost,
	SvgText,
	UpArrow,
	Zzz,
} from './components/Props';
import {Sfx} from './components/Sfx';
import {Badge, Hl, PopText} from './components/Text';
import {C, FONT} from './theme';
import {wordAt} from './timing';

export type SceneProps = {from: number};

const Svg: React.FC<{children: React.ReactNode}> = ({children}) => (
	<svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
		{children}
	</svg>
);

/** Fait apparaître la scène (léger glissement) pendant les premières frames. */
const Enter: React.FC<{children: React.ReactNode}> = ({children}) => {
	const f = useCurrentFrame();
	const t = ease(f, 0, 8);
	return <AbsoluteFill style={{opacity: t, transform: `translateY(${(1 - t) * 50}px)`}}>{children}</AbsoluteFill>;
};

const lerp = (f: number, a: number, b: number, v0: number, v1: number) =>
	interpolate(f, [a, b], [v0, v1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

/* ───────────────────────── 1. Accroche ───────────────────────── */
const SHRUG: Pose = {ls: -32, le: -88, rs: 32, re: 88, head: 8};

export const Hook: React.FC<SceneProps> = ({from}) => {
	const f = useCurrentFrame();
	const w = (x: string) => wordAt('hook', x) - from;
	const deux = w('Deux');
	const frein = w('freinent');
	const haut = w('hauteur');
	const grow = ease(f, deux + 4, 22);
	const blocked = f >= frein;
	const arrowH = blocked ? 330 + shake(f, 8, 1.6) : 360 * grow;
	const stop = pop(f, frein, 8);
	const shrug = pop(f, haut, 14);
	return (
		<AbsoluteFill>
			<Svg>
				<Ruler x={840} top={700} bottom={1290} />
				<UpArrow x={760} bottom={1290} h={arrowH} />
				{f >= frein ? (
					<g transform={`translate(800,${930 - 22}) scale(${stop})`}>
						<rect x={-150} y={-34} width={300} height={68} rx={16} fill={C.red} />
						<SvgText x={0} y={0} size={46} color="#fff">
							STOP
						</SvgText>
					</g>
				) : null}
				<Person x={430} y={1020} scale={1.2} pose={mixPose({}, SHRUG, shrug)} />
				{[
					{x: 250, y: 700, r: -18, d: 0},
					{x: 600, y: 640, r: 14, d: 3},
					{x: 200, y: 860, r: -8, d: 6},
				].map((q, i) => {
					const s = pop(f, haut + q.d, 9);
					if (f < haut + q.d) return null;
					return (
						<g key={i} transform={`translate(${q.x},${q.y}) rotate(${q.r + shake(f + i * 5, 6)}) scale(${s})`}>
							<SvgText x={0} y={0} size={120} color={C.red}>
								?
							</SvgText>
						</g>
					);
				})}
			</Svg>
			<PopText at={deux} y={200} size={150} rotate={-3}>
				<Hl>2</Hl> erreurs
			</PopText>
			<PopText at={frein} y={410} size={74}>
				qui freinent ta <Hl>croissance</Hl>
			</PopText>
			<Sfx at={deux} name="slam" volume={0.6} />
			<Sfx at={frein} name="wrong" volume={0.35} />
			<Sfx at={haut} name="pop" />
		</AbsoluteFill>
	);
};

/* ───────────────────────── 2. Cartilages ───────────────────────── */
export const Cartilage: React.FC<SceneProps> = ({from}) => {
	const f = useCurrentFrame();
	const w = (x: string, n = 0) => wordAt('cartilage', x, n) - from;
	const cart = w('cartilages');
	const pas = w('pas');
	const tu = w('tu');
	const agir = w('agir');
	const label = pop(f, cart + 6);
	const glow = 0.5 + 0.5 * Math.sin(f / 4);
	const stretch = ease(f, agir, 14);
	const top = 700 - stretch * 50;
	const bottom = 1300 + stretch * 10;
	return (
		<Enter>
			<Svg>
				<Bone cx={420} top={top} bottom={bottom} glow={glow} />
				<g opacity={label} transform={`translate(${(1 - label) * 40},0)`}>
					<line x1={530} y1={top + 108} x2={640} y2={top + 108} stroke={C.ink} strokeWidth={6} />
					<line x1={530} y1={bottom - 108} x2={640} y2={bottom - 108} stroke={C.ink} strokeWidth={6} />
					<SvgText x={650} y={top + 90} size={40} anchor="start">
						cartilage de
					</SvgText>
					<SvgText x={650} y={top + 136} size={40} anchor="start" color={C.orange}>
						croissance
					</SvgText>
					<SvgText x={650} y={bottom - 126} size={40} anchor="start">
						cartilage de
					</SvgText>
					<SvgText x={650} y={bottom - 80} size={40} anchor="start" color={C.orange}>
						croissance
					</SvgText>
				</g>
				{f >= agir ? (
					<g opacity={stretch}>
						<UpArrow x={220} bottom={1120} h={260 * stretch} />
						<UpArrow x={800} bottom={1120} h={200 * stretch} w={26} />
					</g>
				) : null}
			</Svg>
			<PopText at={cart} y={190} size={92}>
				Cartilages de <Hl>croissance</Hl>
			</PopText>
			<PopText at={pas} y={400} size={70} color={C.grayDark} out={tu}>
				pas encore fermés ?
			</PopText>
			<PopText at={tu} y={392} size={84} rotate={-2}>
				✅ tu peux encore <Hl>agir</Hl>
			</PopText>
			<Sfx at={0} name="whoosh" volume={0.4} />
			<Sfx at={cart} name="pop" />
			<Sfx at={pas} name="pop" volume={0.35} />
			<Sfx at={agir} name="ding" />
		</Enter>
	);
};

/* ───────────────────────── 3. N°1 ───────────────────────── */
export const N1: React.FC<SceneProps> = ({from}) => {
	const f = useCurrentFrame();
	const w = (x: string) => wordAt('n1', x) - from;
	const num = w('Numéro');
	const mal = w('mal');
	const moon = pop(f, w('dormir'));
	return (
		<Enter>
			<Svg>
				<g transform={`translate(800,560) scale(${moon})`}>
					<Moon x={0} y={0} r={70} />
				</g>
			</Svg>
			<Badge at={num} label="N°1" y={420} />
			<PopText at={mal} y={860} size={150} rotate={-3}>
				Mal <Hl>dormir</Hl>
			</PopText>
			<Sfx at={0} name="whoosh" volume={0.4} />
			<Sfx at={num} name="slam" volume={0.6} />
			<Sfx at={mal} name="pop" />
		</Enter>
	);
};

/* ───────────────────────── 4. Sommeil (hormone + mauvaise nuit) ───────────────────────── */
const LYING: Pose = {torso: 0, ls: 4, le: 0, rs: -4, re: 0, lh: 2, lk: 0, rh: -2, rk: 0};
const PHONE: Pose = {...LYING, rs: -150, re: 70};

export const Sleep: React.FC<SceneProps> = ({from}) => {
	const f = useCurrentFrame();
	const g = (x: string) => wordAt('gh', x) - from;
	const n = (x: string, k = 0) => wordAt('nuit', x, k) - from;
	const horm = g('hormone');
	const somm = g('sommeil');
	const couch = n('Coucher');
	const tel = n('téléphone');
	const six = n('six');
	const perds = n('perds');
	const phone = pop(f, tel, 14);
	const pose = mixPose(LYING, PHONE, phone);
	const cards = [
		{at: couch, x: 210, icon: '🕑', label: '2 h'},
		{at: tel, x: 540, icon: '📱', label: 'au lit'},
		{at: six, x: 870, icon: '😵', label: '6 h'},
	];
	return (
		<Enter>
			<Svg>
				<g transform={`scale(${pop(f, somm)})`} style={{transformOrigin: '170px 640px'}}>
					<Moon x={170} y={640} r={60} />
				</g>
				<Bed />
				<Particles frame={f} start={horm} x={560} y={990} spread={320} lowAfter={perds} />
				<Person
					x={560}
					y={1034}
					rotate={90}
					pose={pose}
					shadow={false}
					attach={(j) =>
						phone > 0.05 ? (
							<g transform={`translate(${j.rHand.x},${j.rHand.y}) rotate(-90) scale(${phone})`}>
								<circle cx={0} cy={-10} r={90} fill={C.blueGlow} opacity={0.35} />
								<rect x={-30} y={-52} width={60} height={104} rx={12} fill={C.ink} />
								<rect x={-24} y={-44} width={48} height={84} rx={6} fill={C.blueGlow} />
							</g>
						) : null
					}
				/>
				<Blanket />
				<Zzz frame={f} x={830} y={930} until={tel - 20} />
			</Svg>
			<PopText at={horm} y={190} size={88} out={couch - 4}>
				Hormone de <Hl>croissance</Hl>
			</PopText>
			<PopText at={somm} y={400} size={74} out={couch - 4}>
				= sommeil <Hl>profond</Hl>
			</PopText>
			{cards.map((c, i) => {
				const s = pop(f, c.at);
				if (f < c.at) return null;
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							left: c.x - 140,
							top: 200,
							width: 280,
							height: 240,
							borderRadius: 36,
							background: '#fff',
							border: `8px solid ${C.ink}`,
							boxShadow: '0 12px 0 rgba(0,0,0,0.08)',
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							justifyContent: 'center',
							fontFamily: FONT,
							fontWeight: 900,
							fontSize: 56,
							color: C.ink,
							transform: `scale(${s}) rotate(${(i - 1) * 4}deg)`,
						}}
					>
						<div style={{fontSize: 96, lineHeight: 1}}>{c.icon}</div>
						<div style={{marginTop: 10}}>{c.label}</div>
					</div>
				);
			})}
			<PopText at={perds} y={500} size={76} color={C.red} shakeAmp={f < perds + 12 ? 6 : 0}>
				tu en perds une partie
			</PopText>
			<Sfx at={horm} name="sparkle" volume={0.4} />
			<Sfx at={somm} name="pop" />
			<Sfx at={couch} name="tick" volume={0.7} />
			<Sfx at={couch + 6} name="tick" volume={0.7} />
			<Sfx at={tel} name="pop" />
			<Sfx at={six} name="pop" />
			<Sfx at={perds} name="wrong" volume={0.35} />
		</Enter>
	);
};

/* ───────────────────────── 5. N°2 : le crush ───────────────────────── */
const FLEX: Pose = {ls: -95, le: -95, rs: 95, re: 95, head: 0, lh: -10, rh: 10};

export const N2: React.FC<SceneProps> = ({from}) => {
	const f = useCurrentFrame();
	const w = (x: string) => wordAt('n2', x) - from;
	const num = w('Numéro');
	const imp = w('impressionner');
	const crush = w('crush');
	const flex = pop(f, imp, 12);
	const beat = 1 + 0.08 * Math.sin(f / 3);
	const heart = pop(f, crush, 8) * beat;
	return (
		<Enter>
			<Svg>
				<Person x={330} y={1110} pose={mixPose({}, FLEX, flex)} />
				{flex > 0.5
					? [0, 1, 2].map((i) => (
							<g key={i} opacity={0.5 + 0.5 * Math.sin(f / 3 + i * 2)}>
								<SvgText x={150 + i * 180} y={760 - (i % 2) * 40} size={56} color={C.orange}>
									✦
								</SvgText>
							</g>
						))
					: null}
				<Person x={780} y={1110} scale={0.95} pose={{ls: -8, rs: 8, head: -8}} hair="ponytail" />
				{f >= crush ? <Heart x={780} y={790} s={heart} /> : null}
			</Svg>
			<Badge at={num} label="N°2" y={170} />
			<PopText at={imp} y={545} size={84}>
				Impressionner
			</PopText>
			<PopText at={crush} y={640} size={84}>
				ton <Hl>crush</Hl> 💘
			</PopText>
			<Sfx at={0} name="whoosh" volume={0.4} />
			<Sfx at={num} name="slam" volume={0.6} />
			<Sfx at={imp} name="pop" />
			<Sfx at={crush} name="sparkle" volume={0.5} />
		</Enter>
	);
};

/* ───────────────────────── 6. Le sport, c'est top ───────────────────────── */
const STAR: Pose = {ls: -150, le: -10, rs: 150, re: 10, lh: -28, lk: 0, rh: 28, rk: 0};

export const Sport: React.FC<SceneProps> = ({from}) => {
	const f = useCurrentFrame();
	const w = (x: string) => wordAt('sport', x) - from;
	const sport = w('sport');
	const top = w('top');
	const phase = Math.abs(Math.sin((f - sport) / 5.5));
	const air = f >= sport ? phase : 0;
	return (
		<Enter>
			<Svg>
				<ellipse cx={540} cy={1360} rx={130 - air * 40} ry={16} fill="#000" opacity={0.08} />
				<Person x={540} y={1120 - air * 130} pose={mixPose({}, STAR, air)} shadow={false} />
			</Svg>
			<PopText at={sport} y={190} size={140}>
				Le sport ✅
			</PopText>
			<PopText at={top} y={400} size={74}>
				top pour ta <Hl>croissance</Hl>
			</PopText>
			<Sfx at={sport} name="pop" />
			<Sfx at={top} name="ding" />
		</Enter>
	);
};

/* ───────────────────────── 7. Soulevé de terre → kiné ───────────────────────── */
// Vu de profil, tourné vers la gauche. Bassin à l'origine : en position de départ
// les mains sont à y ≈ +95 et les pieds à y ≈ +155, d'où un disque de rayon 70.
const SETUP: Pose = {torso: 58, head: 15, ls: -2, le: 0, rs: 2, re: 0, lh: -72, lk: 104, rh: -66, rk: 98};
const ROUND: Pose = {torso: 74, head: 30, ls: -2, le: 0, rs: 2, re: 0, lh: -72, lk: 104, rh: -66, rk: 98};
const HURT: Pose = {torso: 24, head: -8, ls: -15, le: -5, rs: 30, re: 50, lh: -6, lk: 4, rh: 8, rk: 0};
const FLOOR = 1330;

export const Kine: React.FC<SceneProps> = ({from}) => {
	const f = useCurrentFrame();
	const w = (x: string, k = 0) => wordAt('kine', x, k) - from;
	const soul = w('soulevé');
	const cent = w('cent');
	const tech = w('technique');
	const coach = w('coach');
	const aller = w('aller');
	const kine = w('kiné');
	const strain = f >= tech ? Math.min(1, (f - tech) / 30) : 0;
	const broke = f >= aller;
	const hurt = pop(f, aller, 14);
	const base = mixPose(SETUP, ROUND, strain);
	const pose = broke ? mixPose(base, HURT, hurt) : base;
	const tremble = broke ? 0 : shake(f, 2 + strain * 7, 2);
	const flash = broke ? Math.max(0, 1 - (f - aller) / 10) : 0;
	const sign = pop(f, kine);
	const px = 590;
	const k = 1.3;
	const py = broke ? FLOOR - (18 + 219) * k : FLOOR - 165 * k;
	return (
		<Enter>
			<Svg>
				<line x1={60} x2={1020} y1={1330} y2={1330} stroke={C.gray} strokeWidth={8} strokeLinecap="round" />
				{broke ? <Plate x={px - 200} y={FLOOR - 94} r={94} /> : null}
				<Person
					x={px + tremble}
					y={py}
					scale={k}
					pose={pose}
					attach={(j) => (!broke ? <Plate x={j.rHand.x} y={j.rHand.y} /> : null)}
				/>
				{broke ? <Pain x={px + 60 * k} y={py - 60 * k} s={hurt} /> : null}
				{f >= kine - 6 ? <Signpost x={880} y={1080} s={sign} /> : null}
			</Svg>
			<AbsoluteFill style={{background: C.red, opacity: flash * 0.3}} />
			<PopText at={soul} y={190} size={96} out={aller - 3}>
				Soulevé de terre
			</PopText>
			<PopText at={cent} y={330} size={130} color={C.orange} rotate={-5} out={aller - 3}>
				100 kg
			</PopText>
			<PopText at={tech} y={510} size={64} color={C.red} out={aller - 3}>
				❌ sans technique
			</PopText>
			<PopText at={coach} y={600} size={64} color={C.red} out={aller - 3}>
				❌ sans coach
			</PopText>
			<PopText at={aller} y={200} size={92}>
				Aller simple
			</PopText>
			<PopText at={aller + 8} y={310} size={92}>
				chez le <Hl>kiné</Hl> 🩹
			</PopText>
			<Sfx at={0} name="whoosh" volume={0.4} />
			<Sfx at={soul} name="pop" />
			<Sfx at={cent} name="slam" volume={0.55} />
			<Sfx at={tech} name="wrong" volume={0.3} />
			<Sfx at={coach} name="wrong" volume={0.3} />
			<Sfx at={aller} name="crack" volume={0.8} />
			<Sfx at={kine} name="pop" />
		</Enter>
	);
};

/* ───────────────────────── 8. Appel à l'action ───────────────────────── */
const POINT: Pose = {rs: 118, re: -14, ls: -10, head: 6};

const PlanRow: React.FC<{at: number; icon: string; label: string; y: number}> = ({at, icon, label, y}) => {
	const f = useCurrentFrame();
	const t = pop(f, at, 13);
	if (f < at) return null;
	return (
		<div
			style={{
				position: 'absolute',
				left: 32,
				right: 32,
				top: y,
				height: 96,
				borderRadius: 24,
				background: C.orangeSoft,
				display: 'flex',
				alignItems: 'center',
				padding: '0 24px',
				fontSize: 40,
				fontWeight: 800,
				color: C.ink,
				transform: `translateX(${(1 - t) * 120}px)`,
				opacity: clamp01(t * 1.5),
			}}
		>
			<span style={{fontSize: 48, marginRight: 18}}>{icon}</span>
			<span style={{flex: 1}}>{label}</span>
			<span
				style={{
					width: 52,
					height: 52,
					borderRadius: 26,
					background: C.orange,
					color: '#fff',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: 32,
				}}
			>
				✓
			</span>
		</div>
	);
};

export const Cta: React.FC<SceneProps> = ({from}) => {
	const f = useCurrentFrame();
	const c = (x: string) => wordAt('cta', x) - from;
	const p = (x: string) => wordAt('plan', x) - from;
	const tele = c('Télécharge');
	const grand = c('Grandimi');
	const est = p('estime');
	const somm = p('sommeil');
	const nutr = p('nutrition');
	const sport = p('sport');
	const adapt = p('adapté');
	const slide = pop(f, 2, 16);
	const height = Math.round(lerp(f, est, est + 24, 150, 178));
	const point = pop(f, est, 14);
	const end = p('âge') + 22;
	const btn = pop(f, end);
	return (
		<Enter>
			<Svg>
				<Person x={170} y={1110} scale={0.82} pose={mixPose({}, POINT, point)} />
			</Svg>
			<PopText at={tele} y={150} size={96}>
				Télécharge
			</PopText>
			<PopText at={grand} y={250} size={150} color={C.orange} rotate={-2}>
				Grandimi
			</PopText>
			<div
				style={{
					position: 'absolute',
					left: 330,
					top: 460 + (1 - slide) * 1200,
					width: 470,
					height: 880,
					borderRadius: 64,
					background: C.ink,
					padding: 18,
					boxShadow: '0 30px 60px rgba(0,0,0,0.18)',
					fontFamily: FONT,
				}}
			>
				<div style={{position: 'relative', width: '100%', height: '100%', borderRadius: 48, background: '#fff', overflow: 'hidden'}}>
					<div style={{height: 34, display: 'flex', justifyContent: 'center', paddingTop: 12}}>
						<div style={{width: 120, height: 28, borderRadius: 14, background: C.ink}} />
					</div>
					<div style={{padding: '22px 32px 0', fontSize: 44, fontWeight: 900, color: C.orange, letterSpacing: -1}}>grandimi</div>
					<div
						style={{
							margin: '22px 32px 0',
							borderRadius: 28,
							background: C.ink,
							color: '#fff',
							padding: '26px 28px',
							opacity: f >= est ? 1 : 0.15,
						}}
					>
						<div style={{fontSize: 28, fontWeight: 700, opacity: 0.75}}>Taille adulte estimée</div>
						<div style={{fontSize: 96, fontWeight: 900, letterSpacing: -3, lineHeight: 1.05}}>
							{f >= est ? height : '—'}
							<span style={{fontSize: 44, marginLeft: 8}}>cm</span>
						</div>
						<div style={{fontSize: 22, fontWeight: 600, opacity: 0.55}}>exemple</div>
					</div>
					<div style={{padding: '30px 32px 0', fontSize: 30, fontWeight: 800, color: C.grayDark}}>Ton plan</div>
					<PlanRow at={somm} icon="😴" label="Sommeil" y={432} />
					<PlanRow at={nutr} icon="🥗" label="Nutrition" y={544} />
					<PlanRow at={sport} icon="🏀" label="Sport" y={656} />
					{f >= adapt ? (
						<div
							style={{
								position: 'absolute',
								left: 32,
								right: 32,
								top: 772,
								textAlign: 'center',
								fontSize: 30,
								fontWeight: 800,
								color: C.orange,
								transform: `scale(${pop(f, adapt)})`,
							}}
						>
							adapté à ton âge
						</div>
					) : null}
				</div>
			</div>
			{f >= end ? (
				<div
					style={{
						position: 'absolute',
						left: 140,
						right: 140,
						top: 1390,
						height: 130,
						borderRadius: 65,
						background: C.orange,
						color: '#fff',
						fontFamily: FONT,
						fontWeight: 900,
						fontSize: 58,
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						transform: `scale(${btn * (1 + 0.04 * Math.sin((f - end) / 4))})`,
						boxShadow: '0 14px 0 rgba(255,90,31,0.3)',
					}}
				>
					Télécharge Grandimi
				</div>
			) : null}
			<Sfx at={2} name="whoosh" volume={0.45} />
			<Sfx at={grand} name="sparkle" volume={0.5} />
			<Sfx at={est} name="pop" />
			<Sfx at={somm} name="pop" volume={0.4} />
			<Sfx at={nutr} name="pop" volume={0.4} />
			<Sfx at={sport} name="pop" volume={0.4} />
			<Sfx at={end} name="ding" />
		</Enter>
	);
};
