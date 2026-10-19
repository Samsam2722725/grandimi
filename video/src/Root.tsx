import {Composition} from 'remotion';
import {calculateTexteAnimeMetadata, TexteAnime, TexteAnimeProps} from './texte-anime/TexteAnime';
import {calculateDormirMetadata, Dormir, DormirProps} from './dessin/Dormir';
import {calculateRoutineMetadata, Routine, RoutineProps} from './routine/Routine';
import {calculateEpisodeMetadata, Episode, EpisodeProps} from './episode/Episode';
import {Video} from './Video';
import timeline from './timeline.json';

export const Root: React.FC = () => (
	<>
		<Composition
			id="Croissance"
			component={Video}
			durationInFrames={timeline.totalFrames}
			fps={timeline.fps}
			width={1080}
			height={1920}
		/>
		{/* Un épisode du format « prédiction à partir de vos commentaires ».
		    npx remotion render Episode out/partie-6.mp4 --props='{"episode":"partie-6"}' */}
		<Composition
			id="Episode"
			component={Episode}
			calculateMetadata={calculateEpisodeMetadata}
			defaultProps={{episode: 'partie-5'} as EpisodeProps}
			durationInFrames={1}
			fps={30}
			width={1080}
			height={1920}
		/>
		{/* Texte animé mot par mot (« 2 raisons », « signes »…) : public/textes/<video>/.
		    npx remotion render TexteAnime out/x.mp4 --props='{"video":"deux-raisons"}' */}
		<Composition
			id="TexteAnime"
			component={TexteAnime}
			calculateMetadata={calculateTexteAnimeMetadata}
			defaultProps={{video: 'deux-raisons'} as TexteAnimeProps}
			durationInFrames={1}
			fps={30}
			width={1080}
			height={1920}
		/>
		{/* Dessin animé + sous-titres karaoké (« Si tu dors sur le dos… ») : public/dessins/dormir/.
		    npx remotion render Dormir out/dormir.mp4 */}
		<Composition
			id="Dormir"
			component={Dormir}
			calculateMetadata={calculateDormirMetadata}
			defaultProps={{} as DormirProps}
			durationInFrames={1}
			fps={30}
			width={1080}
			height={1920}
		/>
		{/* Routine en 3 étapes sans voix off : public/routines/<routine>/.
		    npx remotion render Routine out/routine-1.mp4 --props='{"routine":"routine-1"}' */}
		<Composition
			id="Routine"
			component={Routine}
			calculateMetadata={calculateRoutineMetadata}
			defaultProps={{routine: 'routine-1'} as RoutineProps}
			durationInFrames={1}
			fps={30}
			width={1080}
			height={1920}
		/>
	</>
);
