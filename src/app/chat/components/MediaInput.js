// ============================================
// ARQUIVO: MediaInput.js
// CAMINHO: src/app/chat/components/MediaInput.js
// ============================================

import React, { useState, useRef } from 'react';
import { Smile, Image, Sticker, Send } from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import StickerPicker from './StickerPicker';

const MediaInput = ({ onSendMessage, socket }) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const fileInputRef = useRef(null);

  const handleSendMessage = () => {
    if (inputText.trim()) {
      onSendMessage({
        type: 'text',
        content: inputText,
        timestamp: new Date().toISOString()
      });
      setInputText('');
    }
  };

  const handleEmojiSelect = (emoji) => {
    setInputText(inputText + emoji);
    setShowEmojiPicker(false);
  };

  const handleStickerSelect = (sticker) => {
    onSendMessage({
      type: 'sticker',
      content: sticker,
      timestamp: new Date().toISOString()
    });
    setShowStickerPicker(false);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onSendMessage({
          type: 'image',
          content: event.target.result,
          fileName: file.name,
          timestamp: new Date().toISOString()
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <div className="flex items-end space-x-2 relative">
        <button
          onClick={() => {
            setShowEmojiPicker(!showEmojiPicker);
            setShowStickerPicker(false);
          }}
          className="text-gray-600 hover:text-green-600 transition p-2 hover:bg-gray-100 rounded-full"
          title="Emojis"
        >
          <Smile size={24} />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-gray-600 hover:text-green-600 transition p-2 hover:bg-gray-100 rounded-full"
          title="Enviar imagem"
        >
          <Image size={24} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        <button
          onClick={() => {
            setShowStickerPicker(!showStickerPicker);
            setShowEmojiPicker(false);
          }}
          className="text-gray-600 hover:text-green-600 transition p-2 hover:bg-gray-100 rounded-full"
          title="Figurinhas"
        >
          <Sticker size={24} />
        </button>

        <div className="flex-1">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Digite uma mensagem..."
            className="w-full border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:border-green-500 resize-none"
            rows={1}
          />
        </div>

        <button
          onClick={handleSendMessage}
          className="bg-green-600 text-white p-3 rounded-full hover:bg-green-700 transition"
          title="Enviar"
        >
          <Send size={20} />
        </button>

        {showEmojiPicker && (
          <EmojiPicker
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
        {showStickerPicker && (
          <StickerPicker
            onSelect={handleStickerSelect}
            onClose={() => setShowStickerPicker(false)}
          />
        )}
      </div>
    </div>
  );
};

export default MediaInput;