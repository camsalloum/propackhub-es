import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Register = () => {
  const navigate = useNavigate();
  const { register, isLoading, error } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    tenantName: '',
    displayCurrency: 'AED',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(
        formData.email,
        formData.password,
        formData.displayName,
        formData.tenantName,
        formData.displayCurrency
      );
      navigate('/dashboard');
    } catch (err) {
      // Error is displayed from useAuth state
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy to-navy/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back button */}
        <button
          onClick={() => navigate('/login')}
          className="mb-6 text-gold hover:text-gold/80 flex items-center space-x-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to login</span>
        </button>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gold rounded-lg mb-4">
            <span className="font-display font-bold text-lg text-navy">ES</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-white mb-2">
            Create Account
          </h1>
          <p className="text-gold/80">Join Estimation Studio today</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy mb-2">
                Your Name
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                required
                placeholder="John Doe"
                className="w-full border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-2">
                Company/Workspace Name
              </label>
              <input
                type="text"
                name="tenantName"
                value={formData.tenantName}
                onChange={handleChange}
                required
                placeholder="My Company"
                className="w-full border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your@email.com"
                className="w-full border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-2">Display Currency</label>
              <select name="displayCurrency" value={formData.displayCurrency} onChange={handleChange} className="input w-48">
                <option value="AED">AED - UAE Dirham</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="SAR">SAR - Saudi Riyal</option>
                <option value="INR">INR - Indian Rupee</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy mb-2">
                Password (min 8 characters)
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={8}
                placeholder="••••••••"
                className="w-full border border-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gold focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gold text-white font-display font-semibold py-3 rounded-lg hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              {isLoading && <Loader className="w-4 h-4 animate-spin" />}
              <span>{isLoading ? 'Creating account...' : 'Create Account'}</span>
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-mist">
            <p>
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-gold font-medium hover:underline"
              >
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
