import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, Easing, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {ease, pop} from '../anim';
import {FONT} from '../theme';

/*
 * Accroche dessinée « 1m78, c'est la taille moyenne en France » (modèle : vidéo de l'utilisateur
 * a56d6d55, 2,6 s). Plan 1 : bonhomme à côté d'une barre bleue qui monte jusqu'à la taille, chiffre
 * en haut. Plan 2 (à `carte`) : carte de France orange, règle, petit bonhomme, puis (à `moyenne`)
 * silhouette en pointillés qui grandit jusqu'au repère rouge. Positions mesurées sur le modèle (1080×1920).
 */

const BLEU = '#1593ee';
const ORANGE = '#ff7a00';
const ENCRE = '#151515';

const Fond: React.FC = () => (
	<AbsoluteFill style={{background: 'radial-gradient(ellipse 75% 60% at 50% 48%, #ffffff 0%, #f7f7f7 45%, #c9c9c9 100%)'}} />
);

/** Bonhomme dessiné (tête ronde, t-shirt blanc, short gris), pieds en (x, sol), hauteur h. */
const Bonhomme: React.FC<{x: number; sol: number; h: number}> = ({x, sol, h}) => {
	const u = h / 900;
	const t = sol - h;
	const head = 118 * u;
	const cy = t + head;
	const neck = cy + head;
	const hip = neck + 330 * u;
	const sw = 9 * u;
	return (
		<g strokeLinecap="round" strokeLinejoin="round" stroke={ENCRE} strokeWidth={sw}>
			{/* jambes */}
			<path d={`M${x - 45 * u},${hip + 60 * u} L${x - 50 * u},${sol - 8 * u} L${x - 95 * u},${sol - 8 * u}`} fill="none" />
			<path d={`M${x + 40 * u},${hip + 60 * u} L${x + 45 * u},${sol - 8 * u} L${x + 90 * u},${sol - 8 * u}`} fill="none" />
			{/* short */}
			<path d={`M${x - 80 * u},${hip - 20 * u} L${x + 75 * u},${hip - 20 * u} L${x + 80 * u},${hip + 140 * u} L${x + 8 * u},${hip + 140 * u} L${x},${hip + 60 * u} L${x - 12 * u},${hip + 140 * u} L${x - 85 * u},${hip + 140 * u} Z`} fill="#8d8d8d" />
			{/* t-shirt */}
			<path d={`M${x - 70 * u},${neck + 25 * u} L${x + 70 * u},${neck + 25 * u} L${x + 78 * u},${hip} L${x - 82 * u},${hip} Z`} fill="#fff" />
			{/* bras : gauche le long du corps, droit levé contre la barre */}
			<path d={`M${x - 70 * u},${neck + 40 * u} L${x - 92 * u},${hip + 40 * u}`} fill="none" />
			<path d={`M${x + 70 * u},${neck + 45 * u} L${x + 135 * u},${neck + 210 * u} L${x + 175 * u},${neck + 60 * u}`} fill="none" />
			<ellipse cx={x + 178 * u} cy={neck + 48 * u} rx={14 * u} ry={26 * u} fill={ENCRE} stroke="none" />
			{/* tête */}
			<circle cx={x} cy={cy} r={head} fill="#fff" strokeWidth={sw * 1.15} />
			<ellipse cx={x - 28 * u} cy={cy - 6 * u} rx={7 * u} ry={11 * u} fill={ENCRE} stroke="none" />
			<ellipse cx={x + 45 * u} cy={cy - 6 * u} rx={7 * u} ry={11 * u} fill={ENCRE} stroke="none" />
			<path d={`M${x - 52 * u},${cy - 30 * u} L${x - 14 * u},${cy - 30 * u}`} strokeWidth={sw * 0.6} />
			<path d={`M${x - 2 * u},${cy + 40 * u} Q${x + 18 * u},${cy + 55 * u} ${x + 40 * u},${cy + 36 * u}`} fill="none" strokeWidth={sw * 0.7} />
		</g>
	);
};

/** Petit bonhomme noir (tête pleine) debout sur un disque bleu. */
const Mini: React.FC<{x: number; sol: number; h: number}> = ({x, sol, h}) => {
	const u = h / 200;
	return (
		<g stroke={ENCRE} strokeWidth={9 * u} strokeLinecap="round" fill="none">
			<ellipse cx={x} cy={sol + 4 * u} rx={70 * u} ry={11 * u} fill={BLEU} stroke="none" />
			<circle cx={x + 6 * u} cy={sol - h + 22 * u} r={22 * u} fill={ENCRE} stroke="none" />
			<path d={`M${x + 2 * u},${sol - h + 46 * u} L${x - 2 * u},${sol - 80 * u} L${x - 14 * u},${sol} M${x - 2 * u},${sol - 80 * u} L${x + 10 * u},${sol}`} />
			<path d={`M${x + 2 * u},${sol - h + 60 * u} L${x - 12 * u},${sol - 95 * u}`} />
		</g>
	);
};

/** Règle verticale (graduations à gauche) de y0 à y1. */
const Regle: React.FC<{x: number; y0: number; y1: number}> = ({x, y0, y1}) => {
	const ticks = [];
	for (let y = y1 - 12, i = 0; y > y0 + 6; y -= 16, i++) ticks.push(<line key={i} x1={x - (i % 5 === 0 ? 34 : 20)} x2={x} y1={y} y2={y} />);
	return (
		<g stroke={ENCRE} strokeWidth={4}>
			<rect x={x - 46} y={y0} width={56} height={y1 - y0} fill="#fff" stroke="none" opacity={0.9} />
			<line x1={x} x2={x} y1={y0} y2={y1} strokeWidth={6} />
			{ticks}
		</g>
	);
};

/** Silhouette en pointillés (tête en cercle tireté), pieds en (x, sol), hauteur h. */
const Fantome: React.FC<{x: number; sol: number; h: number}> = ({x, sol, h}) => {
	const u = h / 770;
	const head = 70 * u;
	const t = sol - h;
	return (
		<g fill="none" strokeWidth={8 * u} strokeLinecap="round">
			<circle cx={x} cy={t + head} r={head} stroke={BLEU} strokeDasharray={`${14 * u} ${10 * u}`} />
			<path
				d={`M${x - 10 * u},${t + 2 * head} L${x - 10 * u},${t + 330 * u} L${x - 95 * u},${t + 420 * u} M${x + 10 * u},${t + 2 * head} L${x + 10 * u},${t + 330 * u} L${x + 95 * u},${t + 420 * u}
				    M${x - 20 * u},${t + 330 * u} L${x - 35 * u},${sol} M${x + 20 * u},${t + 330 * u} L${x + 35 * u},${sol} M${x - 70 * u},${sol} L${x + 70 * u},${sol}`}
				stroke="#5f8aa6"
				opacity={0.75}
			/>
		</g>
	);
};

export const HookTaille: React.FC<{cm: number; carte: number; moyenne: number}> = ({cm, carte, moyenne}) => {
	const f = useCurrentFrame();
	const [france, setFrance] = useState<{w: number; h: number; d: string} | null>(null);
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
		// Plan 1 : entrée en zoom avec flou, la barre monte, le chiffre se pose.
		const zin = interpolate(f, [0, 7], [1.7, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
		const flou = interpolate(f, [0, 7], [22, 0], {extrapolateRight: 'clamp'});
		const derive = 1 + Math.max(0, f - 7) * 0.0015;
		const SOL = 1488;
		const top = 529;
		const grow = ease(f, 4, 12);
		const barTop = SOL - (SOL - top) * grow;
		const shown = Math.round(100 + (cm - 100) * grow);
		const num = pop(f, 10, 9);
		return (
			<AbsoluteFill style={{transform: `scale(${zin * derive})`, filter: flou > 0.3 ? `blur(${flou}px)` : undefined}}>
				<Fond />
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
					<line x1={216} x2={907} y1={SOL} y2={SOL} stroke="#555" strokeWidth={5} />
					<ellipse cx={318} cy={SOL + 4} rx={120} ry={12} fill="#000" opacity={0.08} />
					<rect x={464} y={barTop} width={184} height={SOL - barTop} fill={BLEU} />
					<Bonhomme x={300} sol={SOL - 2} h={900} />
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
						transform: `scale(${0.6 + 0.4 * num})`,
						opacity: Math.min(1, num * 1.5),
					}}
				>
					{shown}
					<span style={{fontSize: 52, fontWeight: 700, color: '#666', letterSpacing: 0, marginLeft: 10}}>cm</span>
				</div>
			</AbsoluteFill>
		);
	}

	// Plan 2 : carte de France, règle, petit bonhomme ; silhouette qui grandit à `moyenne`.
	const g = f - carte;
	const zin = interpolate(g, [0, 5], [1.12, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	const derive = 1 + g * 0.0012;
	const ghost = ease(f, moyenne, 12);
	const RX = 506;
	const SOL = 1290;
	const regleTop = interpolate(ghost, [0, 1], [529, 313]);
	const mapScale = 713 / (france?.w ?? 800);
	return (
		<AbsoluteFill style={{transform: `scale(${zin * derive})`}}>
			<Fond />
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				{france ? <path d={france.d} fill={ORANGE} transform={`translate(281 ${616 - 40}) scale(${mapScale})`} /> : null}
				<Regle x={RX} y0={regleTop} y1={SOL} />
				{ghost > 0 ? (
					<>
						<Fantome x={640} sol={SOL - 20} h={(SOL - 20 - regleTop) * 0.8 * ghost} />
						<rect x={RX - 46} y={regleTop - 14} width={56} height={22} fill="#e8202a" />
						<line x1={RX} x2={RX + 160 * ghost} y1={regleTop - 3} y2={regleTop - 3} stroke="#e8202a" strokeWidth={8} />
					</>
				) : null}
				<Mini x={226} sol={SOL} h={200} />
			</svg>
		</AbsoluteFill>
	);
};
