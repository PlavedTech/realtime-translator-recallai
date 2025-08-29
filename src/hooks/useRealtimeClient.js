import { useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeClient } from '@openai/realtime-api-beta';

export const useRealtimeClient = (apiKey, relayServerUrl, targetLanguage = 'Spanish', meetingAudioStream = null, isRecallBot = false) => {
  const clientRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [currentTranslation, setCurrentTranslation] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Audio processing for meeting stream
  const processAudioStream = useCallback(async () => {
    if (!meetingAudioStream || !clientRef.current?.isConnected()) return;

    try {
      // Create audio context for processing meeting audio
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(meetingAudioStream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        const inputData = event.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array for OpenAI
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send audio data to OpenAI Realtime API
        if (clientRef.current?.isConnected()) {
          clientRef.current.appendInputAudio(int16Data);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      console.log('🎤 Meeting audio stream connected to OpenAI Realtime API');
      
    } catch (error) {
      console.error('Error processing meeting audio stream:', error);
    }
  }, [meetingAudioStream]);

  useEffect(() => {
    if (!apiKey && !relayServerUrl) return;

    const client = new RealtimeClient(
      relayServerUrl 
        ? { url: relayServerUrl }
        : { 
            apiKey: apiKey,
            dangerouslyAllowAPIKeyInBrowser: true 
          }
    );

    clientRef.current = client;

    // Configure session for intelligent real-time translation
    const sessionConfig = {
      instructions: `You are an intelligent real-time translator optimized for ${isRecallBot ? 'Recall.ai Output Media integration' : 'direct browser usage'}. 
      
      CORE BEHAVIOR:
      - Automatically translate ALL speech to ${targetLanguage}
      - Handle bidirectional translation (detect source language automatically)
      - Provide ONLY the translation, no extra commentary
      - Maintain conversation context for better translations
      - Process speech with minimal latency for real-time communication
      
      TRANSLATION RULES:
      - If you hear Spanish, translate to ${targetLanguage}
      - If you hear ${targetLanguage}, translate to Spanish  
      - For other languages, translate to ${targetLanguage}
      - Preserve tone, context, and meaning
      - Keep translations natural and conversational
      
      OUTPUT FORMAT:
      - Provide only the translated text
      - No prefixes like "Translation:" or explanations
      - Maintain speaker context in conversations
      
      ${isRecallBot ? 'RECALL.AI MODE: You are running in a meeting bot. Focus on clear, immediate translations suitable for voice output.' : 'BROWSER MODE: You are running in direct browser mode.'}`,
      voice: 'alloy',
      turn_detection: meetingAudioStream ? { type: 'server_vad' } : { type: 'server_vad' },
      input_audio_transcription: { model: 'whisper-1' },
      temperature: 0.3,
    };

    client.updateSession(sessionConfig);

    // Set up event listeners
    client.on('error', (event) => {
      console.error('Realtime API error:', event);
    });

    client.on('conversation.updated', ({ item, delta }) => {
      if (item.type === 'message' && item.role === 'user') {
        if (delta?.transcript) {
          setCurrentTranscript(prev => prev + delta.transcript);
        }
      }

      if (item.type === 'message' && item.role === 'assistant') {
        if (delta?.transcript) {
          setCurrentTranslation(prev => prev + delta.transcript);
        }
      }
    });

    client.on('conversation.item.completed', ({ item }) => {
      if (item.type === 'message' && item.role === 'user') {
        const originalText = item.content?.[0]?.transcript || '';
        setCurrentTranscript(originalText);
        setIsProcessing(true);
      }
      
      if (item.type === 'message' && item.role === 'assistant') {
        const translatedText = item.content?.[0]?.transcript || '';
        setCurrentTranslation(translatedText);
        setIsProcessing(false);
        
        // Add to conversation history
        if (currentTranscript && translatedText) {
          setConversationHistory(prev => [...prev, {
            id: Date.now(),
            timestamp: new Date(),
            original: currentTranscript,
            translation: translatedText,
            direction: 'auto' // AI determines language direction
          }]);
        }
        
        // Clear current for next interaction
        setTimeout(() => {
          setCurrentTranscript('');
          setCurrentTranslation('');
        }, 2000);
      }
    });

    client.on('conversation.interrupted', () => {
      setIsProcessing(false);
    });

    // Connect to API
    const connect = async () => {
      try {
        await client.connect();
        setIsConnected(true);
        
        // Process meeting audio stream if available
        if (meetingAudioStream) {
          await processAudioStream();
        }
        
        console.log(`✅ Connected to OpenAI Realtime API (${isRecallBot ? 'Recall.ai Bot Mode' : 'Browser Mode'})`);
      } catch (error) {
        console.error('Failed to connect to Realtime API:', error);
        setIsConnected(false);
      }
    };

    connect();

    // Cleanup
    return () => {
      if (client.isConnected()) {
        client.disconnect();
      }
      setIsConnected(false);
    };
  }, [apiKey, relayServerUrl, targetLanguage, meetingAudioStream, isRecallBot, processAudioStream]);

  const updateTargetLanguage = (language) => {
    if (!clientRef.current?.isConnected()) return;
    
    // Update AI instructions for new target language
    clientRef.current.updateSession({
      instructions: `You are an intelligent real-time translator optimized for Recall.ai Output Media integration. 
      
      CORE BEHAVIOR:
      - Automatically translate ALL speech to ${language}
      - Handle bidirectional translation (detect source language automatically)
      - Provide ONLY the translation, no extra commentary
      - Maintain conversation context for better translations
      - Process speech with minimal latency for real-time communication
      
      TRANSLATION RULES:
      - If you hear Spanish, translate to ${language}
      - If you hear ${language}, translate to Spanish  
      - For other languages, translate to ${language}
      - Preserve tone, context, and meaning
      - Keep translations natural and conversational
      
      OUTPUT FORMAT:
      - Provide only the translated text
      - No prefixes like "Translation:" or explanations
      - Maintain speaker context in conversations`,
      temperature: 0.3,
    });
  };

  const clearHistory = () => {
    setConversationHistory([]);
  };

  // Force create response for manual triggering
  const triggerResponse = useCallback(() => {
    if (clientRef.current?.isConnected()) {
      clientRef.current.createResponse();
    }
  }, []);

  return {
    isConnected,
    conversationHistory,
    currentTranscript,
    currentTranslation,
    isProcessing,
    updateTargetLanguage,
    clearHistory,
    triggerResponse,
    client: clientRef.current
  };
};