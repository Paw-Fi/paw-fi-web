import * as React from 'react';

// A basic, unstyled textarea component to satisfy imports.
// It forwards the ref and accepts standard textarea props.
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return <textarea className={className} ref={ref} {...props} />;
});
Textarea.displayName = 'Textarea';
