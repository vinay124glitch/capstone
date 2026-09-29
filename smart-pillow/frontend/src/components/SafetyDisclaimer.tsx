import React from 'react';
import { ShieldAlert, AlertTriangle, Info, HeartHandshake } from 'lucide-react';

export const SafetyDisclaimer: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3 border-b border-amber-200/80 pb-4">
          <div className="p-3 bg-amber-100 border border-amber-300 rounded-2xl text-amber-800">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-amber-900">
              Academic & Proof-of-Concept Safety Warning
            </h2>
            <p className="text-xs text-amber-700 font-medium">
              Important regulatory and safety disclosures for SmartPillow System
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-amber-900/90 leading-relaxed">
          <div className="p-3.5 bg-white rounded-xl border border-amber-200 flex items-start space-x-2.5 shadow-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-900 font-bold block mb-1">Non-Medical Device Statement</strong>
              <span>
                The SmartPillow platform, including its EEG signal processing, head-neck ergonomic scoring, pressure matrix heatmaps, and sleep stage classification algorithms, is designed solely for <strong>academic research, biomedical engineering demonstrations, and non-clinical proof-of-concept testing</strong>.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2 shadow-xs">
              <h4 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                Experimental Single-Channel EEG
              </h4>
              <p className="text-gray-600 text-[11px]">
                Frontal EEG derivation (Fp1-Fp2) is sensitive to ocular EOG artifacts and movement noise. It cannot replace a clinical 32-channel polysomnography (PSG) diagnostic system.
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2 shadow-xs">
              <h4 className="font-bold text-gray-900 flex items-center gap-1.5 text-xs">
                <HeartHandshake className="w-3.5 h-3.5 text-emerald-600" />
                Ergonomic Strain Guidance
              </h4>
              <p className="text-gray-600 text-[11px]">
                Cervical strain indices are estimated using MEMS IMU sensors. Individuals suffering from chronic cervical spine pathologies or sleep apnea should consult a physician.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
