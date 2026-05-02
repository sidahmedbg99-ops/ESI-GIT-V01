import { useState, useEffect } from 'react';
import Navbar from '../components/layout/Navbar';

export default function DashboardLayout({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.3s ease' }}>
      <Navbar />
      <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        paddingTop: '100px'
      }} id="main-content">
        <main 
          className="animate-fade"
          style={{ 
            flex: 1, 
            padding: '28px', 
            maxWidth: '1440px', 
            width: '100%', 
            margin: '0 auto',
          }}
        >
          {children}
        </main>
      </div>
      <style>{`
        @media (max-width: 768px) {
          main { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}
