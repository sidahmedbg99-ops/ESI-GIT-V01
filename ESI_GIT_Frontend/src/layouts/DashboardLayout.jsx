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
        paddingTop: 'var(--nav-height, 90px)'
      }} id="main-content">
        <main 
          className="animate-fade"
          style={{ 
            flex: 1, 
            padding: '24px', 
            maxWidth: '1400px', 
            width: '100%', 
            margin: '0 auto',
            boxSizing: 'border-box'
          }}
        >
          {children}
        </main>
      </div>
      <style>{`
        :root { --nav-height: 100px; }
        @media (max-width: 768px) {
          :root { --nav-height: 80px; }
          main { padding: 16px !important; }
        }
        @media (max-width: 480px) {
          :root { --nav-height: 70px; }
          main { padding: 12px !important; }
        }
      `}</style>
    </div>
  );
}
