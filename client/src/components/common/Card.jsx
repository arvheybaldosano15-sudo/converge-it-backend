import React from 'react';

const Card = ({ children, className = '', hover = true, glow = false, ...props }) => {
  return (
    <div
      className={`glass-panel rounded-2xl p-5 relative overflow-hidden ${
        hover ? 'glass-panel-hover' : ''
      } ${glow ? 'shadow-glass-glow border-cyan-500/30' : ''} ${className}`}
      {...props}
    >
      {glow && (
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
      )}
      {children}
    </div>
  );
};

export default Card;
