import React from 'react';
import './App.css';
import TaxCalculator from './components/TaxCalculator';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Home Affordability Calculator</h1>
      </header>
      <main>
        <TaxCalculator />
      </main>
    </div>
  );
}

export default App; 