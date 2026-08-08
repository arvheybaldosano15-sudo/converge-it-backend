import React from 'react';

const Input = React.forwardRef(({
  label,
  error,
  icon: Icon,
  type = 'text',
  className = '',
  id,
  helperText,
  ...props
}, ref) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full flex flex-col space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`glass-input w-full rounded-xl py-2.5 text-sm transition-all duration-200 placeholder:text-slate-500 ${
            Icon ? 'pl-10 pr-4' : 'px-4'
          } ${error ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/30' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-rose-400 font-medium">{error}</span>}
      {helperText && !error && <span className="text-xs text-slate-400">{helperText}</span>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
