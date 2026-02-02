'use client';

import { RiskLevel, useRisk } from '@/lib/risk-context';

interface RiskSelectorProps {
  className?: string;
}

const riskOptions: { level: RiskLevel; label: string; icon: string; description: string }[] = [
  {
    level: 'safe',
    label: 'Safe',
    icon: '🛡️',
    description: 'Template picks, proven performers',
  },
  {
    level: 'balanced',
    label: 'Balanced',
    icon: '⚖️',
    description: 'Mix of template and differentials',
  },
  {
    level: 'aggressive',
    label: 'Aggressive',
    icon: '🚀',
    description: 'High-ceiling differentials',
  },
];

export function RiskSelector({ className = '' }: RiskSelectorProps) {
  const { riskLevel, setRiskLevel } = useRisk();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-400 mr-1">Risk:</span>
      <div className="flex rounded-lg bg-gray-800 p-1">
        {riskOptions.map((option) => (
          <button
            key={option.level}
            onClick={() => setRiskLevel(option.level)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
              riskLevel === option.level
                ? option.level === 'safe'
                  ? 'bg-blue-600 text-white'
                  : option.level === 'balanced'
                  ? 'bg-fpl-green text-fpl-purple'
                  : 'bg-orange-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            title={option.description}
          >
            <span>{option.icon}</span>
            <span className="hidden sm:inline">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
