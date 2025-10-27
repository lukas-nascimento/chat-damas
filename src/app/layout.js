import "./globals.css";

export const metadata = {
  title: "Chat | Damas da Night",
  description: "Aplicação de chat",
  
  // 🚀 PREVINE PULL-TO-REFRESH E ZOOM NO MOBILE
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  
  // 🍎 Configurações para iOS/Safari
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Damas da Night',
  },
  
  // 📱 PWA e Mobile otimizado
  themeColor: '#667eea',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <head>
        {/* Google Material Icons */}
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0" 
        />
        
        {/* 🚀 META TAGS ADICIONAIS PARA MOBILE */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
      </head>
      <body>{children}</body>
    </html>
  );
}