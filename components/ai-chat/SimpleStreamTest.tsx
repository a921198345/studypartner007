import React, { useEffect, useState } from 'react';

interface SimpleStreamTestProps {
  streamText: string;
  isStreaming: boolean;
}

export const SimpleStreamTest: React.FC<SimpleStreamTestProps> = ({ streamText, isStreaming }) => {
  const [displayText, setDisplayText] = useState('');
  
  useEffect(() => {
    setDisplayText(streamText);
  }, [streamText]);
  
  return (
    <div style={{ 
      padding: '20px', 
      background: '#f0f0f0', 
      borderRadius: '8px',
      minHeight: '100px'
    }}>
      <div style={{ whiteSpace: 'pre-wrap' }}>
        {displayText}
        {isStreaming && <span style={{
          display: 'inline-block',
          width: '2px',
          height: '16px',
          background: '#007bff',
          animation: 'blink 1s infinite',
          marginLeft: '2px'
        }} />}
      </div>
    </div>
  );
};