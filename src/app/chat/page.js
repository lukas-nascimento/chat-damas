// ============================================
// ARQUIVO: page.js (COM SISTEMA DE SEGURANÇA)
// CAMINHO: src/app/chat/page.js
// ============================================

'use client';

import { useState, useRef, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import ChatScreen from './components/ChatScreen';

const colors = [
  "cadetblue", "darkgoldenrod", "cornflowerblue",
  "darkkhaki", "hotpink", "gold"
];

export default function ChatPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [user, setUser] = useState({ id: null, name: '', color: '' });
  const websocketRef = useRef(null);
  const userColorsRef = useRef(new Map());
  const userIdRef = useRef(null);

  const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

  const getUserColor = (userId) => {
    if (!userColorsRef.current.has(userId)) {
      userColorsRef.current.set(userId, getRandomColor());
    }
    return userColorsRef.current.get(userId);
  };

  useEffect(() => {
    return () => {
      if (websocketRef.current) websocketRef.current.close();
    };
  }, []);

  const handleLeaveRoom = () => {
    console.log('🚪 Saindo do chat...');
    
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    
    setIsLoggedIn(false);
    setUsername('');
    setMessages([]);
    setMessageInput('');
    setUser({ id: null, name: '', color: '' });
    userIdRef.current = null;
    
    console.log('✅ Logout realizado com sucesso!');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    // 🌐 DETECTA O AMBIENTE E USA A URL CORRETA
    const isProduction = process.env.NODE_ENV === 'production';
    const wsUrl = isProduction 
      ? 'wss://chat-damas.onrender.com'  // Produção
      : 'ws://localhost:10000';           // Desenvolvimento

    console.log('🔌 Conectando ao WebSocket:', wsUrl);

    const ws = new WebSocket(wsUrl);
    websocketRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Conectado ao servidor');
      ws.send(JSON.stringify({ type: 'set_name', data: username }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log('📨 [PAGE.JS] Mensagem recebida:', msg.type, msg);

        if (msg.type === 'user_id') {
          const serverUser = {
            id: msg.data.userId,
            name: username,
            color: getRandomColor()
          };
          userIdRef.current = msg.data.userId;
          setUser(serverUser);
          setIsLoggedIn(true);
          console.log('🆔 Usuário definido:', serverUser);
        }
      } catch (err) {
        console.error('❌ Erro ao processar mensagem:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('❌ Erro WS:', err);
      alert('Erro ao conectar ao servidor WebSocket.');
    };

    ws.onclose = () => {
      console.log('🔌 Conexão fechada');
      setIsLoggedIn(false);
    };
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !websocketRef.current) return;

    console.log('📤 Enviando mensagem:', messageInput);

    websocketRef.current.send(JSON.stringify({
      type: 'message',
      data: messageInput
    }));
    setMessageInput('');
  };

  const handleMessageReceived = (msg) => {
    console.log('📥 [PAGE.JS] handleMessageReceived chamado');
    console.log('   - Tipo:', msg.type);
    console.log('   - Dados:', msg.data);

    // 🆕 MENSAGEM DO SISTEMA (BANIMENTOS)
    if (msg.type === 'system_message') {
      console.log('🔔 [PAGE.JS] Mensagem do sistema');
      
      setMessages(prev => [...prev, {
        content: msg.data.content,
        timestamp: msg.data.timestamp,
        isSystem: true,
        isAudio: false,
        isImage: false,
        isVideo: false,
        isSticker: false
      }]);
      return;
    }

    // Mensagens de TEXTO
    if (msg.type === 'message') {
      const { userId, userName, content } = msg.data;
      
      console.log('💬 [PAGE.JS] Adicionando mensagem de texto');
      
      setMessages(prev => [...prev, {
        userId,
        userName,
        content,
        userColor: getUserColor(userId),
        isSelf: userId === userIdRef.current,
        isAudio: false,
        isImage: false,
        isVideo: false,
        isSticker: false
      }]);
    }

    // Mensagens de ÁUDIO
    else if (msg.type === 'audio_message') {
      const { userId, userName, content } = msg.data;
      
      console.log('🎤 [PAGE.JS] Adicionando mensagem de áudio');
      
      setMessages(prev => [...prev, {
        userId,
        userName,
        content,
        userColor: getUserColor(userId),
        isSelf: userId === userIdRef.current,
        isAudio: true,
        isImage: false,
        isVideo: false,
        isSticker: false
      }]);
    }

    // Mensagens de IMAGEM
    else if (msg.type === 'image_message') {
      const { userId, userName, content, fileName } = msg.data;
      
      console.log('🖼️ [PAGE.JS] Adicionando mensagem de imagem');
      
      setMessages(prev => [...prev, {
        userId,
        userName,
        content,
        fileName: fileName || 'imagem.png',
        userColor: getUserColor(userId),
        isSelf: userId === userIdRef.current,
        isAudio: false,
        isImage: true,
        isVideo: false,
        isSticker: false
      }]);
    }

    // Mensagens de VÍDEO
    else if (msg.type === 'video_message') {
      const { userId, userName, content, fileName, fileSize } = msg.data;
      
      console.log('📹 [PAGE.JS] RECEBENDO VÍDEO!');
      
      let videoUrl = content;
      
      if (content && content.length > 1000000) {
        try {
          console.log('🔄 Convertendo Base64 para Blob URL...');
          const base64Data = content.split(',')[1] || content;
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'video/mp4' });
          videoUrl = URL.createObjectURL(blob);
          console.log('✅ Blob URL criada:', videoUrl);
        } catch (error) {
          console.error('❌ Erro ao criar Blob URL:', error);
          videoUrl = content;
        }
      }
      
      setMessages(prev => [...prev, {
        userId,
        userName,
        content: videoUrl,
        fileName: fileName || 'video.mp4',
        fileSize: fileSize,
        userColor: getUserColor(userId),
        isSelf: userId === userIdRef.current,
        isAudio: false,
        isImage: false,
        isVideo: true,
        isSticker: false
      }]);

      console.log('✅ [PAGE.JS] Mensagem de vídeo adicionada ao estado!');
    }

    // Mensagens de STICKER
    else if (msg.type === 'sticker_message') {
      const { userId, userName, content } = msg.data;
      
      console.log('🎨 [PAGE.JS] Adicionando mensagem de sticker');
      
      setMessages(prev => [...prev, {
        userId,
        userName,
        content,
        userColor: getUserColor(userId),
        isSelf: userId === userIdRef.current,
        isAudio: false,
        isImage: false,
        isVideo: false,
        isSticker: true
      }]);
    }

    else {
      console.warn('⚠️ [PAGE.JS] Tipo de mensagem desconhecido:', msg.type);
    }
  };

  useEffect(() => {
    console.log('🔄 [PAGE.JS] Messages atualizado:', messages.length, 'mensagens');
    messages.forEach((msg, i) => {
      if (msg.isSystem) {
        console.log(`   ${i}: 🔔 SISTEMA: ${msg.content}`);
      } else {
        console.log(`   ${i}: ${msg.isVideo ? '📹' : msg.isImage ? '🖼️' : msg.isAudio ? '🎤' : '💬'} ${msg.userName}: ${msg.isVideo ? 'VIDEO' : msg.isImage ? 'IMAGE' : msg.isAudio ? 'AUDIO' : msg.content}`);
      }
    });
  }, [messages]);

  return (
    <section className="container">
      {!isLoggedIn ? (
        <LoginScreen 
          username={username}
          setUsername={setUsername}
          onLogin={handleLogin}
        />
      ) : (
        <ChatScreen 
          websocket={websocketRef.current}
          messages={messages}
          messageInput={messageInput}
          setMessageInput={setMessageInput}
          onSendMessage={handleSendMessage}
          onMessageReceived={handleMessageReceived}
          currentUserName={username}
          onLeaveRoom={handleLeaveRoom}
        />
      )}
    </section>
  );
}