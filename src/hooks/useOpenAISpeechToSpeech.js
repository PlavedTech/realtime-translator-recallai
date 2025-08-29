import { useState, useEffect, useRef, useCallback } from 'react';
import { RealtimeClient } from '@openai/realtime-api-beta';

export const useOpenAISpeechToSpeech = (targetLanguage = 'Russian') => {
  const clientRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [currentTranslation, setCurrentTranslation] = useState('');
  const audioBufferRef = useRef([]);

  // Initialize OpenAI Realtime client for speech-to-speech translation
  useEffect(() => {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const relayServerUrl = import.meta.env.VITE_RELAY_SERVER_URL;
    
    if (!apiKey && !relayServerUrl) {
      console.error('❌ OpenAI API key or relay server URL required');
      return;
    }

    const client = new RealtimeClient(
      relayServerUrl 
        ? { url: relayServerUrl }
        : { 
            apiKey: apiKey,
            dangerouslyAllowAPIKeyInBrowser: true 
          }
    );

    clientRef.current = client;

    // Configure for speech-to-speech translation optimized for Recall.ai
    client.updateSession({
      instructions: `You are a real-time speech-to-speech translator for video meetings via Recall.ai bots.

      CORE MISSION:
      - Translate ALL incoming speech to ${targetLanguage}
      - Handle bidirectional translation intelligently:
        * Spanish speech → translate to ${targetLanguage}
        * ${targetLanguage} speech → translate to Spanish
        * Other languages → translate to ${targetLanguage}
      - Provide ONLY the translation in speech output
      - Maintain natural conversation flow and speaker context
      - Optimize for minimal latency (meeting participants are waiting)
      
      VOICE COMMANDS (respond to these in the original language, don't translate):
      - "translate to Russian" / "traduce a ruso" → switch target to Russian
      - "translate to Spanish" / "переводи на испанский" → switch target to Spanish
      - "translate to French" / "traduce a francés" → switch target to French
      - "translate to German" / "traduce a alemán" → switch target to German
      - When you hear language change commands, acknowledge briefly and continue translating
      
      CRITICAL REQUIREMENTS:
      - Generate translated SPEECH output, not just text
      - Preserve tone, emotion, and speaking style
      - Handle conversation interruptions gracefully  
      - No explanatory text or prefixes for translations
      - For language changes, briefly acknowledge then continue
      - Focus on clear, natural pronunciation`,
      
      voice: 'alloy', // Use alloy voice for clear pronunciation
      turn_detection: { type: 'server_vad' }, // Server-side voice activity detection
      input_audio_transcription: { model: 'whisper-1' },
      temperature: 0.3, // Lower temperature for consistent translations
    });

    // Handle transcription updates
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
        
        // Collect audio output for Recall.ai
        if (delta?.audio) {
          audioBufferRef.current.push(...delta.audio);
        }
      }
    });

    // Handle completed translation
    client.on('conversation.item.completed', ({ item }) => {
      if (item.type === 'message' && item.role === 'user') {
        const transcript = item.content?.[0]?.transcript || '';
        setCurrentTranscript(transcript);
        setIsTranslating(true);
        
        console.log('🎤 Speech received:', transcript);
      }
      
      if (item.type === 'message' && item.role === 'assistant') {
        const translation = item.content?.[0]?.transcript || '';
        setCurrentTranslation(translation);
        setIsTranslating(false);
        
        console.log('🌐 Translation completed:', translation);
        
        // Audio buffer is ready for Recall.ai output
        if (audioBufferRef.current.length > 0) {
          console.log('🔊 Translated audio ready:', audioBufferRef.current.length, 'samples');
        }
      }
    });

    client.on('error', (event) => {
      console.error('❌ OpenAI Realtime error:', event);
    });

    // Connect to OpenAI
    const connect = async () => {
      try {
        await client.connect();
        setIsConnected(true);
        console.log('✅ Connected to OpenAI Realtime API for speech-to-speech');
      } catch (error) {
        console.error('❌ Failed to connect to OpenAI Realtime API:', error);
      }
    };

    connect();

    return () => {
      if (client.isConnected()) {
        client.disconnect();
      }
    };
  }, [targetLanguage]);

  // Process audio from Recall.ai and send to OpenAI for translation
  const translateAudio = useCallback(async (audioData) => {
    if (!clientRef.current?.isConnected() || !audioData) return null;

    try {
      // Clear previous audio buffer
      audioBufferRef.current = [];
      setCurrentTranscript('');
      setCurrentTranslation('');
      
      // Send audio to OpenAI Realtime API
      clientRef.current.appendInputAudio(audioData);
      clientRef.current.createResponse();
      
      console.log('🔄 Sending audio to OpenAI for translation...');
      
      // Return promise that resolves when translation is complete
      return new Promise((resolve) => {
        const checkComplete = () => {
          if (!isTranslating && audioBufferRef.current.length > 0) {
            const translatedAudio = new Int16Array(audioBufferRef.current);
            resolve(translatedAudio);
          } else {
            setTimeout(checkComplete, 100);
          }
        };
        checkComplete();
      });
      
    } catch (error) {
      console.error('❌ Error translating audio:', error);
      return null;
    }
  }, [isTranslating]);

  // Update target language
  const updateTargetLanguage = useCallback((language) => {
    if (!clientRef.current?.isConnected()) return;
    
    clientRef.current.updateSession({
      instructions: `You are a real-time speech-to-speech translator for video meetings via Recall.ai bots.

      CORE MISSION:
      - Translate ALL incoming speech to ${language}
      - Handle bidirectional translation intelligently:
        * Spanish speech → translate to ${language}
        * ${language} speech → translate to Spanish
        * Other languages → translate to ${language}
      - Provide ONLY the translation in speech output
      - Maintain natural conversation flow and speaker context
      - Optimize for minimal latency (meeting participants are waiting)
      
      CRITICAL REQUIREMENTS:
      - Generate translated SPEECH output, not just text
      - Preserve tone, emotion, and speaking style
      - Handle conversation interruptions gracefully  
      - No explanatory text or prefixes
      - Focus on clear, natural pronunciation`,
    });
  }, []);

  return {
    isConnected,
    isTranslating,
    currentTranscript,
    currentTranslation,
    translateAudio,
    updateTargetLanguage
  };
};