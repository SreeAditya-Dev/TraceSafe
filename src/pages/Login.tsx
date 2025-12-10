import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Tractor, Truck, Store, Shield, Leaf } from 'lucide-react';

const roleIcons = {
    farmer: Tractor,
    driver: Truck,
    retailer: Store,
    admin: Shield,
};

// Roles allowed for registration (farmer verifies via AgriStack, admin is pre-set)
const registerableRoles = {
    driver: Truck,
    retailer: Store,
};

const roleColors = {
    farmer: 'bg-green-500 hover:bg-green-600',
    driver: 'bg-blue-500 hover:bg-blue-600',
    retailer: 'bg-purple-500 hover:bg-purple-600',
    admin: 'bg-red-500 hover:bg-red-600',
};

const roleDescriptions = {
    farmer: 'Create batches, generate QR codes, track your produce',
    driver: 'Pickup batches, update transit info, deliver to retailers',
    retailer: 'Receive batches, manage inventory, sell to customers',
    admin: 'Full system access, view all data, manage integrations',
};

const Login: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { quickLogin, login, register, loginWithAgriStack } = useAuth();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [loginRole, setLoginRole] = useState<'farmer' | 'other'>('other');
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [agristackId, setAgristackId] = useState('');
    const [registerData, setRegisterData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'driver', // Default to driver (farmer/admin not registrable)
        phone: '',
    });

    const from = (location.state as { from?: Location })?.from?.pathname || '/';

    const handleQuickLogin = async (role: string) => {
        setIsLoading(true);
        try {
            const user = await quickLogin(role);
            toast({
                title: 'Login Successful',
                description: `Welcome back, ${user.name}!`,
            });

            if (from === '/') {
                navigate(`/${user.role}`);
            } else {
                navigate(from);
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Login failed';
            toast({
                title: 'Login Failed',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            let user;
            if (loginRole === 'farmer') {
                // Farmer login with AgriStack ID
                user = await loginWithAgriStack(agristackId);
                toast({
                    title: 'Login Successful',
                    description: 'Welcome, Farmer!',
                });
            } else {
                // Regular login with email/password
                user = await login(loginEmail, loginPassword);
                toast({
                    title: 'Login Successful',
                    description: 'Welcome back!',
                });
            }

            if (from === '/') {
                // Redirect to role-specific dashboard if coming from home
                if (user.role === 'admin') navigate('/admin');
                else if (user.role === 'farmer') navigate('/farmer');
                else if (user.role === 'driver') navigate('/driver');
                else if (user.role === 'retailer') navigate('/retailer');
                else navigate('/');
            } else {
                navigate(from);
            }
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Invalid credentials';
            toast({
                title: 'Login Failed',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await register(registerData);
            toast({
                title: 'Registration Successful',
                description: 'Your account has been created',
            });

            const routes: Record<string, string> = {
                farmer: '/farmer',
                driver: '/driver',
                retailer: '/retailer',
                admin: '/admin',
            };
            navigate(routes[registerData.role] || '/');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Registration failed';
            toast({
                title: 'Registration Failed',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <img src="/android-chrome-192x192.png" alt="TraceSafe Logo" className="h-12 w-12" />
                        <h1 className="text-4xl font-bold text-gray-900">TraceSafe</h1>
                    </div>
                    <p className="text-lg text-gray-600">Farm-to-Fork Traceability Platform</p>
                    <p className="text-sm text-gray-500 mt-2">Supply Chain Transparency with Blockchain & AgriStack Integration</p>
                </div>

                <Tabs defaultValue="quick" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-6">
                        <TabsTrigger value="quick">Quick Access</TabsTrigger>
                        <TabsTrigger value="login">Login</TabsTrigger>
                        <TabsTrigger value="register">Register</TabsTrigger>
                    </TabsList>

                    <TabsContent value="quick">
                        <Card>
                            <CardHeader>
                                <CardTitle>Select Your Role</CardTitle>
                                <CardDescription>
                                    Quick access for demo purposes. Select your role to access the dashboard.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(Object.keys(roleIcons) as Array<keyof typeof roleIcons>).map((role) => {
                                        const Icon = roleIcons[role];
                                        return (
                                            <Button
                                                key={role}
                                                className={`h-auto py-6 flex flex-col gap-2 ${roleColors[role]} text-white`}
                                                onClick={() => handleQuickLogin(role)}
                                                disabled={isLoading}
                                            >
                                                <Icon className="h-8 w-8" />
                                                <span className="text-lg font-semibold capitalize">{role}</span>
                                                <span className="text-xs opacity-80 font-normal">{roleDescriptions[role]}</span>
                                            </Button>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="login">
                        <Card>
                            <CardHeader>
                                <CardTitle>Login</CardTitle>
                                <CardDescription>Enter your credentials to access your account</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4 mb-4">
                                    <Label>Select Login Type</Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            type="button"
                                            variant={loginRole === 'farmer' ? 'default' : 'outline'}
                                            className="flex items-center gap-2"
                                            onClick={() => setLoginRole('farmer')}
                                        >
                                            <Tractor className="h-4 w-4" />
                                            Farmer
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={loginRole === 'other' ? 'default' : 'outline'}
                                            className="flex items-center gap-2"
                                            onClick={() => setLoginRole('other')}
                                        >
                                            <Shield className="h-4 w-4" />
                                            Driver / Retailer / Admin
                                        </Button>
                                    </div>
                                </div>

                                <form onSubmit={handleLogin} className="space-y-4">
                                    {loginRole === 'farmer' ? (
                                        <div className="space-y-2">
                                            <Label htmlFor="agristack-id">AgriStack Farmer ID</Label>
                                            <Input
                                                id="agristack-id"
                                                placeholder="e.g., MH234567890121"
                                                value={agristackId}
                                                onChange={(e) => setAgristackId(e.target.value)}
                                                required
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Enter your AgriStack Farmer ID from the registry
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email</Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="you@example.com"
                                                    value={loginEmail}
                                                    onChange={(e) => setLoginEmail(e.target.value)}
                                                    required
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="password">Password</Label>
                                                <Input
                                                    id="password"
                                                    type="password"
                                                    placeholder="••••••••"
                                                    value={loginPassword}
                                                    onChange={(e) => setLoginPassword(e.target.value)}
                                                    required
                                                />
                                            </div>
                                        </>
                                    )}
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? 'Logging in...' : 'Login'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="register">
                        <Card>
                            <CardHeader>
                                <CardTitle>Create Account</CardTitle>
                                <CardDescription>Register to join the TraceSafe platform</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form onSubmit={handleRegister} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="reg-name">Full Name</Label>
                                            <Input
                                                id="reg-name"
                                                placeholder="John Doe"
                                                value={registerData.name}
                                                onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="reg-phone">Phone</Label>
                                            <Input
                                                id="reg-phone"
                                                placeholder="+91 98765 43210"
                                                value={registerData.phone}
                                                onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reg-email">Email</Label>
                                        <Input
                                            id="reg-email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={registerData.email}
                                            onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="reg-password">Password</Label>
                                        <Input
                                            id="reg-password"
                                            type="password"
                                            placeholder="••••••••"
                                            value={registerData.password}
                                            onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Role</Label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {(Object.keys(registerableRoles) as Array<keyof typeof registerableRoles>).map((role) => {
                                                const Icon = registerableRoles[role];
                                                return (
                                                    <Button
                                                        key={role}
                                                        type="button"
                                                        variant={registerData.role === role ? 'default' : 'outline'}
                                                        className="flex items-center gap-2"
                                                        onClick={() => setRegisterData({ ...registerData, role })}
                                                    >
                                                        <Icon className="h-4 w-4" />
                                                        <span className="capitalize">{role}</span>
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Farmers access the platform through AgriStack verification.
                                        </p>
                                    </div>
                                    <Button type="submit" className="w-full" disabled={isLoading}>
                                        {isLoading ? 'Creating Account...' : 'Create Account'}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
};

export default Login;
