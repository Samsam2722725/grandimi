import React from 'react';
import {random} from 'remotion';
import {C, FONT} from '../theme';

export const Ruler: React.FC<{x: number; top: number; bottom: number}> = ({x, top, bottom}) => {
	const ticks = [];
	for (let y = bottom; y >= top; y -= 25) {
		const major = (bottom - y) % 100 === 0;
		ticks.push(<line key={y} x1={x} x2={x + (major ? 44 : 24)} y1={y} y2={y} stroke={C.ink} strokeWidth={major ? 6 : 4} />);
	}
	return (
		<g>
			<rect x={x - 10} y={top - 10} width={70} height={bottom - top + 20} rx={12} fill="#f4efe9" />
			<line x1={x} x2={x} y1={top} y2={bottom} stroke={C.ink} strokeWidth={6} />
			{ticks}
		</g>
	);
};

/** Flèche verticale qui monte de `bottom` sur une hauteur `h`. */
export const UpArrow: React.FC<{x: number; bottom: number; h: number; color?: string; w?: number}> = ({
	x,
	bottom,
	h,
	color = C.orange,
	w = 34,
}) => {
	if (h <= 1) return null;
	const head = Math.min(70, h);
	const top = bottom - h;
	return (
		<g>
			<rect x={x - w / 2} y={top + head - 4} width={w} height={Math.max(0, h - head + 4)} rx={6} fill={color} />
			<path d={`M${x - w * 1.6},${top + head} L${x},${top} L${x + w * 1.6},${top + head} Z`} fill={color} strokeLinejoin="round" />
		</g>
	);
};

export const SvgText: React.FC<{
	x: number;
	y: number;
	size: number;
	color?: string;
	children: React.ReactNode;
	rotate?: number;
	anchor?: 'middle' | 'start' | 'end';
	weight?: number;
}> = ({x, y, size, color = C.ink, children, rotate = 0, anchor = 'middle', weight = 900}) => (
	<text
		x={x}
		y={y}
		fontFamily={FONT}
		fontWeight={weight}
		fontSize={size}
		fill={color}
		textAnchor={anchor}
		dominantBaseline="central"
		transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
	>
		{children}
	</text>
);

export const Bone: React.FC<{cx: number; top: number; bottom: number; glow: number}> = ({cx, top, bottom, glow}) => {
	const knob = 62;
	const plate = (y: number) => (
		<g>
			<rect x={cx - 92} y={y - 14} width={184} height={28} rx={14} fill={C.orange} opacity={0.35 + 0.65 * glow} />
			<rect x={cx - 104} y={y - 24} width={208} height={48} rx={24} fill={C.orange} opacity={0.18 * glow} />
		</g>
	);
	const end = (y: number, dir: 1 | -1) => (
		<g>
			<circle cx={cx - 44} cy={y + dir * 10} r={knob} fill="#f6f1ea" stroke={C.ink} strokeWidth={10} />
			<circle cx={cx + 44} cy={y + dir * 10} r={knob} fill="#f6f1ea" stroke={C.ink} strokeWidth={10} />
			<rect x={cx - 90} y={dir === 1 ? y + 10 : y - 70} width={180} height={60} fill="#f6f1ea" />
		</g>
	);
	return (
		<g>
			<rect x={cx - 48} y={top + 60} width={96} height={bottom - top - 120} fill="#f6f1ea" stroke={C.ink} strokeWidth={10} />
			{end(top + 30, -1)}
			{end(bottom - 30, 1)}
			<rect x={cx - 38} y={top + 70} width={76} height={bottom - top - 140} fill="#f6f1ea" />
			{plate(top + 108)}
			{plate(bottom - 108)}
		</g>
	);
};

export const Bed: React.FC = () => (
	<g>
		<rect x={880} y={880} width={60} height={360} rx={18} fill={C.ink} />
		<rect x={130} y={1000} width={40} height={240} rx={14} fill={C.ink} />
		<rect x={150} y={1068} width={760} height={92} rx={22} fill="#f4efe9" stroke={C.ink} strokeWidth={10} />
		<rect x={150} y={1150} width={760} height={34} rx={10} fill={C.ink} />
		<rect x={760} y={1022} width={120} height={52} rx={24} fill="#fff" stroke={C.ink} strokeWidth={8} />
	</g>
);

export const Blanket: React.FC = () => (
	<path
		d="M 300 1010 Q 330 990 420 994 L 640 1002 Q 700 1004 700 1040 L 700 1076 L 300 1076 Z"
		fill={C.orange}
		stroke={C.ink}
		strokeWidth={8}
		strokeLinejoin="round"
	/>
);

export const Moon: React.FC<{x: number; y: number; r?: number}> = ({x, y, r = 60}) => (
	<g>
		<circle cx={x} cy={y} r={r} fill="#ffcf4a" />
		<circle cx={x + r * 0.45} cy={y - r * 0.3} r={r * 0.85} fill="#fff" />
	</g>
);

/** Particules « hormone de croissance » qui montent depuis le corps. */
export const Particles: React.FC<{
	frame: number;
	start: number;
	x: number;
	y: number;
	spread: number;
	lowAfter?: number;
}> = ({frame, start, x, y, spread, lowAfter}) => {
	const items = [];
	for (let i = 0; i < 60; i++) {
		const born = start + i * 5;
		const age = frame - born;
		if (age < 0 || age > 60) continue;
		const low = lowAfter !== undefined && born >= lowAfter;
		if (low && i % 3 !== 0) continue;
		const px = x + (random(`px${i}`) - 0.5) * spread + Math.sin(age / 8 + i) * 12;
		const py = y - age * 6.5;
		const r = 10 + random(`r${i}`) * 14;
		const op = Math.min(1, age / 6) * Math.max(0, 1 - age / 60);
		items.push(<circle key={i} cx={px} cy={py} r={r} fill={low ? C.grayDark : C.orange} opacity={op} />);
	}
	return <g>{items}</g>;
};

export const Zzz: React.FC<{frame: number; x: number; y: number; until?: number}> = ({frame, x, y, until}) => {
	const items = [];
	for (let i = 0; i < 12; i++) {
		const born = i * 18;
		const age = frame - born;
		if (age < 0 || age > 54) continue;
		if (until !== undefined && born > until) continue;
		const op = Math.min(1, age / 8) * Math.max(0, 1 - age / 54);
		items.push(
			<SvgText key={i} x={x + age * 2.2} y={y - age * 3} size={44 + age * 0.6} color={C.ink}>
				<tspan opacity={op}>Z</tspan>
			</SvgText>,
		);
	}
	return <g>{items}</g>;
};

export const Barbell: React.FC<{x: number; y: number; rotate?: number; label?: boolean}> = ({x, y, rotate = 0, label = true}) => (
	<g transform={`translate(${x},${y}) rotate(${rotate})`}>
		<rect x={-300} y={-9} width={600} height={18} rx={9} fill="#5a5650" />
		{[-1, 1].map((s) => (
			<g key={s}>
				<rect x={s * 230 - 34} y={-118} width={68} height={236} rx={18} fill={C.ink} />
				<rect x={s * 190 - 20} y={-86} width={40} height={172} rx={12} fill={C.ink} />
			</g>
		))}
		{label ? (
			<SvgText x={230} y={0} size={34} color="#fff" rotate={-90}>
				100 KG
			</SvgText>
		) : null}
	</g>
);

export const Heart: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
	<path
		transform={`translate(${x},${y}) scale(${s})`}
		d="M0,30 C-10,18 -52,-6 -52,-32 C-52,-52 -36,-64 -20,-64 C-8,-64 -2,-56 0,-48 C2,-56 8,-64 20,-64 C36,-64 52,-52 52,-32 C52,-6 10,18 0,30 Z"
		fill={C.red}
	/>
);

export const Signpost: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
	<g transform={`translate(${x},${y}) scale(${s})`}>
		<rect x={-10} y={-40} width={20} height={300} fill="#5a5650" />
		<path d="M-120,-150 L110,-150 L160,-95 L110,-40 L-120,-40 Z" fill={C.orange} stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
		<SvgText x={10} y={-95} size={62} color="#fff">
			KINÉ
		</SvgText>
	</g>
);

/** Petite croix médicale (douleur) et éclats rouges. */
export const Pain: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) => (
	<g transform={`translate(${x},${y}) scale(${s})`}>
		{[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
			<line
				key={a}
				x1={Math.cos((a * Math.PI) / 180) * 40}
				y1={Math.sin((a * Math.PI) / 180) * 40}
				x2={Math.cos((a * Math.PI) / 180) * 78}
				y2={Math.sin((a * Math.PI) / 180) * 78}
				stroke={C.red}
				strokeWidth={12}
				strokeLinecap="round"
			/>
		))}
	</g>
);

/** Disque de barre vu de profil (la barre est perpendiculaire à l'écran). */
export const Plate: React.FC<{x: number; y: number; r?: number}> = ({x, y, r = 72}) => (
	<g transform={`translate(${x},${y})`}>
		<circle r={r} fill={C.ink} />
		<circle r={r * 0.72} fill="none" stroke="#3a3632" strokeWidth={6} />
		<circle r={14} fill="#8c8780" />
		<SvgText x={0} y={-r * 0.42} size={24} color="#fff">
			100 KG
		</SvgText>
	</g>
);
