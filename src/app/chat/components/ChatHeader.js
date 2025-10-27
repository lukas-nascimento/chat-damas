import { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function ChatHeader({ 
  onlineCount = 0, 
  usersTyping = [], 
  currentUser = '👏🍻 DﾑMﾑS 💃🔥 Dﾑ NIGӇԵ 💃🎶🍾🍸',
  onBack = () => {},
  onLeaveRoom = () => {} // Nova prop para sair da sala
}) {
  const [isTypingVisible, setIsTypingVisible] = useState(true);
  const titleRef = useRef(null);
  const headerRef = useRef(null);
  const exitButtonRef = useRef(null);

  useEffect(() => {
    if (usersTyping.length === 0) return;
    
    setIsTypingVisible(true);
    const timer = setTimeout(() => {
      setIsTypingVisible(false);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [usersTyping]);

  useEffect(() => {
    // Animação do header com glow neon
    if (headerRef.current) {
      gsap.to(headerRef.current, {
        boxShadow: '0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.3), 0 4px 20px rgba(0, 0, 0, 0.3)',
        duration: 1.5,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
      });
    }

    if (!titleRef.current) return;

    // Animação de néon pulsante no título
    gsap.to(titleRef.current, {
      textShadow: '0 0 10px #fff, 0 0 20px #fff, 0 0 30px #a855f7, 0 0 40px #a855f7, 0 0 50px #a855f7, 0 0 60px #a855f7, 0 0 70px #a855f7',
      duration: 0.5,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut'
    });

    // Animação de néon pulsante no botão de sair
    if (exitButtonRef.current) {
      gsap.to(exitButtonRef.current, {
        textShadow: '0 0 15px #ef4444, 0 0 30px #ef4444, 0 0 45px #ef4444',
        duration: 0.8,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
      });
    }

    // Animar emojis de fogo
    const fires = titleRef.current.querySelectorAll('.fire');
    fires.forEach((fire, i) => {
      gsap.to(fire, {
        y: -5,
        duration: 0.3,
        repeat: -1,
        yoyo: true,
        delay: i * 0.15,
        ease: 'power1.inOut'
      });
      
      gsap.to(fire, {
        scale: 1.2,
        duration: 0.4,
        repeat: -1,
        yoyo: true,
        delay: i * 0.1,
        ease: 'power2.inOut'
      });
    });

    // Animar mulheres dançando
    const dancers = titleRef.current.querySelectorAll('.dancer');
    dancers.forEach((dancer, i) => {
      gsap.to(dancer, {
        rotation: 15,
        duration: 0.4,
        repeat: -1,
        yoyo: true,
        delay: i * 0.2,
        ease: 'power1.inOut'
      });
      
      gsap.to(dancer, {
        x: 3,
        duration: 0.3,
        repeat: -1,
        yoyo: true,
        delay: i * 0.15,
        ease: 'sine.inOut'
      });
    });
  }, []);

  const getTypingText = () => {
    if (usersTyping.length === 0) return null;
    
    if (usersTyping.length === 1) {
      return `${usersTyping[0]} está escrevendo...`;
    } else if (usersTyping.length === 2) {
      return `${usersTyping[0]} e ${usersTyping[1]} estão escrevendo...`;
    } else {
      return `${usersTyping.length} pessoas estão escrevendo...`;
    }
  };

  const typingText = getTypingText();

  const headerStyle = {
    background: 'linear-gradient(135deg, rgba(126, 34, 206, 0.85) 0%, rgba(88, 28, 135, 0.9) 50%, rgba(59, 7, 100, 0.85) 100%)',
    backdropFilter: 'blur(10px)',
    color: 'white',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: '0 0 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.3), 0 4px 20px rgba(0, 0, 0, 0.3)',
    borderBottom: '2px solid rgba(168, 85, 247, 0.5)'
  };

  const titleStyle = {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    display: 'inline-block',
    color: '#fff',
    textShadow: '0 0 10px #fff, 0 0 20px #a855f7'
  };

  const subtitleStyle = {
    margin: '4px 0 0 0',
    fontSize: '12px',
    color: '#e9d5ff',
    textShadow: '0 0 5px rgba(168, 85, 247, 0.5)'
  };

  const buttonStyle = {
    background: 'transparent',
    color: '#ef4444',
    border: 'none',
    padding: '0',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    textShadow: '0 0 10px #ef4444, 0 0 20px #ef4444'
  };

  return (
    <div ref={headerRef} style={headerStyle}>
      <div>
        <h1 ref={titleRef} style={titleStyle}>
          <span className="emoji">👏</span>
          <span className="emoji">🍻</span>
          {' DﾑMﾑS '}
          <span className="dancer">💃</span>
          <span className="fire">🔥</span>
          {' Dﾑ NIGӇԵ '}
          <span className="dancer">💃</span>
          <span className="emoji">🎶</span>
          <span className="emoji">🍾</span>
          <span className="emoji">🍸</span>
        </h1>
        <p style={subtitleStyle}>
          {typingText ? (
            <span style={{ animation: 'pulse 1s infinite' }}>{typingText}</span>
          ) : (
            <>
              {onlineCount} 
              <span style={{ marginLeft: '4px' }}>
                {onlineCount === 1 ? 'pessoa online' : 'pessoas online'}
              </span>
            </>
          )}
        </p>
      </div>

      <button 
        ref={exitButtonRef}
        onClick={onLeaveRoom}
        style={buttonStyle}
        className="leave-button"
        title="Sair"
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <span style={{ display: 'inline-block', transform: 'scaleX(-1)' }}>🏃</span>
          <span style={{ fontSize: '10px', fontWeight: '500', color: '#3b82f6', textShadow: '0 0 10px #3b82f6, 0 0 20px #3b82f6' }}>Sair</span>
        </div>
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .emoji, .fire, .dancer {
          display: inline-block;
        }

        .leave-button:hover {
          color: #fca5a5;
          text-shadow: 0 0 20px #ef4444, 0 0 40px #ef4444, 0 0 60px #ef4444;
          transform: translateX(3px);
        }

        .leave-button:active {
          transform: scale(0.9);
        }
      `}</style>
    </div>
  );
}