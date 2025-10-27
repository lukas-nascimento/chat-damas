// src/app/chat/components/LoginScreen.js

import './LoginScreen.css';
import { useEffect, useRef } from 'react';

export default function LoginScreen({ username, setUsername, onLogin }) {
  const logoRef = useRef(null);

  useEffect(() => {
    const logo = logoRef.current;
    if (!logo) return;

    // Animação de pulso no brilho (CIANO E ROSA, SEM VERDE!)
    const pulseGlow = () => {
      logo.style.boxShadow = '0 0 50px rgba(0, 217, 255, 0.8), 0 0 90px rgba(255, 0, 153, 0.6)';
      
      setTimeout(() => {
        logo.style.boxShadow = '0 0 30px rgba(0, 217, 255, 0.5), 0 0 60px rgba(255, 0, 153, 0.3)';
      }, 1000);
    };

    const glowInterval = setInterval(pulseGlow, 2000);

    return () => {
      clearInterval(glowInterval);
    };
  }, []);

  return (
    <section className="login">
      <div className="login__card">
        {/* Logo do Grupo - Substitua a URL pela imagem do seu grupo */}
        <div className="login__group-image" ref={logoRef}>
          <img 
            src="https://i.ibb.co/Mk8fsjSD/Whats-App-Image-2025-10-19-at-13-09-39.jpg" 
            alt="Damas da Night Group"
            onError={(e) => {
              // Fallback caso a imagem não carregue
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
              `;
            }}
          />
        </div>

        {/* Título estiloso com efeito neon e rabisco */}
        <div className="login__title-wrapper">
          <h1 className="login__title login__title--stylish">
            <span className="login__title-word">Damas</span>
            <span className="login__title-word login__title-word--glow">da</span>
            <span className="login__title-word login__title-word--neon">Night</span>
          </h1>
        </div>

        <p className="login__subtitle login__subtitle--accent">
          Descubra o poder do anonimato... Envie mensagens secretas, confesse seus sentimentos ocultos e revele aquilo que só as sombras da noite conhecem 🎭✨
        </p>

        {/* Formulário */}
        <form className="login__form" onSubmit={onLogin}>
          <div className="login__input-group">
            <label htmlFor="username" className="login__label">
              Seu nome
            </label>
            <input
              id="username"
              type="text"
              className="login__input"
              placeholder="Digite seu nome..."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <button type="submit" className="login__button">
            <span>Entrar no Chat</span>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/>
            </svg>
          </button>
        </form>

        {/* Footer */}
        <div className="login__footer">
          <p>Pronto para começar a conversar?</p>
        </div>
      </div>
    </section>
  );
}