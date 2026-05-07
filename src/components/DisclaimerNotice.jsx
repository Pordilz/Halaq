import React from 'react';
import MaterialIcon from './MaterialIcon';
import './DisclaimerNotice.css';

export default function DisclaimerNotice({ compact = false }) {
  return (
    <div className={`disclaimer-notice ${compact ? 'disclaimer-notice--compact' : ''}`}>
      <MaterialIcon
        name="info"
        size={compact ? 18 : 22}
        className="disclaimer-notice__icon"
      />
      <p className="disclaimer-notice__text">
        {compact
          ? 'For guidance only. Not financial or fatwa advice.'
          : 'This tool provides general Shariah compliance guidance based on publicly available financial data. It does not constitute a fatwa, financial advice, or an endorsement of any investment. Rulings may differ between scholars and standards. Please consult a qualified Islamic finance scholar for personal guidance.'}
      </p>
    </div>
  );
}
