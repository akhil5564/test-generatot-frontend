import React, { useEffect, useRef } from 'react';
import MathInputKeyboard from '@karyum/react-math-keyboard';

interface MathInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  rows?: number;
  showPreview?: boolean;
  showHelper?: boolean;
}

const MathInput: React.FC<MathInputProps> = ({
  value = '',
  onChange,
}) => {
  const mathFieldRef = useRef<any>(null);

  // Sync value prop with MathQuill
  useEffect(() => {
    if (mathFieldRef.current && value !== undefined) {
      const currentLatex = mathFieldRef.current.latex();
      if (currentLatex !== value) {
        mathFieldRef.current.latex(value || '');
      }
    }
  }, [value]);

  const handleValueChange = (latex: string) => {
    if (onChange) {
      onChange(latex);
    }
  };

  return (
    <div style={{ width: '100%' }} >
      <MathInputKeyboard

        setValue={handleValueChange}
        setMathfieldRef={(mathfield: any) => {
          mathFieldRef.current = mathfield;
        }}
        defaultValue={value}
        style={{ width: '100%', fontSize: '16px', fontFamily: 'Arial, sans-serif' }}
      />
    </div>
  );
};

export default MathInput;
