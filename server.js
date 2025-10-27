// ============================================
// ARQUIVO: server.js (COM SEGURANÇA COMPLETA + VÍDEOS)
// CAMINHO: server.js (raiz do projeto)
// ============================================

const WebSocket = require('ws');

const PORT = 8080;

const wss = new WebSocket.Server({ 
  port: PORT,
  maxPayload: 700 * 1024 * 1024, // 700MB
  perMessageDeflate: false
});

const users = new Map();
const bannedUsers = new Map(); // userId -> { reason, timestamp }
const userViolations = new Map(); // userId -> [violations]
let userIdCounter = 1;

// ==========================================
// SISTEMA DE SEGURANÇA ATUALIZADO
// ==========================================

// Lista COMPLETA de palavras proibidas (sincronizada com o cliente)
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

// Regex para detectar URLs
const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|net|org|br|io|gov|edu|co|tv|me|app|dev)[^\s]*)/gi;

// Função para verificar links
function containsLink(message) {
  return urlRegex.test(message);
}

// Função ATUALIZADA para verificar palavras proibidas (mesma lógica do cliente)
function containsBannedWord(message) {
  const lowerMessage = message.toLowerCase();
  return bannedWords.some(word => {
    // Para frases (com espaços), usa includes
    if (word.includes(' ')) {
      return lowerMessage.includes(word.toLowerCase());
    } else {
      // Para palavras únicas, usa word boundary
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lowerMessage);
    }
  });
}

// Função ATUALIZADA para encontrar a palavra proibida
function findBannedWord(message) {
  const lowerMessage = message.toLowerCase();
  return bannedWords.find(word => {
    // Para frases (com espaços), usa includes
    if (word.includes(' ')) {
      return lowerMessage.includes(word.toLowerCase());
    } else {
      // Para palavras únicas, usa word boundary
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lowerMessage);
    }
  });
}

// Função para banir usuário
function banUser(ws, userId, userName, reason) {
  bannedUsers.set(userId, {
    reason,
    timestamp: new Date().toISOString(),
    userName
  });

  console.log(`🚫 USUÁRIO BANIDO: ${userName} (ID: ${userId}) - ${reason}`);

  // Notifica o usuário banido
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'user_banned',
      data: {
        reason,
        timestamp: new Date().toISOString()
      }
    }));
  }

  // Notifica todos os outros usuários
  broadcastEvent('user_banned_notification', {
    userId,
    userName,
    reason
  });

  // Remove o usuário
  users.delete(ws);
  
  // Desconecta o usuário
  ws.close(1008, `Banido: ${reason}`);
  
  updateOnlineCount();
}

// Validar mensagem antes de enviar
function validateMessage(message, ws, user) {
  // Verifica se usuário está banido
  if (bannedUsers.has(user.id)) {
    const banInfo = bannedUsers.get(user.id);
    ws.send(JSON.stringify({
      type: 'message_blocked',
      data: { reason: `Você está banido: ${banInfo.reason}` }
    }));
    ws.close();
    return false;
  }

  // Verifica links
  if (containsLink(message)) {
    console.log(`⚠️ LINK DETECTADO de ${user.name}: ${message.substring(0, 50)}...`);
    
    // Registra violação
    if (!userViolations.has(user.id)) {
      userViolations.set(user.id, []);
    }
    userViolations.get(user.id).push({
      type: 'LINK',
      message,
      timestamp: new Date()
    });

    // Bane o usuário
    banUser(ws, user.id, user.name, 'Envio de links não autorizado');
    return false;
  }

  // Verifica palavras proibidas
  const bannedWord = findBannedWord(message);
  if (bannedWord) {
    console.log(`⚠️ PALAVRA PROIBIDA de ${user.name}: "${bannedWord}"`);
    
    // Registra violação
    if (!userViolations.has(user.id)) {
      userViolations.set(user.id, []);
    }
    userViolations.get(user.id).push({
      type: 'BANNED_WORD',
      word: bannedWord,
      message,
      timestamp: new Date()
    });

    // Bane o usuário
    banUser(ws, user.id, user.name, `Uso de conteúdo inadequado: "${bannedWord}"`);
    return false;
  }

  return true;
}

// ==========================================
// FIM DO SISTEMA DE SEGURANÇA
// ==========================================

console.log(`🚀 Servidor WebSocket rodando em ws://localhost:${PORT}`);
console.log(`📊 Max Payload: ${wss.options.maxPayload / 1024 / 1024}MB`);
console.log(`🛡️ Sistema de segurança ativado com ${bannedWords.length} palavras/frases proibidas!`);

function broadcastEvent(type, data) {
  const message = JSON.stringify({ type, data });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

function updateOnlineCount() {
  for (const [ws, user] of users.entries()) {
    if (ws.readyState !== WebSocket.OPEN) {
      users.delete(ws);
    }
  }

  const usersList = Array.from(users.values()).map(u => ({
    id: u.id,
    name: u.name
  }));

  console.log(`📊 Usuários online: ${usersList.length}`);
  broadcastEvent('online_count', {
    count: usersList.length,
    users: usersList
  });
}

wss.on('connection', (ws) => {
  const userId = userIdCounter++;
  const userName = `Usuário ${userId}`;
  ws.isAlive = true;

  // Verifica se o ID foi banido anteriormente
  if (bannedUsers.has(userId)) {
    const banInfo = bannedUsers.get(userId);
    ws.send(JSON.stringify({
      type: 'user_banned',
      data: banInfo
    }));
    ws.close();
    return;
  }

  users.set(ws, { id: userId, name: userName });
  console.log(`👤 Novo usuário conectado: ${userName}`);

  ws.send(JSON.stringify({
    type: 'user_id',
    data: { userId, userName }
  }));

  updateOnlineCount();

  ws.on('pong', () => ws.isAlive = true);

  ws.on('message', (msg) => {
    try {
      const message = JSON.parse(msg);
      const user = users.get(ws);
      
      if (!user) return;

      // Handler para DEFINIR NOME
      if (message.type === 'set_name') {
        const old = user.name;
        user.name = message.data || user.name;
        users.set(ws, user);
        console.log(`📝 ${old} agora é ${user.name}`);
        updateOnlineCount();
      }

      // Handler para MENSAGEM DE TEXTO (COM VALIDAÇÃO)
      else if (message.type === 'message') {
        console.log(`💬 ${user.name}: ${message.data}`);

        // VALIDA A MENSAGEM
        if (!validateMessage(message.data, ws, user)) {
          return; // Mensagem bloqueada
        }

        broadcastEvent('message', {
          userId: user.id,
          userName: user.name,
          content: message.data,
          timestamp: new Date().toISOString()
        });
      }

      // Handler para MENSAGEM DE ÁUDIO
      else if (message.type === 'audio_message') {
        console.log(`🎤 ${user.name} enviou um áudio (${Math.round(message.data.audio.length / 1024)}KB)`);

        broadcastEvent('audio_message', {
          userId: user.id,
          userName: user.name,
          content: message.data.audio,
          timestamp: new Date().toISOString()
        });
      }

      // Handler para MENSAGEM DE IMAGEM
      else if (message.type === 'image_message') {
        const imageSizeKB = Math.round(message.data.image.length / 1024);
        console.log(`🖼️ ${user.name} enviou uma imagem (${imageSizeKB}KB) - ${message.data.fileName}`);

        broadcastEvent('image_message', {
          userId: user.id,
          userName: user.name,
          content: message.data.image,
          fileName: message.data.fileName || 'imagem.png',
          timestamp: new Date().toISOString()
        });
      }

      // Handler para MENSAGEM DE VÍDEO
      else if (message.type === 'video_message') {
        const videoSizeMB = (message.data.video.length / 1024 / 1024).toFixed(2);
        console.log(`📹 ${user.name} enviou um vídeo (${videoSizeMB}MB base64) - ${message.data.fileName}`);

        broadcastEvent('video_message', {
          userId: user.id,
          userName: user.name,
          content: message.data.video,
          fileName: message.data.fileName || 'video.mp4',
          fileSize: message.data.fileSize,
          timestamp: new Date().toISOString()
        });

        console.log(`✅ Vídeo distribuído para ${wss.clients.size} clientes`);
      }

      // Handler para MENSAGEM DE STICKER
      else if (message.type === 'sticker_message') {
        console.log(`🎨 ${user.name} enviou um sticker: ${message.data.sticker}`);

        broadcastEvent('sticker_message', {
          userId: user.id,
          userName: user.name,
          content: message.data.sticker,
          timestamp: new Date().toISOString()
        });
      }

      // Handler para DIGITAÇÃO (typing)
      else if (message.type === 'typing_start' || message.type === 'typing_stop') {
        const isTyping = message.type === 'typing_start';

        broadcastEvent('user_typing', {
          userId: user.id,
          userName: user.name,
          isTyping
        });
      }

      // Handler para VERIFICAR STATUS DE BAN
      else if (message.type === 'check_banned') {
        const isBanned = bannedUsers.has(user.id);
        ws.send(JSON.stringify({
          type: 'banned_status',
          data: {
            isBanned,
            banInfo: isBanned ? bannedUsers.get(user.id) : null
          }
        }));
      }

      // Handler para LISTAR USUÁRIOS BANIDOS (admin)
      else if (message.type === 'get_banned_users') {
        const bannedList = Array.from(bannedUsers.entries()).map(([userId, info]) => ({
          userId,
          ...info
        }));
        ws.send(JSON.stringify({
          type: 'banned_users_list',
          data: bannedList
        }));
      }

    } catch (err) {
      console.error('❌ Erro ao processar mensagem:', err.message);
    }
  });

  ws.on('close', () => {
    const user = users.get(ws);
    if (user) {
      console.log(`👋 ${user.name} saiu`);
      users.delete(ws);
      updateOnlineCount();

      broadcastEvent('user_typing', {
        userId: user.id,
        userName: user.name,
        isTyping: false
      });
    }
  });

  ws.on('error', (err) => console.error('❌ Erro WebSocket:', err.message));
});

// Heartbeat
setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) {
      users.delete(ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
  updateOnlineCount();
}, 10000);

// Monitor de memória
setInterval(() => {
  const used = process.memoryUsage();
  console.log(`💾 Memória: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
  console.log(`🚫 Usuários banidos: ${bannedUsers.size}`);
  console.log(`📋 Total de violações registradas: ${userViolations.size}`);
}, 60000);

// Encerramento gracioso
process.on('SIGINT', () => {
  console.log('⏹️ Encerrando servidor...');
  users.clear();
  bannedUsers.clear();
  userViolations.clear();
  wss.close(() => process.exit(0));
});