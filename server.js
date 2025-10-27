// ============================================
// TRECHO CORRIGIDO DO server.js
// Substitua a partir da linha 217 (ws.on('message'))
// ============================================

ws.on('message', (msg) => {
  try {
    const message = JSON.parse(msg);
    const user = users.get(ws);
    
    console.log(`📥 Mensagem recebida - Tipo: ${message.type}, User: ${user?.name || 'DESCONHECIDO'}`);

    if (!user) {
      console.error('❌ ERRO: Usuário não encontrado no Map!');
      console.error('❌ WebSocket registrado?', users.has(ws));
      console.error('❌ Total de usuários:', users.size);
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
      
      // Verifica tamanho
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
    console.error('❌ Mensagem original:', msg.toString());
  }
});