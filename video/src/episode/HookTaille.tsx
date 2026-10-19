import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Easing, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';
import {ease} from '../anim';
import {FONT} from '../theme';

/*
 * Accroche dessinée « 1m78, c'est la taille moyenne en France » (modèle : vidéo de l'utilisateur
 * a56d6d55, 2,6 s). Plan 1 : bonhomme à côté d'une barre bleue qui monte jusqu'à la taille, chiffre
 * qui compte en haut. Plan 2 (à `carte`) : carte de France orange, règle, petit bonhomme, puis (à
 * `moyenne`) silhouette en pointillés qui grandit jusqu'au repère rouge. Positions mesurées sur le
 * modèle (1080×1920). Tout bouge un peu en permanence (respiration, dérive de caméra) pour rester fluide.
 */

const BLEU = '#1593ee';
const BLEU_CLAIR = '#5ab8ff';
const ORANGE = '#ff7a00';
const ENCRE = '#151515';
const FPS = 30;

const ressort = (f: number, at: number, damping = 13, stiffness = 170) =>
	spring({
		frame: f - at,
		fps: FPS,
		config: {damping, stiffness, mass: 0.7},
	});

const Fond: React.FC = () => (
	<AbsoluteFill
		style={{
			background: 'radial-gradient(ellipse 75% 60% at 50% 48%, #ffffff 0%, #f7f7f7 45%, #c9c9c9 100%)',
		}}
	/>
);

/** Bonhomme dessiné (tête ronde, t-shirt blanc, short gris). `bras` : 0 = le long du corps, 1 = main sur la barre. */
const Bonhomme: React.FC<{
	x: number;
	sol: number;
	h: number;
	f: number;
	bras: number;
	mainY: number;
}> = ({x, sol, h, f, bras, mainY}) => {
	const u = h / 900;
	const souffle = Math.sin(f / 9) * 4 * u; // respiration : le haut du corps monte et descend
	const t = sol - h + souffle;
	const head = 118 * u;
	const cy = t + head;
	const neck = cy + head;
	const hip = neck + 330 * u - souffle * 0.5;
	const sw = 9 * u;
	// Clignement des yeux toutes les ~1,6 s (3 frames).
	const blink = f % 48 >= 44 && f % 48 < 47 ? 0.15 : 1;
	// Bras droit : de la position basse à la main posée sur la barre, qui suit le haut de la barre.
	const shoulder = {x: x + 70 * u, y: neck + 45 * u};
	const handDown = {x: x + 105 * u, y: hip + 30 * u};
	const handUp = {x: x + 172 * u, y: Math.max(neck - 10 * u, mainY)};
	const hand = {
		x: handDown.x + (handUp.x - handDown.x) * bras,
		y: handDown.y + (handUp.y - handDown.y) * bras,
	};
	const elbow = {
		x: (shoulder.x + hand.x) / 2 + 40 * u * (1 - bras) + 25 * u * bras,
		y: (shoulder.y + hand.y) / 2 + 70 * u * bras,
	};
	const tilt = Math.sin(f / 23) * 2 + 3 * bras; // la tête penche un peu vers la barre
	return (
		<g strokeLinecap="round" strokeLinejoin="round" stroke={ENCRE} strokeWidth={sw}>
			<ellipse cx={x} cy={sol + 6 * u} rx={130 * u} ry={14 * u} fill="#000" opacity={0.09} stroke="none" />
			{/* jambes */}
			<path d={`M${x - 45 * u},${hip + 60 * u} L${x - 50 * u},${sol - 8 * u} L${x - 95 * u},${sol - 8 * u}`} fill="none" />
			<path d={`M${x + 40 * u},${hip + 60 * u} L${x + 45 * u},${sol - 8 * u} L${x + 90 * u},${sol - 8 * u}`} fill="none" />
			{/* short */}
			<path
				d={`M${x - 80 * u},${hip - 20 * u} L${x + 75 * u},${hip - 20 * u} L${x + 82 * u},${hip + 140 * u} L${x + 8 * u},${hip + 140 * u} L${x},${hip + 62 * u} L${x - 12 * u},${hip + 140 * u} L${x - 87 * u},${hip + 140 * u} Z`}
				fill="#8d8d8d"
			/>
			<path d={`M${x - 70 * u},${hip + 10 * u} L${x - 75 * u},${hip + 120 * u}`} stroke="#a9a9a9" strokeWidth={10 * u} />
			{/* t-shirt avec manches */}
			<path
				d={`M${x - 70 * u},${neck + 22 * u} Q${x},${neck + 8 * u} ${x + 70 * u},${neck + 22 * u} L${x + 78 * u},${hip} L${x - 82 * u},${hip} Z`}
				fill="#fff"
			/>
			<path d={`M${x - 20 * u},${neck + 14 * u} Q${x},${neck + 40 * u} ${x + 20 * u},${neck + 14 * u}`} fill="none" strokeWidth={sw * 0.6} />
			{/* bras gauche le long du corps */}
			<path d={`M${x - 72 * u},${neck + 40 * u} Q${x - 95 * u},${neck + 180 * u} ${x - 92 * u},${hip + 40 * u}`} fill="none" />
			{/* bras droit qui monte avec la barre */}
			<path d={`M${shoulder.x},${shoulder.y} Q${elbow.x},${elbow.y} ${hand.x},${hand.y}`} fill="none" />
			<ellipse cx={hand.x + 4 * u} cy={hand.y - 4 * u} rx={14 * u} ry={24 * u} fill={ENCRE} stroke="none" />
			{/* tête */}
			<g transform={`rotate(${tilt} ${x} ${neck})`}>
				<circle cx={x} cy={cy} r={head} fill="#fff" strokeWidth={sw * 1.15} />
				<ellipse cx={x - 28 * u} cy={cy - 6 * u} rx={7 * u} ry={11 * u * blink} fill={ENCRE} stroke="none" />
				<ellipse cx={x + 45 * u} cy={cy - 6 * u} rx={7 * u} ry={11 * u * blink} fill={ENCRE} stroke="none" />
				<path d={`M${x - 52 * u},${cy - 32 * u} L${x - 14 * u},${cy - 30 * u}`} strokeWidth={sw * 0.6} />
				<path d={`M${x - 2 * u},${cy + 40 * u} Q${x + 18 * u},${cy + 55 * u} ${x + 40 * u},${cy + 36 * u}`} fill="none" strokeWidth={sw * 0.7} />
			</g>
		</g>
	);
};

/** Petit bonhomme noir (tête pleine) debout sur un disque bleu, qui sautille légèrement. */
const Mini: React.FC<{
	x: number;
	sol: number;
	h: number;
	f: number;
	entree: number;
}> = ({x, sol, h, f, entree}) => {
	const u = (h / 200) * entree;
	const saut = -Math.abs(Math.sin(f / 7)) * 6;
	const s = sol + saut;
	return (
		<g stroke={ENCRE} strokeWidth={9 * u} strokeLinecap="round" fill="none">
			<ellipse cx={x} cy={sol + 4} rx={70 * u * (1 + saut / 60)} ry={11 * u} fill={BLEU} stroke="none" />
			<circle cx={x + 6 * u} cy={s - 200 * u + 22 * u} r={22 * u} fill={ENCRE} stroke="none" />
			<path d={`M${x + 2 * u},${s - 154 * u} L${x - 2 * u},${s - 80 * u} L${x - 14 * u},${s} M${x - 2 * u},${s - 80 * u} L${x + 10 * u},${s}`} />
			<path d={`M${x + 2 * u},${s - 140 * u} L${x - 12 * u},${s - 95 * u}`} />
		</g>
	);
};

/** Règle verticale (graduations à gauche) de y0 à y1 ; `trace` (0 → 1) dessine les graduations de bas en haut. */
const Regle: React.FC<{x: number; y0: number; y1: number; trace: number}> = ({x, y0, y1, trace}) => {
	const top = y1 - (y1 - y0) * trace;
	const ticks = [];
	for (let y = y1 - 12, i = 0; y > top + 6; y -= 16, i++) ticks.push(<line key={i} x1={x - (i % 5 === 0 ? 34 : 20)} x2={x} y1={y} y2={y} />);
	return (
		<g stroke={ENCRE} strokeWidth={4}>
			<rect x={x - 46} y={top} width={56} height={y1 - top} fill="#fff" stroke="none" opacity={0.92} />
			<line x1={x} x2={x} y1={top} y2={y1} strokeWidth={6} />
			{ticks}
		</g>
	);
};

/** Silhouette (corps plein translucide, contour, tête en cercle tireté qui tourne), pieds en (x, sol), hauteur h. */
const Fantome: React.FC<{x: number; sol: number; h: number; f: number}> = ({x, sol, h, f}) => {
	if (h < 4) return null;
	const u = h / 770;
	const r = 68 * u;
	const t = sol - h;
	const n = t + 2 * r + 6 * u; // cou
	const body = `M${x - 18 * u},${n} L${x - 70 * u},${n + 30 * u} L${x - 110 * u},${n + 300 * u} L${x - 84 * u},${n + 306 * u} L${x - 52 * u},${n + 110 * u}
		L${x - 50 * u},${n + 300 * u} L${x - 60 * u},${sol} L${x - 14 * u},${sol} L${x},${n + 340 * u} L${x + 14 * u},${sol} L${x + 60 * u},${sol}
		L${x + 50 * u},${n + 300 * u} L${x + 52 * u},${n + 110 * u} L${x + 84 * u},${n + 306 * u} L${x + 110 * u},${n + 300 * u} L${x + 70 * u},${n + 30 * u} L${x + 18 * u},${n} Z`;
	return (
		<g>
			<path d={body} fill={BLEU_CLAIR} fillOpacity={0.18} stroke="#5f8aa6" strokeWidth={7 * u} strokeLinejoin="round" />
			<circle
				cx={x}
				cy={t + r}
				r={r}
				fill={BLEU_CLAIR}
				fillOpacity={0.15}
				stroke={BLEU}
				strokeWidth={8 * u}
				strokeDasharray={`${16 * u} ${11 * u}`}
				strokeDashoffset={-f * 1.5}
			/>
		</g>
	);
};

export const HookTaille: React.FC<{
	cm: number;
	carte: number;
	moyenne: number;
}> = ({cm, carte, moyenne}) => {
	const f = useCurrentFrame();
	const [france, setFrance] = useState<{
		w: number;
		h: number;
		d: string;
	} | null>(null);
	const [handle] = useState(() => delayRender('carte de France'));
	useEffect(() => {
		fetch(staticFile('dessins/france.json'))
			.then((r) => r.json())
			.then((j) => {
				setFrance(j);
				continueRender(handle);
			});
	}, [handle]);

	if (f < carte) {
		// Plan 1 : entrée en zoom avec flou, la barre monte avec un léger rebond, le chiffre compte.
		const zin = interpolate(f, [0, 8], [1.7, 1], {
			extrapolateRight: 'clamp',
			easing: Easing.out(Easing.cubic),
		});
		const flouIn = interpolate(f, [0, 8], [22, 0], {
			extrapolateRight: 'clamp',
		});
		// Sortie : zoom traversant sur les 4 dernières frames (enchaîne avec l'entrée de la carte).
		const zout = interpolate(f, [carte - 4, carte], [1, 1.35], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
			easing: Easing.in(Easing.quad),
		});
		const flouOut = interpolate(f, [carte - 4, carte], [0, 14], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
		});
		const derive = 1 + Math.max(0, f - 8) * 0.0015;
		const SOL = 1488;
		const TOP = 529;
		const grow = ressort(f, 4, 14, 120);
		const barTop = SOL - (SOL - TOP) * grow;
		const compte = Math.min(
			1,
			interpolate(f, [4, 18], [0, 1], {
				extrapolateLeft: 'clamp',
				extrapolateRight: 'clamp',
				easing: Easing.out(Easing.cubic),
			}),
		);
		const shown = Math.round(100 + (cm - 100) * compte);
		const num = ressort(f, 6, 10, 200);
		const pose = f >= 18 ? 1 + 0.12 * Math.max(0, 1 - (f - 18) / 7) : 1; // petit coup quand le chiffre se pose
		const bras = ease(f, 2, 12);
		const ticks = [];
		for (let y = SOL - 30, i = 0; y > barTop + 10; y -= 48, i++)
			ticks.push(<line key={i} x1={648 - (i % 2 ? 22 : 38)} x2={648} y1={y} y2={y} stroke="#fff" strokeWidth={5} opacity={0.85} />);
		return (
			<AbsoluteFill>
				<Fond />
				<AbsoluteFill
					style={{
						transform: `scale(${zin * derive * zout})`,
						filter: flouIn + flouOut > 0.3 ? `blur(${flouIn + flouOut}px)` : undefined,
					}}
				>
					<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
						<line x1={216} x2={907} y1={SOL} y2={SOL} stroke="#555" strokeWidth={5} />
						<rect x={464} y={barTop} width={184} height={Math.max(0, SOL - barTop)} fill={BLEU} rx={4} />
						<rect x={476} y={barTop + 8} width={26} height={Math.max(0, SOL - barTop - 16)} fill="#fff" opacity={0.18} rx={6} />
						{ticks}
						<Bonhomme x={300} sol={SOL - 2} h={900} f={f} bras={bras} mainY={barTop + 40} />
					</svg>
					<div
						style={{
							position: 'absolute',
							left: 0,
							right: 0,
							top: 250,
							textAlign: 'center',
							fontFamily: "'Poppins', " + FONT,
							fontWeight: 800,
							fontSize: 290,
							lineHeight: 1,
							color: BLEU,
							letterSpacing: -10,
							fontVariantNumeric: 'tabular-nums',
							transform: `scale(${(0.55 + 0.45 * num) * pose})`,
							opacity: Math.min(1, num * 1.5),
						}}
					>
						{shown}
						<span
							style={{
								fontSize: 52,
								fontWeight: 700,
								color: '#666',
								letterSpacing: 0,
								marginLeft: 10,
								opacity: ease(f, 16, 6),
							}}
						>
							cm
						</span>
					</div>
				</AbsoluteFill>
			</AbsoluteFill>
		);
	}

	// Plan 2 : carte de France, règle, petit bonhomme ; silhouette qui grandit à `moyenne`.
	const g = f - carte;
	const zin = interpolate(g, [0, 6], [0.82, 1], {
		extrapolateRight: 'clamp',
		easing: Easing.out(Easing.cubic),
	});
	const flou = interpolate(g, [0, 5], [12, 0], {extrapolateRight: 'clamp'});
	const derive = 1 + g * 0.0012;
	const carteIn = ressort(g, 0, 12, 160);
	const trace = ease(g, 2, 10);
	const mini = ressort(g, 3, 10, 220);
	const ghost = ressort(f, moyenne, 15, 110);
	const RX = 506;
	const SOL = 1290;
	const regleTop = interpolate(ghost, [0, 1], [529, 313]);
	const mapScale = 713 / (france?.w ?? 800);
	const mapW = france?.w ?? 800;
	const mapH = france?.h ?? 788;
	return (
		<AbsoluteFill>
			<Fond />
			<AbsoluteFill
				style={{
					transform: `scale(${zin * derive})`,
					filter: flou > 0.3 ? `blur(${flou}px)` : undefined,
				}}
			>
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
					{france ? (
						<g
							transform={`translate(281 576) scale(${mapScale}) translate(${mapW / 2} ${mapH / 2}) scale(${0.9 + 0.1 * carteIn}) translate(${-mapW / 2} ${-mapH / 2})`}
						>
							<path d={france.d} fill="#000" opacity={0.08} transform="translate(8 12)" />
							<path d={france.d} fill={ORANGE} />
						</g>
					) : null}
					<Regle x={RX} y0={regleTop} y1={SOL} trace={trace} />
					<Fantome x={640} sol={SOL - 20} h={(SOL - 20 - regleTop) * 0.8 * ghost} f={f} />
					{ghost > 0.01 ? (
						<>
							<rect x={RX - 46} y={regleTop - 14} width={56} height={22} fill="#e8202a" />
							<line x1={RX} x2={RX + 160 * Math.min(1, ghost)} y1={regleTop - 3} y2={regleTop - 3} stroke="#e8202a" strokeWidth={8} />
						</>
					) : null}
					<Mini x={226} sol={SOL} h={200} f={f} entree={mini} />
				</svg>
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
