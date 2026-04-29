import React, { useState, useEffect } from 'react';
import { FiNavigation, FiMaximize2 } from 'react-icons/fi';
import { SkeletonBlock } from '../common/Skeletons';

export default function PropertyMap({
  properties = [],
  center = null,
  zoom = 13,
  singleProperty = null,
  onPropertyClick = () => {},
  showLocateMe = true,
  className = '',
  height = '400px',
}) {
  const [MapComponents, setMapComponents] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState('');

  const defaultCenter = center || (singleProperty
    ? [singleProperty.lat || 9.02, singleProperty.lng || 38.75]
    : [9.02, 38.75]); // Addis Ababa

  useEffect(() => {
    let mounted = true;
    import('react-leaflet').then((mod) => {
      if (mounted) setMapComponents(mod);
    }).catch(() => {
      if (mounted) setError('Failed to load map. Please check your internet connection.');
    });
    return () => { mounted = false; };
  }, []);

  const locateMe = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setIsLocating(false);
      },
      () => {
        setError('Unable to get your location.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const formatETB = (price) =>
    new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(price);

  if (error && !MapComponents) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded-2xl text-sm text-gray-500 ${className}`} style={{ height }}>
        <p>{error}</p>
      </div>
    );
  }

  if (!MapComponents) {
    return (
      <div className={`${className}`} style={{ height }}>
        <SkeletonBlock className="h-full w-full" />
      </div>
    );
  }

  const { MapContainer, TileLayer, Marker, Popup, useMap } = MapComponents;

  const RecenterButton = () => {
    const map = useMap();
    return (
      <div className="leaflet-top leaflet-right" style={{ pointerEvents: 'auto' }}>
        <div className="leaflet-control flex flex-col gap-2 m-3">
          {showLocateMe && (
            <button
              onClick={(e) => { e.stopPropagation(); locateMe(); }}
              disabled={isLocating}
              className="w-9 h-9 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
              title="Near me"
            >
              <FiNavigation className={`w-4 h-4 text-gray-700 ${isLocating ? 'animate-pulse' : ''}`} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); map.setView(defaultCenter, zoom); }}
            className="w-9 h-9 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
            title="Reset view"
          >
            <FiMaximize2 className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>
    );
  };

  const FlyToLocation = ({ location }) => {
    const map = useMap();
    useEffect(() => {
      if (location) map.flyTo(location, 15, { duration: 1.5 });
    }, [location, map]);
    return null;
  };

  const allPoints = singleProperty
    ? [singleProperty]
    : properties.filter((p) => p.lat && p.lng);

  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`} style={{ height }}>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        crossOrigin=""
      />
      <MapContainer
        center={defaultCenter}
        zoom={zoom}
        className="w-full h-full z-0"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <RecenterButton />
        <FlyToLocation location={userLocation} />

        {allPoints.map((p, i) => (
          <Marker key={p.id || i} position={[p.lat, p.lng]}>
            <Popup>
              <div
                className="cursor-pointer min-w-[180px]"
                onClick={() => onPropertyClick(p)}
              >
                {p.images?.[0] && (
                  <img
                    src={p.images[0]}
                    alt={p.title}
                    className="w-full h-24 object-cover rounded-lg mb-2"
                  />
                )}
                <p className="font-semibold text-gray-800 text-sm mb-0.5">{p.title || 'Property'}</p>
                {p.price && (
                  <p className="text-green-700 font-bold text-sm">{formatETB(p.price)} ETB</p>
                )}
                {(p.bedrooms || p.bathrooms) && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {p.bedrooms && `${p.bedrooms} bed`}{p.bedrooms && p.bathrooms && ' · '}{p.bathrooms && `${p.bathrooms} bath`}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {userLocation && (
          <Marker position={userLocation}>
            <Popup>Your location</Popup>
          </Marker>
        )}
      </MapContainer>

      {error && (
        <div className="absolute bottom-4 left-4 right-4 bg-red-50 text-red-600 text-sm px-4 py-2 rounded-lg shadow-sm">
          {error}
        </div>
      )}
    </div>
  );
}
