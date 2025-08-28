import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Chat from '../components/Chat';
import { getHumeAccessToken } from '../Utils/getHumeAccessToken';

export default function CallPage() {
  const [accessToken, setAccessToken] = useState<string>('');
  const navigate = useNavigate();

  // Styles
  const styles = {
    page: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      flexDirection: 'column' as const,
      zIndex: 1000,
    },
    header: {
      padding: '1rem',
      background: '#181818',
      color: 'white',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    backButton: {
      background: 'rgba(255, 255, 255, 0.2)',
      border: 'none',
      color: 'white',
      borderRadius: '6px',
      padding: '6px 12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      fontSize: '0.9rem',
      transition: 'background-color 0.2s ease',
      zIndex: 1001,
    },
    title: {
      margin: 0,
      fontSize: '1.1rem',
      fontWeight: 600 as const,
    },
    spacer: {
      width: '80px',
    },
    content: {
      flex: 1,
      overflow: 'hidden' as const,
    },
  };

  useEffect(() => {
    const fetchAccessToken = async () => {
      const token = await getHumeAccessToken();
      setAccessToken(token);
    };
    
    fetchAccessToken();
  }, []);


  const handleBack = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('Back button clicked - navigating to /');
    navigate('/', { replace: true });
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <button
          onClick={handleBack}
          style={styles.backButton}
        >
          ← Back
        </button>
        <h2 style={styles.title}>Call Interface</h2>
        <div style={styles.spacer}></div>
      </div>
      
      <div style={styles.content}>
        {accessToken && <Chat accessToken={accessToken} />}
      </div>
    </div>
  );
}
