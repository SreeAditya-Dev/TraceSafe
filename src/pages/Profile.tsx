import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User, Phone, Shield, Store, Truck, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
    const { user, profile, refreshProfile } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        fssaiLicense: '',
        shopName: '',
        vehicleNumber: '',
        licenseNumber: '',
    });

    useEffect(() => {
        if (user && profile) {
            const p = profile as any;
            setFormData({
                name: user.name || '',
                phone: user.phone || '',
                fssaiLicense: p.fssai_license || '',
                shopName: p.shop_name || '',
                vehicleNumber: p.vehicle_number || '',
                licenseNumber: p.license_number || '',
            });
        }
    }, [user, profile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await authAPI.updateProfile(formData);
            await refreshProfile();
            toast({
                title: 'Profile Updated',
                description: 'Your changes have been saved successfully.',
            });
        } catch (error) {
            console.error('Update failed:', error);
            toast({
                title: 'Update Failed',
                description: 'Failed to update profile. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (!user) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <Button variant="ghost" className="mb-6" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                </Button>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">My Profile</CardTitle>
                        <CardDescription>Manage your account settings and preferences</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">Full Name</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="name"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="pl-10"
                                        placeholder="Your Name"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                    <Input
                                        id="phone"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="pl-10"
                                        placeholder="Phone Number"
                                    />
                                </div>
                            </div>

                            {/* Role Specific Fields */}
                            {(user.role === 'farmer' || user.role === 'retailer') && (
                                <div className="space-y-2">
                                    <Label htmlFor="fssaiLicense">FSSAI License Number</Label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="fssaiLicense"
                                            name="fssaiLicense"
                                            value={formData.fssaiLicense}
                                            onChange={handleChange}
                                            className="pl-10"
                                            placeholder="14-digit FSSAI License"
                                            maxLength={14}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500">This will be automatically applied to your batches.</p>
                                </div>
                            )}

                            {user.role === 'retailer' && (
                                <div className="space-y-2">
                                    <Label htmlFor="shopName">Shop Name</Label>
                                    <div className="relative">
                                        <Store className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                        <Input
                                            id="shopName"
                                            name="shopName"
                                            value={formData.shopName}
                                            onChange={handleChange}
                                            className="pl-10"
                                            placeholder="Shop Name"
                                        />
                                    </div>
                                </div>
                            )}

                            {user.role === 'driver' && (
                                <>
                                    <div className="space-y-2">
                                        <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                                        <div className="relative">
                                            <Truck className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="vehicleNumber"
                                                name="vehicleNumber"
                                                value={formData.vehicleNumber}
                                                onChange={handleChange}
                                                className="pl-10"
                                                placeholder="Vehicle Number"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="licenseNumber">Driving License</Label>
                                        <div className="relative">
                                            <CreditCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                            <Input
                                                id="licenseNumber"
                                                name="licenseNumber"
                                                value={formData.licenseNumber}
                                                onChange={handleChange}
                                                className="pl-10"
                                                placeholder="Driving License Number"
                                            />
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="pt-4">
                                <Button type="submit" className="w-full" disabled={isLoading}>
                                    {isLoading ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Profile;
