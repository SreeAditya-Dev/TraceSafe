import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { batchAPI } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Leaf, Truck, Store, ShoppingCart, MapPin,
    Thermometer, Droplets, CheckCircle, Clock, Share2, ArrowLeft
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface JourneyEvent {
    event_type: string;
    actor: string;
    actor_type: string;
    location: {
        latitude: number | null;
        longitude: number | null;
        address: string | null;
    };
    data: {
        temperature: number | null;
        humidity: number | null;
    };
    notes: string;
    timestamp: string;
}

interface BatchJourney {
    batch: {
        id: string;
        crop: string;
        variety: string;
        quantity: string;
        harvest_date: string;
        status: string;
        origin: {
            latitude: number | null;
            longitude: number | null;
            address: string | null;
        };
        qr_code_url: string;
        created_at: string;
    };
    farmer: {
        name: string;
        agristack_id: string;
        verified: boolean;
        agristack_status: string;
    };
    journey: JourneyEvent[];
}

const eventIcons: Record<string, typeof Leaf> = {
    created: Leaf,
    pickup: Truck,
    transit_update: Truck,
    delivery: Store,
    received: Store,
    sold: ShoppingCart,
};

const eventColors: Record<string, string> = {
    created: 'bg-green-500',
    pickup: 'bg-blue-500',
    transit_update: 'bg-yellow-500',
    delivery: 'bg-purple-500',
    received: 'bg-indigo-500',
    sold: 'bg-gray-500',
};

const CustomerView: React.FC = () => {
    const { batchId } = useParams<{ batchId: string }>();
    const [data, setData] = useState<BatchJourney | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (batchId) {
            loadJourney();
        }
    }, [batchId]);

    const loadJourney = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await batchAPI.getJourney(batchId!);
            setData(response.data);
        } catch (err) {
            setError('Batch not found or journey unavailable');
            console.error('Failed to load journey:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleShare = async () => {
        const url = window.location.href;
        if (navigator.share) {
            await navigator.share({
                title: `TraceSafe - ${data?.batch.crop} Journey`,
                text: `Track the journey of ${data?.batch.crop} from farm to you`,
                url,
            });
        } else {
            await navigator.clipboard.writeText(url);
            alert('Link copied to clipboard!');
        }
    };

    // Get map coordinates from journey
    const getMapCoordinates = () => {
        if (!data) return [];

        const coords: [number, number][] = [];

        // Add origin if available
        if (data.batch.origin.latitude && data.batch.origin.longitude) {
            coords.push([data.batch.origin.latitude, data.batch.origin.longitude]);
        }

        // Add journey coordinates
        data.journey.forEach(event => {
            if (event.location.latitude && event.location.longitude) {
                coords.push([event.location.latitude, event.location.longitude]);
            }
        });

        return coords;
    };

    const mapCoordinates = getMapCoordinates();
    const hasMapData = mapCoordinates.length > 0;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading journey...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
                <Card className="max-w-md mx-4">
                    <CardHeader>
                        <CardTitle className="text-red-600">Not Found</CardTitle>
                        <CardDescription>{error || 'Batch journey unavailable'}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Link to="/">
                            <Button variant="outline" className="w-full">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Go Home
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            created: 'bg-blue-500',
            in_transit: 'bg-yellow-500',
            delivered: 'bg-purple-500',
            received: 'bg-green-500',
            sold: 'bg-gray-500',
        };
        return colors[status] || 'bg-gray-500';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Leaf className="h-6 w-6 text-green-600" />
                            <span className="font-bold text-xl">TraceSafe</span>
                        </div>
                        <Button variant="outline" size="sm" onClick={handleShare}>
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Batch Info Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-start justify-between">
                            <div>
                                <CardTitle className="text-2xl">{data.batch.crop}</CardTitle>
                                {data.batch.variety && (
                                    <CardDescription className="text-lg">{data.batch.variety}</CardDescription>
                                )}
                                <p className="font-mono text-sm text-gray-500 mt-1">{data.batch.id}</p>
                            </div>
                            <Badge className={`${getStatusColor(data.batch.status)} text-white`}>
                                {data.batch.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Quantity</p>
                                <p className="font-semibold">{data.batch.quantity}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Harvest Date</p>
                                <p className="font-semibold">
                                    {data.batch.harvest_date
                                        ? new Date(data.batch.harvest_date).toLocaleDateString()
                                        : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Farmer</p>
                                <p className="font-semibold">{data.farmer.name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">AgriStack ID</p>
                                <p className="font-mono text-sm">{data.farmer.agristack_id || 'N/A'}</p>
                            </div>
                        </div>

                        {data.farmer.verified && (
                            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <span className="text-green-800 font-medium">Verified via AgriStack Registry</span>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Map */}
                {hasMapData && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MapPin className="h-5 w-5" />
                                Journey Map
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64 rounded-lg overflow-hidden">
                                <MapContainer
                                    center={mapCoordinates[0]}
                                    zoom={10}
                                    style={{ height: '100%', width: '100%' }}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    {mapCoordinates.map((coord, idx) => (
                                        <Marker key={idx} position={coord}>
                                            <Popup>
                                                {idx === 0 ? 'Origin' : `Stop ${idx}`}
                                            </Popup>
                                        </Marker>
                                    ))}
                                    {mapCoordinates.length > 1 && (
                                        <Polyline positions={mapCoordinates} color="green" weight={3} />
                                    )}
                                </MapContainer>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Journey Timeline */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            Journey Timeline
                        </CardTitle>
                        <CardDescription>
                            Complete traceability from farm to you
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="relative">
                            {/* Timeline line */}
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>

                            <div className="space-y-6">
                                {data.journey.map((event, idx) => {
                                    const Icon = eventIcons[event.event_type] || Clock;
                                    const color = eventColors[event.event_type] || 'bg-gray-500';

                                    return (
                                        <div key={idx} className="relative flex gap-4">
                                            {/* Icon */}
                                            <div className={`z-10 flex items-center justify-center w-8 h-8 rounded-full ${color} text-white`}>
                                                <Icon className="h-4 w-4" />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 pb-4">
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h4 className="font-semibold capitalize">
                                                            {event.event_type.replace('_', ' ')}
                                                        </h4>
                                                        <p className="text-sm text-gray-600">by {event.actor}</p>
                                                    </div>
                                                    <time className="text-xs text-gray-500">
                                                        {new Date(event.timestamp).toLocaleString()}
                                                    </time>
                                                </div>

                                                {event.notes && (
                                                    <p className="text-sm text-gray-600 mt-1">{event.notes}</p>
                                                )}

                                                {(event.data.temperature || event.data.humidity) && (
                                                    <div className="flex gap-4 mt-2 text-sm">
                                                        {event.data.temperature && (
                                                            <span className="flex items-center gap-1 text-orange-600">
                                                                <Thermometer className="h-3 w-3" />
                                                                {event.data.temperature}°C
                                                            </span>
                                                        )}
                                                        {event.data.humidity && (
                                                            <span className="flex items-center gap-1 text-blue-600">
                                                                <Droplets className="h-3 w-3" />
                                                                {event.data.humidity}%
                                                            </span>
                                                        )}
                                                    </div>
                                                )}

                                                {event.location.latitude && event.location.longitude && (
                                                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                        <MapPin className="h-3 w-3" />
                                                        {event.location.latitude.toFixed(4)}, {event.location.longitude.toFixed(4)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer */}
                <div className="text-center py-6 text-sm text-gray-500">
                    <p>Powered by TraceSafe - Farm-to-Fork Traceability</p>
                    <p className="mt-1">Secured with Blockchain Technology</p>
                </div>
            </main>
        </div>
    );
};

export default CustomerView;
