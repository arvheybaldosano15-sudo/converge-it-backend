import React from 'react';

const Skeleton = ({ className = '', count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`bg-slate-800/60 animate-pulse rounded-xl ${className}`}
        />
      ))}
    </>
  );
};

export default Skeleton;
