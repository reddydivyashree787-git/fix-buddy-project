import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();

  React.useEffect(() => {
    navigate('/admin/dashboard', { replace: true });
  }, [navigate]);

  return null;
}
