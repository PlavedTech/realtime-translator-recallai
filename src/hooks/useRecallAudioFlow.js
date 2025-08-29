import { useState, useEffect, useRef, useCallback } from 'react';

export const useRecallAudioFlow = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [audioQueue, setAudioQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);

  // WebSocket connection to receive audio from Recall.ai
  const connectToRecallAudio = useCallback(async () => {
    try {
      // This would typically connect to your server that handles Recall.ai WebSocket
      // For now, we'll simulate the connection
      console.log('🔌 Connecting to Recall.ai audio stream...');
      
      // In production, this would be your server's WebSocket endpoint
      // that receives audio from Recall.ai and forwards it here
      const wsUrl = 'wss://your-server.com/recall-audio-stream';
      
      // For development, we'll simulate this connection
      setIsConnected(true);
      console.log('✅ Connected to Recall.ai audio stream');
      
    } catch (error) {
      console.error('❌ Failed to connect to Recall.ai audio stream:', error);
      setIsConnected(false);
    }
  }, []);

  // Process incoming audio from Recall.ai meeting
  const processRecallAudio = useCallback((audioBuffer) => {
    if (!audioBuffer) return;

    setIsProcessing(true);
    
    // Convert base64 to audio buffer
    const binaryString = atob(audioBuffer);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert to 16-bit PCM for OpenAI Realtime API
    const audioArray = new Int16Array(bytes.buffer);
    
    // Add to processing queue
    setAudioQueue(prev => [...prev, audioArray]);
    
    console.log('🎤 Received audio from Recall.ai meeting:', audioArray.length, 'samples');
  }, []);

  // Send translated audio back to Recall.ai
  const sendAudioToRecall = useCallback(async (translatedAudioBuffer, botId) => {
    if (!translatedAudioBuffer || !botId) return;

    try {
      // Convert audio buffer to format expected by Recall.ai
      const audioBase64 = btoa(
        String.fromCharCode(...new Uint8Array(translatedAudioBuffer.buffer))
      );

      // Send to Recall.ai bot_output_audio_create endpoint
      const response = await fetch(`https://us-east-1.recall.ai/api/v1/bot/${botId}/output_audio/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RECALL_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_data: audioBase64,
          // Additional parameters as needed
        })
      });

      if (response.ok) {
        console.log('🔊 Successfully sent translated audio to meeting');
      } else {
        console.error('❌ Failed to send audio to meeting:', response.statusText);
      }
      
    } catch (error) {
      console.error('❌ Error sending audio to Recall.ai:', error);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Handle WebSocket messages from Recall.ai
  const handleWebSocketMessage = useCallback((event) => {
    try {
      const message = JSON.parse(event.data);
      
      if (message.event === 'audio_mixed_raw.data') {
        const audioBuffer = message.data.data.buffer;
        processRecallAudio(audioBuffer);
      }
      
    } catch (error) {
      console.error('❌ Error processing WebSocket message:', error);
    }
  }, [processRecallAudio]);

  // Initialize audio context
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
      sampleRate: 16000 // Match Recall.ai's 16kHz requirement
    });

    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Auto-connect when component mounts
  useEffect(() => {
    connectToRecallAudio();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectToRecallAudio]);

  return {
    isConnected,
    audioQueue,
    isProcessing,
    sendAudioToRecall,
    processRecallAudio,
    connectToRecallAudio
  };
};