import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {FONT} from '../theme';

/*
 * Écrans de saisie Grandimi plein écran (référence p15-ref, 8,5-16,5 s : sexe, date de naissance, taille et poids,
 * taille des parents) : chaque écran glisse depuis la droite à son ancre, la réponse se sélectionne ou les roues
 * tournent jusqu'à la valeur, puis le bouton « Suivant » s'enfonce juste avant l'écran suivant.
 */
const OR = '#ff5a1f';

export type EcranSaisie = {
	titre: string;
	a: number;
	options?: string[];
	choisi?: number;
	roues?: {label: string; valeurs: string[]; choisi: number}[];
};

const Roue: React.FC<{label: string; valeurs: string[]; choisi: number; t: number}> = ({label, valeurs, choisi, t}) => {
	const H = 96;
	const decal = (1 - t) * 3; // la roue arrive de 3 crans plus haut
	return (
		<div style={{width: 300, textAlign: 'center'}}>
			<div style={{fontSize: 38, color: '#9a9a9a', fontWeight: 600, marginBottom: 26}}>{label}</div>
			<div style={{position: 'relative', height: H * 5, overflow: 'hidden'}}>
				<div style={{position: 'absolute', left: 10, right: 10, top: H * 2, height: H, borderRadius: 20, background: '#1f1f1f'}} />
				{valeurs.map((v, i) => {
					const pos = i - choisi + decal; // 0 = ligne centrale
					const net = Math.max(0, 1 - Math.abs(pos) * 0.38);
					return (
						<div
							key={i}
							style={{
								position: 'absolute',
								left: 0,
								right: 0,
								top: H * 2 + pos * H,
								height: H,
								lineHeight: `${H}px`,
								fontSize: 50,
								fontWeight: Math.abs(pos) < 0.5 ? 800 : 500,
								color: Math.abs(pos) < 0.5 ? '#fff' : '#777',
								opacity: net,
							}}
						>
							{v}
						</div>
					);
				})}
			</div>
		</div>
	);
};

export const FormulaireGrandimi: React.FC<{ecrans: EcranSaisie[]; fin: number}> = ({ecrans, fin}) => {
	const f = useCurrentFrame();
	return (
		<>
			{ecrans.map((e, i) => {
				const suivant = i + 1 < ecrans.length ? ecrans[i + 1].a : fin;
				if (f < e.a || f >= suivant + 6) return null;
				const entree = interpolate(f, [e.a, e.a + 6], [1, 0], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
				const sortie = interpolate(f, [suivant, suivant + 6], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.in(Easing.cubic)});
				const choix = interpolate(f, [e.a + 7, e.a + 17], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
				const appui = interpolate(f, [suivant - 5, suivant - 2, suivant], [1, 0.93, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
				return (
					<div
						key={i}
						style={{
							position: 'absolute',
							inset: 0,
							background: '#0b0b0b',
							fontFamily: FONT,
							color: '#fff',
							transform: `translateX(${(entree - sortie) * 1080}px)`,
						}}
					>
						<div style={{position: 'absolute', left: 60, right: 60, top: 150, height: 10, borderRadius: 5, background: '#262626'}}>
							<div style={{width: `${((i + choix) / ecrans.length) * 100}%`, height: '100%', borderRadius: 5, background: OR}} />
						</div>
						<div style={{position: 'absolute', left: 60, top: 230, fontSize: 64, fontWeight: 800}}>{e.titre}</div>
						<div style={{position: 'absolute', left: 60, right: 60, top: 330, fontSize: 32, color: '#8d8d8d', lineHeight: 1.35}}>
							Ceci sera utilisé pour prédire ton potentiel de taille et créer ton plan personnalisé.
						</div>
						{e.options ? (
							<div style={{position: 'absolute', left: 60, right: 60, top: 640, display: 'flex', flexDirection: 'column', gap: 28}}>
								{e.options.map((o, j) => {
									const sel = j === e.choisi ? choix : 0;
									return (
										<div
											key={j}
											style={{
												display: 'flex',
												justifyContent: 'space-between',
												alignItems: 'center',
												padding: '38px 40px',
												borderRadius: 28,
												fontSize: 46,
												fontWeight: 700,
												background: `rgba(255,90,31,${0.2 * sel})`,
												border: `3px solid ${sel > 0.5 ? OR : '#2a2a2a'}`,
												transform: `scale(${1 + 0.04 * Math.sin(sel * Math.PI)})`,
											}}
										>
											{o}
											<div
												style={{
													width: 46,
													height: 46,
													borderRadius: 23,
													border: `4px solid ${sel > 0.5 ? OR : '#555'}`,
													background: sel > 0.5 ? OR : 'transparent',
													boxSizing: 'border-box',
												}}
											/>
										</div>
									);
								})}
							</div>
						) : null}
						{e.roues ? (
							<div style={{position: 'absolute', left: 0, right: 0, top: 620, display: 'flex', justifyContent: 'center', gap: 60}}>
								{e.roues.map((r, j) => (
									<Roue key={j} {...r} t={choix} />
								))}
							</div>
						) : null}
						<div
							style={{
								position: 'absolute',
								left: 60,
								right: 60,
								bottom: 170,
								padding: '40px 0',
								borderRadius: 60,
								textAlign: 'center',
								fontSize: 46,
								fontWeight: 800,
								background: `linear-gradient(90deg, ${OR}, #ff8a3d)`,
								transform: `scale(${appui})`,
							}}
						>
							Suivant
						</div>
					</div>
				);
			})}
		</>
	);
};
