export interface WhisperTestSegment {
  id: number;
  startMs: number | null;
  endMs: number | null;
  text: string;
}

export interface WhisperTestResult {
  text: string;
  segments: WhisperTestSegment[];
  durationMs: number;
  model: string;
  language: string;
  serviceUrl: string;
}

export interface WhisperTestRequestBody {
  language?: string;
  prompt?: string;
  temperature?: string;
}
