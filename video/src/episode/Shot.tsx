import React from 'react';
import {Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';

/** Position de caméra : centre (x, y) en pixels de l'image, et zoom (1 = l'image couvre l'écran). */
export type Cam = {f: number; x: number; y: number; z: number; dur?: number; lineaire?: boolean};

const W = 1080;
const H = 1920;

const camAt = (keys: Cam[], f: number, derive: boolean) => {
	let i = 0;
	while (i + 1 < keys.length && keys[i + 1].f <= f) i++;
	const k = keys[i];
	const prev = keys[Math.max(0, i - 1)];
	const t = interpolate(f, [k.f, k.f + (k.dur ?? 12)], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: k.lineaire ? Easing.linear : Easing.inOut(Easing.cubic),
	});
	const from = i === 0 ? k : prev;
	// Légère poussée continue après chaque mouvement, pour que l'image ne soit jamais figée.
	const drift = derive ? 1 + Math.min(0.05, Math.max(0, f - k.f) * 0.0012) : 1;
	return {
		x: from.x + (k.x - from.x) * t,
		y: from.y + (k.y - from.y) * t,
		z: (from.z + (k.z - from.z) * t) * drift,
	};
};

/**
 * Image plein écran filmée par une caméra virtuelle. Les enfants sont placés
 * en coordonnées de l'image et suivent donc les mouvements de caméra.
 */
export const Shot: React.FC<{
	src: string;
	w: number;
	h: number;
	cams: Cam[];
	bg?: string;
	children?: React.ReactNode;
	rotate?: number;
	libre?: boolean;
	/** false : caméra parfaitement fixe entre deux mouvements (comme la référence 7436214342510513439). */
	derive?: boolean;
	/** Flou proportionnel à la vitesse de la caméra (zooms rapides qui restent fluides). */
	flouMouvement?: boolean;
}> = ({src, w, h, cams, bg = '#000', children, rotate = 0, libre = false, derive = true, flouMouvement = false}) => {
	const f = useCurrentFrame();
	const c = camAt(cams, f, derive);
	const p = camAt(cams, f - 1, derive);
	const flou = flouMouvement ? Math.min(10, (60 * Math.abs(c.z - p.z)) / c.z + 0.06 * Math.hypot(c.x - p.x, c.y - p.y) * c.z) : 0;
	const s = Math.max(W / w, H / h) * c.z;
	let tx = W / 2 - c.x * s;
	let ty = H / 2 - c.y * s;
	if (!libre) {
		if (w * s >= W) tx = Math.min(0, Math.max(W - w * s, tx));
		else tx = (W - w * s) / 2;
		if (h * s >= H) ty = Math.min(0, Math.max(H - h * s, ty));
		else ty = (H - h * s) / 2;
	}
	return (
		<div style={{position: 'absolute', inset: 0, overflow: 'hidden', background: bg}}>
			<div
				style={{
					position: 'absolute',
					left: 0,
					top: 0,
					width: w,
					height: h,
					transformOrigin: '0 0',
					transform: `translate(${tx}px, ${ty}px) scale(${s})${rotate ? ` rotate(${rotate}deg)` : ''}`,
					filter: flou > 0.4 ? `blur(${flou.toFixed(1)}px)` : undefined,
				}}
			>
				<Img src={staticFile(src)} style={{position: 'absolute', left: 0, top: 0, width: w, height: h}} />
				{children}
			</div>
		</div>
	);
};
