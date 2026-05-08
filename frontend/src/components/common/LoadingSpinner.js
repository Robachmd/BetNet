import React from 'react';

const sizeMap = {
  sm: 'w-5 h-5 border-[3px]',
  md: 'w-10 h-10 border-[3px]',
  lg: 'w-12 h-12 border-4',
  xl: 'w-16 h-16 border-4',
};

export default function LoadingSpinner({
  size = 'md',
  fullScreen = false,
  page = false,
  text = '',
}) {
  const spinner = (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative flex items-center justify-center">
        <div
          className={`${sizeMap[size]} rounded-full border-primary-100 border-t-primary-700 border-r-primary-400/40 animate-spin`}
          aria-hidden
        />
      </div>
      {text && (
        <p className="text-sm font-medium text-gray-500 tracking-wide animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/85 backdrop-blur-[2px]">
        {spinner}
      </div>
    );
  }

  if (page) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#FAFAFA]">
        {spinner}
      </div>
    );
  }

  return <div className="flex items-center justify-center py-10">{spinner}</div>;
}
