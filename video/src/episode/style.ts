import type React from 'react';
import {FONT} from '../theme';

export const P5 = {
	yellow: '#fff200',
	green: '#29e05c',
	pink: '#ff1a78',
	orange: '#ff5a1f',
	caption: {
		fontFamily: FONT,
		fontWeight: 800,
		color: '#fff200',
		WebkitTextStroke: '6px #000',
		paintOrder: 'stroke fill',
		letterSpacing: -1,
		lineHeight: 1.05,
		textShadow: '0 4px 0 rgba(0,0,0,0.35)',
	} as React.CSSProperties,
};
