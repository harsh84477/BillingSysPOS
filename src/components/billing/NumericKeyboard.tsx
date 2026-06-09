import React from 'react';
import { Delete } from 'lucide-react';

interface NumericKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onConfirm?: () => void;
  className?: string;
  maxDigits?: number;
}

export default function NumericKeyboard({
  value,
  onChange,
  onConfirm,
  className = '',
  maxDigits = 5
}: NumericKeyboardProps) {
  
  const handleKeyPress = (key: string) => {
    let newValue = value;

    if (key === 'C') {
      newValue = '';
    } else if (key === 'backspace') {
      newValue = value.slice(0, -1);
    } else {
      // Append number, but if current is '0', replace it
      if (value === '0') {
        newValue = key;
      } else {
        newValue = value + key;
      }
    }

    // Apply max digits limit
    if (newValue.length <= maxDigits) {
      onChange(newValue);
    }
  };

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['C', '0', 'backspace']
  ];

  return (
    <div className={`w-full max-w-xs mx-auto ${className}`}>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((row, rowIndex) => (
          <React.Fragment key={rowIndex}>
            {row.map((key) => {
              const isSpecial = key === 'C' || key === 'backspace';
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleKeyPress(key)}
                  className={`
                    flex items-center justify-center h-12 text-lg font-semibold rounded-xl
                    transition-all active:scale-95 duration-100 select-none border border-border/40
                    ${isSpecial 
                      ? 'bg-muted/65 hover:bg-muted text-muted-foreground active:bg-muted/80' 
                      : 'bg-card hover:bg-muted/20 text-foreground shadow-sm active:bg-primary active:text-primary-foreground active:border-primary'
                    }
                  `}
                >
                  {key === 'backspace' ? (
                    <Delete className="h-5 w-5" />
                  ) : (
                    key
                  )}
                </button>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
