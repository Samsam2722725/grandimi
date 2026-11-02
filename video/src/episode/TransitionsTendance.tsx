import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';

/*
 * Transitions « tendance » (demande du 02/11 : plus visibles, fortes, mais absolument fluides).
 * Chaque transition est une paire sortie + entrée : le mouvement continue d'un plan à l'autre (même sens, même
 * vitesse au moment de la coupe), ce qui donne l'impression d'un seul geste.
 *   zoom : le plan sortant plonge en avant (×1 → ×1,7) avec flou et éclair blanc sur 7 images ; le plan entrant
 *          arrive de très près (×1,7) et se pose avec un léger rebond (×0,985) en 10 images.
 *   whip : balayage horizontal : le plan sortant file à gauche (−520 px) en 6 images, le plan entrant arrive de la
 *          droite (+520 px, bord à bord, jamais d'image noire) avec un flou de mouvement, dépasse un peu puis se cale.
 */

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const FlouH: React.FC<{id: string; px: number}> = ({id, px}) => (
	<svg width={0} height={0} style={{position: 'absolute'}}>
		<filter id={id} x="-20%" y="0" width="140%" height="100%">
			<feGaussianBlur stdDeviation={`${px} 0`} />
		</filter>
	</svg>
);

export const EntreeZoom: React.FC<{children: React.ReactNode}> = ({children}) => {
	const f = useCurrentFrame();
	const z = interpolate(f, [0, 3, 6, 10], [1.7, 1.12, 0.985, 1], {...clamp, easing: Easing.out(Easing.cubic)});
	const flou = interpolate(f, [0, 4, 7], [16, 4, 0], clamp);
	const blanc = interpolate(f, [0, 1, 3], [0.4, 0.15, 0], clamp);
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{transform: `scale(${z})`, filter: flou > 0.3 ? `blur(${flou}px)` : undefined}}>{children}</AbsoluteFill>
			{blanc > 0.01 ? <AbsoluteFill style={{background: '#fff', opacity: blanc}} /> : null}
		</AbsoluteFill>
	);
};

export const SortieZoom: React.FC<{dur: number; children: React.ReactNode}> = ({dur, children}) => {
	const f = useCurrentFrame();
	const t = interpolate(f, [dur - 7, dur - 1], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const blanc = 0;
	return (
		<AbsoluteFill>
			<AbsoluteFill style={{transform: `scale(${1 + 0.7 * t})`, filter: t > 0.02 ? `blur(${16 * t}px)` : undefined}}>{children}</AbsoluteFill>
			{blanc > 0.01 ? <AbsoluteFill style={{background: '#fff', opacity: blanc}} /> : null}
		</AbsoluteFill>
	);
};

export const EntreeWhip: React.FC<{id: string; children: React.ReactNode}> = ({id, children}) => {
	const f = useCurrentFrame();
	const x = interpolate(f, [0, 3, 6, 10], [520, 90, -24, 0], {...clamp, easing: Easing.out(Easing.cubic)});
	const flou = interpolate(f, [0, 3, 6], [60, 18, 0], clamp);
	return (
		<AbsoluteFill>
			{flou > 0.5 ? <FlouH id={`whip-in-${id}`} px={flou} /> : null}
			<AbsoluteFill style={{transform: `translateX(${x}px)`, filter: flou > 0.5 ? `url(#whip-in-${id})` : undefined}}>{children}</AbsoluteFill>
		</AbsoluteFill>
	);
};

export const SortieWhip: React.FC<{id: string; dur: number; children: React.ReactNode}> = ({id, dur, children}) => {
	const f = useCurrentFrame();
	const t = interpolate(f, [dur - 6, dur - 1], [0, 1], {...clamp, easing: Easing.in(Easing.cubic)});
	const flou = 60 * t;
	return (
		<AbsoluteFill>
			{flou > 0.5 ? <FlouH id={`whip-out-${id}`} px={flou} /> : null}
			<AbsoluteFill style={{transform: `translateX(${-520 * t}px)`, filter: flou > 0.5 ? `url(#whip-out-${id})` : undefined}}>{children}</AbsoluteFill>
		</AbsoluteFill>
	);
};
