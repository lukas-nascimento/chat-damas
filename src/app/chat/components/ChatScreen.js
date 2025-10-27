// ============================================
// ARQUIVO: ChatScreen.js (COM SEGURANÇA INTEGRADA)
// CAMINHO: src/app/chat/components/ChatScreen.js
// ============================================

import { useEffect, useRef, useState } from 'react';
import { Image, Video, Download, X } from 'lucide-react';
import ChatHeader from './ChatHeader';
import WhatsAppAudioRecorder from './WhatsAppAudioRecorder';
import { useChatSecurity } from '../hooks/useChatSecurity';
import './ChatScreen.css';

export default function ChatScreen({ 
  websocket, 
  messages, 
  messageInput, 
  setMessageInput, 
  onSendMessage, 
  onMessageReceived, 
  currentUserName,
  onLeaveRoom
}) {
  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [usersTyping, setUsersTyping] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(null);
  const typingTimeoutRef = useRef(null);

  // 🛡️ SISTEMA DE SEGURANÇA
  const { validateMessage, isBanned, banReason } = useChatSecurity(websocket);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => scrollToBottom(), [messages, usersTyping]);

  useEffect(() => {
    if (!websocket) return;

    const originalOnMessage = websocket.onmessage;

    websocket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        console.log('🔵 ChatScreen recebeu:', msg.type, msg);

        if (msg.type === 'online_count') {
          setOnlineCount(msg.data.count);
        }

        if (msg.type === 'user_typing') {
          if (msg.data.userName !== currentUserName) {
            setUsersTyping(prev => {
              if (msg.data.isTyping) {
                return prev.includes(msg.data.userName)
                  ? prev
                  : [...prev, msg.data.userName];
              } else {
                return prev.filter(n => n !== msg.data.userName);
              }
            });
          }
        }

        // 🆕 NOTIFICAÇÃO DE USUÁRIO BANIDO
        if (msg.type === 'user_banned_notification') {
          console.log('🚫 Usuário banido:', msg.data);
          // Adiciona mensagem do sistema
          if (onMessageReceived) {
            onMessageReceived({
              type: 'system_message',
              data: {
                content: `🚫 ${msg.data.userName} foi banido do chat. Motivo: ${msg.data.reason}`,
                timestamp: new Date().toISOString(),
                isSystem: true
              }
            });
          }
        }

        if (msg.type === 'message' && onMessageReceived) {
          console.log('🔵 Chamando onMessageReceived para message');
          onMessageReceived(msg);
        }

        if (msg.type === 'audio_message' && onMessageReceived) {
          console.log('🔵 Chamando onMessageReceived para audio_message');
          onMessageReceived(msg);
        }

        if (msg.type === 'image_message' && onMessageReceived) {
          console.log('🔵 Chamando onMessageReceived para image_message');
          onMessageReceived(msg);
        }

        if (msg.type === 'video_message') {
          console.log('🔵 VÍDEO RECEBIDO no ChatScreen!', msg);
          
          if (onMessageReceived) {
            console.log('🔵 Chamando onMessageReceived para video_message');
            onMessageReceived(msg);
          } else {
            console.error('❌ onMessageReceived não está definido!');
          }
          
          setUploadProgress(null);
        }

        if (msg.type === 'sticker_message' && onMessageReceived) {
          console.log('🔵 Chamando onMessageReceived para sticker_message');
          onMessageReceived(msg);
        }

        if (originalOnMessage && typeof originalOnMessage === 'function') {
          originalOnMessage(event);
        }
      } catch (err) {
        console.error('Erro ao processar:', err);
      }
    };

    return () => {
      if (originalOnMessage) {
        websocket.onmessage = originalOnMessage;
      }
    };
  }, [websocket, onMessageReceived, currentUserName]);

  const handleInputChange = (e) => {
    setMessageInput(e.target.value);

    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify({ type: 'typing_start' }));
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({ type: 'typing_stop' }));
      }
    }, 1000);
  };

  // 🛡️ VALIDAÇÃO NO ENVIO DE MENSAGEM
  const handleSendMessageWithValidation = (e) => {
    e.preventDefault();
    
    if (!messageInput.trim() || isBanned) return;

    // VALIDA A MENSAGEM
    const validation = validateMessage(messageInput);

    if (!validation.isValid) {
      // Simplesmente não envia, sem alerta
      setMessageInput(''); // Limpa o input
      return;
    }

    // Se passou na validação, envia normalmente
    onSendMessage(e);
  };

  const handleSendAudio = (audioBlob) => {
    console.log("📤 handleSendAudio chamado", audioBlob);
    
    if (isBanned) {
      alert('Você está banido e não pode enviar mensagens.');
      return;
    }
    
    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      alert('Conexão perdida. Não foi possível enviar o áudio.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = reader.result;
      console.log("📤 Enviando áudio via WebSocket, tamanho:", base64Audio.length);
      
      websocket.send(JSON.stringify({
        type: 'audio_message',
        data: {
          audio: base64Audio,
          userName: currentUserName
        }
      }));
      
      console.log("✅ Áudio enviado!");
    };
    reader.readAsDataURL(audioBlob);
  };

  const handleImageUpload = (e) => {
    if (isBanned) {
      alert('Você está banido e não pode enviar mensagens.');
      return;
    }

    const file = e.target.files[0];
    if (!file) return;

    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      alert('Formato de imagem não suportado. Use JPEG, PNG, GIF ou WebP.');
      return;
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Imagem muito grande! O tamanho máximo é 10MB.');
      return;
    }

    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      alert('Conexão perdida. Não foi possível enviar a imagem.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Image = event.target.result;
      console.log("📤 Enviando imagem via WebSocket");

      websocket.send(JSON.stringify({
        type: 'image_message',
        data: {
          image: base64Image,
          fileName: file.name,
          userName: currentUserName
        }
      }));

      console.log("✅ Imagem enviada!");
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = async (e) => {
    if (isBanned) {
      alert('Você está banido e não pode enviar mensagens.');
      return;
    }

    console.log('🎬 handleVideoUpload chamado');
    
    const file = e.target.files[0];
    
    if (!file) {
      console.log('❌ Nenhum arquivo selecionado');
      return;
    }

    console.log('✅ Arquivo selecionado:', file.name, file.type, file.size);

    const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!validVideoTypes.includes(file.type)) {
      alert('Formato de vídeo não suportado. Use MP4, WebM, OGG ou MOV.');
      e.target.value = '';
      return;
    }

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('Vídeo muito grande! O tamanho máximo é 500MB.');
      e.target.value = '';
      return;
    }

    if (!websocket || websocket.readyState !== WebSocket.OPEN) {
      alert('Conexão perdida. Não foi possível enviar o vídeo.');
      e.target.value = '';
      return;
    }

    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    console.log(`📤 Processando vídeo de ${sizeMB}MB...`);
    
    const videoUrl = URL.createObjectURL(file);
    
    setUploadProgress({ 
      fileName: file.name, 
      status: 'Preparando',
      progress: 0,
      preview: videoUrl,
      sizeMB: sizeMB
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    const reader = new FileReader();
    
    reader.onloadstart = () => {
      console.log('🔄 Iniciando leitura do arquivo...');
      setUploadProgress(prev => ({ 
        ...prev,
        status: 'Carregando',
        progress: 1
      }));
    };
    
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        console.log(`📊 Progresso: ${percentComplete}%`);
        setUploadProgress(prev => ({ 
          ...prev,
          status: 'Carregando',
          progress: percentComplete 
        }));
      }
    };

    reader.onload = (event) => {
      const base64Video = event.target.result;
      const base64SizeMB = (base64Video.length / 1024 / 1024).toFixed(2);
      console.log(`📤 Vídeo convertido para base64: ${base64SizeMB}MB`);

      setUploadProgress(prev => ({ 
        ...prev,
        status: 'Enviando',
        progress: 100 
      }));

      try {
        websocket.send(JSON.stringify({
          type: 'video_message',
          data: {
            video: base64Video,
            fileName: file.name,
            userName: currentUserName,
            fileSize: file.size
          }
        }));

        console.log("✅ Vídeo enviado com sucesso!");
      } catch (error) {
        console.error('❌ Erro ao enviar:', error);
        alert('Erro ao enviar o vídeo. Pode ser muito grande para o WebSocket.');
        setUploadProgress(null);
        URL.revokeObjectURL(videoUrl);
      }
      
      e.target.value = '';
      
      setTimeout(() => {
        URL.revokeObjectURL(videoUrl);
      }, 2000);
    };

    reader.onerror = (error) => {
      console.error('❌ Erro ao ler arquivo:', error);
      setUploadProgress(null);
      URL.revokeObjectURL(videoUrl);
      e.target.value = '';
      alert('Erro ao processar o vídeo. Tente novamente.');
    };

    reader.readAsDataURL(file);
  };

  const handleCancelUpload = () => {
    if (uploadProgress?.preview) {
      URL.revokeObjectURL(uploadProgress.preview);
    }
    setUploadProgress(null);
  };

  const handleDownloadMedia = (mediaUrl, fileName) => {
    const link = document.createElement('a');
    link.href = mediaUrl;
    link.download = fileName || 'arquivo';
    link.click();
  };

  // 🚫 TELA DE BANIMENTO
  if (isBanned) {
    return (
      <section className="chat" style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          background: 'white',
          padding: '50px',
          borderRadius: '20px',
          textAlign: 'center',
          maxWidth: '500px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
          animation: 'bounceIn 0.6s ease'
        }}>
          <div style={{ fontSize: '80px', marginBottom: '20px' }}>🚫</div>
          <h1 style={{ color: '#ff4757', marginBottom: '15px', fontSize: '32px' }}>
            Você foi banido do chat
          </h1>
          <p style={{
            background: '#fff3cd',
            borderLeft: '4px solid #ffc107',
            padding: '15px',
            borderRadius: '8px',
            margin: '20px 0',
            color: '#856404',
            fontWeight: '600',
            textAlign: 'left'
          }}>
            {banReason}
          </p>
          <p style={{ color: '#666', margin: '20px 0', lineHeight: '1.6' }}>
            Você violou as regras do chat e foi permanentemente banido.
          </p>
          <button 
            onClick={onLeaveRoom}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '15px 40px',
              borderRadius: '25px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '16px',
              marginTop: '20px'
            }}
          >
            Voltar ao Login
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="chat">
      <ChatHeader 
        onlineCount={onlineCount} 
        usersTyping={usersTyping}
        onLeaveRoom={onLeaveRoom}
      />
      
      <section className="chat__messages">
        {messages.map((msg, i) => {
          // 🆕 MENSAGEM DO SISTEMA
          if (msg.isSystem) {
            return (
              <div key={i} style={{
                textAlign: 'center',
                padding: '10px',
                margin: '10px 0'
              }}>
                <div style={{
                  display: 'inline-block',
                  background: '#ff4757',
                  color: 'white',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <div key={i} className={msg.isSelf ? 'message--self' : 'message--other'}>
              {!msg.isSelf && (
                <div className="message__wrapper">
                  <span className="message--sender" style={{ color: msg.userColor }}>
                    {msg.userName}
                  </span>
                  <div className="message__bubble">
                    {msg.isAudio && (
                      <audio src={msg.content} controls style={{ maxWidth: '250px' }} />
                    )}
                    
                    {msg.isImage && (
                      <div>
                        <img 
                          src={msg.content} 
                          alt="Imagem enviada" 
                          style={{ 
                            maxWidth: '250px', 
                            borderRadius: '8px',
                            display: 'block',
                            marginBottom: '5px'
                          }} 
                        />
                        <button
                          onClick={() => handleDownloadMedia(msg.content, msg.fileName)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            color: '#666',
                            fontSize: '12px'
                          }}
                        >
                          <Download size={14} />
                          Baixar
                        </button>
                      </div>
                    )}
                    
                    {msg.isVideo && (
                      <div>
                        <video 
                          src={msg.content} 
                          controls 
                          style={{ 
                            maxWidth: '250px', 
                            borderRadius: '8px',
                            display: 'block',
                            marginBottom: '5px',
                            background: '#000'
                          }}
                        />
                        <button
                          onClick={() => handleDownloadMedia(msg.content, msg.fileName)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            color: '#666',
                            fontSize: '12px'
                          }}
                        >
                          <Download size={14} />
                          Baixar
                        </button>
                      </div>
                    )}
                    
                    {msg.isSticker && (
                      <div style={{ fontSize: '60px', lineHeight: '1' }}>
                        {msg.content}
                      </div>
                    )}
                    
                    {!msg.isAudio && !msg.isImage && !msg.isVideo && !msg.isSticker && msg.content}
                  </div>
                </div>
              )}
              
              {msg.isSelf && (
                <div className="message__bubble message__bubble--self">
                  {msg.isAudio && (
                    <audio src={msg.content} controls style={{ maxWidth: '250px' }} />
                  )}
                  
                  {msg.isImage && (
                    <div>
                      <img 
                        src={msg.content} 
                        alt="Imagem enviada" 
                        style={{ 
                          maxWidth: '250px', 
                          borderRadius: '8px',
                          display: 'block',
                          marginBottom: '5px'
                        }} 
                      />
                      <button
                        onClick={() => handleDownloadMedia(msg.content, msg.fileName)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                      >
                        <Download size={14} />
                        Baixar
                      </button>
                    </div>
                  )}
                  
                  {msg.isVideo && (
                    <div>
                      <video 
                        src={msg.content} 
                        controls 
                        style={{ 
                          maxWidth: '250px', 
                          borderRadius: '8px',
                          display: 'block',
                          marginBottom: '5px',
                          background: '#000'
                        }}
                      />
                      <button
                        onClick={() => handleDownloadMedia(msg.content, msg.fileName)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          color: '#fff',
                          fontSize: '12px'
                        }}
                      >
                        <Download size={14} />
                        Baixar
                      </button>
                    </div>
                  )}
                  
                  {msg.isSticker && (
                    <div style={{ fontSize: '60px', lineHeight: '1' }}>
                      {msg.content}
                    </div>
                  )}
                  
                  {!msg.isAudio && !msg.isImage && !msg.isVideo && !msg.isSticker && msg.content}
                </div>
              )}
            </div>
          );
        })}

        {uploadProgress && (
          <div style={{
            position: 'fixed',
            bottom: '80px',
            right: '20px',
            background: '#fff',
            borderRadius: '12px',
            padding: '12px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '300px',
            zIndex: 1000
          }}>
            <div style={{ position: 'relative' }}>
              <svg width="60" height="60" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="30"
                  cy="30"
                  r="26"
                  fill="none"
                  stroke="#e0e0e0"
                  strokeWidth="4"
                />
                <circle
                  cx="30"
                  cy="30"
                  r="26"
                  fill="none"
                  stroke="#25D366"
                  strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 26}`}
                  strokeDashoffset={`${2 * Math.PI * 26 * (1 - uploadProgress.progress / 100)}`}
                  style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                />
              </svg>
              
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#000'
              }}>
                {uploadProgress.preview ? (
                  <video 
                    src={uploadProgress.preview} 
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      objectFit: 'cover' 
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#128C7E'
                  }}>
                    <Video size={20} color="#fff" />
                  </div>
                )}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '500',
                color: '#000',
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {uploadProgress.fileName}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: '#667781'
              }}>
                {uploadProgress.status === 'Processando' && 'Processando vídeo...'}
                {uploadProgress.status === 'Carregando' && `Carregando ${uploadProgress.progress}%`}
                {uploadProgress.status === 'Enviando' && 'Enviando...'}
                {uploadProgress.sizeMB && ` • ${uploadProgress.sizeMB}MB`}
              </div>
            </div>

            <button
              onClick={handleCancelUpload}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#667781'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f0f2f5'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </section>

      <form className="chat__form" onSubmit={handleSendMessageWithValidation}>
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="chat__media-button"
          title="Enviar imagem"
          disabled={isBanned}
          style={{
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0'
          }}
        >
          <Image size={24} />
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />

        <button
          type="button"
          onClick={() => videoInputRef.current?.click()}
          className="chat__media-button"
          title="Enviar vídeo (até 500MB)"
          disabled={isBanned}
          style={{
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0'
          }}
        >
          <Video size={24} />
        </button>
        <input
          ref={videoInputRef}
          type="file"
          accept="video/mp4,video/webm,video/ogg,video/quicktime"
          onChange={handleVideoUpload}
          style={{ display: 'none' }}
        />

        <input
          type="text"
          className="chat__input"
          placeholder="Digite uma mensagem"
          value={messageInput}
          onChange={handleInputChange}
          disabled={isBanned}
          required
        />

        <button 
          type="submit" 
          className="chat__button"
          disabled={isBanned}
        >
          <span className="material-symbols-outlined">send</span>
        </button>
        
        <WhatsAppAudioRecorder 
          onSendAudio={handleSendAudio}
          disabled={isBanned}
        />
      </form>
    </section>
  );
}