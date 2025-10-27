// ============================================
// ARQUIVO: server.js (Next.js + WebSocket Integrado)
// CAMINHO: server.js (raiz do projeto)
// ============================================

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const WebSocket = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT, 10) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const users = new Map();
const bannedUsers = new Map();
const userViolations = new Map();
let userIdCounter = 1;

// Limites para economizar memória
const MAX_BANNED_USERS = 100;
const MAX_VIOLATIONS_PER_USER = 5;
const MAX_MESSAGE_LENGTH = 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutos

// ==========================================
// SISTEMA DE SEGURANÇA
// ==========================================

const bannedWords = [
  'fake',
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

const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([a-zA-Z0-9-]+\.(com|net|org|br|io|gov|edu|co|tv|me|app|dev)[^\s]*)/gi;

function containsLink(message) {
  return urlRegex.test(message);
}

function findBannedWord(message) {
  const lowerMessage = message.toLowerCase();
  return bannedWords.find(word => {
    if (word.includes(' ')) {
      return lowerMessage.includes(word.toLowerCase());
    } else {
      const regex = new RegExp(`\\b${word}\\b`, 'i');
      return regex.test(lowerMessage);
    }
  });
}

function banUser(ws, userId, userName, reason) {
  if (bannedUsers.size >= MAX_BANNED_USERS) {
    const oldestKey = bannedUsers.keys().next().value;
    bannedUsers.delete(oldestKey);
  }

  bannedUsers.set(userId, {
    reason,
    timestamp: Date.now(),
    userName
  });

  console.log(`🚫 BANIDO: ${userName} (ID: ${userId}) - ${reason}`);

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'user_banned',
      data: { reason, timestamp: Date.now() }
    }));
  }

  broadcastEvent('user_banned_notification', { userId, userName, reason });
  users.delete(ws);
  ws.close(1008, `Banido: ${reason}`);
  updateOnlineCount();
}

function validateMessage(message, ws, user) {
  if (bannedUsers.has(user.id)) {
    const banInfo = bannedUsers.get(user.id);
    ws.send(JSON.stringify({
      type: 'message_blocked',
      data: { reason: `Você está banido: ${banInfo.reason}` }
    }));
    ws.close();
    return false;
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    ws.send(JSON.stringify({
      type: 'message_blocked',
      data: { reason: 'Mensagem muito longa' }
    }));
    return false;
  }

  if (containsLink(message)) {
    console.log(`⚠️ LINK DETECTADO de ${user.name}`);
    
    if (!userViolations.has(user.id)) {
      userViolations.set(user.id, []);
    }
    const violations = userViolations.get(user.id);
    
    if (violations.length >= MAX_VIOLATIONS_PER_USER) {
      violations.shift();
    }
    
    violations.push({
      type: 'LINK',
      timestamp: Date.now()
    });

    banUser(ws, user.id, user.name, 'Envio de links não autorizado');
    return false;
  }

  const bannedWord = findBannedWord(message);
  if (bannedWord) {
    console.log(`⚠️ PALAVRA PROIBIDA de ${user.name}: "${bannedWord}"`);
    
    if (!userViolations.has(user.id)) {
      userViolations.set(user.id, []);
    }
    const violations = userViolations.get(user.id);
    
    if (violations.length >= MAX_VIOLATIONS_PER_USER) {
      violations.shift();
    }
    
    violations.push({
      type: 'BANNED_WORD',
      word: bannedWord,
      timestamp: Date.now()
    });

    banUser(ws, user.id, user.name, `Uso de conteúdo inadequado: "${bannedWord}"`);
    return false;
  }

  return true;
}

function broadcastEvent(type, data) {
  const message = JSON.stringify({ type, data });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (err) {
        console.error('Erro ao enviar:', err.message);
      }
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

  broadcastEvent('online_count', {
    count: usersList.length,
    users: usersList
  });
}

function cleanup() {
  console.log('🧹 Executando limpeza de memória...');
  
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [userId, violations] of userViolations.entries()) {
    const recentViolations = violations.filter(v => v.timestamp > oneHourAgo);
    if (recentViolations.length === 0) {
      userViolations.delete(userId);
    } else {
      userViolations.set(userId, recentViolations);
    }
  }

  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  for (const [userId, banInfo] of bannedUsers.entries()) {
    if (banInfo.timestamp < oneDayAgo) {
      bannedUsers.delete(userId);
    }
  }

  if (global.gc) {
    global.gc();
    console.log('♻️ Garbage collection executado');
  }

  const used = process.memoryUsage();
  console.log(`💾 Memória após limpeza: ${Math.round(used.heapUsed / 1024 / 1024)}MB`);
}

// Variável global para o WebSocket Server
let wss;

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // WebSocket Server integrado
  wss = new WebSocket.Server({ 
    server,
    maxPayload: 10 * 1024 * 1024,
    perMessageDeflate: {
      zlibDeflateOptions: {
        chunkSize: 1024,
        memLevel: 7,
        level: 3
      },
      zlibInflateOptions: {
        chunkSize: 10 * 1024
      },
      threshold: 1024
    }
  });

  console.log(`🚀 Servidor Next.js + WebSocket iniciando...`);
  console.log(`📊 Max Payload: 10MB`);
  console.log(`🛡️ Sistema de segurança ativado!`);
  console.log(`💾 Modo economia de memória ativado`);

  wss.on('connection', (ws) => {
    const userId = userIdCounter++;
    const userName = `Usuário ${userId}`;
    ws.isAlive = true;

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

        if (message.type === 'set_name') {
          user.name = message.data || user.name;
          users.set(ws, user);
          updateOnlineCount();
        }

        else if (message.type === 'message') {
          if (!validateMessage(message.data, ws, user)) return;

          broadcastEvent('message', {
            userId: user.id,
            userName: user.name,
            content: message.data,
            timestamp: Date.now()
          });
        }

        else if (message.type === 'audio_message') {
          broadcastEvent('audio_message', {
            userId: user.id,
            userName: user.name,
            content: message.data.audio,
            timestamp: Date.now()
          });
        }

        else if (message.type === 'image_message') {
          broadcastEvent('image_message', {
            userId: user.id,
            userName: user.name,
            content: message.data.image,
            fileName: message.data.fileName || 'imagem.png',
            timestamp: Date.now()
          });
        }

        else if (message.type === 'video_message') {
          ws.send(JSON.stringify({
            type: 'message_blocked',
            data: { reason: 'Vídeos temporariamente desabilitados para economia de memória' }
          }));
        }

        else if (message.type === 'sticker_message') {
          broadcastEvent('sticker_message', {
            userId: user.id,
            userName: user.name,
            content: message.data.sticker,
            timestamp: Date.now()
          });
        }

        else if (message.type === 'typing_start' || message.type === 'typing_stop') {
          broadcastEvent('user_typing', {
            userId: user.id,
            userName: user.name,
            isTyping: message.type === 'typing_start'
          });
        }

      } catch (err) {
        console.error('❌ Erro:', err.message);
      }
    });

    ws.on('close', () => {
      const user = users.get(ws);
      if (user) {
        users.delete(ws);
        updateOnlineCount();
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
  }, 30000);

  // Limpeza de memória
  setInterval(cleanup, CLEANUP_INTERVAL);

  // Monitor de memória
  setInterval(() => {
    const used = process.memoryUsage();
    const memMB = Math.round(used.heapUsed / 1024 / 1024);
    console.log(`💾 Memória: ${memMB}MB | Usuários: ${users.size} | Banidos: ${bannedUsers.size}`);
    
    if (memMB > 400) {
      console.log('⚠️ ALERTA: Memória alta! Executando limpeza...');
      cleanup();
    }
  }, 60000);

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`✅ Servidor rodando em http://${hostname}:${port}`);
    console.log(`🌐 WebSocket disponível em wss://chat-damas.onrender.com`);
  });

  // Encerramento gracioso
  process.on('SIGINT', () => {
    console.log('⏹️ Encerrando servidor...');
    users.clear();
    bannedUsers.clear();
    userViolations.clear();
    wss.close(() => process.exit(0));
  });
});