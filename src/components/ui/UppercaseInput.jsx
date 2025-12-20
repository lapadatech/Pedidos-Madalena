import React from 'react';
import { Input } from '@/components/ui/input';

const UppercaseInput = React.forwardRef(({ value, onChange, ...props }, ref) => {
  const handleInputChange = (e) => {
    e.target.value = e.target.value.toUpperCase();
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <Input
      ref={ref}
      value={value ? String(value).toUpperCase() : ''}
      onChange={handleInputChange}
      {...props}
    />
  );
});

UppercaseInput.displayName = 'UppercaseInput';

export { UppercaseInput };
