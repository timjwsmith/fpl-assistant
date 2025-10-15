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
    console.log('[STREAMING] Starting analysis for', players.length, 'players');
    setState({
      isStreaming: true,
      partialContent: '',
      result: null,
      error: null,
    });

    try {
      console.log('[STREAMING] Fetching stream endpoint...');
      const response = await fetch('/api/ai/analyze-team/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ players, formation }),
      });

      console.log('[STREAMING] Response status:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Stream request failed: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      console.log('[STREAMING] Reading stream...');
      let buffer = '';
      let lineBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('[STREAMING] Stream done');
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        lineBuffer += chunk;
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() || '';

        for (const line of lines) {
          console.log('[STREAMING] Received line:', line.substring(0, 100));
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log('[STREAMING] Parsed data:', data);
              
              if (data.status === 'started') {
                console.log('[STREAMING] Stream started successfully');
                continue;
              }

              if (data.error) {
                console.error('[STREAMING] Server error:', data.error);
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
                  console.log('[STREAMING] Final parsed result:', result);
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
            } catch (jsonError) {
              console.error('[STREAMING] JSON parse error for line:', line, jsonError);
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
