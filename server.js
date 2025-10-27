// ============================================
// ARQUIVO: server.js (COMPLETO E CORRIGIDO)
// CAMINHO: /server.js (raiz do projeto)
// ============================================

const WebSocket = require('ws');
const http = require('http');

const PORT = process.env.PORT || 8080;

// Criar servidor HTTP
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Server Running');
});

// Criar servidor WebSocket
const wss = new WebSocket.Server({ server });

// Armazenar usuários conectados
const users = new Map();
let userIdCounter = 0;

// Armazenar usuários banidos (por IP ou userId)
const bannedUsers = new Set();
const bannedIPs = new Set();

// Histórico de mensagens por usuário (para detectar spam)
const messageHistory = new Map();

// Palavras banidas (censura)
const bannedWords = [
  'puta', 'fdp', 'caralho', 'porra', 'merda', 'viado', 'buceta', 
  'cu', 'corno', 'arrombado', 'babaca', 'desgraça', 'prostituta',
  'vagabunda', 'safada', 'vadia', 'piranha', 'galinha', 'rapariga'
];

// Regex para detectar links
const urlRegex = /(https?:\/\/[^\s]+)/gi;

// ✅ FUNÇÃO: Broadcast para todos os clientes
function broadcastEvent(type, data) {
  const message = JSON.stringify({ type, data });
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ✅ FUNÇÃO: Atualizar contador de usuários online
function updateOnlineCount() {
  const count = wss.clients.size;
  console.log(`👥 Usuários online: ${count}`);
  broadcastEvent('online_count', { count });
}

// ✅ FUNÇÃO: Validar mensagem (anti-spam, censura, links)
function validateMessage(message, ws, user) {
  // 1️⃣ Verificar se usuário está banido
  if (bannedUsers.has(user.id)) {
    console.log(`🚫 Usuário ${user.name} está banido`);
    ws.send(JSON.stringify({
      type: 'user_banned',
      data: { reason: 'Você foi banido permanentemente' }
    }));
    ws.close(1008, 'Usuário banido');
    return false;
  }

  // 2️⃣ Anti-spam: Limitar mensagens por segundo
  const now = Date.now();
  const history = messageHistory.get(user.id) || [];
  const recentMessages = history.filter(time => now - time < 5000); // Últimos 5 segundos

  if (recentMessages.length >= 5) {
    console.log(`🚫 ${user.name} enviando spam`);
    ws.send(JSON.stringify({
      type: 'message_blocked',
      data: { reason: 'Você está enviando mensagens muito rápido!' }
    }));
    
    // Banir se continuar spammando
    if (recentMessages.length >= 10) {
      bannedUsers.add(user.id);
      broadcastEvent('user_banned_notification', {
        userName: user.name,
        reason: 'Spam excessivo'
      });
      ws.close(1008, 'Banido por spam');
    }
    return false;
  }

  messageHistory.set(user.id, [...recentMessages, now]);

  // 3️⃣ Verificar palavrões
  const lowerMessage = message.toLowerCase();
  const hasBadWord = bannedWords.some(word => lowerMessage.includes(word));
  
  if (hasBadWord) {
    console.log(`🚫 Mensagem bloqueada (palavrão): ${message}`);
    ws.send(JSON.stringify({
      type: 'message_blocked',
      data: { reason: 'Mensagem contém palavras proibidas' }
    }));
    
    // Advertência: 3 strikes = ban
    user.warnings = (user.warnings || 0) + 1;
    if (user.warnings >= 3) {
      bannedUsers.add(user.id);
      broadcastEvent('user_banned_notification', {
        userName: user.name,
        reason: 'Uso repetido de linguagem inapropriada'
      });
      ws.close(1008, 'Banido por linguagem inapropriada');
    }
    return false;
  }

  // 4️⃣ Bloquear links suspeitos
  if (urlRegex.test(message)) {
    console.log(`🚫 Link bloqueado: ${message}`);
    ws.send(JSON.stringify({
      type: 'message_blocked',
      data: { reason: 'Links não são permitidos no chat' }
    }));
    return false;
  }

  return true;
}

// ✅ CONEXÃO DE NOVOS CLIENTES
wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log('🔌 Nova conexão de:', ip);

  // Verificar se IP está banido
  if (bannedIPs.has(ip)) {
    console.log('🚫 IP banido tentou conectar:', ip);
    ws.close(1008, 'IP banido');
    return;
  }

  const userId = ++userIdCounter;
  const user = {
    id: userId,
    name: `Usuário ${userId}`,
    color: ['crimson', 'gold', 'cadetblue', 'coral', 'teal'][userId % 5],
    warnings: 0
  };

  users.set(ws, user);

  // Enviar ID do usuário
  ws.send(JSON.stringify({
    type: 'user_id',
    data: user
  }));

  console.log(`✅ Usuário ${user.name} conectado (ID: ${userId})`);
  updateOnlineCount();

  // ✅ RECEBER MENSAGENS
  ws.on('message', (msg) => {
    try {
      const message = JSON.parse(msg);
      const user = users.get(ws);
      
      console.log(`📥 Mensagem recebida - Tipo: ${message.type}, User: ${user?.name || 'DESCONHECIDO'}`);

      if (!user) {
        console.error('❌ ERRO: Usuário não encontrado no Map!');
        return;
      }

      // ✅ SET_NAME COM VALIDAÇÃO RIGOROSA
      if (message.type === 'set_name') {
        console.log('📝 set_name recebido:', message.data, 'Tipo:', typeof message.data);
        
        // ✅ VALIDAÇÃO CRÍTICA DO TIPO
        if (typeof message.data !== 'string') {
          console.error('❌ ERRO: Nome não é string!', typeof message.data, message.data);
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Nome inválido: deve ser uma string' }
          }));
          return;
        }

        const newName = message.data.trim();
        
        // ✅ VALIDAÇÃO DE TAMANHO
        if (!newName) {
          console.error('❌ ERRO: Nome vazio após trim');
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Nome não pode estar vazio' }
          }));
          return;
        }

        if (newName.length < 3 || newName.length > 20) {
          console.error('❌ ERRO: Nome com tamanho inválido:', newName.length);
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Nome deve ter entre 3 e 20 caracteres' }
          }));
          return;
        }

        console.log(`✏️ Alterando nome: ${user.name} → ${newName}`);
        user.name = newName;
        users.set(ws, user);
        updateOnlineCount();
        
        console.log('✅ Nome alterado com sucesso!');
      }

      // ✅ MENSAGEM DE TEXTO COM VALIDAÇÃO
      else if (message.type === 'message') {
        console.log(`💬 Processando mensagem de texto: "${message.data}"`);
        
        // ✅ VALIDAÇÃO DO TIPO
        if (typeof message.data !== 'string') {
          console.error('❌ Mensagem não é string!', typeof message.data);
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Mensagem inválida' }
          }));
          return;
        }
        
        const cleanMessage = message.data.trim();
        
        if (!cleanMessage) {
          console.log('❌ Mensagem vazia após trim');
          return;
        }
        
        if (!validateMessage(cleanMessage, ws, user)) {
          console.log('❌ Mensagem bloqueada pela validação');
          return;
        }

        console.log(`📤 Broadcasting mensagem de ${user.name}`);
        broadcastEvent('message', {
          userId: user.id,
          userName: user.name,
          content: cleanMessage,
          timestamp: Date.now()
        });
      }

      // ✅ ÁUDIO
      else if (message.type === 'audio_message') {
        console.log(`🎤 Áudio recebido de ${user.name}`);
        
        if (!message.data || !message.data.audio) {
          console.error('❌ Dados de áudio inválidos');
          return;
        }
        
        broadcastEvent('audio_message', {
          userId: user.id,
          userName: user.name,
          content: message.data.audio,
          timestamp: Date.now()
        });
      }

      // ✅ IMAGEM
      else if (message.type === 'image_message') {
        console.log(`🖼️ Imagem recebida de ${user.name}`);
        
        if (!message.data || !message.data.image) {
          console.error('❌ Dados de imagem inválidos');
          return;
        }
        
        broadcastEvent('image_message', {
          userId: user.id,
          userName: user.name,
          content: message.data.image,
          fileName: message.data.fileName || 'imagem.png',
          timestamp: Date.now()
        });
      }

      // ✅ VÍDEO
      else if (message.type === 'video_message') {
        console.log(`🎥 Vídeo recebido de ${user.name}`);
        
        if (!message.data || !message.data.video) {
          console.error('❌ Dados de vídeo inválidos');
          ws.send(JSON.stringify({
            type: 'message_blocked',
            data: { reason: 'Dados de vídeo inválidos' }
          }));
          return;
        }
        
        const videoSize = message.data.fileSize || 0;
        const maxSize = 500 * 1024 * 1024; // 500MB
        
        if (videoSize > maxSize) {
          console.log(`❌ Vídeo muito grande: ${(videoSize / 1024 / 1024).toFixed(2)}MB`);
          ws.send(JSON.stringify({
            type: 'message_blocked',
            data: { reason: 'Vídeo muito grande (máximo 500MB)' }
          }));
          return;
        }
        
        console.log(`📤 Broadcasting vídeo de ${user.name} (${(videoSize / 1024 / 1024).toFixed(2)}MB)`);
        
        broadcastEvent('video_message', {
          userId: user.id,
          userName: user.name,
          content: message.data.video,
          fileName: message.data.fileName || 'video.mp4',
          timestamp: Date.now()
        });
      }

      // ✅ STICKER
      else if (message.type === 'sticker_message') {
        console.log(`😊 Sticker enviado por ${user.name}`);
        
        if (!message.data || !message.data.sticker) {
          console.error('❌ Dados de sticker inválidos');
          return;
        }
        
        broadcastEvent('sticker_message', {
          userId: user.id,
          userName: user.name,
          content: message.data.sticker,
          timestamp: Date.now()
        });
      }

      // ✅ TYPING
      else if (message.type === 'typing_start' || message.type === 'typing_stop') {
        console.log(`⌨️ ${user.name} ${message.type === 'typing_start' ? 'começou' : 'parou'} de digitar`);
        broadcastEvent('user_typing', {
          userId: user.id,
          userName: user.name,
          isTyping: message.type === 'typing_start'
        });
      }

      else {
        console.log(`⚠️ Tipo de mensagem desconhecido: ${message.type}`);
      }

    } catch (err) {
      console.error('❌ Erro ao processar mensagem:', err.message);
      console.error('❌ Stack:', err.stack);
    }
  });

  // ✅ DESCONEXÃO
  ws.on('close', () => {
    const user = users.get(ws);
    if (user) {
      console.log(`👋 ${user.name} desconectou`);
      users.delete(ws);
      messageHistory.delete(user.id);
      updateOnlineCount();
    }
  });

  ws.on('error', (error) => {
    console.error('❌ Erro WebSocket:', error.message);
  });
});

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor WebSocket rodando na porta ${PORT}`);
});