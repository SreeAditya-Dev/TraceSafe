import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Leaf, Tractor, Truck, Store, Shield, QrCode,
  MapPin, CheckCircle, ArrowRight, Scan
} from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="h-8 w-8 text-green-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              TraceSafe
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/govt/enam">
              <Button variant="ghost" size="sm">Government Portal</Button>
            </Link>
            <Link to="/login">
              <Button className="bg-green-600 hover:bg-green-700">
                Get Started
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Farm-to-Fork in{" "}
            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              2 Seconds
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Complete supply chain transparency with QR traceability, blockchain immutability,
            and AgriStack verification. Zero waste. Zero fraud. Full trust.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/login">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 gap-2">
                <Scan className="h-5 w-5" />
                Start Tracking
              </Button>
            </Link>
            <Link to="/govt/agristack">
              <Button size="lg" variant="outline" className="gap-2">
                <Shield className="h-5 w-5" />
                View AgriStack Registry
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-6 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <Tractor className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle>1. Farmer Creates</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Farmer registers produce batch with AgriStack verification and gets unique QR code
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  <Truck className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle>2. Driver Transports</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Real-time GPS tracking, temperature monitoring, and condition updates during transit
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-4">
                  <Store className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle>3. Retailer Receives</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Shop verifies delivery, adds to inventory, and displays QR for customer scanning
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-16 h-16 mx-auto bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <QrCode className="h-8 w-8 text-orange-600" />
                </div>
                <CardTitle>4. Customer Scans</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Complete journey from farm to store visible in seconds with blockchain verification
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Role Selection */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Choose Your Role</h2>
          <p className="text-center text-gray-600 mb-12">Select your role to access the appropriate dashboard</p>

          <div className="grid md:grid-cols-4 gap-6">
            <Link to="/login" className="block">
              <Card className="hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer border-green-200 hover:border-green-400">
                <CardHeader className="text-center">
                  <Tractor className="h-12 w-12 mx-auto text-green-600 mb-2" />
                  <CardTitle>Farmer</CardTitle>
                  <CardDescription>Create batches, generate QR codes, track produce</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/login" className="block">
              <Card className="hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer border-blue-200 hover:border-blue-400">
                <CardHeader className="text-center">
                  <Truck className="h-12 w-12 mx-auto text-blue-600 mb-2" />
                  <CardTitle>Driver</CardTitle>
                  <CardDescription>Pickup, update transit, deliver to retailers</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/login" className="block">
              <Card className="hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer border-purple-200 hover:border-purple-400">
                <CardHeader className="text-center">
                  <Store className="h-12 w-12 mx-auto text-purple-600 mb-2" />
                  <CardTitle>Retailer</CardTitle>
                  <CardDescription>Receive inventory, manage stock, sell to customers</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/login" className="block">
              <Card className="hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer border-red-200 hover:border-red-400">
                <CardHeader className="text-center">
                  <Shield className="h-12 w-12 mx-auto text-red-600 mb-2" />
                  <CardTitle>Admin</CardTitle>
                  <CardDescription>Full oversight, government integrations, analytics</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Government Integrations */}
      <section className="py-16 px-6 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Government Integrations</h2>
          <p className="text-center text-gray-400 mb-12">Connected with official platforms for complete compliance</p>

          <div className="grid md:grid-cols-3 gap-6">
            <Link to="/govt/enam">
              <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
                <CardHeader>
                  <CardTitle className="text-white">e-NAM Dashboard</CardTitle>
                  <CardDescription className="text-gray-400">
                    Electronic National Agriculture Market - Commodity prices and batch data
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/govt/agristack">
              <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
                <CardHeader>
                  <CardTitle className="text-green-400">AgriStack Registry</CardTitle>
                  <CardDescription className="text-gray-400">
                    Digital Agriculture Mission - Farmer verification and onboarding
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link to="/govt/fssai">
              <Card className="bg-gray-800 border-gray-700 hover:bg-gray-750 transition-colors">
                <CardHeader>
                  <CardTitle className="text-orange-400">FSSAI Compliance</CardTitle>
                  <CardDescription className="text-gray-400">
                    Food Safety Standards - License verification and compliance checks
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">Why TraceSafe?</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Blockchain Immutability</h3>
                <p className="text-gray-600">Every transaction is recorded permanently. No tampering possible.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">AgriStack Verification</h3>
                <p className="text-gray-600">Farmers verified against government registry. No duplicates or fraud.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Real-time GPS Tracking</h3>
                <p className="text-gray-600">Know exactly where your produce is at every moment.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">2-Second Traceability</h3>
                <p className="text-gray-600">From 7 days to 2 seconds - just like IBM-Walmart blockchain pilot.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">FSSAI Compliant</h3>
                <p className="text-gray-600">Integrated with Food Safety Standards Authority for compliance.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-lg">Protect Good Farmers</h3>
                <p className="text-gray-600">97% innocent farmers protected. One bad batch doesn't ruin everyone.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-green-500" />
              <span className="text-xl font-bold">TraceSafe</span>
            </div>
            <p className="text-gray-400 text-sm">
              Farm-to-Fork Traceability Platform | Supply Chain Transparency
            </p>
            <div className="flex gap-4 text-sm text-gray-400">
              <Link to="/govt/enam" className="hover:text-white">e-NAM</Link>
              <Link to="/govt/agristack" className="hover:text-white">AgriStack</Link>
              <Link to="/govt/fssai" className="hover:text-white">FSSAI</Link>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center text-sm text-gray-500">
            <p>Built for Supply Chain Transparency | Powered by Blockchain Technology</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
