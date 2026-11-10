// Réglage des sous-titres d'une recopie : rend quelques images pour plusieurs jeux de réglages
// (un seul navigateur, un seul bundle) et les écrit en PNG ; la note est calculée par regler_note.py.
// Usage : BROWSER=… node scripts/regler_soustitres.mjs <id> DOSSIER '[{"nom":…,"reglages":{…}}]' 18,30,…
import {bundle} from '@remotion/bundler';
import {openBrowser, renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';

const [id, dossier, variantes, images] = process.argv.slice(2);
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const browser = await openBrowser('chrome', {browserExecutable: process.env.BROWSER});
for (const v of JSON.parse(variantes)) {
	const inputProps = {video: id, audio: false, reglages: v.reglages};
	const composition = await selectComposition({serveUrl, id: 'Recopie', inputProps, puppeteerInstance: browser});
	for (const f of images.split(',').map(Number)) {
		await renderStill({composition, serveUrl, inputProps, frame: f, output: `${dossier}/${v.nom}_${f}.png`, puppeteerInstance: browser});
	}
	console.log('rendu', v.nom);
}
await browser.close({silent: true});
