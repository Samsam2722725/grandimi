import React from 'react';
import {useCurrentFrame} from 'remotion';
import {FONT} from '../theme';

/*
 * Carte TikTok « Réponse au commentaire de … » (référence partie 11 : x 0,12-0,88, y 0,61-0,82,
 * inclinée de −4°, queue de bulle en bas à gauche, présente de 0 à 4,7 s par-dessus les plans).
 */
export const CarteCommentaire: React.FC<{
	nom: string;
	texte: string;
	de: number;
	a: number;
	haut?: boolean;
	x?: number;
	y?: number;
	ligne?: boolean;
	w?: number;
}> = ({nom, texte, de, a, haut, x, y, ligne, w}) => {
	const f = useCurrentFrame();
	if (f < de || f >= a) return null;
	if (ligne) {
		// Variante de la référence rayan.taller : ligne de commentaire TikTok, bande blanche droite x 40-1039, y 1340-1639.
		const gris = '#8a8a8a';
		return (
			<div style={{position: 'absolute', left: 40, top: y ?? 1340, width: 1000, height: 300, background: '#fff', fontFamily: FONT, overflow: 'hidden'}}>
				<div style={{position: 'absolute', left: 16, top: 16, width: 92, height: 92, borderRadius: 46, background: '#d9d9d9', overflow: 'hidden'}}>
					<div style={{position: 'absolute', left: 30, top: 16, width: 32, height: 32, borderRadius: 16, background: '#a8a8a8'}} />
					<div style={{position: 'absolute', left: 16, top: 54, width: 60, height: 50, borderRadius: 30, background: '#a8a8a8'}} />
				</div>
				<div style={{position: 'absolute', left: 120, top: 22, fontSize: 30, color: gris, fontWeight: 500}}>{nom}</div>
				<div style={{position: 'absolute', left: 120, top: 64, width: 820, fontSize: 37, color: '#161616', fontWeight: 500, lineHeight: 1.3}}>{texte}</div>
				<div style={{position: 'absolute', left: 120, top: 196, fontSize: 28, color: gris, fontWeight: 500}}>
					20 h<span style={{marginLeft: 44, fontWeight: 600}}>Répondre</span>
				</div>
				<svg width={44} height={40} viewBox="0 0 24 22" style={{position: 'absolute', left: 816, top: 192}}>
					<path d="M12 20 L3.5 11.5 A5 5 0 0 1 12 4.5 A5 5 0 0 1 20.5 11.5 Z" fill="none" stroke={gris} strokeWidth={2} strokeLinejoin="round" />
				</svg>
				<svg width={40} height={40} viewBox="0 0 24 24" style={{position: 'absolute', left: 962, top: 192}}>
					<path d="M4 4 H15 L19 12 V14 H13 L14 20 L11 20 L7 14 H4 Z" fill="none" stroke={gris} strokeWidth={2} strokeLinejoin="round" />
				</svg>
				<div style={{position: 'absolute', left: 120, top: 276, width: 58, height: 2, background: '#cfcfcf'}} />
				<div style={{position: 'absolute', left: 200, top: 258, fontSize: 28, color: gris, fontWeight: 600}}>Afficher 11 réponses ⌄</div>
			</div>
		);
	}
	if (haut) {
		// Variante de la référence « Steve » : petite carte droite en haut de l'écran (x 0,22-0,74, y 0,18-0,31).
		return (
			<div style={{position: 'absolute', left: x ?? 232, top: y ?? 330, width: 580, fontFamily: FONT, transform: `scale(${(w ?? 580) / 580})`, transformOrigin: '0 0'}}>
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
