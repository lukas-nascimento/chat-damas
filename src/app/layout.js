import "./globals.css";

export const metadata = {
  title: "Chat | Damas da Night",
  description: "Aplicação de chat",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <head>
        <link 
          rel="stylesheet" 
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0" 
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
