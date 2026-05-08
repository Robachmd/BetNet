import React from 'react';
import LoadingSpinner from './LoadingSpinner';

export default function RouteFallback() {
  return <LoadingSpinner page text="Loading..." />;
}
