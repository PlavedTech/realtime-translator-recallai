import { useState, useEffect, useCallback } from 'react';
import { useRecallAudioFlow } from './useRecallAudioFlow';
import { useOpenAISpeechToSpeech } from './useOpenAISpeechToSpeech';

export const useRecallTranslator = (targetLanguage = 'Russian') => {
  const [translationHistory, setTranslationHistory] = useState([]);
  const [isActive, setIsActive] = useState(false);
  const [botId, setBotId] = useState(null);

  // Recall.ai audio input/output handling
  const {
    isConnected: recallConnected,
    audioQueue,
    isProcessing: recallProcessing,
    sendAudioToRecall,
    processRecallAudio
  } = useRecallAudioFlow();

  // OpenAI speech-to-speech translation
  const {
    isConnected: openaiConnected,
    isTranslating,
    currentTranscript,
    currentTranslation,
    translateAudio,
    updateTargetLanguage
  } = useOpenAISpeechToSpeech(targetLanguage);

  // Get bot ID from URL or environment (Recall.ai provides this)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const botIdFromUrl = urlParams.get('bot_id');
    const botIdFromEnv = import.meta.env.VITE_RECALL_BOT_ID;
    
    const detectedBotId = botIdFromUrl || botIdFromEnv;
    if (detectedBotId) {
      setBotId(detectedBotId);
      console.log('🤖 Recall.ai Bot ID detected:', detectedBotId);
    }
  }, []);

  // Process audio queue from Recall.ai through OpenAI translation
  useEffect(() => {
    const processAudioQueue = async () => {
      if (audioQueue.length === 0 || isTranslating || !openaiConnected) return;

      const audioToProcess = audioQueue[0]; // Process first item in queue
      setIsActive(true);

      try {
        // Send to OpenAI for speech-to-speech translation
        console.log('🔄 Processing audio through OpenAI Realtime...');
        const translatedAudio = await translateAudio(audioToProcess);
        
        if (translatedAudio && botId) {
          // Send translated audio back to Recall.ai meeting
          console.log('📤 Sending translated audio back to meeting...');
          await sendAudioToRecall(translatedAudio, botId);
          
          // Add to history
          if (currentTranscript && currentTranslation) {
            setTranslationHistory(prev => [...prev, {
              id: Date.now(),
              timestamp: new Date(),
              original: currentTranscript,
              translation: currentTranslation,
              targetLanguage
            }]);
          }
        }
        
        // Remove processed audio from queue
        audioQueue.shift();
        
      } catch (error) {
        console.error('❌ Error in translation workflow:', error);
      } finally {
        setIsActive(false);
      }
    };

    processAudioQueue();
  }, [audioQueue, isTranslating, openaiConnected, translateAudio, sendAudioToRecall, botId, currentTranscript, currentTranslation, targetLanguage]);

  // Update target language in OpenAI
  useEffect(() => {
    updateTargetLanguage(targetLanguage);
  }, [targetLanguage, updateTargetLanguage]);

  // Clear translation history
  const clearHistory = useCallback(() => {
    setTranslationHistory([]);
  }, []);

  // Manual trigger for testing
  const testTranslation = useCallback(async (testAudio) => {
    if (!openaiConnected || !botId) {
      console.warn('⚠️ OpenAI or Bot ID not ready for testing');
      return;
    }

    try {
      const translatedAudio = await translateAudio(testAudio);
      if (translatedAudio) {
        await sendAudioToRecall(translatedAudio, botId);
      }
    } catch (error) {
      console.error('❌ Test translation failed:', error);
    }
  }, [openaiConnected, botId, translateAudio, sendAudioToRecall]);

  // Connection status
  const isFullyConnected = recallConnected && openaiConnected && !!botId;
  
  const getStatus = () => {
    if (!recallConnected) return '🔴 Recall.ai disconnected';
    if (!openaiConnected) return '🔴 OpenAI disconnected';
    if (!botId) return '⚠️ No Bot ID detected';
    if (isActive) return '🔄 Translating...';
    return '✅ Ready for translation';
  };

  return {
    // Status
    isFullyConnected,
    isActive,
    status: getStatus(),
    
    // Components status
    recallConnected,
    openaiConnected,
    botId,
    
    // Translation state
    isTranslating,
    currentTranscript,
    currentTranslation,
    translationHistory,
    
    // Controls
    clearHistory,
    testTranslation,
    
    // Audio processing
    audioQueueLength: audioQueue.length,
    recallProcessing
  };
};