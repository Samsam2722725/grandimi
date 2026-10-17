import React from 'react';
import {C} from '../theme';

/**
 * Silhouette « pictogramme » sans visage, animable membre par membre.
 * Angles en degrés : 0 = vers le bas, 90 = vers la droite, 180 = vers le haut.
 * Les coudes et genoux sont relatifs au segment parent. Le bassin est à l'origine.
 */
export type Pose = {
	torso?: number; // inclinaison du buste (0 = droit, + = penché vers la gauche)
	head?: number;
	ls?: number; // épaule gauche
	le?: number; // coude gauche
	rs?: number;
	re?: number;
	lh?: number; // hanche gauche
	lk?: number; // genou gauche
	rh?: number;
	rk?: number;
};

export type Pt = {x: number; y: number};
export type Joints = {
	hip: Pt;
	neck: Pt;
	head: Pt;
	lHand: Pt;
	rHand: Pt;
	lFoot: Pt;
	rFoot: Pt;
};

const SEG = {torso: 175, upper: 92, fore: 88, thigh: 112, shin: 108, head: 44};
const rad = (d: number) => (d * Math.PI) / 180;
const step = (p: Pt, angle: number, len: number): Pt => ({
	x: p.x + Math.sin(rad(angle)) * len,
	y: p.y + Math.cos(rad(angle)) * len,
});

export const STAND: Required<Pose> = {
	torso: 0,
	head: 0,
	ls: -10,
	le: -6,
	rs: 10,
	re: 6,
	lh: -5,
	lk: 2,
	rh: 5,
	rk: -2,
};

export const mixPose = (a: Pose, b: Pose, t: number): Required<Pose> => {
	const A = {...STAND, ...a};
	const B = {...STAND, ...b};
	const out = {} as Required<Pose>;
	(Object.keys(STAND) as (keyof Pose)[]).forEach((k) => {
		out[k] = A[k] + (B[k] - A[k]) * t;
	});
	return out;
};

export const joints = (pose: Pose): Joints & {lElbow: Pt; rElbow: Pt; lKnee: Pt; rKnee: Pt; shoulder: Pt} => {
	const p = {...STAND, ...pose};
	const hip = {x: 0, y: 0};
	const neck = step(hip, 180 + p.torso, SEG.torso);
	const shoulder = step(neck, p.torso, 14);
	const head = step(neck, 180 + p.torso + p.head, SEG.head + 10);
	const lElbow = step(shoulder, p.ls, SEG.upper);
	const lHand = step(lElbow, p.ls + p.le, SEG.fore);
	const rElbow = step(shoulder, p.rs, SEG.upper);
	const rHand = step(rElbow, p.rs + p.re, SEG.fore);
	const lKnee = step(hip, p.lh, SEG.thigh);
	const lFoot = step(lKnee, p.lh + p.lk, SEG.shin);
	const rKnee = step(hip, p.rh, SEG.thigh);
	const rFoot = step(rKnee, p.rh + p.rk, SEG.shin);
	return {hip, neck, shoulder, head, lElbow, lHand, rElbow, rHand, lKnee, lFoot, rKnee, rFoot};
};

const line = (pts: Pt[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

export const Person: React.FC<{
	x: number;
	y: number;
	scale?: number;
	rotate?: number;
	pose?: Pose;
	color?: string;
	hair?: 'none' | 'ponytail';
	opacity?: number;
	/** Dessin attaché au corps (haltère, téléphone…), au-dessus des bras arrière. */
	attach?: (j: ReturnType<typeof joints>) => React.ReactNode;
	shadow?: boolean;
}> = ({x, y, scale = 1, rotate = 0, pose = {}, color = C.ink, hair = 'none', opacity = 1, attach, shadow = true}) => {
	const j = joints(pose);
	const limb = {stroke: color, strokeWidth: 36, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none'};
	const back = {...limb, stroke: color, opacity: 0.82};
	const footY = Math.max(j.lFoot.y, j.rFoot.y) + 18;
	return (
		<g transform={`translate(${x},${y}) rotate(${rotate}) scale(${scale})`} opacity={opacity}>
			{shadow && rotate === 0 ? <ellipse cx={0} cy={footY} rx={120} ry={16} fill="#000" opacity={0.08} /> : null}
			<path d={line([j.shoulder, j.lElbow, j.lHand])} {...back} />
			<path d={line([j.hip, j.lKnee, j.lFoot])} {...back} />
			<path d={line([j.hip, j.rKnee, j.rFoot])} {...limb} />
			<path d={line([j.hip, j.neck])} {...limb} strokeWidth={64} />
			{hair === 'ponytail' ? (
				<path
					d={`M${j.head.x - 30},${j.head.y - 20} q-46,10 -52,70`}
					stroke={color}
					strokeWidth={26}
					strokeLinecap="round"
					fill="none"
				/>
			) : null}
			<circle cx={j.head.x} cy={j.head.y} r={SEG.head} fill={color} />
			{attach ? attach(j) : null}
			<path d={line([j.shoulder, j.rElbow, j.rHand])} {...limb} />
		</g>
	);
};
