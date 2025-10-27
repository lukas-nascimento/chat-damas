// ============================================
// ARQUIVO: page.js (COM SISTEMA DE SEGURANÇA)
// CAMINHO: src/app/chat/page.js
// ============================================

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import LoginScreen from './components/LoginScreen';
import ChatScreen from './components/ChatScreen';

export default function ChatPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const isConnectingRef = useRef(false);
  const MAX_RECONNECT_ATTEMPTS = 5;

  const WS_URL = 'wss://chat-damas.onrender.com';

  const getColorForUser = (userId) => {
    const colors = ['crimson', 'gold', 'cadetblue', 'coral', 'teal', 'purple', 'deeppink', 'lime', 'orange', 'cyan'];
    return colors[userId % colors.length];
  };

  const connectWebSocket = useCallback(() => {
    console.log('🔌 Tentando conectar ao WebSocket:', WS_URL);

    // ✅ PREVINE MÚLTIPLAS CONEXÕES
    if (isConnectingRef.current) {
      console.log('⏳ Já existe uma conexão sendo estabelecida');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('⏳ WebSocket já está conectando');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket já está conectado');
      return;
    }

    // Limpa conexão anterior
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      try {
        wsRef.current.close();
      } catch (e) {
        console.log('⚠️ Erro ao fechar conexão anterior:', e.message);
      }
    }

    isConnectingRef.current = true;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ Conectado ao servidor');
      isConnectingRef.current = false;
      reconnectAttemptsRef.current = 0;

      // ✅ VALIDAÇÃO CRÍTICA DO NOME
      if (userName && typeof userName === 'string' && userName.trim()) {
        console.log('📤 Enviando nome do usuário:', userName);
        console.log('📤 Tipo do nome:', typeof userName);
        
        ws.send(JSON.stringify({
          type: 'set_name',
          data: userName.trim() // ✅ Garante que é string limpa
        }));
      } else {
        console.error('❌ userName inválido:', userName, typeof userName);
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 [PAGE.JS] Mensagem recebida:', message.type, message);

        switch (message.type) {
          case 'user_id':
            console.log('🆔 Usuário definido:', message.data);
            setCurrentUser(message.data);
            break;

          case 'message':
            console.log('💬 Nova mensagem:', message.data);
            setMessages(prev => [...prev, {
              userId: message.data.userId,
              userName: message.data.userName,
              content: message.data.content,
              timestamp: message.data.timestamp,
              isSelf: message.data.userName === userName,
              userColor: getColorForUser(message.data.userId)
            }]);
            break;

          case 'audio_message':
            console.log('🎤 Áudio recebido:', message.data);
            setMessages(prev => [...prev, {
              userId: message.data.userId,
              userName: message.data.userName,
              content: message.data.content,
              timestamp: message.data.timestamp,
              isSelf: message.data.userName === userName,
              isAudio: true,
              userColor: getColorForUser(message.data.userId)
            }]);
            break;

          case 'image_message':
            console.log('🖼️ Imagem recebida:', message.data);
            setMessages(prev => [...prev, {
              userId: message.data.userId,
              userName: message.data.userName,
              content: message.data.content,
              fileName: message.data.fileName,
              timestamp: message.data.timestamp,
              isSelf: message.data.userName === userName,
              isImage: true,
              userColor: getColorForUser(message.data.userId)
            }]);
            break;

          case 'video_message':
            console.log('🎥 Vídeo recebido:', message.data);
            setMessages(prev => [...prev, {
              userId: message.data.userId,
              userName: message.data.userName,
              content: message.data.content,
              fileName: message.data.fileName,
              timestamp: message.data.timestamp,
              isSelf: message.data.userName === userName,
              isVideo: true,
              userColor: getColorForUser(message.data.userId)
            }]);
            break;

          case 'sticker_message':
            console.log('😊 Sticker recebido:', message.data);
            setMessages(prev => [...prev, {
              userId: message.data.userId,
              userName: message.data.userName,
              content: message.data.content,
              timestamp: message.data.timestamp,
              isSelf: message.data.userName === userName,
              isSticker: true,
              userColor: getColorForUser(message.data.userId)
            }]);
            break;

          case 'user_banned_notification':
            console.log('🚫 Usuário banido:', message.data);
            setMessages(prev => [...prev, {
              content: `🚫 ${message.data.userName} foi banido. Motivo: ${message.data.reason}`,
              timestamp: Date.now(),
              isSystem: true
            }]);
            break;

          case 'online_count':
            console.log('👥 Usuários online:', message.data.count);
            break;

          case 'message_blocked':
            console.warn('⚠️ Mensagem bloqueada:', message.data.reason);
            alert(message.data.reason);
            break;

          case 'user_banned':
            console.error('🚫 Você foi banido:', message.data.reason);
            alert(`Você foi banido: ${message.data.reason}`);
            shouldReconnectRef.current = false;
            break;

          case 'error':
            console.error('❌ Erro do servidor:', message.data);
            alert(`Erro: ${message.data.message || 'Erro desconhecido'}`);
            break;

          default:
            console.log('📦 Mensagem não tratada:', message.type);
        }
      } catch (err) {
        console.error('❌ Erro ao processar mensagem:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ Erro WebSocket:', error);
      isConnectingRef.current = false;
    };

    ws.onclose = (event) => {
      console.log('🔌 Conexão fechada - Code:', event.code, 'Reason:', event.reason || 'Sem razão');
      wsRef.current = null;
      isConnectingRef.current = false;

      // Code 1008 = Banido
      if (event.code === 1008) {
        console.log('🚫 Não reconectando - usuário banido');
        shouldReconnectRef.current = false;
        return;
      }

      // Reconexão automática
      if (shouldReconnectRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * reconnectAttemptsRef.current, 5000);
        console.log(`🔄 Reconectando em ${delay}ms (tentativa ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (shouldReconnectRef.current) {
            connectWebSocket();
          }
        }, delay);
      } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        console.log('❌ Máximo de tentativas de reconexão atingido');
        alert('Não foi possível reconectar ao servidor. Por favor, recarregue a página.');
      }
    };
  }, [userName]);

  const handleSendMessage = (e) => {
    e.preventDefault();

    if (!messageInput.trim()) {
      console.log('⚠️ Mensagem vazia');
      return;
    }

    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket não está conectado');
      alert('Conexão perdida. Tentando reconectar...');
      connectWebSocket();
      return;
    }

    try {
      console.log('📤 Enviando mensagem:', messageInput);

      wsRef.current.send(JSON.stringify({
        type: 'message',
        data: messageInput.trim()
      }));

      console.log('✅ Mensagem enviada com sucesso');
      setMessageInput('');

    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem. Tente novamente.');
    }
  };

  const handleMessageReceived = (message) => {
    console.log('🔵 [PAGE.JS] handleMessageReceived chamado:', message.type);
  };

  // ✅ FUNÇÃO DE LOGIN CORRIGIDA
  const handleLogin = (name) => {
    console.log('🔑 Login iniciado com:', name);
    console.log('🔑 Tipo recebido:', typeof name);
    
    // ✅ VALIDAÇÃO CRÍTICA
    if (typeof name !== 'string') {
      console.error('❌ ERRO: Nome não é string!', name);
      alert('Erro ao fazer login. Tente novamente.');
      return;
    }

    const cleanName = name.trim();
    
    if (!cleanName) {
      console.error('❌ ERRO: Nome vazio!');
      alert('Por favor, digite um nome válido.');
      return;
    }

    if (cleanName.length < 3 || cleanName.length > 20) {
      console.error('❌ ERRO: Nome com tamanho inválido!');
      alert('Nome deve ter entre 3 e 20 caracteres.');
      return;
    }

    console.log('✅ Nome válido:', cleanName);
    
    setUserName(cleanName);
    setIsLoggedIn(true);
    shouldReconnectRef.current = true;
    reconnectAttemptsRef.current = 0;
  };

  const handleLeaveRoom = () => {
    console.log('👋 Saindo do chat...');
    
    shouldReconnectRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.onclose = null;
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    isConnectingRef.current = false;
    setIsLoggedIn(false);
    setMessages([]);
    setCurrentUser(null);
    setUserName('');
    reconnectAttemptsRef.current = 0;
  };

  useEffect(() => {
    if (isLoggedIn && userName && typeof userName === 'string' && userName.trim()) {
      console.log('🚀 Iniciando conexão WebSocket para:', userName);
      connectWebSocket();
    }

    return () => {
      console.log('🧹 Limpando componente...');
      shouldReconnectRef.current = false;
      isConnectingRef.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (wsRef.current) {
        wsRef.current.onclose = null;
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }
      }
    };
  }, [isLoggedIn, userName, connectWebSocket]);

  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <ChatScreen
      websocket={wsRef.current}
      messages={messages}
      messageInput={messageInput}
      setMessageInput={setMessageInput}
      onSendMessage={handleSendMessage}
      onMessageReceived={handleMessageReceived}
      currentUserName={userName}
      onLeaveRoom={handleLeaveRoom}
    />
  );
}