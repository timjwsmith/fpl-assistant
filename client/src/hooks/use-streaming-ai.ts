import { useState, useCallback } from 'react';

export interface StreamingAIResult {
  insights: string[];
  predicted_points: number;
  confidence: number;
}

export interface StreamingState {
  isStreaming: boolean;
  partialContent: string;
  result: StreamingAIResult | null;
  error: string | null;
}

export function useStreamingAI() {
  const [state, setState] = useState<StreamingState>({
    isStreaming: false,
    partialContent: '',
    result: null,
    error: null,
  });

  const analyzeTeam = useCallback(async (players: any[], formation: string) => {
    setState({
      isStreaming: true,
      partialContent: '',
      result: null,
      error: null,
    });

    try {
      const response = await fetch('/api/ai/analyze-team/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ players, formation }),
      });

      if (!response.ok) {
        throw new Error('Stream request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.error) {
              setState(prev => ({
                ...prev,
                isStreaming: false,
                error: data.error,
              }));
              return;
            }

            if (data.chunk) {
              buffer += data.chunk;
              setState(prev => ({
                ...prev,
                partialContent: buffer,
              }));
            }

            if (data.done && data.fullContent) {
              try {
                const result = JSON.parse(data.fullContent);
                console.log('[STREAMING] Parsed result:', result);
                setState({
                  isStreaming: false,
                  partialContent: data.fullContent,
                  result: {
                    insights: result.insights || [],
                    predicted_points: result.predicted_points || 0,
                    confidence: result.confidence || 0,
                  },
                  error: null,
                });
              } catch (parseError) {
                console.error('[STREAMING] Parse error:', parseError);
                setState(prev => ({
                  ...prev,
                  isStreaming: false,
                  error: 'Failed to parse AI response',
                }));
              }
              return;
            }
          }
        }
      }
    } catch (error) {
      console.error('[STREAMING] Error:', error);
      setState({
        isStreaming: false,
        partialContent: '',
        result: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      isStreaming: false,
      partialContent: '',
      result: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    analyzeTeam,
    reset,
  };
}
