import React, { useState, useCallback } from 'react';
import Map, { Marker, NavigationControl, GeolocateControl } from 'react-map-gl';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2 } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

// Using a placeholder token - User needs to replace this
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYmxpdHpqYiIsImEiOiJjbTEweDAzb20wOGhiMnRwZGNqZ2NsdXF6In0.DhETe3EckUcqEAvDDQsfLA';

interface MapboxLocationInputProps {
    latitude: string | number;
    longitude: string | number;
    onChange: (lat: string, lng: string) => void;
    label?: string;
}

export const MapboxLocationInput: React.FC<MapboxLocationInputProps> = ({
    latitude,
    longitude,
    onChange,
    label = "Location"
}) => {
    const [viewState, setViewState] = useState({
        latitude: Number(latitude) || 20.5937, // Default to India center
        longitude: Number(longitude) || 78.9629,
        zoom: 4
    });
    const [loading, setLoading] = useState(false);

    const handleMarkerDrag = useCallback((event: any) => {
        const { lng, lat } = event.lngLat;
        onChange(lat.toFixed(6), lng.toFixed(6));
    }, [onChange]);

    const getCurrentLocation = () => {
        setLoading(true);
        if (!navigator.geolocation) {
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setViewState({
                    latitude,
                    longitude,
                    zoom: 14
                });
                onChange(latitude.toFixed(6), longitude.toFixed(6));
                setLoading(false);
            },
            () => {
                setLoading(false);
            }
        );
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <Label>{label}</Label>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={getCurrentLocation}
                    disabled={loading}
                    className="h-8 text-xs"
                >
                    {loading ? (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    ) : (
                        <MapPin className="mr-2 h-3 w-3" />
                    )}
                    Locate Me
                </Button>
            </div>

            <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-200 relative">
                <Map
                    {...viewState}
                    onMove={evt => setViewState(evt.viewState)}
                    style={{ width: '100%', height: '100%' }}
                    mapStyle="mapbox://styles/mapbox/streets-v12"
                    mapboxAccessToken={MAPBOX_TOKEN}
                    onClick={(evt) => {
                        const { lng, lat } = evt.lngLat;
                        onChange(lat.toFixed(6), lng.toFixed(6));
                    }}
                >
                    <GeolocateControl position="top-left" />
                    <NavigationControl position="top-left" />

                    {(Number(latitude) && Number(longitude)) && (
                        <Marker
                            longitude={Number(longitude)}
                            latitude={Number(latitude)}
                            anchor="bottom"
                            draggable
                            onDragEnd={handleMarkerDrag}
                        >
                            <MapPin className="h-8 w-8 text-red-600 fill-red-100" />
                        </Marker>
                    )}
                </Map>

                {/* Token Warning Overlay */}
                {MAPBOX_TOKEN.includes('example') && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                        <div className="bg-white p-4 rounded text-center max-w-xs">
                            <p className="font-bold text-red-600">Mapbox Token Required</p>
                            <p className="text-xs text-gray-600 mt-1">
                                Please replace the placeholder token in MapboxLocationInput.tsx
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                <div>Lat: {latitude || 'Not set'}</div>
                <div>Lng: {longitude || 'Not set'}</div>
            </div>
        </div>
    );
};
