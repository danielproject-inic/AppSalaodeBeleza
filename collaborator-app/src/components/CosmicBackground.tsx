import React from 'react';

export const CosmicBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#050814]">
      {/* Deep Space Radial Nebula Blobs */}
      <div 
        className="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-[120px] opacity-35 animate-pulse"
        style={{ background: 'radial-gradient(circle, #00f0ff 0%, #050814 70%)' }}
      />
      <div 
        className="absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full blur-[140px] opacity-30 animate-pulse"
        style={{ background: 'radial-gradient(circle, #b000ff 0%, #050814 70%)', animationDuration: '7s' }}
      />
      <div 
        className="absolute -bottom-32 left-1/4 w-96 h-96 rounded-full blur-[130px] opacity-25 animate-pulse"
        style={{ background: 'radial-gradient(circle, #ffd700 0%, #050814 70%)', animationDuration: '9s' }}
      />

      {/* Cyber Grid Subtlety */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{
          backgroundImage: `linear-gradient(#00f0ff 1px, transparent 1px), linear-gradient(90deg, #00f0ff 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
    </div>
  );
};
