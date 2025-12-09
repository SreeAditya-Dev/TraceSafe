import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2 } from 'lucide-react';

interface LocationInputProps {
    latitude: string | number;
    longitude: string | number;
    onChange: (lat: string, lng: string) => void;
    label?: string;
}

export const LocationInput: React.FC<LocationInputProps> = ({
    latitude,
    longitude,
    onChange,
    label = "Location"
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getCurrentLocation = () => {
        setLoading(true);
        setError(null);

        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser");
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                onChange(
                    position.coords.latitude.toFixed(6),
                    position.coords.longitude.toFixed(6)
                );
                setLoading(false);
            },
            (err) => {
                setError(`Unable to retrieve location: ${err.message}`);
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
                    Get Current Location
                </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="latitude" className="text-xs text-muted-foreground">Latitude</Label>
                    <Input
                        id="latitude"
                        type="number"
                        placeholder="0.000000"
                        value={latitude}
                        onChange={(e) => onChange(e.target.value, String(longitude))}
                        step="any"
                    />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="longitude" className="text-xs text-muted-foreground">Longitude</Label>
                    <Input
                        id="longitude"
                        type="number"
                        placeholder="0.000000"
                        value={longitude}
                        onChange={(e) => onChange(String(latitude), e.target.value)}
                        step="any"
                    />
                </div>
            </div>

            {error && (
                <p className="text-xs text-red-500">{error}</p>
            )}
        </div>
    );
};
