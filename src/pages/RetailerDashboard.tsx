import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { batchAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    Store, QrCode, MapPin, Package, CheckCircle,
    LogOut, Camera, ShoppingCart, Eye, User
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { LocationInput } from '@/components/LocationInput';
import { CameraInput } from '@/components/CameraInput';

interface Batch {
    id: string;
    batch_id: string;
    crop: string;
    quantity: number;
    unit: string;
    status: string;
    farmer_name: string;
    created_at: string;
    qr_code_url?: string;
}

const RetailerDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [batches, setBatches] = useState<Batch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [manualBatchId, setManualBatchId] = useState('');
    const [loadedBatch, setLoadedBatch] = useState<Batch | null>(null);
    const [location, setLocation] = useState<{ lat: string; lng: string }>({ lat: '', lng: '' });
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const response = await batchAPI.getAll();
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
            setLoadedBatch(response.data.batch);
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

    const [evidenceImage, setEvidenceImage] = useState<string | null>(null);

    const handleReceive = async () => {
        if (!loadedBatch) return;

        setIsProcessing(true);
        try {
            const formData = new FormData();
            formData.append('latitude', location.lat || '0');
            formData.append('longitude', location.lng || '0');
            formData.append('notes', 'Received at retail location');

            if (evidenceImage) {
                const fetchRes = await fetch(evidenceImage);
                const blob = await fetchRes.blob();
                formData.append('image', blob, 'receive-evidence.jpg');
            }

            const response = await batchAPI.receive(loadedBatch.batch_id, formData);

            toast({
                title: 'Batch Received',
                description: `${loadedBatch.batch_id} added to inventory${response.data.blockchain_tx_id ? ` (TX: ${response.data.blockchain_tx_id.substring(0, 8)}...)` : ''}`,
            });

            // Refresh data after successful blockchain transaction
            await loadData();
            setLoadedBatch(null);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Receive failed';
            toast({
                title: 'Receive Failed',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSell = async (batchId: string) => {
        setIsProcessing(true);
        try {
            const response = await batchAPI.sell(batchId, {
                notes: 'Sold to customer',
            });

            toast({
                title: 'Batch Sold',
                description: `${batchId} marked as sold${response.data.blockchain_tx_id ? ` (TX: ${response.data.blockchain_tx_id.substring(0, 8)}...)` : ''}`,
            });

            // Refresh data after successful blockchain transaction
            await loadData();
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Sale failed';
            toast({
                title: 'Sale Failed',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsProcessing(false);
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
            sold: 'bg-gray-500',
        };
        return colors[status] || 'bg-gray-500';
    };

    const inventoryBatches = batches.filter(b => b.status === 'received');
    const soldBatches = batches.filter(b => b.status === 'sold');

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-purple-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Store className="h-8 w-8" />
                        <div>
                            <h1 className="text-xl font-bold">Retailer Dashboard</h1>
                            <p className="text-sm text-purple-100">Welcome, {user?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => navigate('/profile')}>
                            My Profile
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="bg-purple-100 p-2 rounded-full">
                                <User className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                                <p className="font-semibold">{user?.name}</p>
                                <p className="text-xs text-gray-500">Retailer</p>
                            </div>
                        </div>
                        <Button variant="outline" size="icon" onClick={handleLogout}>
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Receive Batch Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <QrCode className="h-5 w-5" />
                            Receive Batch
                        </CardTitle>
                        <CardDescription>
                            Scan or enter batch ID to receive delivery
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
                                Load
                            </Button>
                            <Button variant="outline">
                                <Camera className="h-4 w-4 mr-2" />
                                Scan
                            </Button>
                        </div>

                        {loadedBatch && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <h4 className="font-semibold text-lg">{loadedBatch.crop}</h4>
                                        <p className="font-mono text-sm text-gray-600">{loadedBatch.batch_id}</p>
                                    </div>
                                    <Badge className={getStatusColor(loadedBatch.status)}>
                                        {loadedBatch.status.replace('_', ' ')}
                                    </Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                                    <div>
                                        <p className="text-gray-500">Quantity</p>
                                        <p className="font-medium">{loadedBatch.quantity} {loadedBatch.unit}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Farmer</p>
                                        <p className="font-medium">{loadedBatch.farmer_name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500">Created</p>
                                        <p className="font-medium">{new Date(loadedBatch.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <LocationInput
                                        latitude={location.lat}
                                        longitude={location.lng}
                                        onChange={(lat, lng) => setLocation({ lat, lng })}
                                        label="Retail Location"
                                    />
                                </div>

                                {loadedBatch.status === 'delivered' && (
                                    <div className="space-y-4">
                                        <CameraInput
                                            onCapture={setEvidenceImage}
                                            label="Proof of Receipt"
                                        />
                                        <Button
                                            onClick={handleReceive}
                                            className="w-full bg-green-600 hover:bg-green-700"
                                            disabled={isProcessing}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            {isProcessing ? 'Processing...' : 'Confirm Receipt'}
                                        </Button>
                                    </div>
                                )}

                                {loadedBatch.status === 'in_transit' && (
                                    <div className="text-center py-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                        <p className="text-yellow-700 font-medium">
                                            ⏳ Awaiting Driver Delivery
                                        </p>
                                        <p className="text-sm text-yellow-600">
                                            The driver must mark this batch as delivered before you can receive it
                                        </p>
                                    </div>
                                )}

                                {loadedBatch.status === 'created' && (
                                    <div className="text-center py-3 bg-blue-50 border border-blue-200 rounded-lg">
                                        <p className="text-blue-700 font-medium">
                                            📦 Not Yet Picked Up
                                        </p>
                                        <p className="text-sm text-blue-600">
                                            This batch is still with the farmer
                                        </p>
                                    </div>
                                )}

                                {loadedBatch.status === 'received' && (
                                    <p className="text-center text-green-600 font-medium">
                                        <CheckCircle className="h-4 w-4 inline mr-1" />
                                        Already in your inventory
                                    </p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Inventory */}
                <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Current Inventory ({inventoryBatches.length})
                    </h2>

                    {inventoryBatches.length === 0 ? (
                        <Card className="text-center py-12">
                            <CardContent>
                                <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                <p className="text-gray-500">No items in inventory</p>
                                <p className="text-sm text-gray-400">Receive batches to add to inventory</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {inventoryBatches.map((batch) => (
                                <Card key={batch.id} className="hover:shadow-lg transition-shadow">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-lg">{batch.crop}</CardTitle>
                                                <CardDescription className="font-mono">{batch.batch_id}</CardDescription>
                                            </div>
                                            <Badge className="bg-green-500">In Stock</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 text-sm mb-4">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Quantity</span>
                                                <span>{batch.quantity} {batch.unit}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Farmer</span>
                                                <span>{batch.farmer_name || 'N/A'}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="flex-1">
                                                        <QrCode className="h-4 w-4 mr-1" />
                                                        QR
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Customer QR Code</DialogTitle>
                                                        <DialogDescription>{batch.batch_id}</DialogDescription>
                                                    </DialogHeader>
                                                    <div className="flex justify-center py-4">
                                                        <QRCodeSVG
                                                            value={`${window.location.origin}/scan/${batch.batch_id}`}
                                                            size={250}
                                                        />
                                                    </div>
                                                    <p className="text-center text-sm text-gray-500">
                                                        Customer can scan to view journey
                                                    </p>
                                                </DialogContent>
                                            </Dialog>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => navigate(`/scan/${batch.batch_id}`)}
                                            >
                                                <Eye className="h-4 w-4 mr-1" />
                                                Journey
                                            </Button>

                                            <Button
                                                size="sm"
                                                className="flex-1 bg-purple-600 hover:bg-purple-700"
                                                onClick={() => handleSell(batch.batch_id)}
                                                disabled={isProcessing}
                                            >
                                                <ShoppingCart className="h-4 w-4 mr-1" />
                                                Sell
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>

                {/* Sold Batches */}
                {soldBatches.length > 0 && (
                    <div>
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5" />
                            Sold Items ({soldBatches.length})
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {soldBatches.map((batch) => (
                                <Card key={batch.id} className="opacity-75">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <CardTitle className="text-base">{batch.crop}</CardTitle>
                                                <CardDescription className="font-mono text-xs">{batch.batch_id}</CardDescription>
                                            </div>
                                            <Badge variant="secondary">Sold</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-sm text-gray-500">{batch.quantity} {batch.unit}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div >
    );
};

export default RetailerDashboard;
