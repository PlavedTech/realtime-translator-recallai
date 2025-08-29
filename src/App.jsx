import { useState } from 'react'
import { useRecallTranslator } from './hooks/useRecallTranslator'
import './App.css'

const LANGUAGE_MAP = {
  'es': 'Spanish',
  'fr': 'French', 
  'de': 'German',
  'it': 'Italian',
  'pt': 'Portuguese',
  'ru': 'Russian',
  'ja': 'Japanese',
  'ko': 'Korean',
  'zh': 'Chinese',
  'ar': 'Arabic'
}

function App() {
  const [targetLanguage] = useState(
    import.meta.env.VITE_DEFAULT_TARGET_LANGUAGE_CODE || 'ru'
  )

  const {
    isFullyConnected,
    translationHistory,
  } = useRecallTranslator(LANGUAGE_MAP[targetLanguage])

  // Simple English translation mapping (in real app this would use translation API)
  const getEnglishTranslation = (text, sourceLang) => {
    // This is a placeholder - in production would use Google Translate or similar
    // For now, if source is English, return as is
    if (sourceLang === 'en' || sourceLang === 'English') {
      return text
    }
    // For demo purposes, showing the structure
    return `English translation of: "${text}"`
  }

  return (
    <div className="app">
      {!isFullyConnected && (
        <div className="error">Connection lost</div>
      )}
      
      <div className="target-language">
        {LANGUAGE_MAP[targetLanguage]}
      </div>
      
      <div className="translations">
        {translationHistory.map((item) => (
          <div key={item.id} className="translation-item">
            <div className="original">{item.original}</div>
            <div className="translated">{item.translation}</div>
            <div className="english">
              {getEnglishTranslation(item.translation, targetLanguage)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App