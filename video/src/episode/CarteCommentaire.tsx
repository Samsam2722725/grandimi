import React from 'react';
import {Img, useCurrentFrame} from 'remotion';
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
	reponse?: {h: number; rotation: number; modele?: 'parsa' | 'taller'; avatar?: string};
	/** Photo de profil ronde (variante haut). */
	photo?: string;
}> = ({nom, texte, de, a, haut, x, y, ligne, w, reponse, photo}) => {
	const f = useCurrentFrame();
	if (f < de || f >= a) return null;
	if (reponse?.modele === 'taller') {
		// Carte de la référence p22-ref, mesurée à 1,0 s : x 88-993, y 1045-1275, rayon 34, queue en bas à gauche,
		// avatar rond (centre 137, 128 ; rayon 72), en-tête gris et commentaire en gras sur une ligne chacun.
		return (
			<div style={{position: 'absolute', left: x ?? 88, top: y ?? 1045, width: w ?? 905, height: reponse.h, fontFamily: FONT, transform: reponse.rotation ? `rotate(${reponse.rotation}deg)` : undefined}}>
				<div style={{position: 'absolute', inset: 0, background: '#fff', borderRadius: 34}} />
				<svg width={90} height={80} viewBox="0 0 90 80" style={{position: 'absolute', left: 0, top: reponse.h - 44}}>
					<path d="M0 0 L0 76 L74 18 Z" fill="#fff" />
				</svg>
				{photo ? (
					<Img src={photo} style={{position: 'absolute', left: 65, top: reponse.h / 2 - 72, width: 144, height: 144, borderRadius: 72, border: '4px solid #bdbdbd', objectFit: 'cover', boxSizing: 'border-box'}} />
				) : (
					<div style={{position: 'absolute', left: 65, top: reponse.h / 2 - 72, width: 144, height: 144, borderRadius: 72, border: '5px solid #9a9a9a', background: '#fff', boxSizing: 'border-box', overflow: 'hidden'}}>
						<div style={{position: 'absolute', left: 42, top: 22, width: 52, height: 52, borderRadius: 26, background: '#9a9a9a'}} />
						<div style={{position: 'absolute', left: 18, top: 84, width: 100, height: 70, borderRadius: 50, background: '#9a9a9a'}} />
					</div>
				)}
				<div style={{position: 'absolute', left: 257, right: 24, top: reponse.h / 2 - 66, fontSize: 31, fontWeight: 700, color: '#8a8a8a', whiteSpace: 'nowrap', letterSpacing: -0.3}}>
					Réponse au commentaire de {nom}
				</div>
				<div style={{position: 'absolute', left: 257, right: 24, top: reponse.h / 2 - 14, fontSize: 34, fontWeight: 800, color: '#141414', lineHeight: 1.18, letterSpacing: -0.3}}>
					{texte}
				</div>
			</div>
		);
	}
	if (reponse?.modele === 'parsa') {
		// Carte de la vidéo Taller « Parsa » (references/p16-ref) : 856 × 273 px, centre (539, 1281), penchée de −3,6°,
		// en-tête gris sur une ligne, avatar rond, commentaire très court en gros.
		return (
			<div
				style={{
					position: 'absolute',
					left: x ?? 111,
					top: y ?? 1145,
					width: w ?? 856,
					height: reponse.h,
					transform: `rotate(${reponse.rotation}deg)`,
					fontFamily: FONT,
				}}
			>
				<div style={{position: 'absolute', inset: 0, background: '#fff', borderRadius: 22}} />
				<div style={{position: 'absolute', left: 10, bottom: -30, width: 0, height: 0, borderLeft: '4px solid #fff', borderRight: '42px solid transparent', borderTop: '34px solid #fff'}} />
				<div style={{position: 'absolute', left: 175, top: 50, fontSize: 37, fontWeight: 600, color: '#9b9b9b', whiteSpace: 'nowrap'}}>
					Réponse au commentaire de {nom}
				</div>
				<div
					style={{
						position: 'absolute',
						left: 37,
						top: 121,
						width: 106,
						height: 106,
						borderRadius: 53,
						background: '#0d0d0d',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontSize: 66,
					}}
				>
					{reponse.avatar ?? '👽'}
				</div>
				<div style={{position: 'absolute', left: 175, top: 108, fontSize: 78, fontWeight: 800, color: '#111', whiteSpace: 'nowrap', letterSpacing: -1}}>
					{texte}
				</div>
			</div>
		);
	}
	if (reponse) {
		// Variante « Reply to … comment » des vidéos Taller (photo du port) : carte blanche penchée, en-tête gris
		// sur deux lignes, avatar carré arrondi, commentaire en gras, queue de bulle en bas à gauche.
		const W = w ?? 725;
		const k = W / 725;
		return (
			<div
				style={{
					position: 'absolute',
					left: x ?? 160,
					top: y ?? 1018,
					width: W,
					height: reponse.h,
					transform: `rotate(${reponse.rotation}deg)`,
					fontFamily: FONT,
				}}
			>
				<div style={{position: 'absolute', inset: 0, background: '#fff', borderRadius: 20 * k}} />
				<div style={{position: 'absolute', left: 14 * k, bottom: -34 * k, width: 0, height: 0, borderLeft: `${4 * k}px solid #fff`, borderRight: `${40 * k}px solid transparent`, borderTop: `${36 * k}px solid #fff`}} />
				<div style={{position: 'absolute', left: 137 * k, right: 30 * k, top: 40 * k, fontSize: 37 * k, fontWeight: 600, color: '#9b9b9b', lineHeight: 1.22}}>
					Réponse au commentaire de {nom}
				</div>
				<div
					style={{
						position: 'absolute',
						left: 34 * k,
						top: 146 * k,
						width: 84 * k,
						height: 84 * k,
						borderRadius: 26 * k,
						background: '#1d1d1d',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						fontSize: 48 * k,
					}}
				>
					👟
				</div>
				<div style={{position: 'absolute', left: 137 * k, right: 30 * k, top: 150 * k, fontSize: 54 * k, fontWeight: 800, color: '#111', lineHeight: 1.18, letterSpacing: -0.5}}>
					{texte}
				</div>
			</div>
		);
	}
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
					<div style={{fontSize: photo ? 23 : 31, fontWeight: 500, color: '#8a8a8a', marginLeft: 94, lineHeight: 1.15, whiteSpace: photo ? 'nowrap' : undefined}}>
						Réponse au commentaire de {nom}
					</div>
					<div style={{display: 'flex', alignItems: 'center', gap: 16, marginTop: 4}}>
						{photo ? (
							<Img src={photo} style={{width: 78, height: 78, borderRadius: 39, flexShrink: 0, objectFit: 'cover'}} />
						) : (
							<div style={{width: 78, height: 78, borderRadius: 39, background: '#000', flexShrink: 0}} />
						)}
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
