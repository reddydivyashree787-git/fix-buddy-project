import React from 'react';

export default function StarRating({ rating = 0, max = 5, size = 16, interactive = false, onChange }) {
  return (
    <span style={{ display:'inline-flex', gap:2 }}>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          style={{
            fontSize: size,
            color: i < Math.round(rating) ? '#f59e0b' : '#d1d5db',
            cursor: interactive ? 'pointer' : 'default',
            transition: 'color .1s'
          }}
          onClick={() => interactive && onChange && onChange(i + 1)}
        >★</span>
      ))}
    </span>
  );
}
