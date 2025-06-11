
import React from 'react';

const Footer = () => {
  return (
    <footer className="mt-16 py-8 border-t border-white/20">
      <div className="container mx-auto px-4 text-center">
        <p className="text-white/70">
           by{' '}
          <a
            href="https://raufjatoi.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-yellow-200 transition-colors font-medium"
          >
            Abdul Rauf Jatoi
          </a>
          {' '}|{' '}
          <span className="text-white/60">iCreativez</span>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
