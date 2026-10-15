import {Composition} from 'remotion';
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
	</>
);
