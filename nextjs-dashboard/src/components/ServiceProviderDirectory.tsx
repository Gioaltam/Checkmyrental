"use client";
import { useState } from "react";
import { Phone, Mail, Star, MapPin, Plus, ExternalLink } from "lucide-react";

interface ServiceProvider {
  id: string;
  name: string;
  company: string;
  specialty: 'hvac' | 'plumbing' | 'both';
  phone: string;
  email: string;
  rating: number;
  servicesCompleted: number;
  lastService?: string;
  address?: string;
}

const SAMPLE_PROVIDERS: ServiceProvider[] = [
  {
    id: '1',
    name: 'John Smith',
    company: 'Smith HVAC Services',
    specialty: 'hvac',
    phone: '(555) 123-4567',
    email: 'john@smithhvac.com',
    rating: 5,
    servicesCompleted: 12,
    lastService: '2024-10-15',
    address: '123 Main St, City, ST'
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    company: 'Reliable Plumbing Co.',
    specialty: 'plumbing',
    phone: '(555) 987-6543',
    email: 'sarah@reliableplumbing.com',
    rating: 4.5,
    servicesCompleted: 8,
    lastService: '2024-09-28',
    address: '456 Oak Ave, City, ST'
  },
  {
    id: '3',
    name: 'Mike Davis',
    company: 'All-Pro Home Services',
    specialty: 'both',
    phone: '(555) 456-7890',
    email: 'mike@allprohome.com',
    rating: 4,
    servicesCompleted: 15,
    lastService: '2024-11-02',
    address: '789 Pine Rd, City, ST'
  }
];

export default function ServiceProviderDirectory() {
  const [providers, setProviders] = useState<ServiceProvider[]>(SAMPLE_PROVIDERS);
  const [filter, setFilter] = useState<'all' | 'hvac' | 'plumbing' | 'both'>('all');

  const filteredProviders = providers.filter(p =>
    filter === 'all' || p.specialty === filter
  );

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
      );
    }

    if (hasHalfStar) {
      stars.push(
        <div key="half" className="relative w-4 h-4">
          <Star className="w-4 h-4 text-yellow-400 absolute" />
          <div className="overflow-hidden w-2 absolute">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          </div>
        </div>
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <Star key={`empty-${i}`} className="w-4 h-4 text-white/20" />
      );
    }

    return stars;
  };

  const getSpecialtyBadge = (specialty: string) => {
    switch (specialty) {
      case 'hvac':
        return <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">HVAC</span>;
      case 'plumbing':
        return <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs font-medium">Plumbing</span>;
      case 'both':
        return <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">HVAC & Plumbing</span>;
      default:
        return null;
    }
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold">Service Providers</h3>
        </div>
        <span className="text-xs text-white/60">{filteredProviders.length} contacts</span>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto">
        {['all', 'hvac', 'plumbing', 'both'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              filter === f
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            {f === 'all' ? 'All' : f === 'hvac' ? 'HVAC' : f === 'plumbing' ? 'Plumbing' : 'Both'}
          </button>
        ))}
      </div>

      {/* Provider Cards */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {filteredProviders.map((provider) => (
          <div
            key={provider.id}
            className="rounded-lg p-4 bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-white">{provider.name}</h4>
                  {getSpecialtyBadge(provider.specialty)}
                </div>
                <div className="text-sm text-white/70">{provider.company}</div>
                {provider.address && (
                  <div className="flex items-center gap-1 text-xs text-white/50 mt-1">
                    <MapPin className="w-3 h-3" />
                    {provider.address}
                  </div>
                )}
              </div>
            </div>

            {/* Rating and Stats */}
            <div className="flex items-center gap-4 mb-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-1">
                {renderStars(provider.rating)}
                <span className="text-sm text-white/70 ml-1">({provider.rating})</span>
              </div>
              <div className="text-xs text-white/60">
                {provider.servicesCompleted} services completed
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-3">
              <a
                href={`tel:${provider.phone}`}
                className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors group"
              >
                <Phone className="w-4 h-4 text-green-400" />
                <span className="group-hover:underline">{provider.phone}</span>
              </a>
              <a
                href={`mailto:${provider.email}`}
                className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors group"
              >
                <Mail className="w-4 h-4 text-blue-400" />
                <span className="group-hover:underline">{provider.email}</span>
              </a>
            </div>

            {/* Last Service */}
            {provider.lastService && (
              <div className="text-xs text-white/50 mb-3">
                Last service: {new Date(provider.lastService).toLocaleDateString()}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <a
                href={`tel:${provider.phone}`}
                className="flex-1 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-md transition-all flex items-center justify-center gap-2 text-sm text-green-400 font-medium"
              >
                <Phone className="w-4 h-4" />
                Call
              </a>
              <a
                href={`mailto:${provider.email}`}
                className="flex-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-md transition-all flex items-center justify-center gap-2 text-sm text-blue-400 font-medium"
              >
                <Mail className="w-4 h-4" />
                Email
              </a>
            </div>
          </div>
        ))}

        {filteredProviders.length === 0 && (
          <div className="text-center py-8 text-white/60">
            <Phone className="w-12 h-12 mx-auto mb-3 text-white/40" />
            <p>No service providers found</p>
            <p className="text-xs text-white/40 mt-1">Add your first provider below</p>
          </div>
        )}
      </div>

      {/* Add Provider Button */}
      <button className="w-full mt-4 px-4 py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg transition-all flex items-center justify-center gap-2 text-sm text-blue-400 font-medium">
        <Plus className="w-4 h-4" />
        <span>Add Service Provider</span>
      </button>

      {/* Quick Stats */}
      <div className="mt-5 pt-5 border-t border-white/10 grid grid-cols-2 gap-3 text-center">
        <div>
          <div className="text-2xl font-bold text-white">{providers.length}</div>
          <div className="text-xs text-white/60">Total Providers</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-white">
            {(providers.reduce((sum, p) => sum + p.rating, 0) / providers.length).toFixed(1)}
          </div>
          <div className="text-xs text-white/60">Avg Rating</div>
        </div>
      </div>
    </div>
  );
}
