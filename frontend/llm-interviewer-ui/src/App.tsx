import React from 'react';
import AppRouter from './router/Router';
import './App.css'; // Default Vite CSS, can be modified/removed later

const App: React.FC = () => {
  return (
    <>
      {/* Global components like Header, Footer, or Layout wrappers can go here if needed outside the router */}
      <AppRouter />
    </>
  );
};

export default App;
