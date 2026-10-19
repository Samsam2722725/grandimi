import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame} from 'remotion';
import {ease} from '../anim';
import {FONT} from '../theme';
import {BLEU, Bonhomme, bosse, Eclats, ENCRE, Fond, ORANGE, ressort, secousse} from './HookTaille';

/*
 * Accroche dessinée « On prédit votre potentiel de taille à partir de vos commentaires » (dérivée de
 * l'accroche de la partie 9, HookTaille). Plan 1 : le bonhomme, la barre qui monte jusqu'à la taille
 * actuelle (`actuelle`), le chiffre qui compte et se pose ; à `potentiel`, un prolongement en pointillés
 * monte au-dessus de la barre et le chiffre se brouille (« 1?? cm ») : la réponse arrive plus tard.
 * Plan 2 (à `commentaires`, zoom traversant) : des commentaires TikTok arrivent un par un, le premier
 * est celui de la personne de l'épisode.
 */

type Bulle = {nom: string; texte: string; couleur: string};

const BulleView: React.FC<{b: Bulle; y: number; f: number; at: number; i: number}> = ({b, y, f, at, i}) => {
	const e = ressort(f, at, 12, 200);
	if (e <= 0.001) return null;
	const flotte = Math.sin((f + i * 11) / 13) * 6;
	const coeur = bosse(f, at + 6, 8);
	const cote = i % 2 ? 1 : -1;
	return (
		<div
			style={{
				position: 'absolute',
				left: 70 + (i % 2) * 40,
				right: 70 - (i % 2) * 40,
				top: y + flotte,
				transform: `translate(${(1 - e) * 140 * cote}px, ${(1 - e) * 90}px) scale(${0.7 + 0.3 * e}) rotate(${(1 - e) * 6 * cote + cote * 1.2}deg)`,
				opacity: Math.min(1, e * 1.6),
				display: 'flex',
				alignItems: 'center',
				gap: 26,
				background: '#fff',
				borderRadius: 44,
				padding: '26px 34px',
				boxShadow: '0 18px 45px rgba(0,0,0,0.16)',
				fontFamily: FONT,
			}}
		>
			<div
				style={{
					width: 92,
					height: 92,
					borderRadius: 46,
					background: b.couleur,
					flexShrink: 0,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					color: '#fff',
					fontSize: 44,
					fontWeight: 800,
				}}
			>
				{b.nom.replace('@', '').slice(0, 1).toUpperCase()}
			</div>
			<div style={{flex: 1}}>
				<div style={{fontSize: 30, fontWeight: 700, color: '#8a8a8a'}}>{b.nom}</div>
				<div style={{fontSize: 44, fontWeight: 800, color: ENCRE, lineHeight: 1.15}}>{b.texte}</div>
			</div>
			<div style={{fontSize: 52, transform: `scale(${1 + 0.45 * coeur})`, color: coeur > 0.05 ? '#fe2c55' : '#bbb'}}>♥</div>
		</div>
	);
};

export const HookCommentaires: React.FC<{actuelle: number; cible: number; potentiel: number; commentaires: number; bulles: Bulle[]}> = ({
	actuelle,
	cible,
	potentiel,
	commentaires,
	bulles,
}) => {
	const f = useCurrentFrame();

	if (f < commentaires) {
		/* ── Plan 1 : la barre jusqu'à la taille actuelle, puis le potentiel inconnu ── */
		const SOL = 1488;
		const TOP = 529;
		const hauteur = (cm: number) => ((cm - 100) / (cible - 100)) * (SOL - TOP);
		const zin = interpolate(f, [0, 7], [1.6, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
		const flouIn = interpolate(f, [0, 6], [20, 0], {extrapolateRight: 'clamp'});
		const zout = interpolate(f, [commentaires - 4, commentaires], [1, 1.45], {
			extrapolateLeft: 'clamp',
			extrapolateRight: 'clamp',
			easing: Easing.in(Easing.quad),
		});
		const flouOut = interpolate(f, [commentaires - 4, commentaires], [0, 16], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
		const grow = ressort(f, 3, 12, 95);
		const pose = 16;
		const barTop = SOL - hauteur(actuelle) * grow;
		const shown = Math.round(100 + (actuelle - 100) * (f >= pose ? 1 : Math.min(0.995, grow)));
		const num = ressort(f, 4, 11, 210);
		const punch = bosse(f, pose, 7) + bosse(f, potentiel, 7);
		const cam = 1 + Math.max(0, f - 7) * 0.0022 + 0.05 * punch;
		const ext = ressort(f, potentiel, 14, 90); // prolongement en pointillés jusqu'au potentiel
		const extTop = SOL - hauteur(actuelle) - (hauteur(cible) - hauteur(actuelle)) * ext;
		const suiviY = 50 * Math.min(1, grow) + 60 * Math.min(1, ext);
		const brouille = f >= potentiel;
		const chiffres = brouille ? `1${'??'}` : String(shown);
		const ecrase = bosse(f, 0, 8) * 0.8 + bosse(f, pose, 6) * 0.6;
		const regard = ease(f, 6, 10);
		const surpris = brouille && bosse(f, potentiel, 18) > 0.2 ? 1 : 0;
		const entree = ressort(f, 0, 10, 220);
		const ticks = [];
		for (let y = SOL - 30, i = 0; y > barTop + 10; y -= 48, i++)
			ticks.push(<line key={i} x1={648 - (i % 2 ? 22 : 38)} x2={648} y1={y} y2={y} stroke="#fff" strokeWidth={5} opacity={0.85} />);
		const tremble = brouille ? Math.sin(f * 2.3) * 4 : 0;
		return (
			<AbsoluteFill>
				<Fond />
				<AbsoluteFill
					style={{
						transformOrigin: '50% 38%',
						transform: `translate(${secousse(f, pose, 9) + secousse(f, potentiel, 7)}px, ${suiviY}px) scale(${zin * cam * zout})`,
						filter: flouIn + flouOut > 0.3 ? `blur(${flouIn + flouOut}px)` : undefined,
					}}
				>
					<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
						<line x1={216} x2={907} y1={SOL} y2={SOL} stroke="#555" strokeWidth={5} />
						{ext > 0.01 ? (
							<rect
								x={468}
								y={extTop}
								width={176}
								height={Math.max(0, SOL - hauteur(actuelle) - extTop)}
								fill={ORANGE}
								fillOpacity={0.12}
								stroke={ORANGE}
								strokeWidth={8}
								strokeDasharray="26 16"
								strokeDashoffset={-f * 2}
								rx={6}
							/>
						) : null}
						<rect x={464} y={barTop} width={184} height={Math.max(0, SOL - barTop)} fill={BLEU} rx={4} />
						<rect x={476} y={barTop + 8} width={26} height={Math.max(0, SOL - barTop - 16)} fill="#fff" opacity={0.18} rx={6} />
						{ticks}
						<g transform={`translate(300 ${SOL}) scale(${0.85 + 0.15 * entree}) translate(-300 ${-SOL})`}>
							<Bonhomme
								x={300}
								sol={SOL - 2}
								h={900}
								f={f}
								bras={ease(f, 2, 12)}
								mainY={barTop + 40}
								regard={regard}
								surpris={surpris}
								ecrase={ecrase}
							/>
						</g>
						<Eclats cx={556} cy={395} f={f} at={pose} />
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
							color: brouille ? ORANGE : BLEU,
							letterSpacing: -10,
							fontVariantNumeric: 'tabular-nums',
							transform: `translateX(${tremble}px) scale(${(0.5 + 0.5 * num) * (1 + 0.2 * punch)})`,
							opacity: Math.min(1, num * 1.5),
						}}
					>
						{chiffres}
						<span style={{fontSize: 52, fontWeight: 700, color: '#666', letterSpacing: 0, marginLeft: 10, opacity: ease(f, pose, 5)}}>cm</span>
					</div>
				</AbsoluteFill>
			</AbsoluteFill>
		);
	}

	/* ── Plan 2 : les commentaires ── */
	const g = f - commentaires;
	const zin = interpolate(g, [0, 6], [1.3, 1], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
	const flou = interpolate(g, [0, 5], [14, 0], {extrapolateRight: 'clamp'});
	const pousse = 1 + g * 0.0015;
	return (
		<AbsoluteFill>
			<Fond />
			<AbsoluteFill style={{transformOrigin: '50% 45%', transform: `scale(${zin * pousse})`, filter: flou > 0.3 ? `blur(${flou}px)` : undefined}}>
				{bulles.map((b, i) => (
					<BulleView key={i} b={b} i={i} f={g} at={2 + i * 5} y={300 + i * 225} />
				))}
			</AbsoluteFill>
		</AbsoluteFill>
	);
};
