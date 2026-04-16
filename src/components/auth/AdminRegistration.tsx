import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Shield } from 'lucide-react';

interface AdminRegistrationProps {
  onRegistrationComplete: () => void;
}

export function AdminRegistration({ onRegistrationComplete }: AdminRegistrationProps) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    shopName: '',
    shopAddress: '',
    drugLicenseNumber: '',
    gstNumber: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const { registerAdmin } = useAuth();

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await registerAdmin(
        formData.email, 
        formData.password, 
        formData.fullName, 
        formData.phone,
        formData.shopName,
        formData.shopAddress,
        formData.drugLicenseNumber,
        formData.gstNumber
      );
      if (result.success) {
        onRegistrationComplete();
      }
    } catch (error) {
      // Error handled in useAuth
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md shadow-medical">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full gradient-medical flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">KP Medical Shop</CardTitle>
          <CardDescription>
            Register as System Admin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>

            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">Shop Details</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="shopName">Shop Name</Label>
                  <Input
                    id="shopName"
                    placeholder="Enter your shop name"
                    value={formData.shopName}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shopAddress">Shop Address</Label>
                  <Textarea
                    id="shopAddress"
                    placeholder="Enter complete shop address"
                    value={formData.shopAddress}
                    onChange={(e) => setFormData({ ...formData, shopAddress: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="drugLicenseNumber">Drug License No.</Label>
                    <Input
                      id="drugLicenseNumber"
                      placeholder="e.g., DL-XX-XXXX"
                      value={formData.drugLicenseNumber}
                      onChange={(e) => setFormData({ ...formData, drugLicenseNumber: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gstNumber">GST Number</Label>
                    <Input
                      id="gstNumber"
                      placeholder="e.g., 22AAAAA0000A1Z5"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating Admin Account...' : 'Create Admin Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}