import React from 'react';
import MaterialIcon from './MaterialIcon';

export default function DisclaimerNotice({ compact = false }) {
  return (
    <div className={`bg-caution-container/40 border border-caution/15 rounded-2xl flex items-start gap-3 text-on-caution-container ${compact ? 'p-3' : 'p-4'}`}>
      <MaterialIcon name="info" className={`text-caution mt-0.5 ${compact ? 'text-lg' : 'text-xl'}`} />
      <p className={compact ? 'text-xs font-medium' : 'text-sm'}>
        {compact ? (
          "ⓘ For guidance only. Not financial or fatwa advice."
        ) : (
          "This tool provides general Shariah compliance guidance based on publicly available financial data. It does not constitute a fatwa, financial advice, or an endorsement of any investment. Rulings may differ between scholars and standards. Please consult a qualified Islamic finance scholar for personal guidance."
        )}
      </p>
    </div>
  );
}
