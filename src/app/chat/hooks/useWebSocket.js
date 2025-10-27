import { useEffect, useRef, useCallback } from 'react';

let globalWs = null;
let connectionCount = 0;

export function useWebSocket(onMessage, onClose) {
  const wsRef = useRef(null);
  const messageHandlerRef = useRef(onMessage);
  const closeHandlerRef = useRef(onClose);
  const userInfoRef = useRef(null);

  useEffect(() => {
    messageHandlerRef.current = onMessage;
    closeHandlerRef.current = onClose;
  }, [onMessage, onClose]);

  const connect = useCallback((userId, userName) => {
    userInfoRef.current = { userId, userName };

    // ✅ Se já tem uma conexão global viva, reutiliza
    if (globalWs && globalWs.readyState === WebSocket.OPEN) {
      console.log('♻️  Reutilizando conexão existente');
      wsRef.current = globalWs;
      return globalWs;
    }

    // ✅ Se a conexão anterior está conectando, aguarda
    if (globalWs && globalWs.readyState === WebSocket.CONNECTING) {
      console.log('⏳ Aguardando conexão anterior completar...');
      return null;
    }

    connectionCount++;
    console.log(`🔌 Criando conexão #${connectionCount}`);

    const ws = new WebSocket('ws://localhost:8080');

    ws.onopen = () => {
      console.log('✅ WebSocket conectado!');
      
      // ✅ Define nome do usuário se fornecido
      if (userName) {
        ws.send(JSON.stringify({
          type: 'set_name',
          data: userName
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 Mensagem recebida:', message);
        
        // ✅ Processa diferentes tipos de mensagem
        if (message.type === 'user_id') {
          userInfoRef.current = {
            userId: message.data.userId,
            userName: message.data.userName
          };
          console.log('🆔 ID recebido:', message.data);
        }
        
        messageHandlerRef.current?.(message);
      } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('❌ WebSocket fechado');
      globalWs = null;
      closeHandlerRef.current?.();
    };

    globalWs = ws;
    wsRef.current = ws;
    return ws;
  }, []);

  const send = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      // ✅ CORRIGIDO: Envia no formato que o servidor espera
      let messageToSend;
      
      if (typeof data === 'string') {
        // Se for string simples, envia como mensagem
        messageToSend = {
          type: 'message',
          data: data  // ✅ SERVIDOR ESPERA 'data', NÃO 'content'
        };
      } else {
        // Se já for objeto, mantém a estrutura
        messageToSend = data;
      }
      
      console.log('📤 Enviando:', messageToSend);
      wsRef.current.send(JSON.stringify(messageToSend));
      return true;
    }
    console.warn('⚠️  WebSocket não está aberto');
    return false;
  }, []);

  const sendTyping = useCallback((isTyping) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: isTyping ? 'typing_start' : 'typing_stop'
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
      globalWs = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup se necessário
    };
  }, []);

  return { connect, send, sendTyping, disconnect, wsRef };
}