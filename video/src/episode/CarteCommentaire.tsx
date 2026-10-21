import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FONT} from '../theme';

/*
 * Carte TikTok « Réponse au commentaire de … » (référence partie 11 : x 0,12-0,88, y 0,61-0,82,
 * inclinée de −4°, queue de bulle en bas à gauche, présente de 0 à 4,7 s par-dessus les plans).
 */
export const CarteCommentaire: React.FC<{nom: string; texte: string; de: number; a: number; haut?: boolean; x?: number; y?: number}> = ({
	nom,
	texte,
	de,
	a,
	haut,
	x,
	y,
}) => {
	const f = useCurrentFrame();
	if (f < de || f >= a) return null;
	if (haut) {
		// Variante de la référence « Steve » : petite carte droite en haut de l'écran (x 0,22-0,74, y 0,18-0,31).
		return (
			<div style={{position: 'absolute', left: x ?? 232, top: y ?? 330, width: 580, fontFamily: FONT}}>
				<div style={{position: 'relative', background: '#fff', borderRadius: 14, padding: '20px 24px 26px 20px'}}>
					<div style={{fontSize: 31, fontWeight: 500, color: '#8a8a8a', marginLeft: 94, lineHeight: 1.15}}>Réponse au commentaire de {nom}</div>
					<div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 4}}>
						<div style={{width: 78, height: 78, borderRadius: 39, background: '#000', flexShrink: 0}} />
						<div style={{fontSize: 42, fontWeight: 700, color: '#111', lineHeight: 1.1}}>{texte}</div>
					</div>
					<div
						style={{
							position: 'absolute',
							left: 14,
							bottom: -30,
							width: 0,
							height: 0,
							borderRight: '34px solid transparent',
							borderTop: '32px solid #fff',
						}}
					/>
				</div>
			</div>
		);
	}
	return (
		<div style={{position: 'absolute', left: 128, top: 1215, width: 840, transform: 'rotate(-4deg)', transformOrigin: '0% 100%', fontFamily: FONT}}>
			<div
				style={{
					position: 'relative',
					background: '#fff',
					borderRadius: 20,
					padding: '30px 30px 38px 34px',
					boxShadow: '0 6px 18px rgba(0,0,0,0.18)',
				}}
			>
				<div style={{fontSize: 38, fontWeight: 500, color: '#8a8a8a', marginLeft: 138, marginBottom: 6, whiteSpace: 'nowrap'}}>
					Réponse au commentaire de {nom}
				</div>
				<div style={{display: 'flex', alignItems: 'center', gap: 22}}>
					<div style={{width: 112, height: 112, borderRadius: 56, background: '#000', flexShrink: 0}} />
					<div style={{fontSize: 66, fontWeight: 700, color: '#111', lineHeight: 1.1, letterSpacing: -0.5}}>{texte}</div>
				</div>
				<div
					style={{
						position: 'absolute',
						left: 34,
						bottom: -46,
						width: 0,
						height: 0,
						borderLeft: '0px solid transparent',
						borderRight: '54px solid transparent',
						borderTop: '48px solid #fff',
					}}
				/>
			</div>
		</div>
	);
};
