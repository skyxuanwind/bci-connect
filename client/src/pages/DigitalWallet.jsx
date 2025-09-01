import React from 'react';
import DigitalCardWallet from '../components/NFCCard/DigitalCardWallet';
import './DigitalWallet.css';

const DigitalWallet = () => {
  return (
    <div className="digital-wallet-page">
      <DigitalCardWallet />
    </div>
  );
};

export default DigitalWallet;