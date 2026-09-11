export interface UserQueryMessage {
  id: string;
  author: string;
  avatarLetter: string;
  time: string;
  queryText: string;
  attachedDoc: string;
  model: string;
}

export interface MetricStat {
  label: string;
  value: string;
  subtext: string;
  type: 'tertiary' | 'secondary' | 'default';
}

export interface ComparisonCriterion {
  id: string;
  criteria: string;
  rscDetail: string;
  rscStatus: 'positive' | 'neutral' | 'lock';
  ssrDetail: string;
  ssrStatus: 'negative' | 'neutral';
}

export interface CodeSnippet {
  filePath: string;
  language: string;
  code: string;
}

export interface Citation {
  id: string;
  sourceFile: string;
  reference: string;
  quote: string;
  accentColor: 'secondary' | 'tertiary';
}

export interface MissingDocSuggestion {
  technology: string;
  topic: string;
  title: string;
  url: string;
  reason: string;
}

export interface AiAnalysisData {
  title: string;
  vectorSimilarity: string;
  executiveSummary: string;
  stats: MetricStat[];
  comparisonTable?: {
    title: string;
    subtitle: string;
    badge: string;
    rows: ComparisonCriterion[];
  };
  codeSnippet?: CodeSnippet;
  citations: Citation[];
  followUpSuggestions?: string[];
  missingDocSuggestion?: MissingDocSuggestion | null;
}
