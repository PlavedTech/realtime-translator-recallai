# Real-time Voice Translator - Recall.ai & OpenAI Integration

This application demonstrates how to create a real-time voice translator using OpenAI's Realtime API and Recall.ai's Output Media feature. The app provides seamless voice-to-voice translation with automatic language detection and supports both browser mode and Recall.ai bot mode.

## 🎯 Key Features

- **Full Voice Functionality**: Voice input via microphone and voice output via text-to-speech
- **Real-time Translation**: Automatic Spanish ↔ Russian (and other languages) translation 
- **Dual Mode Support**: Works in both browser mode and Recall.ai bot mode
- **Auto Language Detection**: Intelligently detects source language and translates appropriately
- **Live Transcription**: Real-time speech-to-text with conversation history
- **Production Ready**: Optimized for Vercel deployment

## 📋 Prerequisites

- Node.js (v16+) and npm installed
- OpenAI API Key with access to Realtime API
- (Optional) Recall.ai API Key for bot mode
- (Optional) ngrok for local testing with Recall.ai

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd realtime-translator-recallai
npm install
```

### 2. Configure Environment
Copy the example environment file:
```bash
cp .env.example .env
```

Update your `.env` file with:
```env
VITE_OPENAI_API_KEY=your_openai_api_key
VITE_DEFAULT_TARGET_LANGUAGE_CODE=ru
VITE_RELAY_SERVER_URL=
```

### 3. Development Setup
```bash
npm run dev
```

This starts the development server on `http://localhost:3001`

### 4. Production Build
```bash
npm run build
```

## 🌐 Deployment to Vercel

### Option 1: Deploy via Vercel Dashboard
1. Push your code to GitHub/GitLab/Bitbucket
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add the following environment variables in Vercel dashboard:
   - `VITE_OPENAI_API_KEY`: Your OpenAI API key
   - `VITE_DEFAULT_TARGET_LANGUAGE_CODE`: Default target language (e.g., `ru`)
   - `VITE_RELAY_SERVER_URL`: (Optional) Relay server URL

### Option 2: Deploy via Vercel CLI
```bash
npm install -g vercel
vercel --prod
```

## 🤖 Recall.ai Bot Integration

For meeting integration, you can use Recall.ai bots to deploy the translator in video conferences:

### 1. Start ngrok (for development)
```bash
ngrok http --domain {YOUR_NGROK_STATIC_DOMAIN} 3001
```

### 2. Create a Recall.ai Bot
```bash
curl --request POST \
     --url https://us-west-2.recall.ai/api/v1/bot/ \
     --header 'Authorization: Token {RECALLAI_API_KEY}' \
     --header 'accept: application/json' \
     --header 'content-type: application/json' \
     --data '{
       "meeting_url": "{MEETING_URL}",
       "bot_name": "Voice Translator",
       "output_media": {
         "screenshare": {
           "kind": "webpage",
           "config": {
             "url": "{YOUR_APP_URL}"
           }
         }
       }
     }'
```

Replace:
- `{RECALLAI_API_KEY}`: Your Recall.ai API key
- `{MEETING_URL}`: The video conference URL
- `{YOUR_APP_URL}`: Your app URL (ngrok or Vercel)

## 🔧 Configuration

### Environment Variables
- `VITE_OPENAI_API_KEY`: Required for OpenAI Realtime API access
- `VITE_DEFAULT_TARGET_LANGUAGE_CODE`: Default target language (ru, es, fr, de, etc.)
- `VITE_RELAY_SERVER_URL`: Optional relay server for WebSocket connection

### Supported Languages
- Spanish (es) ↔ Russian (ru)
- French (fr)
- German (de)
- Italian (it)
- Portuguese (pt)
- Japanese (ja)
- Korean (ko)
- Chinese (zh)
- Arabic (ar)

## 🎤 Usage

### Browser Mode
1. Open the app in a browser
2. Allow microphone access when prompted
3. Select your target language
4. Start speaking - translations appear automatically
5. Voice output plays the translation in the target language

### Recall.ai Bot Mode
1. The bot automatically detects the meeting environment
2. Uses meeting audio for input
3. Displays translations in real-time on screen
4. Provides voice output through the meeting

## 🛠️ Technical Details

- **Frontend**: React 18 + Vite
- **Voice Processing**: Web Audio API + OpenAI Realtime API
- **Text-to-Speech**: Web Speech API
- **Real-time Communication**: WebSocket connection to OpenAI
- **Build Output**: Static files optimized for Vercel deployment

## 📝 File Structure
```
src/
├── App.jsx                    # Main application component
├── hooks/
│   ├── useRealtimeClient.js  # OpenAI Realtime API integration
│   ├── useRecallDetection.js # Recall.ai bot mode detection
│   └── useAudioOutput.js     # Text-to-speech functionality
├── App.css                   # Application styles
└── main.jsx                  # React entry point
```

Happy building! 🚀