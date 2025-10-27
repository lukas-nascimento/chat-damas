"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic } from "lucide-react";

const WhatsAppAudioRecorder = ({ onSendAudio }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Função para iniciar gravação
  const startRecording = async (e) => {
    e.preventDefault();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      alert("Não foi possível acessar o microfone.");
    }
  };

  // Função para parar gravação e ENVIAR AUTOMATICAMENTE
  const stopRecording = () => {
    console.log("🛑 stopRecording chamado");
    if (!mediaRecorderRef.current) {
      console.log("❌ mediaRecorderRef é null!");
      return;
    }

    mediaRecorderRef.current.onstop = () => {
      console.log("🎬 mediaRecorder.onstop disparado");
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      console.log("📦 Blob criado:", blob.size, "bytes");
      
      // ENVIA AUTOMATICAMENTE quando solta
      if (onSendAudio) {
        console.log("📤 Chamando onSendAudio...");
        onSendAudio(blob);
        console.log("✅ onSendAudio chamado com sucesso!");
      } else {
        console.log("❌ onSendAudio não está definido!");
      }

      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    };

    console.log("⏹️ Parando mediaRecorder...");
    mediaRecorderRef.current.stop();
    clearInterval(timerRef.current);
    setIsRecording(false);
    setRecordingTime(0);
  };

  // Adicionar listeners globais para capturar quando soltar o botão
  useEffect(() => {
    if (!isRecording) return;

    const handleMouseUp = () => {
      console.log("🖱️ Mouse solto - chamando stopRecording");
      stopRecording();
    };
    const handleTouchEnd = () => {
      console.log("👆 Touch solto - chamando stopRecording");
      stopRecording();
    };

    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isRecording]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <div style={styles.container}>
        {!isRecording && (
          <button
            type="button"
            style={styles.recordButton}
            onMouseDown={startRecording}
            onTouchStart={startRecording}
            className="audio-record-btn"
          >
            <Mic size={22} strokeWidth={2.5} />
          </button>
        )}

        {isRecording && (
          <div style={styles.recordingContainer}>
            <span style={styles.recordingDot}>●</span>
            <span style={styles.recordingText}>{formatTime(recordingTime)}</span>
          </div>
        )}
      </div>

      {/* CSS para animações */}
      <style jsx>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        
        @keyframes ripple {
          0% {
            box-shadow: 0 0 0 0 rgba(102, 126, 234, 0.4);
          }
          100% {
            box-shadow: 0 0 0 15px rgba(102, 126, 234, 0);
          }
        }
        
        .audio-record-btn {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .audio-record-btn:hover {
          transform: scale(1.08);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;
        }
        
        .audio-record-btn:active {
          transform: scale(0.95);
          animation: ripple 0.6s ease-out;
        }
      `}</style>
    </>
  );
};

// Estilos Modernos
const styles = {
  container: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  recordButton: {
    width: 46,
    height: 46,
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
    padding: 0,
    userSelect: "none",
  },
  recordingContainer: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 20px",
    borderRadius: 30,
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
    fontWeight: 600,
    userSelect: "none",
    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
  },
  recordingDot: {
    fontSize: 20,
    color: "#ff3b30",
    animation: "blink 1s infinite",
  },
  recordingText: {
    fontSize: 15,
    fontFamily: "'Roboto Mono', 'Courier New', monospace",
    letterSpacing: "0.5px",
  },
};

export default WhatsAppAudioRecorder;