import React from 'react';

export default function SurfaceCard({
  children,
  className = '',
  padding = 'p-5 sm:p-6',
  interactive = false,
  as: Component = 'div',
  ...rest
}) {
  const base = interactive ? 'card-interactive' : 'surface-card';
  return (
    <Component className={`${base} ${padding} ${className}`} {...rest}>
      {children}
    </Component>
  );
}
