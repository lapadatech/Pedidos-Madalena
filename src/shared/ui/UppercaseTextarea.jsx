import React from 'react';
import { Textarea } from '@/shared/ui/textarea';

const UppercaseTextarea = React.forwardRef(({ value, onChange, ...props }, ref) => {
  const handleInputChange = (e) => {
    e.target.value = e.target.value.toUpperCase();
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <Textarea
      ref={ref}
      value={value ? String(value).toUpperCase() : ''}
      onChange={handleInputChange}
      {...props}
    />
  );
});

UppercaseTextarea.displayName = 'UppercaseTextarea';

export { UppercaseTextarea };
