import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { statsAPI, batchAPI, agristackAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    Shield, Package, Truck, Store, Users, LogOut,
    LayoutDashboard, FileText, Settings, Search, Filter, Download, ChevronRight, Eye, ShieldCheck, Award,
    BarChart3, MapPin, RefreshCw, ExternalLink, Leaf, CheckCircle, AlertTriangle
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

interface Stats {
    batches: {
        total: number;
        created: number;
        in_transit: number;
        delivered: number;
        received: number;
        sold: number;
    };
    farmers: {
        registered: number;
    };
    journey_events: number;
    agristack: {
        total: number;
        verified: number;
    };
}

interface Batch {
    id: string;
    batch_id: string;
    crop: string;
    quantity: number;
    unit: string;
    status: string;
    farmer_name: string;
    origin_latitude: number;
    origin_longitude: number;
    created_at: string;
}

interface AgristackFarmer {
    farmer_id: string;
    name: string;
    land: string;
    crops: string;
    verified: boolean;
    registry_status: string;
    state: string;
}

const AdminDashboard: React.FC = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [stats, setStats] = useState<Stats | null>(null);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [agristackFarmers, setAgristackFarmers] = useState<AgristackFarmer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedBatch, setSelectedBatch] = useState<any | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [statsRes, batchesRes, agristackRes] = await Promise.all([
                statsAPI.get(),
                batchAPI.getAll({ limit: 100 }),
                agristackAPI.getFarmers({ limit: 100 }),
            ]);

            setStats(statsRes.data);
            setBatches(batchesRes.data.batches || []);
            setAgristackFarmers(agristackRes.data.farmers || []);
        } catch (error) {
            console.error('Failed to load data:', error);
            toast({
                title: 'Error',
                description: 'Failed to load dashboard data',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleAgristackSync = async () => {
        setIsSyncing(true);
        try {
            await agristackAPI.sync();
            await loadData();
            toast({
                title: 'Sync Complete',
                description: 'AgriStack data synchronized successfully',
            });
        } catch (error) {
            toast({
                title: 'Sync Failed',
                description: 'Failed to sync with AgriStack',
                variant: 'destructive',
            });
        } finally {
            setIsSyncing(false);
        }
    };

    const [isCertifying, setIsCertifying] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<any>(null);

    const handleViewDetails = async (batchId: string) => {
        setIsLoadingDetails(true);
        setSelectedBatch(null);
        setVerificationResult(null); // Reset verification result
        setIsDetailsOpen(true);
        try {
            const response = await batchAPI.getJourney(batchId);
            setSelectedBatch(response.data);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to load batch details',
                variant: 'destructive',
            });
            setIsDetailsOpen(false);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleVerify = async () => {
        if (!selectedBatch) return;

        setIsVerifying(true);
        setVerificationResult(null);
        try {
            const response = await batchAPI.verify(selectedBatch.batch.batch_id);
            setVerificationResult(response.data);

            if (response.data.verified) {
                toast({
                    title: 'Verification Successful',
                    description: 'Batch data matches blockchain record.',
                    className: 'bg-green-50 border-green-200 text-green-800',
                });
            } else {
                toast({
                    title: 'Integrity Warning',
                    description: 'Discrepancies found between database and blockchain!',
                    variant: 'destructive',
                });
            }
        } catch (error: any) {
            toast({
                title: 'Verification Failed',
                description: error.response?.data?.message || 'Failed to verify batch integrity',
                variant: 'destructive',
            });
        } finally {
            setIsVerifying(false);
        }
    };

    const handleCertify = async () => {
        if (!selectedBatch) return;

        setIsCertifying(true);
        try {
            const response = await batchAPI.certify(selectedBatch.batch.batch_id);

            toast({
                title: 'Batch Certified',
                description: `Certificate ID: ${response.data.certificate_id}`,
            });

            // Refresh details
            handleViewDetails(selectedBatch.batch.batch_id);
        } catch (error: any) {
            toast({
                title: 'Certification Failed',
                description: error.response?.data?.message || 'Failed to certify batch',
                variant: 'destructive',
            });
        } finally {
            setIsCertifying(false);
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

    // Get batches with coordinates for map
    const batchesWithCoords = batches.filter(b => b.origin_latitude && b.origin_longitude);

    // Calculate center for Leaflet map
    const getMapCenter = (): [number, number] => {
        if (batchesWithCoords.length > 0) {
            return [batchesWithCoords[0].origin_latitude, batchesWithCoords[0].origin_longitude];
        }
        return [20.5937, 78.9629]; // India center
    };

    const mapCenter = getMapCenter();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-gray-900 text-white shadow-lg">
                <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/android-chrome-192x192.png" alt="TraceSafe Logo" className="h-10 w-10" />
                        <div>
                            <h1 className="text-xl font-bold">Admin Dashboard</h1>
                            <p className="text-sm text-gray-400">TraceSafe Control Center</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-400">Welcome, {user?.name}</span>
                        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-white hover:bg-gray-800">
                            <LogOut className="h-4 w-4 mr-2" />
                            Logout
                        </Button>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="bg-white border-b">
                <div className="max-w-7xl mx-auto px-4">
                    <nav className="flex gap-4">
                        {['overview', 'batches', 'agristack', 'govt'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                                    ? 'border-red-500 text-red-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            <main className="max-w-7xl mx-auto px-4 py-6">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {/* Stats Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Total Batches</CardDescription>
                                    <CardTitle className="text-3xl">{stats?.batches.total || 0}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Package className="h-8 w-8 text-blue-500" />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>In Transit</CardDescription>
                                    <CardTitle className="text-3xl">{stats?.batches.in_transit || 0}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Truck className="h-8 w-8 text-yellow-500" />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Registered Farmers</CardDescription>
                                    <CardTitle className="text-3xl">{stats?.farmers.registered || 0}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Users className="h-8 w-8 text-green-500" />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>AgriStack Verified</CardDescription>
                                    <CardTitle className="text-3xl">{stats?.agristack.verified || 0}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <CheckCircle className="h-8 w-8 text-purple-500" />
                                </CardContent>
                            </Card>
                        </div>

                        {/* Status Breakdown */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart3 className="h-5 w-5" />
                                    Batch Status Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-4 flex-wrap">
                                    {Object.entries(stats?.batches || {}).filter(([key]) => key !== 'total').map(([status, count]) => (
                                        <div key={status} className="flex items-center gap-2">
                                            <span className={`w-3 h-3 rounded-full ${getStatusColor(status)}`}></span>
                                            <span className="text-sm capitalize">{status.replace('_', ' ')}: {count as number}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Map */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5" />
                                    Batch Origins Map
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-96 rounded-lg overflow-hidden">
                                    <MapContainer
                                        center={mapCenter}
                                        zoom={5}
                                        style={{ height: '100%', width: '100%' }}
                                    >
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        />
                                        {batchesWithCoords.map((batch, idx) => (
                                            <Marker
                                                key={batch.batch_id || idx}
                                                position={[batch.origin_latitude, batch.origin_longitude]}
                                            >
                                                <Popup>
                                                    <strong>{batch.crop}</strong><br />
                                                    {batch.batch_id}<br />
                                                    {batch.farmer_name || 'Unknown Farmer'}
                                                </Popup>
                                            </Marker>
                                        ))}
                                    </MapContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Batches Tab */}
                {activeTab === 'batches' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>All Batches ({batches.length})</CardTitle>
                            <CardDescription>Complete list of all batches in the system</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-3 px-4">Batch ID</th>
                                            <th className="text-left py-3 px-4">Crop</th>
                                            <th className="text-left py-3 px-4">Quantity</th>
                                            <th className="text-left py-3 px-4">Farmer</th>
                                            <th className="text-left py-3 px-4">Status</th>
                                            <th className="text-left py-3 px-4">Created</th>
                                            <th className="text-left py-3 px-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {batches.map((batch) => (
                                            <tr key={batch.id} className="border-b hover:bg-gray-50">
                                                <td className="py-3 px-4 font-mono">{batch.batch_id}</td>
                                                <td className="py-3 px-4">{batch.crop}</td>
                                                <td className="py-3 px-4">{batch.quantity} {batch.unit}</td>
                                                <td className="py-3 px-4">{batch.farmer_name || 'N/A'}</td>
                                                <td className="py-3 px-4">
                                                    <Badge className={getStatusColor(batch.status)}>
                                                        {batch.status.replace('_', ' ')}
                                                    </Badge>
                                                </td>
                                                <td className="py-3 px-4">{new Date(batch.created_at).toLocaleDateString()}</td>
                                                <td className="py-3 px-4">
                                                    <div className="flex gap-2">
                                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/scan/${batch.batch_id}`)}>
                                                            <ExternalLink className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(batch.batch_id)}>
                                                            <Eye className="h-4 w-4 text-blue-600" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* AgriStack Tab */}
                {activeTab === 'agristack' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-semibold">AgriStack Registry</h2>
                                <p className="text-gray-600">Farmer records synced from AgriStack</p>
                            </div>
                            <Button onClick={handleAgristackSync} disabled={isSyncing}>
                                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                                {isSyncing ? 'Syncing...' : 'Sync Now'}
                            </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Total in Registry</CardDescription>
                                    <CardTitle className="text-2xl">{agristackFarmers.length}</CardTitle>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Verified</CardDescription>
                                    <CardTitle className="text-2xl text-green-600">
                                        {agristackFarmers.filter(f => f.verified).length}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardDescription>Pending</CardDescription>
                                    <CardTitle className="text-2xl text-yellow-600">
                                        {agristackFarmers.filter(f => !f.verified).length}
                                    </CardTitle>
                                </CardHeader>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Farmer Records</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-3 px-4">Farmer ID</th>
                                                <th className="text-left py-3 px-4">Name</th>
                                                <th className="text-left py-3 px-4">State</th>
                                                <th className="text-left py-3 px-4">Land</th>
                                                <th className="text-left py-3 px-4">Crops</th>
                                                <th className="text-left py-3 px-4">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {agristackFarmers.map((farmer) => (
                                                <tr key={farmer.farmer_id} className="border-b hover:bg-gray-50">
                                                    <td className="py-3 px-4 font-mono">{farmer.farmer_id}</td>
                                                    <td className="py-3 px-4">{farmer.name}</td>
                                                    <td className="py-3 px-4">{farmer.state || 'N/A'}</td>
                                                    <td className="py-3 px-4">{farmer.land}</td>
                                                    <td className="py-3 px-4">{farmer.crops}</td>
                                                    <td className="py-3 px-4">
                                                        <Badge variant={farmer.verified ? 'default' : 'secondary'}>
                                                            {farmer.registry_status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Government Integrations Tab */}
                {activeTab === 'govt' && (
                    <div className="space-y-6">
                        <h2 className="text-xl font-semibold">Government Integrations</h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Link to="/govt/enam">
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between">
                                            e-NAM Dashboard
                                            <ExternalLink className="h-4 w-4 text-gray-400" />
                                        </CardTitle>
                                        <CardDescription>
                                            Commodity prices and batch tracking synced with electronic National Agriculture Market
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            </Link>

                            <Link to="/govt/agristack">
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-green-200">
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between text-green-700">
                                            AgriStack Registry
                                            <ExternalLink className="h-4 w-4 text-gray-400" />
                                        </CardTitle>
                                        <CardDescription>
                                            Farmer verification and registry data from Digital Agriculture Mission
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            </Link>

                            <Link to="/govt/fssai">
                                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-orange-200">
                                    <CardHeader>
                                        <CardTitle className="flex items-center justify-between text-orange-700">
                                            FSSAI Compliance
                                            <ExternalLink className="h-4 w-4 text-gray-400" />
                                        </CardTitle>
                                        <CardDescription>
                                            Food safety compliance status, license verification, and recall notices
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            </Link>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Leaf className="h-5 w-5 text-green-600" />
                                    Integration Status
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="font-medium">AgriStack Sync</p>
                                            <p className="text-sm text-gray-500">Farmer registry data</p>
                                        </div>
                                        <Badge className="bg-green-500">Connected</Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="font-medium">e-NAM Prices</p>
                                            <p className="text-sm text-gray-500">Market price data</p>
                                        </div>
                                        <Badge className="bg-green-500">Connected</Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="font-medium">FSSAI Verification</p>
                                            <p className="text-sm text-gray-500">License validation</p>
                                        </div>
                                        <Badge className="bg-green-500">Connected</Badge>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div>
                                            <p className="font-medium">Blockchain Network</p>
                                            <p className="text-sm text-gray-500">Hyperledger Fabric</p>
                                        </div>
                                        <Badge variant="secondary">Simulated</Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </main>
            {/* Batch Details Modal */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Batch Details</DialogTitle>
                        <DialogDescription>Full journey history and evidence</DialogDescription>
                    </DialogHeader>

                    {isLoadingDetails ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : selectedBatch ? (
                        <div className="space-y-6">
                            {/* Header Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <p className="text-sm text-gray-500">Batch ID</p>
                                    <p className="font-mono font-medium">{selectedBatch.batch.batch_id}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Crop / Variety</p>
                                    <p className="font-medium">{selectedBatch.batch.crop} ({selectedBatch.batch.variety})</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Farmer</p>
                                    <p className="font-medium">{selectedBatch.farmer.name}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Status</p>
                                    <Badge className={getStatusColor(selectedBatch.batch.status)}>
                                        {selectedBatch.batch.status.replace('_', ' ').toUpperCase()}
                                    </Badge>
                                </div>
                            </div>


                            {/* Certification Action */}
                            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-lg">
                                <div>
                                    <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                                        <ShieldCheck className="h-5 w-5" />
                                        Smart Certification
                                    </h3>
                                    <p className="text-sm text-blue-700">
                                        {selectedBatch.journey.some((e: any) => e.event_type === 'certified')
                                            ? 'This batch has been verified and certified on the blockchain.'
                                            : 'Validate this batch and issue a blockchain certificate.'}
                                    </p>
                                </div>

                                {selectedBatch.journey.some((e: any) => e.event_type === 'certified') ? (
                                    <div className="text-right">
                                        <Badge className="bg-blue-600 hover:bg-blue-700 text-lg py-1 px-3 mb-1">
                                            <Award className="h-4 w-4 mr-1" />
                                            Certified
                                        </Badge>
                                        <p className="text-xs font-mono text-blue-800">
                                            {selectedBatch.journey.find((e: any) => e.event_type === 'certified')?.notes.split('ID: ')[1] || 'Verified'}
                                        </p>
                                    </div>
                                ) : (
                                    (selectedBatch.batch.status === 'received' || selectedBatch.batch.status === 'sold') ? (
                                        <Button
                                            onClick={handleCertify}
                                            disabled={isCertifying}
                                            className="bg-blue-600 hover:bg-blue-700"
                                        >
                                            {isCertifying ? 'Certifying...' : 'Certify Batch'}
                                        </Button>
                                    ) : (
                                        <Badge variant="outline" className="text-gray-500 border-gray-300">
                                            Not Eligible Yet
                                        </Badge>
                                    )
                                )}
                            </div>

                            {/* Integrity Verification */}
                            <div className="flex flex-col p-4 bg-purple-50 border border-purple-100 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                                            <Shield className="h-5 w-5" />
                                            Integrity Verification
                                        </h3>
                                        <p className="text-sm text-purple-700">
                                            Verify that local data matches the immutable blockchain record.
                                        </p>
                                    </div>
                                    <Button
                                        onClick={handleVerify}
                                        disabled={isVerifying}
                                        variant="outline"
                                        className="border-purple-300 text-purple-700 hover:bg-purple-100"
                                    >
                                        {isVerifying ? 'Verifying...' : 'Verify Integrity'}
                                    </Button>
                                </div>

                                {verificationResult && (
                                    <div className={`mt-3 p-3 rounded-md text-sm ${verificationResult.verified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {verificationResult.verified ? (
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                                <span className="font-medium">Verification Successful: Data is intact.</span>
                                            </div>
                                        ) : (
                                            <div>
                                                <div className="flex items-center gap-2 mb-2 font-bold">
                                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                                    <span>Tampering Detected!</span>
                                                </div>
                                                <ul className="list-disc list-inside space-y-1 pl-1">
                                                    {verificationResult.discrepancies.map((d: string, i: number) => (
                                                        <li key={i}>{d}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Journey Timeline */}
                            <div>
                                <h3 className="text-lg font-semibold mb-4">Journey Timeline</h3>
                                <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                                    {selectedBatch.journey.map((event: any, index: number) => (
                                        <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            {/* Icon */}
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-300 group-[.is-active]:bg-blue-500 text-slate-500 group-[.is-active]:text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                                <CheckCircle className="w-5 h-5" />
                                            </div>

                                            {/* Content */}
                                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border border-slate-200 shadow bg-white">
                                                <div className="flex items-center justify-between space-x-2 mb-1">
                                                    <div className="font-bold text-slate-900 capitalize">{event.event_type.replace('_', ' ')}</div>
                                                    <time className="font-caveat font-medium text-indigo-500">
                                                        {(() => {
                                                            const dateVal = event.created_at || event.timestamp;
                                                            if (!dateVal) return 'N/A';
                                                            const date = new Date(dateVal);
                                                            return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleString();
                                                        })()}
                                                    </time>
                                                </div>
                                                <div className="text-slate-500 text-sm mb-2">
                                                    by <span className="font-medium text-slate-900">{event.actor_name}</span> ({event.actor_type})
                                                </div>
                                                {event.notes && (
                                                    <div className="text-slate-600 mb-2 bg-slate-50 p-2 rounded text-sm">
                                                        {event.notes}
                                                    </div>
                                                )}

                                                {/* Images */}
                                                {event.image_urls && event.image_urls.length > 0 && (
                                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                                        {event.image_urls.map((url: string, i: number) => (
                                                            <div key={i} className="relative aspect-video rounded-md overflow-hidden border">
                                                                <img
                                                                    src={url}
                                                                    alt={`Evidence ${i + 1}`}
                                                                    className="object-cover w-full h-full hover:scale-105 transition-transform"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500">No details available</div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminDashboard;
