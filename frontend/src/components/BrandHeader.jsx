import React from 'react';
import { Link } from 'react-router-dom';

export default function BrandHeader({ to = '/' }) {
  return (
    <Link to={to} className="inline-flex items-center gap-3 text-blue-600 font-black text-lg hover:text-blue-700 transition">
      <span className="inline-flex items-center justify-center rounded-2xl bg-blue-100 text-blue-600 w-10 h-10">
        🏠
      </span>
      <span>Fix Buddy</span>
    </Link>
  );
}

