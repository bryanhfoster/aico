import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Chat from '../components/Chat';
import { getHumeAccessToken } from '../Utils/getHumeAccessToken';

export default function ChatPage() {
  const [accessToken, setAccessToken] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAccessToken = async () => {
      const token = await getHumeAccessToken();
      setAccessToken(token);
    };
    
    fetchAccessToken();
  }, []);

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column',
    //   backgroundColor: '#f8f9fa',
      zIndex: 1000,
    }}>
      <div style={{
        padding: '16px',
        background: 'linear-gradient(135deg, #1971c2, #1864ab)',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <button
          onClick={handleBack}
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: 'none',
            color: 'white',
            borderRadius: '6px',
            padding: '6px 12px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          ← Back
        </button>
        <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Call Interface</h2>
        <div style={{ width: '80px' }}></div> {/* Spacer for alignment */}
      </div>
      
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {accessToken && <Chat accessToken={accessToken} />}
      </div>
    </div>
  );
}
