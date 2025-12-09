import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { statsAPI, batchAPI, agristackAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    Shield, Package, Truck, Store, Users, LogOut,
    BarChart3, MapPin, RefreshCw, ExternalLink, Leaf, CheckCircle
} from 'lucide-react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1Ijoic3JlZWFkaXR5YWRldiIsImEiOiJjbTRpNGRocmcwMGo1MmxzYnU5cWZlbmRjIn0.YWV6AzSWOvKqPROGNJpOPQ';
mapboxgl.accessToken = MAPBOX_TOKEN;

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
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const markersRef = useRef<mapboxgl.Marker[]>([]);

    const [stats, setStats] = useState<Stats | null>(null);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [agristackFarmers, setAgristackFarmers] = useState<AgristackFarmer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

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

    const defaultCenter: [number, number] = [78.9629, 20.5937]; // India center [lng, lat]

    // Initialize Mapbox map when overview tab is active
    useEffect(() => {
        if (activeTab !== 'overview' || !mapContainerRef.current) return;
        if (mapRef.current) return; // Already initialized

        const map = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: 'mapbox://styles/mapbox/streets-v12',
            center: defaultCenter,
            zoom: 5,
        });

        map.addControl(new mapboxgl.NavigationControl(), 'top-right');
        mapRef.current = map;

        return () => {
            mapRef.current?.remove();
            mapRef.current = null;
        };
    }, [activeTab]);

    // Update markers when batches change
    useEffect(() => {
        if (!mapRef.current || activeTab !== 'overview') return;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        const batchesWithCoords = batches.filter(b => b.origin_latitude && b.origin_longitude);

        // Add new markers
        batchesWithCoords.forEach((batch) => {
            const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div style="padding: 8px;">
                    <strong style="font-size: 14px;">${batch.crop}</strong><br/>
                    <span style="color: #666;">${batch.batch_id}</span><br/>
                    <span style="color: #888;">${batch.farmer_name || 'Unknown Farmer'}</span>
                </div>
            `);

            const marker = new mapboxgl.Marker({ color: '#ef4444' })
                .setLngLat([batch.origin_longitude, batch.origin_latitude])
                .setPopup(popup)
                .addTo(mapRef.current!);

            markersRef.current.push(marker);
        });

        // Fit bounds if we have batches
        if (batchesWithCoords.length > 0) {
            const bounds = new mapboxgl.LngLatBounds();
            batchesWithCoords.forEach(b => bounds.extend([b.origin_longitude, b.origin_latitude]));
            mapRef.current.fitBounds(bounds, { padding: 50 });
        }
    }, [batches, activeTab]);

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
                        <Shield className="h-8 w-8 text-red-500" />
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
                                    <div
                                        ref={mapContainerRef}
                                        style={{ height: '100%', width: '100%' }}
                                    />
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
                                                    <Button variant="ghost" size="sm" onClick={() => navigate(`/scan/${batch.batch_id}`)}>
                                                        View
                                                    </Button>
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
        </div>
    );
};

export default AdminDashboard;
