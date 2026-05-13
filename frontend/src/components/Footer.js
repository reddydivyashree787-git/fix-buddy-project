import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebookF, FaInstagram, FaLinkedin } from 'react-icons/fa';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerStyle = {
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    marginTop: 'auto',
    position: 'relative',
    zIndex: 10,
  };

  const containerStyle = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem 1rem 1rem',
  };

  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '2rem',
    marginBottom: '1.5rem',
  };

  const sectionStyle = {
    display: 'flex',
    flexDirection: 'column',
  };

  const h3Style = {
    fontSize: '1.1rem',
    fontWeight: '600',
    marginBottom: '1rem',
    color: '#e2e8f0',
  };

  const linkStyleBase = {
    color: '#cbd5e1',
    textDecoration: 'none',
    marginBottom: '0.5rem',
    fontSize: '0.95rem',
    transition: 'color 0.2s ease',
  };

  const hoverStyle = {
    color: '#60a5fa',
  };

  const socialStyle = {
    display: 'flex',
    gap: '1rem',
    marginTop: '0.5rem',
  };

  const iconStyleBase = {
    width: '28px',
    height: '28px',
    color: '#cbd5e1',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const bottomStyle = {
    borderTop: '1px solid #334155',
    paddingTop: '1.5rem',
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '0.875rem',
  };

  const handleLinkHover = (e, color) => {
    e.target.style.color = color;
  };

  const handleLinkLeave = (e) => {
    e.target.style.color = '#cbd5e1';
  };

  const handleIconHover = (e, color, scale = 'scale(1.1)') => {
    e.target.style.color = color;
    e.target.style.transform = scale;
  };

  const handleIconLeave = (e) => {
    e.target.style.color = '#cbd5e1';
    e.target.style.transform = 'scale(1)';
  };

  return (
    <footer style={footerStyle}>
      <div style={containerStyle}>
        <div style={gridStyle}>
          {/* Project Info */}
          <div style={sectionStyle}>
            <h3 style={h3Style}>Fix buddy</h3>
            <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '0.95rem' }}>
              AI Based Home Services Booking System
            </p>
          </div>

          {/* Quick Links */}
          <div style={sectionStyle}>
            <h3 style={h3Style}>Quick Links</h3>
            <Link 
              to="/" 
              style={linkStyleBase}
              onMouseEnter={(e) => handleLinkHover(e, '#60a5fa')}
              onMouseLeave={handleLinkLeave}
            >
              Home
            </Link>
            <Link 
              to="/categories" 
              style={linkStyleBase}
              onMouseEnter={(e) => handleLinkHover(e, '#60a5fa')}
              onMouseLeave={handleLinkLeave}
            >
              Services
            </Link>
            <Link 
              to="/dashboard" 
              style={linkStyleBase}
              onMouseEnter={(e) => handleLinkHover(e, '#60a5fa')}
              onMouseLeave={handleLinkLeave}
            >
              Bookings
            </Link>
            <Link 
              to="/about" 
              style={linkStyleBase}
              onMouseEnter={(e) => handleLinkHover(e, '#60a5fa')}
              onMouseLeave={handleLinkLeave}
            >
              About
            </Link>
            <Link 
              to="/contact" 
              style={linkStyleBase}
              onMouseEnter={(e) => handleLinkHover(e, '#60a5fa')}
              onMouseLeave={handleLinkLeave}
            >
              Contact
            </Link>
          </div>

          {/* Contact Info */}
          <div style={sectionStyle}>
            <h3 style={h3Style}>Contact Info</h3>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ ...linkStyleBase, fontWeight: '500', cursor: 'default' }}>Email</div>
              <a 
                href="mailto:reddydivyashree787@gmail.com" 
                style={linkStyleBase}
                onMouseEnter={(e) => handleLinkHover(e, '#60a5fa')}
                onMouseLeave={handleLinkLeave}
              >
                reddydivyashree787@gmail.com
              </a>
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ ...linkStyleBase, fontWeight: '500', cursor: 'default' }}>Phone</div>
              <a 
                href="tel:+916382402422" 
                style={linkStyleBase}
                onMouseEnter={(e) => handleLinkHover(e, '#60a5fa')}
                onMouseLeave={handleLinkLeave}
              >
                +91 6382402422
              </a>
            </div>
            <div>
              <div style={{ ...linkStyleBase, fontWeight: '500', cursor: 'default' }}>Location</div>
              <span style={linkStyleBase}>Hosur, Tamil Nadu, India</span>
            </div>
          </div>

          {/* Social Media */}
          <div style={sectionStyle}>
            <h3 style={h3Style}>Follow Us</h3>
            <div style={socialStyle}>
              <a 
                href="https://www.facebook.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={iconStyleBase}
                title="Facebook"
                onMouseEnter={(e) => handleIconHover(e, '#3b82f6')}
                onMouseLeave={handleIconLeave}
              >
                <FaFacebookF />
              </a>
              <a 
                href="https://www.instagram.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={iconStyleBase}
                title="Instagram"
                onMouseEnter={(e) => handleIconHover(e, '#ec4899')}
                onMouseLeave={handleIconLeave}
              >
                <FaInstagram />
              </a>
              <a 
                href="https://www.linkedin.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                style={iconStyleBase}
                title="LinkedIn"
                onMouseEnter={(e) => handleIconHover(e, '#0ea5e9')}
                onMouseLeave={handleIconLeave}
              >
                <FaLinkedin />
              </a>
            </div>
          </div>
        </div>
        <div style={bottomStyle}>
          © {currentYear} FixBuddy. All Rights Reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;

