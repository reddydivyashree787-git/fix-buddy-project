import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth >= 1024) {
        setIsSidebarOpen(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="min-h-screen bg-slate-50 flex relative overflow-hidden">
      {/* Dynamic Animated Background Mesh */}
      <div className="absolute top-0 left-0 w-[40rem] h-[40rem] bg-indigo-400/40 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse pointer-events-none"></div>
      <div className="absolute top-[20%] right-0 w-[35rem] h-[35rem] bg-purple-400/40 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-0 left-[20%] w-[45rem] h-[45rem] bg-pink-400/40 rounded-full mix-blend-multiply filter blur-[100px] animate-pulse pointer-events-none" style={{ animationDelay: '4s' }}></div>
      
      {/* Textured dot pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none"></div>
      
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <TopNavbar />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
