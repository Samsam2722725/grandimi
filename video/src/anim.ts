import {Easing, interpolate, spring} from 'remotion';

export const FPS = 30;

/** Ressort 0 → 1 qui démarre à `at` (rebond marqué, effet « pop »). */
export const pop = (frame: number, at: number, damping = 11) =>
	spring({frame: frame - at, fps: FPS, config: {damping, stiffness: 190, mass: 0.6}});

/** Ressort doux sans dépassement. */
export const ease = (frame: number, at: number, dur = 12) =>
	interpolate(frame, [at, at + dur], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing: Easing.out(Easing.cubic),
	});

/** Tremblement pseudo-aléatoire déterministe. */
export const shake = (frame: number, amp: number, speed = 1) =>
	amp * (Math.sin(frame * 2.1 * speed) * 0.6 + Math.sin(frame * 3.7 * speed + 1) * 0.4);

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
