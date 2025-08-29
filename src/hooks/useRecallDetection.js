import { useState, useEffect } from 'react';

export const useRecallDetection = () => {
  const [isRecallBot, setIsRecallBot] = useState(false);
  const [meetingAudioStream, setMeetingAudioStream] = useState(null);
  const [audioPermission, setAudioPermission] = useState('prompt');

  useEffect(() => {
    // Detect if running in Recall.ai bot environment
    const detectRecallBot = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const hostname = window.location.hostname;
      const referrer = document.referrer.toLowerCase();
      
      return (
        userAgent.includes('recall') ||
        userAgent.includes('bot') ||
        hostname.includes('recall.ai') ||
        referrer.includes('recall.ai') ||
        window.location.href.includes('recall') ||
        // Check for specific bot indicators
        userAgent.includes('headlesschrome') ||
        userAgent.includes('puppeteer') ||
        // Check for ngrok domains (often used with Recall.ai)
        hostname.includes('ngrok.io') ||
        hostname.includes('ngrok.app')
      );
    };

    const isBot = detectRecallBot();
    setIsRecallBot(isBot);

    // Request microphone access for meeting audio
    const requestMicrophoneAccess = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 24000,
            channelCount: 1
          }
        });
        
        setMeetingAudioStream(stream);
        setAudioPermission('granted');
        
        console.log('🎤 Microphone access granted for meeting audio');
        
        // Log audio input details
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
          console.log('Audio track settings:', audioTracks[0].getSettings());
        }
        
      } catch (error) {
        console.error('❌ Microphone access denied:', error);
        setAudioPermission('denied');
      }
    };

    // Always request microphone access for voice functionality
    requestMicrophoneAccess();

    // Cleanup function
    return () => {
      if (meetingAudioStream) {
        meetingAudioStream.getTracks().forEach(track => {
          track.stop();
        });
      }
    };
  }, []);

  // Check if audio is available
  const hasAudioInput = meetingAudioStream && audioPermission === 'granted';

  return {
    isRecallBot,
    meetingAudioStream,
    hasAudioInput,
    audioPermission
  };
};