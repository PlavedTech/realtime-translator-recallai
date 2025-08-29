import { useState, useEffect, useCallback, useRef } from 'react';

const LANGUAGE_VOICES = {
  'Spanish': 'es-ES',
  'Russian': 'ru-RU', 
  'French': 'fr-FR',
  'German': 'de-DE',
  'Italian': 'it-IT',
  'Portuguese': 'pt-PT',
  'Japanese': 'ja-JP',
  'Korean': 'ko-KR',
  'Chinese': 'zh-CN',
  'Arabic': 'ar-SA'
};

export const useAudioOutput = () => {
  const [speechSupported, setSpeechSupported] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentUtteranceRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    // Check if speech synthesis is supported
    const checkSpeechSupport = () => {
      const isSupported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
      setSpeechSupported(isSupported);

      if (isSupported) {
        // Load available voices
        const loadVoices = () => {
          const voices = speechSynthesis.getVoices();
          setAvailableVoices(voices);
        };

        loadVoices();
        speechSynthesis.addEventListener('voiceschanged', loadVoices);

        return () => {
          speechSynthesis.removeEventListener('voiceschanged', loadVoices);
        };
      }
    };

    checkSpeechSupport();

    // Initialize audio context for better audio processing
    const initAudioContext = () => {
      try {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch (error) {
        console.warn('AudioContext not supported:', error);
      }
    };

    initAudioContext();

    // Cleanup
    return () => {
      if (currentUtteranceRef.current) {
        speechSynthesis.cancel();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const findBestVoice = useCallback((languageCode) => {
    if (!availableVoices.length) return null;

    // Try to find exact match
    let voice = availableVoices.find(v => 
      v.lang.toLowerCase() === languageCode.toLowerCase()
    );

    if (!voice) {
      // Try to find language family match (e.g., 'es' for 'es-ES')
      const langFamily = languageCode.split('-')[0];
      voice = availableVoices.find(v => 
        v.lang.toLowerCase().startsWith(langFamily.toLowerCase())
      );
    }

    if (!voice) {
      // Fallback to default voice
      voice = availableVoices.find(v => v.default) || availableVoices[0];
    }

    return voice;
  }, [availableVoices]);

  const speakTranslation = useCallback((text, targetLanguage) => {
    if (!speechSupported || !text.trim()) {
      console.warn('Speech not supported or empty text');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // Cancel any current speech
        if (currentUtteranceRef.current) {
          speechSynthesis.cancel();
        }

        // Get language code for target language
        const languageCode = LANGUAGE_VOICES[targetLanguage] || 'en-US';
        
        // Create speech utterance
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = findBestVoice(languageCode);
        
        if (voice) {
          utterance.voice = voice;
        }
        
        utterance.lang = languageCode;
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Set up event handlers
        utterance.onstart = () => {
          setIsSpeaking(true);
          console.log(`🔊 Speaking translation in ${targetLanguage}:`, text);
        };

        utterance.onend = () => {
          setIsSpeaking(false);
          currentUtteranceRef.current = null;
          resolve();
        };

        utterance.onerror = (event) => {
          setIsSpeaking(false);
          currentUtteranceRef.current = null;
          console.error('Speech synthesis error:', event);
          reject(new Error(`Speech synthesis failed: ${event.error}`));
        };

        // Store reference and speak
        currentUtteranceRef.current = utterance;
        speechSynthesis.speak(utterance);

      } catch (error) {
        setIsSpeaking(false);
        console.error('Error in speakTranslation:', error);
        reject(error);
      }
    });
  }, [speechSupported, findBestVoice]);

  const stopSpeaking = useCallback(() => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      currentUtteranceRef.current = null;
    }
  }, []);

  const testVoice = useCallback((targetLanguage) => {
    const testPhrases = {
      'Spanish': '¡Hola! Esta es una prueba de voz en español.',
      'Russian': 'Привет! Это тест голоса на русском языке.',
      'French': 'Bonjour! Ceci est un test vocal en français.',
      'German': 'Hallo! Dies ist ein Stimmtest auf Deutsch.',
      'Italian': 'Ciao! Questo è un test vocale in italiano.',
      'Portuguese': 'Olá! Este é um teste de voz em português.',
      'Japanese': 'こんにちは！これは日本語の音声テストです。',
      'Korean': '안녕하세요! 이것은 한국어 음성 테스트입니다.',
      'Chinese': '你好！这是中文语音测试。',
      'Arabic': 'مرحبا! هذا اختبار صوتي باللغة العربية.'
    };

    const testPhrase = testPhrases[targetLanguage] || 'Hello! This is a voice test.';
    return speakTranslation(testPhrase, targetLanguage);
  }, [speakTranslation]);

  return {
    speechSupported,
    availableVoices,
    isSpeaking,
    speakTranslation,
    stopSpeaking,
    testVoice
  };
};