import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { batchAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    Truck, QrCode, MapPin, Package, Thermometer,
    Droplets, LogOut, Camera, Send, Navigation
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { LocationInput } from '@/components/LocationInput';
import { MapboxLocationInput } from '@/components/MapboxLocationInput';
import { CameraInput } from '@/components/CameraInput';
import { RouteMap } from '@/components/RouteMap';

interface Batch {
    id: string;
    batch_id: string;
    crop: string;
    quantity: number;
    unit: string;
    status: string;
    farmer_name: string;
    created_at: string;
}

interface Retailer {
    id: string;
    name: string;
    shop_name: string;
    phone: string;
    address: string;
}

const TruckDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);

    const [batches, setBatches] = useState<Batch[]>([]);
    const [retailers, setRetailers] = useState<Retailer[]>([]);
    const [selectedRetailerId, setSelectedRetailerId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [showScanner, setShowScanner] = useState(false);
    const [scannedBatch, setScannedBatch] = useState<Batch | null>(null);
    const [manualBatchId, setManualBatchId] = useState('');
    const [location, setLocation] = useState<{ lat: string; lng: string }>({ lat: '', lng: '' });
    const [evidenceImage, setEvidenceImage] = useState<string | null>(null);

    // Transit update form
    const [transitForm, setTransitForm] = useState({
        temperature: '',
        humidity: '',
        notes: '',
    });
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [batchesRes, retailersRes] = await Promise.all([
                batchAPI.getAll({ status: 'in_transit' }),
                batchAPI.getRetailers()
            ]);
            setBatches(batchesRes.data.batches || []);
            setRetailers(retailersRes.data.retailers || []);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };



    const handleLoadBatch = async (batchId: string) => {
        try {
            const response = await batchAPI.getById(batchId);
            setScannedBatch(response.data.batch);
            setShowScanner(false);
            toast({
                title: 'Batch Loaded',
                description: `${response.data.batch.crop} - ${batchId}`,
            });
        } catch (error) {
            toast({
                title: 'Batch Not Found',
                description: 'Could not find batch with this ID',
                variant: 'destructive',
            });
        }
    };

    const handlePickup = async () => {
        if (!scannedBatch) return;

        setIsUpdating(true);
        try {
            const formData = new FormData();
            formData.append('latitude', location.lat || '0');
            formData.append('longitude', location.lng || '0');
            formData.append('notes', 'Picked up by driver');

            if (evidenceImage) {
                const fetchRes = await fetch(evidenceImage);
                const blob = await fetchRes.blob();
                formData.append('image', blob, 'pickup-evidence.jpg');
            }

            await batchAPI.pickup(scannedBatch.batch_id, formData);

            toast({
                title: 'Batch Picked Up',
                description: `${scannedBatch.batch_id} is now in transit`,
            });

            loadData();
            setScannedBatch(null);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Pickup failed';
            toast({
                title: 'Pickup Failed',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleTransitUpdate = async () => {
        if (!scannedBatch) return;

        setIsUpdating(true);
        try {
            const formData = new FormData();
            formData.append('latitude', location.lat || '0');
            formData.append('longitude', location.lng || '0');
            if (transitForm.temperature) formData.append('temperature', transitForm.temperature);
            if (transitForm.humidity) formData.append('humidity', transitForm.humidity);
            formData.append('notes', transitForm.notes);

            if (evidenceImage) {
                const fetchRes = await fetch(evidenceImage);
                const blob = await fetchRes.blob();
                formData.append('image', blob, 'transit-evidence.jpg');
            }

            await batchAPI.updateTransit(scannedBatch.batch_id, formData);

            toast({
                title: 'Transit Updated',
                description: 'Location and conditions recorded',
            });

            setTransitForm({ temperature: '', humidity: '', notes: '' });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Update failed';
            toast({
                title: 'Update Failed',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleDeliver = async () => {
        if (!scannedBatch) return;

        if (!selectedRetailerId) {
            toast({
                title: 'Select Retailer',
                description: 'You must select a retailer to deliver to',
                variant: 'destructive',
            });
            return;
        }

        setIsUpdating(true);
        try {
            const formData = new FormData();
            formData.append('latitude', location.lat || '0');
            formData.append('longitude', location.lng || '0');
            formData.append('retailerId', selectedRetailerId);
            formData.append('notes', 'Delivered to destination');

            if (evidenceImage) {
                const fetchRes = await fetch(evidenceImage);
                const blob = await fetchRes.blob();
                formData.append('image', blob, 'delivery-evidence.jpg');
            }

            await batchAPI.deliver(scannedBatch.batch_id, formData);

            toast({
                title: 'Batch Delivered',
                description: `${scannedBatch.batch_id} has been delivered`,
            });

            loadData();
            setScannedBatch(null);
            setSelectedRetailerId('');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Delivery failed';
            toast({
                title: 'Delivery Failed',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            created: 'bg-blue-500',
            in_transit: 'bg-yellow-500',
            delivered: 'bg-purple-500',
            received: 'bg-green-500',
        };
        return colors[status] || 'bg-gray-500';
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-blue-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Truck className="h-8 w-8" />
                        <div>
                            <h1 className="text-xl font-bold">Driver Dashboard</h1>
                            <p className="text-sm text-blue-100">Welcome, {user?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {location && (
                            <Badge className="bg-blue-800">
                                <Navigation className="h-3 w-3 mr-1" />
                                GPS Active
                            </Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-blue-700">
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Scanner Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <QrCode className="h-5 w-5" />
                            Scan or Enter Batch ID
                        </CardTitle>
                        <CardDescription>
                            Scan QR code or manually enter batch ID to load, update, or deliver
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Enter Batch ID (e.g., TOM-2024-1234)"
                                value={manualBatchId}
                                onChange={(e) => setManualBatchId(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={() => handleLoadBatch(manualBatchId)} disabled={!manualBatchId}>
                                Load Batch
                            </Button>
                            <Button variant="outline" onClick={() => setShowScanner(true)}>
                                <Camera className="h-4 w-4 mr-2" />
                                Scan QR
                            </Button>
                        </div>

                        <div className="mt-4 space-y-4">
                            <MapboxLocationInput
                                latitude={location.lat}
                                longitude={location.lng}
                                onChange={(lat, lng) => setLocation({ lat, lng })}
                                label="Current Location"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Loaded Batch Card */}
                {scannedBatch && (
                    <Card className="border-blue-300 bg-blue-50">
                        <CardHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <CardTitle className="text-xl">{scannedBatch.crop}</CardTitle>
                                    <CardDescription className="font-mono text-lg">{scannedBatch.batch_id}</CardDescription>
                                </div>
                                <Badge className={getStatusColor(scannedBatch.status)}>
                                    {scannedBatch.status.replace('_', ' ')}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">Quantity</p>
                                    <p className="font-medium">{scannedBatch.quantity} {scannedBatch.unit}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">From Farmer</p>
                                    <p className="font-medium">{scannedBatch.farmer_name || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Created</p>
                                    <p className="font-medium">{new Date(scannedBatch.created_at).toLocaleDateString()}</p>
                                </div>
                            </div>

                            {scannedBatch.status === 'created' && (
                                <div className="space-y-4">
                                    <CameraInput
                                        onCapture={setEvidenceImage}
                                        label="Take Pickup Photo"
                                    />
                                    <Button onClick={handlePickup} className="w-full bg-green-600 hover:bg-green-700" disabled={isUpdating}>
                                        <Package className="h-4 w-4 mr-2" />
                                        {isUpdating ? 'Processing...' : 'Pickup This Batch'}
                                    </Button>
                                </div>
                            )}

                            {scannedBatch.status === 'in_transit' && (
                                <>
                                    <div className="border-t pt-4">
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                            <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                                                <Thermometer className="h-4 w-4" />
                                                IoT Monitoring Active
                                            </h4>
                                            <p className="text-sm text-blue-700">
                                                Temperature, humidity, and location data is being automatically tracked by IoT sensors.
                                            </p>
                                        </div>

                                        <div className="space-y-2 mt-4">
                                            <Label>Delivery Evidence Photo (Optional)</Label>
                                            <CameraInput
                                                onCapture={setEvidenceImage}
                                                label="Take Delivery Photo"
                                            />
                                        </div>

                                        {/* Retailer Selection - Required */}
                                        <div className="space-y-2 mt-4">
                                            <Label className="flex items-center gap-1">
                                                <Package className="h-4 w-4" />
                                                Select Retailer <span className="text-red-500">*</span>
                                            </Label>
                                            <select
                                                className="w-full p-2 border rounded-md bg-white"
                                                value={selectedRetailerId}
                                                onChange={(e) => setSelectedRetailerId(e.target.value)}
                                            >
                                                <option value="">-- Choose a retailer --</option>
                                                {retailers.map((r) => (
                                                    <option key={r.id} value={r.id}>
                                                        {r.name} {r.shop_name ? `(${r.shop_name})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            {retailers.length === 0 && (
                                                <p className="text-sm text-orange-600">No retailers registered yet</p>
                                            )}
                                        </div>

                                        <Button
                                            onClick={handleDeliver}
                                            className="w-full mt-4 bg-purple-600 hover:bg-purple-700"
                                            disabled={isUpdating || !selectedRetailerId}
                                        >
                                            <Package className="h-4 w-4 mr-2" />
                                            {isUpdating ? 'Processing...' : 'Mark as Delivered'}
                                        </Button>
                                    </div>

                                    {/* Route Map Visualization */}
                                    <div className="mt-6 border-t pt-4">
                                        <h4 className="font-medium mb-3 flex items-center gap-2">
                                            <Navigation className="h-4 w-4" />
                                            Live Route
                                        </h4>
                                        <RouteMap
                                            originLat={12.9716} // Placeholder origin (Bangalore)
                                            originLng={77.5946}
                                            currentLat={Number(location.lat) || 12.9716}
                                            currentLng={Number(location.lng) || 77.5946}
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Active Batches */}
                <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Active Shipments ({batches.length})
                    </h2>

                    {batches.length === 0 ? (
                        <Card className="text-center py-12">
                            <CardContent>
                                <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                <p className="text-gray-500">No active shipments</p>
                                <p className="text-sm text-gray-400">Scan a batch QR code to start</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {batches.map((batch) => (
                                <Card key={batch.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setScannedBatch(batch)}>
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-lg">{batch.crop}</CardTitle>
                                                <CardDescription className="font-mono">{batch.batch_id}</CardDescription>
                                            </div>
                                            <Badge className={getStatusColor(batch.status)}>
                                                {batch.status.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Quantity</span>
                                                <span>{batch.quantity} {batch.unit}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Farmer</span>
                                                <span>{batch.farmer_name || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Scanner Dialog */}
            <Dialog open={showScanner} onOpenChange={setShowScanner}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Scan QR Code</DialogTitle>
                        <DialogDescription>
                            Point your camera at the batch QR code
                        </DialogDescription>
                    </DialogHeader>
                    <div className="bg-gray-100 rounded-lg p-8 text-center">
                        <Camera className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 mb-4">Camera scanner placeholder</p>
                        <p className="text-sm text-gray-400">For demo, use manual entry above</p>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TruckDashboard;
