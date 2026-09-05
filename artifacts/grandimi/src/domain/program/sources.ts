export interface ProgramSource {
  id: string;
  title: string;
  url: string;
  summary: string;
}

export const PROGRAM_SOURCES: readonly ProgramSource[] = [
  {
    id: "aasm-sleep-2016",
    title: "AASM sleep-duration recommendations",
    url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC5078711/",
    summary: "Consensus sleep-duration ranges for children and adolescents.",
  },
  {
    id: "who-physical-activity",
    title: "WHO Be Healthy: physical activity",
    url: "https://www.who.int/initiatives/behealthy/physical-activity",
    summary:
      "Physical activity supports health. For ages 5–17, WHO gives about 60 minutes daily of moderate-to-vigorous activity and muscle/bone strengthening on 3 days weekly as general context, not an individual prescription.",
  },
  {
    id: "who-healthy-diet",
    title: "WHO healthy diet fact sheet",
    url: "https://www.who.int/news-room/fact-sheets/detail/healthy-diet",
    summary:
      "A healthy diet includes diverse foods, fruit and vegetables, and regular hydration.",
  },
];

export const PROGRAM_SOURCE_IDS = new Set(
  PROGRAM_SOURCES.map((source) => source.id),
);
