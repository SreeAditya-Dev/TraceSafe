import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { agristackAPI, batchAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    Tractor, Plus, QrCode, MapPin, Package, CheckCircle,
    AlertCircle, LogOut, Search, Leaf
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { LocationInput } from '@/components/LocationInput';

interface Batch {
    id: string;
    batch_id: string;
    crop: string;
    quantity: number;
    unit: string;
    status: string;
    harvest_date: string;
    qr_code_url: string;
    created_at: string;
}

interface AgristackFarmer {
    farmer_id: string;
    name: string;
    land: string;
    crops: string;
    verified: boolean;
    registry_status: string;
}

const FarmerDashboard: React.FC = () => {
    const { user, profile, logout, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [batches, setBatches] = useState<Batch[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showCreateBatch, setShowCreateBatch] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

    // Onboarding state
    const [agristackId, setAgristackId] = useState('');
    const [verificationResult, setVerificationResult] = useState<AgristackFarmer | null>(null);
    const [isVerifying, setIsVerifying] = useState(false);

    // Create batch state
    const [batchForm, setBatchForm] = useState({
        crop: '',
        variety: '',
        quantity: '',
        unit: 'kg',
        harvestDate: new Date().toISOString().split('T')[0],
        address: '',
    });
    const [isCreating, setIsCreating] = useState(false);
    const [createdQR, setCreatedQR] = useState<string | null>(null);
    const [location, setLocation] = useState<{ lat: string; lng: string }>({ lat: '', lng: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            await refreshProfile();
            const response = await batchAPI.getAll();
            setBatches(response.data.batches || []);

            // Check if farmer needs to onboard
            if (!profile?.agristack_id) {
                setShowOnboarding(true);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setIsLoading(false);
        }
    };



    const handleVerifyAgristack = async () => {
        if (!agristackId.trim()) return;

        setIsVerifying(true);
        try {
            const response = await agristackAPI.verifyFarmer(agristackId);
            if (response.data.exists) {
                setVerificationResult(response.data.farmer);
                toast({
                    title: 'Farmer Found',
                    description: `Verified: ${response.data.farmer.name}`,
                });
            } else {
                toast({
                    title: 'Not Found',
                    description: 'This AgriStack ID was not found in the registry',
                    variant: 'destructive',
                });
                setVerificationResult(null);
            }
        } catch (error) {
            toast({
                title: 'Verification Failed',
                description: 'Could not verify AgriStack ID',
                variant: 'destructive',
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleOnboard = async () => {
        if (!verificationResult) return;

        try {
            await agristackAPI.onboardFarmer({ agristackId });
            await refreshProfile();
            setShowOnboarding(false);
            toast({
                title: 'Onboarding Complete',
                description: 'Your AgriStack profile has been linked',
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Onboarding failed';
            toast({
                title: 'Onboarding Failed',
                description: errorMessage,
                variant: 'destructive',
            });
        }
    };

    const handleCreateBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);

        try {
            const formData = new FormData();
            formData.append('crop', batchForm.crop);
            formData.append('variety', batchForm.variety);
            formData.append('quantity', batchForm.quantity);
            formData.append('unit', batchForm.unit);
            formData.append('harvestDate', batchForm.harvestDate);
            formData.append('address', batchForm.address);

            if (location.lat && location.lng) {
                formData.append('latitude', location.lat);
                formData.append('longitude', location.lng);
            }

            const response = await batchAPI.create(formData);
            setCreatedQR(response.data.batch.batch_id);
            setBatches([response.data.batch, ...batches]);

            toast({
                title: 'Batch Created',
                description: `Batch ${response.data.batch.batch_id} created successfully`,
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create batch';
            toast({
                title: 'Creation Failed',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsCreating(false);
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

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-green-600 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Tractor className="h-8 w-8" />
                        <div>
                            <h1 className="text-xl font-bold">Farmer Dashboard</h1>
                            <p className="text-sm text-green-100">Welcome, {user?.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {profile?.verified && (
                            <Badge className="bg-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                AgriStack Verified
                            </Badge>
                        )}
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-green-700">
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
                {/* Onboarding Card */}
                {showOnboarding && !profile?.agristack_id && (
                    <Card className="border-yellow-300 bg-yellow-50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-yellow-800">
                                <AlertCircle className="h-5 w-5" />
                                Complete AgriStack Verification
                            </CardTitle>
                            <CardDescription>
                                Link your AgriStack ID to create batches and access all features
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter your AgriStack ID (e.g., MH234567890121)"
                                    value={agristackId}
                                    onChange={(e) => setAgristackId(e.target.value)}
                                    className="flex-1"
                                />
                                <Button onClick={handleVerifyAgristack} disabled={isVerifying}>
                                    <Search className="h-4 w-4 mr-2" />
                                    {isVerifying ? 'Verifying...' : 'Verify'}
                                </Button>
                            </div>

                            {verificationResult && (
                                <div className="bg-white p-4 rounded-lg border border-green-300">
                                    <h4 className="font-semibold text-green-800 mb-2">Farmer Found in Registry</h4>
                                    <div className="grid grid-cols-2 gap-2 text-sm">
                                        <div><span className="text-gray-500">Name:</span> {verificationResult.name}</div>
                                        <div><span className="text-gray-500">Land:</span> {verificationResult.land}</div>
                                        <div><span className="text-gray-500">Crops:</span> {verificationResult.crops}</div>
                                        <div><span className="text-gray-500">Status:</span> {verificationResult.registry_status}</div>
                                    </div>
                                    <Button onClick={handleOnboard} className="mt-4 w-full bg-green-600 hover:bg-green-700">
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Link This Profile
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Profile Card */}
                {profile?.agristack_id && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Leaf className="h-5 w-5 text-green-600" />
                                Your Profile
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">AgriStack ID</p>
                                    <p className="font-medium">{profile.agristack_id}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Land</p>
                                    <p className="font-medium">{profile.land || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Crops</p>
                                    <p className="font-medium">{profile.crops || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Verification</p>
                                    <Badge variant={profile.verified ? 'default' : 'secondary'}>
                                        {profile.verified ? 'Verified' : 'Pending'}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Actions */}
                <div className="flex gap-4">
                    <Dialog open={showCreateBatch} onOpenChange={setShowCreateBatch}>
                        <DialogTrigger asChild>
                            <Button className="bg-green-600 hover:bg-green-700" disabled={!profile?.agristack_id}>
                                <Plus className="h-4 w-4 mr-2" />
                                Create New Batch
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Create New Batch</DialogTitle>
                                <DialogDescription>
                                    Fill in the details of your produce batch
                                </DialogDescription>
                            </DialogHeader>

                            {createdQR ? (
                                <div className="text-center py-4">
                                    <p className="text-green-600 font-semibold mb-4">Batch Created Successfully!</p>
                                    <div className="bg-white p-4 inline-block rounded-lg border">
                                        <QRCodeSVG
                                            value={`${window.location.origin}/scan/${createdQR}`}
                                            size={200}
                                        />
                                    </div>
                                    <p className="mt-4 font-mono text-lg">{createdQR}</p>
                                    <p className="text-sm text-gray-500 mt-2">Scan or share this code</p>
                                    <Button
                                        onClick={() => { setCreatedQR(null); setShowCreateBatch(false); }}
                                        className="mt-4"
                                    >
                                        Done
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleCreateBatch} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Crop Type</Label>
                                            <Input
                                                placeholder="e.g., Tomato"
                                                value={batchForm.crop}
                                                onChange={(e) => setBatchForm({ ...batchForm, crop: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Variety</Label>
                                            <Input
                                                placeholder="e.g., Cherry"
                                                value={batchForm.variety}
                                                onChange={(e) => setBatchForm({ ...batchForm, variety: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Quantity</Label>
                                            <Input
                                                type="number"
                                                placeholder="50"
                                                value={batchForm.quantity}
                                                onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Unit</Label>
                                            <Select value={batchForm.unit} onValueChange={(v) => setBatchForm({ ...batchForm, unit: v })}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                                                    <SelectItem value="quintal">Quintals</SelectItem>
                                                    <SelectItem value="ton">Tonnes</SelectItem>
                                                    <SelectItem value="pieces">Pieces</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Harvest Date</Label>
                                        <Input
                                            type="date"
                                            value={batchForm.harvestDate}
                                            onChange={(e) => setBatchForm({ ...batchForm, harvestDate: e.target.value })}
                                            required
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Farm Address</Label>
                                        <Textarea
                                            placeholder="Village, District, State"
                                            value={batchForm.address}
                                            onChange={(e) => setBatchForm({ ...batchForm, address: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <LocationInput
                                            latitude={location.lat}
                                            longitude={location.lng}
                                            onChange={(lat, lng) => setLocation({ lat, lng })}
                                            label="Farm Location"
                                        />
                                    </div>

                                    <Button type="submit" className="w-full" disabled={isCreating}>
                                        {isCreating ? 'Creating...' : 'Create Batch & Generate QR'}
                                    </Button>
                                </form>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Batches Grid */}
                <div>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Your Batches ({batches.length})
                    </h2>

                    {batches.length === 0 ? (
                        <Card className="text-center py-12">
                            <CardContent>
                                <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                                <p className="text-gray-500">No batches created yet</p>
                                <p className="text-sm text-gray-400">Create your first batch to get started</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {batches.map((batch) => (
                                <Card key={batch.id} className="hover:shadow-lg transition-shadow">
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
                                                <span className="text-gray-500">Created</span>
                                                <span>{new Date(batch.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex gap-2">
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="flex-1">
                                                        <QrCode className="h-4 w-4 mr-1" />
                                                        QR Code
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Batch QR Code</DialogTitle>
                                                        <DialogDescription>{batch.batch_id}</DialogDescription>
                                                    </DialogHeader>
                                                    <div className="flex justify-center py-4">
                                                        <QRCodeSVG
                                                            value={`${window.location.origin}/scan/${batch.batch_id}`}
                                                            size={250}
                                                        />
                                                    </div>
                                                    <p className="text-center text-sm text-gray-500">
                                                        Scan to view journey
                                                    </p>
                                                </DialogContent>
                                            </Dialog>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => navigate(`/scan/${batch.batch_id}`)}
                                            >
                                                <MapPin className="h-4 w-4 mr-1" />
                                                View Journey
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default FarmerDashboard;
