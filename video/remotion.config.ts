import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(92);
Config.setCodec('h264');
Config.setCrf(18);
// Dans un environnement sans téléchargement de Chrome possible, pointer vers un binaire local :
// BROWSER_EXECUTABLE=/chemin/vers/headless_shell npm run render
if (process.env.BROWSER_EXECUTABLE) {
	Config.setBrowserExecutable(process.env.BROWSER_EXECUTABLE);
}
