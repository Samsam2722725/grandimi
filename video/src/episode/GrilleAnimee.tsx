import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';

/*
 * Grille verte néon de la référence p19-ref, mesurée image par image (1080×1920, 30 i/s) :
 * lignes horizontales espacées de ~200 px qui descendent de ~7 px par image (la boucle revient en ~28 images),
 * lignes verticales fixes à x ≈ 138, 340, 537, 749, 941, toutes légèrement ondulées ;
 * fond noir en haut, vert de plus en plus clair vers le bas (G ≈ 4 à y 100, 95 à y 1500, 193 à y 1910) ;
 * lignes invisibles en haut, nettes et presque blanches-vertes à partir de y ≈ 1300.
 */
const PAS = 200;
const VITESSE = 7;
const XS = [-62, 138, 340, 537, 749, 941, 1141];

const opacite = (y: number) => Math.max(0, Math.min(1, (y - 330) / 900));

export const GrilleAnimee: React.FC = () => {
	const f = useCurrentFrame();
	const decal = (f * VITESSE) % PAS;
	const horizontales: number[] = [];
	for (let y = -PAS + decal; y < 1920 + PAS; y += PAS) horizontales.push(y);
	const onde = (k: number, t: number) => 7 * Math.sin(t / 170 + f / 18 + k * 1.7);
	return (
		<AbsoluteFill
			style={{
				background: 'linear-gradient(180deg, #010402 0%, #010702 15%, #02100a 36%, #04220a 47%, #063a0e 57%, #035012 68%, #045f0e 78%, #047612 88%, #06c113 100%)',
			}}
		>
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
				<defs>
					<filter id="lueur-grille" x="-10%" y="-10%" width="120%" height="120%">
						<feGaussianBlur stdDeviation="7" result="flou" />
						<feMerge>
							<feMergeNode in="flou" />
							<feMergeNode in="flou" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
				</defs>
				<g filter="url(#lueur-grille)" fill="none" strokeLinecap="round">
					{horizontales.map((y, k) => {
						const pts: string[] = [];
						for (let x = -20; x <= 1100; x += 40) pts.push(`${x},${(y + onde(k, x)).toFixed(1)}`);
						const o = opacite(y);
						return o > 0.01 ? <polyline key={`h${k}`} points={pts.join(' ')} stroke="#47ff52" strokeWidth={5} opacity={o} /> : null;
					})}
					{XS.map((x0, k) => {
						const segs = [];
						for (let y = 300; y < 1920; y += 40) {
							const x1 = x0 + onde(k + 5, y);
							const x2 = x0 + onde(k + 5, y + 40);
							segs.push(<line key={y} x1={x1} y1={y} x2={x2} y2={y + 40} stroke="#47ff52" strokeWidth={5} opacity={opacite(y + 20)} />);
						}
						return <g key={`v${k}`}>{segs}</g>;
					})}
				</g>
			</svg>
		</AbsoluteFill>
	);
};
