import React, { useEffect, useState } from 'react';
import Map, { Marker, Source, Layer, NavigationControl } from 'react-map-gl';
import { MapPin, Truck } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';

// Using a placeholder token - User needs to replace this
const MAPBOX_TOKEN = 'pk.eyJ1IjoiYmxpdHpqYiIsImEiOiJjbTEweDAzb20wOGhiMnRwZGNqZ2NsdXF6In0.DhETe3EckUcqEAvDDQsfLA';

interface RouteMapProps {
    originLat?: number;
    originLng?: number;
    currentLat?: number;
    currentLng?: number;
    destinationLat?: number;
    destinationLng?: number;
    coordinates?: { lat: number; lng: number }[];
}

export const RouteMap: React.FC<RouteMapProps> = ({
    originLat,
    originLng,
    currentLat,
    currentLng,
    destinationLat,
    destinationLng,
    coordinates
}) => {
    // Calculate center and zoom based on available data
    const getInitialViewState = () => {
        if (coordinates && coordinates.length > 0) {
            const lats = coordinates.map(c => c.lat);
            const lngs = coordinates.map(c => c.lng);
            const minLat = Math.min(...lats);
            const maxLat = Math.max(...lats);
            const minLng = Math.min(...lngs);
            const maxLng = Math.max(...lngs);
            return {
                latitude: (minLat + maxLat) / 2,
                longitude: (minLng + maxLng) / 2,
                zoom: 9
            };
        }
        if (originLat && currentLat) {
            return {
                latitude: (originLat + currentLat) / 2,
                longitude: (originLng! + currentLng!) / 2,
                zoom: 10
            };
        }
        return {
            latitude: 20.5937,
            longitude: 78.9629,
            zoom: 4
        };
    };

    const [viewState, setViewState] = useState(getInitialViewState());
    const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);

    // Fetch route from Mapbox Directions API or use provided coordinates
    useEffect(() => {
        if (coordinates && coordinates.length > 1) {
            // Construct coordinates string for Mapbox Directions API (lng,lat;lng,lat;...)
            const coordinatesString = coordinates.map(c => `${c.lng},${c.lat}`).join(';');

            if (!MAPBOX_TOKEN.includes('example')) {
                const fetchRoute = async () => {
                    try {
                        const query = await fetch(
                            `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinatesString}?steps=true&geometries=geojson&access_token=${MAPBOX_TOKEN}`
                        );
                        const json = await query.json();
                        if (json.routes && json.routes.length > 0) {
                            const data = json.routes[0];
                            const route = data.geometry.coordinates;

                            const geojson = {
                                type: 'Feature',
                                properties: {},
                                geometry: {
                                    type: 'LineString',
                                    coordinates: route
                                }
                            };
                            setRouteGeoJSON(geojson);
                        } else {
                            // Fallback if no route found
                            console.warn('No route found from Mapbox API, falling back to straight lines');
                            setRouteGeoJSON({
                                type: 'Feature',
                                properties: {},
                                geometry: {
                                    type: 'LineString',
                                    coordinates: coordinates.map(c => [c.lng, c.lat])
                                }
                            });
                        }
                    } catch (error) {
                        console.error('Error fetching route:', error);
                        // Fallback on error
                        setRouteGeoJSON({
                            type: 'Feature',
                            properties: {},
                            geometry: {
                                type: 'LineString',
                                coordinates: coordinates.map(c => [c.lng, c.lat])
                            }
                        });
                    }
                };
                fetchRoute();
            } else {
                // Fallback straight line if no token
                setRouteGeoJSON({
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        type: 'LineString',
                        coordinates: coordinates.map(c => [c.lng, c.lat])
                    }
                });
            }
        } else if (!MAPBOX_TOKEN.includes('example') && originLat && originLng && currentLat && currentLng) {
            const fetchRoute = async () => {
                try {
                    const query = await fetch(
                        `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${currentLng},${currentLat}?steps=true&geometries=geojson&access_token=${MAPBOX_TOKEN}`
                    );
                    const json = await query.json();
                    const data = json.routes[0];
                    const route = data.geometry.coordinates;

                    const geojson = {
                        type: 'Feature',
                        properties: {},
                        geometry: {
                            type: 'LineString',
                            coordinates: route
                        }
                    };
                    setRouteGeoJSON(geojson);
                } catch (error) {
                    console.error('Error fetching route:', error);
                }
            };
            fetchRoute();
        } else if (originLat && originLng && currentLat && currentLng) {
            // Fallback straight line if no token
            setRouteGeoJSON({
                type: 'Feature',
                properties: {},
                geometry: {
                    type: 'LineString',
                    coordinates: [
                        [originLng, originLat],
                        [currentLng, currentLat]
                    ]
                }
            });
        }
    }, [originLat, originLng, currentLat, currentLng, coordinates]);

    return (
        <div className="h-64 w-full rounded-lg overflow-hidden border border-gray-200 relative">
            <Map
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/streets-v12"
                mapboxAccessToken={MAPBOX_TOKEN}
            >
                <NavigationControl position="top-left" />

                {/* Markers from coordinates prop */}
                {coordinates?.map((coord, idx) => (
                    <Marker key={idx} longitude={coord.lng} latitude={coord.lat} anchor="bottom">
                        <div className="flex flex-col items-center">
                            <MapPin className={`h-6 w-6 ${idx === 0 ? 'text-green-600 fill-green-100' : idx === coordinates.length - 1 ? 'text-red-600 fill-red-100' : 'text-blue-600 fill-blue-100'}`} />
                            {idx === 0 && <span className="text-xs font-bold bg-white px-1 rounded shadow">Origin</span>}
                            {idx === coordinates.length - 1 && coordinates.length > 1 && <span className="text-xs font-bold bg-white px-1 rounded shadow">Current</span>}
                        </div>
                    </Marker>
                ))}

                {/* Origin Marker (Legacy props) */}
                {!coordinates && originLat && originLng && (
                    <Marker longitude={originLng} latitude={originLat} anchor="bottom">
                        <div className="flex flex-col items-center">
                            <MapPin className="h-6 w-6 text-green-600 fill-green-100" />
                            <span className="text-xs font-bold bg-white px-1 rounded shadow">Origin</span>
                        </div>
                    </Marker>
                )}

                {/* Current Location Marker (Legacy props) */}
                {!coordinates && currentLat && currentLng && (
                    <Marker longitude={currentLng} latitude={currentLat} anchor="bottom">
                        <div className="flex flex-col items-center">
                            <Truck className="h-6 w-6 text-blue-600 fill-blue-100" />
                            <span className="text-xs font-bold bg-white px-1 rounded shadow">Truck</span>
                        </div>
                    </Marker>
                )}

                {/* Destination Marker (if available) */}
                {!coordinates && destinationLat && destinationLng && (
                    <Marker longitude={destinationLng} latitude={destinationLat} anchor="bottom">
                        <MapPin className="h-6 w-6 text-purple-600 fill-purple-100" />
                    </Marker>
                )}

                {/* Route Line */}
                {routeGeoJSON && (
                    <Source id="route" type="geojson" data={routeGeoJSON}>
                        <Layer
                            id="route"
                            type="line"
                            layout={{
                                'line-join': 'round',
                                'line-cap': 'round'
                            }}
                            paint={{
                                'line-color': '#3b82f6',
                                'line-width': 4,
                                'line-opacity': 0.75
                            }}
                        />
                    </Source>
                )}
            </Map>

            {/* Token Warning Overlay */}
            {MAPBOX_TOKEN.includes('example') && (
                <div className="absolute top-2 right-2 bg-white/90 p-2 rounded text-xs text-red-600 border border-red-200 shadow-sm pointer-events-none">
                    Mapbox Token Required for Real Routing
                </div>
            )}
        </div>
    );
};
