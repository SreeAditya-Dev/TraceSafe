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

const TruckDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const videoRef = useRef<HTMLVideoElement>(null);

    const [batches, setBatches] = useState<Batch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showScanner, setShowScanner] = useState(false);
    const [scannedBatch, setScannedBatch] = useState<Batch | null>(null);
    const [manualBatchId, setManualBatchId] = useState('');
    const [location, setLocation] = useState<{ lat: string; lng: string }>({ lat: '', lng: '' });

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
            const response = await batchAPI.getAll({ status: 'in_transit' });
            setBatches(response.data.batches || []);
        } catch (error) {
            console.error('Failed to load batches:', error);
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
            await batchAPI.pickup(scannedBatch.batch_id, {
                latitude: parseFloat(location.lat) || 0,
                longitude: parseFloat(location.lng) || 0,
                notes: 'Picked up by driver',
            });

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
            await batchAPI.updateTransit(scannedBatch.batch_id, {
                latitude: parseFloat(location.lat) || 0,
                longitude: parseFloat(location.lng) || 0,
                temperature: transitForm.temperature ? parseFloat(transitForm.temperature) : undefined,
                humidity: transitForm.humidity ? parseFloat(transitForm.humidity) : undefined,
                notes: transitForm.notes,
            });

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

        setIsUpdating(true);
        try {
            await batchAPI.deliver(scannedBatch.batch_id, {
                latitude: parseFloat(location.lat) || 0,
                longitude: parseFloat(location.lng) || 0,
                notes: 'Delivered to destination',
            });

            toast({
                title: 'Batch Delivered',
                description: `${scannedBatch.batch_id} has been delivered`,
            });

            loadData();
            setScannedBatch(null);
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

                        <div className="mt-4">
                            <LocationInput
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
                                <Button onClick={handlePickup} className="w-full bg-green-600 hover:bg-green-700" disabled={isUpdating}>
                                    <Package className="h-4 w-4 mr-2" />
                                    {isUpdating ? 'Processing...' : 'Pickup This Batch'}
                                </Button>
                            )}

                            {scannedBatch.status === 'in_transit' && (
                                <>
                                    <div className="border-t pt-4">
                                        <h4 className="font-medium mb-3">Update Transit Conditions</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-1">
                                                    <Thermometer className="h-4 w-4" />
                                                    Temperature (°C)
                                                </Label>
                                                <Input
                                                    type="number"
                                                    placeholder="25"
                                                    value={transitForm.temperature}
                                                    onChange={(e) => setTransitForm({ ...transitForm, temperature: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="flex items-center gap-1">
                                                    <Droplets className="h-4 w-4" />
                                                    Humidity (%)
                                                </Label>
                                                <Input
                                                    type="number"
                                                    placeholder="60"
                                                    value={transitForm.humidity}
                                                    onChange={(e) => setTransitForm({ ...transitForm, humidity: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2 mt-4">
                                            <Label>Notes</Label>
                                            <Textarea
                                                placeholder="Any observations..."
                                                value={transitForm.notes}
                                                onChange={(e) => setTransitForm({ ...transitForm, notes: e.target.value })}
                                            />
                                        </div>

                                        <div className="flex gap-2 mt-4">
                                            <Button onClick={handleTransitUpdate} variant="outline" className="flex-1" disabled={isUpdating}>
                                                <Send className="h-4 w-4 mr-2" />
                                                Update Transit
                                            </Button>
                                            <Button onClick={handleDeliver} className="flex-1 bg-purple-600 hover:bg-purple-700" disabled={isUpdating}>
                                                <Package className="h-4 w-4 mr-2" />
                                                Mark Delivered
                                            </Button>
                                        </div>
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
