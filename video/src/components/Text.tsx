import React from 'react';
import {useCurrentFrame} from 'remotion';
import {pop, shake} from '../anim';
import {C, FONT} from '../theme';

/** Texte qui apparaît en « pop » centré horizontalement à la hauteur `y`. */
export const PopText: React.FC<{
	at: number;
	y: number;
	size?: number;
	color?: string;
	rotate?: number;
	weight?: number;
	shakeAmp?: number;
	children: React.ReactNode;
	x?: number;
	width?: number;
	out?: number;
}> = ({at, y, size = 96, color = C.ink, rotate = 0, weight = 900, shakeAmp = 0, children, x = 540, width = 960, out}) => {
	const f = useCurrentFrame();
	const s = pop(f, at);
	const gone = out !== undefined ? 1 - pop(f, out, 20) : 1;
	if (f < at) return null;
	return (
		<div
			style={{
				position: 'absolute',
				left: x - width / 2,
				top: y,
				width,
				textAlign: 'center',
				fontFamily: FONT,
				fontWeight: weight,
				fontSize: size,
				lineHeight: 1.02,
				letterSpacing: -2,
				color,
				textTransform: 'uppercase',
				transform: `translateX(${shake(f, shakeAmp)}px) scale(${s * gone}) rotate(${rotate}deg)`,
				transformOrigin: '50% 50%',
				textShadow: '0 6px 0 rgba(0,0,0,0.07)',
			}}
		>
			{children}
		</div>
	);
};

export const Hl: React.FC<{children: React.ReactNode; color?: string}> = ({children, color = C.orange}) => (
	<span style={{color}}>{children}</span>
);

/** Pastille « N°1 » / « N°2 ». */
export const Badge: React.FC<{at: number; label: string; y?: number}> = ({at, label, y = 300}) => {
	const f = useCurrentFrame();
	const s = pop(f, at, 9);
	if (f < at) return null;
	return (
		<div
			style={{
				position: 'absolute',
				left: 540 - 170,
				top: y,
				width: 340,
				height: 340,
				borderRadius: 170,
				background: C.orange,
				color: '#fff',
				fontFamily: FONT,
				fontWeight: 900,
				fontSize: 150,
				letterSpacing: -6,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				transform: `scale(${s}) rotate(${(1 - s) * -40}deg)`,
				boxShadow: '0 18px 0 rgba(255,90,31,0.25)',
			}}
		>
			{label}
		</div>
	);
};
