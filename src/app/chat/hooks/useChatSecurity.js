// ============================================
// ARQUIVO: useChatSecurity.js
// CAMINHO: src/chat/hooks/useChatSecurity.js
// ============================================

import { useCallback, useEffect, useState } from 'react';

export const useChatSecurity = (ws) => {
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState('');

  // Lista de palavras proibidas (mesma do servidor)
  const bannedWords = [
    'fake',
    
    // Variações de "não usa foto real"
    'não usa foto real',
    'nao usa foto real',
    'não usa foto dele',
    'não usa foto dela',
    'nao usa foto dele',
    'nao usa foto dela',
    'não é foto real',
    'nao e foto real',
    'foto não é real',
    'foto nao e real',
    'não usa a foto real',
    'nao usa a foto real',
    'não usa suas fotos',
    'nao usa suas fotos',
    'não usa foto própria',
    'nao usa foto propria',
    
    // Variações de "essa pessoa não é real"
    'essa pessoa não é real',
    'essa pessoa nao e real',
    'essa pessoa é fake',
    'essa pessoa e fake',
    'ele não é real',
    'ele nao e real',
    'ela não é real',
    'ela nao e real',
    'não é pessoa real',
    'nao e pessoa real',
    'pessoa fake',
    'perfil fake',
    'conta fake',
    'é fake',
    'e fake',
    'isso é fake',
    'isso e fake',
    
    // Variações de "usa fotos de outra pessoa"
    'ele usa fotos de outra pessoa',
    'ele usa foto de outra pessoa',
    'ela usa fotos de outra pessoa',
    'ela usa foto de outra pessoa',
    'usa foto de outro',
    'usa foto de outra',
    'usa fotos de outro',
    'usa fotos de outra',
    'usa foto alheia',
    'usa fotos alheias',
    'essa foto não é dela',
    'essa foto não é dele',
    'roubou foto',
    'roubou fotos',
    'foto roubada',
    'fotos roubadas',
    'pegou foto de outro',
    'pegou foto de outra',
    'pegou fotos de outro',
    'pegou fotos de outra',
    'copiou foto',
    'copiou fotos',
    'foto de terceiro',
    'fotos de terceiro',
    'não é ele na foto',
    'nao e ele na foto',
    'não é ela na foto',
    'nao e ela na foto',
    'foto não é dele',
    'foto nao e dele',
    'foto não é dela',
    'foto nao e dela',
    'fotos não são dele',
    'fotos nao sao dele',
    'fotos não são dela',
    'fotos nao sao dela',
    
    // Variações com gírias/abreviações
    'usa ft de outro',
    'usa ft de outra',
    'ft fake',
    'foto fake',
    'fotos fake',
    'perfil falso',
    'conta falsa',
    'não é verdadeiro',
    'nao e verdadeiro',
    'não é verdadeira',
    'nao e verdadeira',
    'mentiroso',
    'mentirosa',
    'enganador',
    'enganadora',
    'catfish',
    
    // Outras palavras proibidas
    'pedofilia',
    'pedofilo',
    'pedófilo',
    'droga',
    'trafico',
    'tráfico',
    'hack',
    'hacker',
    'cracker',
    'terrorismo',
    'terrorista',
    'golpe',
    'fraude',
    'cp',
    'scam',
    'phishing',
    'estupro',
    'assassinato',
    'suicidio',
    'suicídio'
  ];

  // Regex para detectar URLs (mesma do servidor)
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|net|org|br|io|gov|edu|co|tv|me|app|dev)[^\s]*)/gi;

  // Função para verificar se a mensagem contém links
  const containsLink = useCallback((message) => {
    return urlRegex.test(message);
  }, []);

  // Função para verificar palavras proibidas
  const containsBannedWord = useCallback((message) => {
    const lowerMessage = message.toLowerCase();
    return bannedWords.some(word => {
      // Para frases, usa includes; para palavras, usa word boundary
      if (word.includes(' ')) {
        return lowerMessage.includes(word.toLowerCase());
      } else {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(lowerMessage);
      }
    });
  }, []);

  // Função para encontrar qual palavra proibida foi usada
  const findBannedWord = useCallback((message) => {
    const lowerMessage = message.toLowerCase();
    return bannedWords.find(word => {
      // Para frases, usa includes; para palavras, usa word boundary
      if (word.includes(' ')) {
        return lowerMessage.includes(word.toLowerCase());
      } else {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        return regex.test(lowerMessage);
      }
    });
  }, []);

  // Escutar eventos de banimento do servidor
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Usuário foi banido
        if (data.type === 'user_banned') {
          setIsBanned(true);
          setBanReason(data.data.reason);
          console.log('🚫 Você foi banido:', data.data.reason);
        }

        // Mensagem foi bloqueada
        if (data.type === 'message_blocked') {
          alert(`⚠️ Mensagem bloqueada!\n${data.data.reason}`);
        }
      } catch (err) {
        console.error('Erro ao processar mensagem:', err);
      }
    };

    ws.addEventListener('message', handleMessage);

    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws]);

  // Função principal de validação (lado cliente)
  const validateMessage = useCallback((message) => {
    const violations = [];

    // Verifica links
    if (containsLink(message)) {
      violations.push({
        type: 'LINK_DETECTED',
        severity: 'HIGH',
        message: 'Links não são permitidos no chat.'
      });
    }

    // Verifica palavras proibidas
    const bannedWord = findBannedWord(message);
    if (bannedWord) {
      violations.push({
        type: 'BANNED_WORD',
        severity: 'CRITICAL',
        word: bannedWord,
        message: 'Esta mensagem contém conteúdo não permitido.'
      });
    }

    return {
      isValid: violations.length === 0,
      violations
    };
  }, [containsLink, findBannedWord]);

  // Função para verificar se usuário está banido
  const checkIfBanned = useCallback(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'check_banned'
      }));
    }
  }, [ws]);

  return {
    validateMessage,
    checkIfBanned,
    containsLink,
    containsBannedWord,
    isBanned,
    banReason
  };
};