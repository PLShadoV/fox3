import './globals.css';
import React from 'react';

export default function RootLayout({ children }:{ children: React.ReactNode }){
  return (
    <html lang="pl" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
