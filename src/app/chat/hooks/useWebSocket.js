import { useEffect, useRef, useCallback } from 'react';

let globalWs = null;
let connectionCount = 0;

export function useWebSocket(onMessage, onClose) {
  const wsRef = useRef(null);
  const messageHandlerRef = useRef(onMessage);
  const closeHandlerRef = useRef(onClose);
  const userInfoRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  
  const MAX_RECONNECT_ATTEMPTS = 5;
  const WS_URL = 'wss://chat-damas.onrender.com';

  useEffect(() => {
    messageHandlerRef.current = onMessage;
    closeHandlerRef.current = onClose;
  }, [onMessage, onClose]);

  const connect = useCallback((userId, userName) => {
    userInfoRef.current = { userId, userName };

    if (globalWs && globalWs.readyState === WebSocket.OPEN) {
      console.log('♻️  Reutilizando conexão existente');
      wsRef.current = globalWs;
      return globalWs;
    }

    if (globalWs && globalWs.readyState === WebSocket.CONNECTING) {
      console.log('⏳ Aguardando conexão anterior completar...');
      return null;
    }

    connectionCount++;
    console.log(`🔌 Criando conexão #${connectionCount} para ${WS_URL}`);

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      console.log('✅ WebSocket conectado!');
      reconnectAttemptsRef.current = 0;
      
      if (userName) {
        console.log('📤 Enviando nome do usuário:', userName);
        ws.send(JSON.stringify({
          type: 'set_name',
          data: userName
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 Mensagem recebida:', message.type, message);
        
        if (message.type === 'user_id') {
          userInfoRef.current = {
            userId: message.data.id,
            userName: message.data.name,
            userColor: message.data.color
          };
          console.log('🆔 Usuário definido:', userInfoRef.current);
        }
        
        messageHandlerRef.current?.(message);
      } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };

    ws.onclose = (event) => {
      console.log(`🔌 WebSocket fechado - Code: ${event.code}, Reason: ${event.reason || 'Sem razão'}`);
      globalWs = null;
      wsRef.current = null;

      if (event.code === 1008) {
        console.log('🚫 Não reconectando - usuário banido');
        shouldReconnectRef.current = false;
        closeHandlerRef.current?.();
        return;
      }

      if (shouldReconnectRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * reconnectAttemptsRef.current, 5000);
        console.log(`🔄 Tentando reconectar em ${delay}ms (tentativa ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (shouldReconnectRef.current) {
            connect(userInfoRef.current?.userId, userInfoRef.current?.userName);
          }
        }, delay);
      } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        console.log('❌ Máximo de tentativas de reconexão atingido');
      }

      closeHandlerRef.current?.();
    };

    globalWs = ws;
    wsRef.current = ws;
    return ws;
  }, []);

  const send = useCallback((data) => {
    if (!wsRef.current) {
      console.error('❌ WebSocket não inicializado');
      return false;
    }

    if (wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('⚠️  WebSocket não está aberto. ReadyState:', wsRef.current.readyState);
      return false;
    }

    try {
      let messageToSend;
      
      if (typeof data === 'string') {
        messageToSend = {
          type: 'message',
          data: data
        };
      } else {
        messageToSend = data;
      }
      
      console.log('📤 Enviando:', messageToSend);
      wsRef.current.send(JSON.stringify(messageToSend));
      console.log('✅ Mensagem enviada com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar mensagem:', error);
      return false;
    }
  }, []);

  const sendTyping = useCallback((isTyping) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify({
          type: isTyping ? 'typing_start' : 'typing_stop'
        }));
        console.log(`⌨️  Enviado: ${isTyping ? 'typing_start' : 'typing_stop'}`);
      } catch (error) {
        console.error('❌ Erro ao enviar typing:', error);
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('👋 Desconectando WebSocket...');
    
    shouldReconnectRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN || 
          wsRef.current.readyState === WebSocket.CONNECTING) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    globalWs = null;
    reconnectAttemptsRef.current = 0;
    console.log('✅ WebSocket desconectado');
  }, []);

  useEffect(() => {
    return () => {
      console.log('🧹 Limpando useWebSocket...');
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      wsRef.current = null;
    };
  }, []);

  return { 
    connect, 
    send, 
    sendTyping, 
    disconnect, 
    wsRef,
    userInfo: userInfoRef.current 
  };
}