import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import agrilinkLogo from '@/assets/agrilink-logo.png'
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MapPin,
  Filter,
  DollarSign,
  Calendar,
  Package,
  Search,
  X,
  Leaf,
  TrendingUp,
  Users,
  Phone,
  Mail,
  Star,
  Heart,
  Share2,
  ArrowRight,
  ArrowLeft,
  Droplet,
  Wind,
  Cloud,
  Navigation,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  User,
  Briefcase,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import axios from 'axios';

// --- Tipos ---

interface Product {
  id: string;
  product_type: string;
  quantity: number;
  harvest_date: string;
  price: number;
  province_id: string;
  municipality_id: string;
  farmer_name: string;
  farmer_id: string;
  farmer_phone?: string;
  farmer_email?: string;
  farmer_rating?: number;
  images?: string[];
  image_url?: string;
  location_lat: number | null;
  location_lng: number | null;
  weatherData?: any;
  roadCondition?: string;
  status?: string;
  created_at?: string;
}

interface Farmer {
  id: string;
  name: string;
  email: string;
  phone: string;
  province_id: string;
  municipality_id: string;
  avatar_url?: string;
  rating?: number;
  products_count?: number;
  location_lat?: number;
  location_lng?: number;
}

interface Buyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  company_name?: string;
  avatar_url?: string;
  rating?: number;
  location_lat?: number;
  location_lng?: number;
}

interface FilterOptions {
  productType: string;
  priceRange: [number, number];
  radius: number;
  userType: 'all' | 'farmers' | 'buyers';
}

// --- Componentes Auxiliares ---

interface ProductCardProps {
  product: Product;
  onClose: () => void;
  onContact: (product: Product) => void;
  onFavorite: (productId: string) => void;
}

// Card simples que aparece ao clicar no marcador
const ProductCard: React.FC<ProductCardProps> = ({ product, onClose, onContact, onFavorite }) => {
  const [isFavorited, setIsFavorited] = useState(false);

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    onFavorite(product.id);
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 z-40 animate-in slide-in-from-bottom duration-300">
      <Card className="w-full max-w-md mx-auto shadow-2xl bg-white border-0 overflow-hidden">
        {/* Header com imagem */}
        <div className="relative h-32 bg-gradient-to-br from-green-500 to-emerald-600">
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.product_type}
              className="w-full h-full object-cover opacity-30"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 rounded-full transition-all"
          >
            <X className="h-4 w-4 text-white" />
          </button>
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="text-xl font-bold text-white drop-shadow-lg">{product.product_type}</h3>
            <div className="flex items-center gap-2 mt-1">
              <User className="h-3 w-3 text-white/80" />
              <span className="text-sm text-white/90">{product.farmer_name}</span>
            </div>
          </div>
        </div>

        <CardContent className="p-4">
          {/* Preço e Quantidade */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <span className="text-2xl font-bold text-green-600">{product.price.toLocaleString()}</span>
                <span className="text-sm text-gray-500 ml-1">AOA/kg</span>
              </div>
            </div>
            <Badge className="bg-emerald-100 text-emerald-700 border-0 px-3 py-1">
              <Package className="h-3 w-3 mr-1" />
              {product.quantity} kg
            </Badge>
          </div>

          {/* Localização e Data */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <MapPin className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600 truncate">{product.municipality_id}</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                {new Date(product.harvest_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
            </div>
          </div>

          {/* Clima (se disponível) */}
          {product.weatherData && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl mb-4">
              <Cloud className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <span className="text-sm font-medium text-blue-800">
                  {Math.round(product.weatherData.main?.temp || 0)}°C
                </span>
                <span className="text-xs text-blue-600 ml-2">
                  {product.weatherData.weather?.[0]?.description}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <Droplet className="h-3 w-3" />
                {product.weatherData.main?.humidity}%
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex gap-2">
            <Button
              onClick={() => onContact(product)}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Contactar
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleFavorite}
              className={`transition-all ${isFavorited ? 'bg-red-50 border-red-200 text-red-500' : 'border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500'}`}
            >
              <Heart className={`h-4 w-4 ${isFavorited ? 'fill-red-500' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="border-gray-200 text-gray-500 hover:border-green-200 hover:text-green-600"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// --- Componente Principal ---

const MapView = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const userMarker = useRef<mapboxgl.Marker | null>(null);

  // Estados
  const [mapboxToken] = useState(
    'pk.eyJ1IjoibHVjYW1iYSIsImEiOiJjbWdqY293Z2QwaGRwMmlyNGlwNW4xYXhwIn0.qOjQNe8kbbfmdK5G0MHWDA'
  );
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Busca e Filtros
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filtros
  const [filters, setFilters] = useState<FilterOptions>({
    productType: '',
    priceRange: [0, 10000],
    radius: 50,
    userType: 'all',
  });

  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const WEATHER_API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || '';

  // --- Efeitos ---

  useEffect(() => {
    if (user) fetchProducts();
  }, [user]);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    if (!mapboxgl.supported({ failIfMajorPerformanceCaveat: true } as any)) {
      setMapError('Seu navegador não suporta o mapa.');
      return;
    }

    try {
      mapboxgl.accessToken = mapboxToken;
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/outdoors-v12',
        center: [13.234444, -8.838333],
        zoom: 6,
        pitch: 0,
        bearing: 0,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Geolocalização
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setUserLocation([longitude, latitude]);

            const el = document.createElement('div');
            el.className = 'user-marker';
            el.style.width = '24px';
            el.style.height = '24px';
            el.style.backgroundColor = '#10b981';
            el.style.border = '3px solid white';
            el.style.borderRadius = '50%';
            el.style.boxShadow = '0 0 15px rgba(16, 185, 129, 0.8)';

            userMarker.current = new mapboxgl.Marker(el)
              .setLngLat([longitude, latitude])
              .addTo(map.current!);

            map.current!.flyTo({ center: [longitude, latitude], zoom: 11 });
          },
          (err) => console.warn('Geolocalização negada:', err)
        );
      }

      setLoading(false);
    } catch (error) {
      console.error('Erro ao iniciar mapa:', error);
      setMapError('Não foi possível inicializar o mapa.');
    }

    return () => {
      markers.current.forEach((m) => m.remove());
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Função para calcular distância haversine
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Filtro por tipo de produto
      if (filters.productType && !p.product_type.toLowerCase().includes(filters.productType.toLowerCase())) {
        return false;
      }

      // Filtro por faixa de preço
      if (p.price < filters.priceRange[0] || p.price > filters.priceRange[1]) {
        return false;
      }

      // Filtro por raio de distância (se localização do usuário estiver disponível)
      if (userLocation && p.location_lat && p.location_lng) {
        const distance = calculateDistance(
          userLocation[1], // lat do usuário
          userLocation[0], // lng do usuário
          p.location_lat,
          p.location_lng
        );
        if (distance > filters.radius) {
          return false;
        }
      }

      // Filtro por tipo de usuário (atualmente só farmers, preparado para buyers)
      if (filters.userType === 'farmers') {
        // Todos os produtos são de farmers por enquanto
        return true;
      } else if (filters.userType === 'buyers') {
        // Quando houver buyers, filtrar aqui
        return false; // Por enquanto, nenhum buyer
      }

      return true;
    });
  }, [products, filters, userLocation, calculateDistance]);

  // Renderizar marcadores
  useEffect(() => {
    if (!map.current) return;

    markers.current.forEach((m) => m.remove());
    markers.current = [];

    filteredProducts.forEach((p) => {
      if (p.location_lat && p.location_lng) {
        const el = document.createElement('div');
        el.innerHTML = '🌾';
        el.style.fontSize = '32px';
        el.style.cursor = 'pointer';
        el.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))';

        const marker = new mapboxgl.Marker(el)
          .setLngLat([p.location_lng, p.location_lat])
          .addTo(map.current!);

        el.addEventListener('click', async () => {
          let weatherData = null;
          try {
            if (WEATHER_API_KEY) {
              const res = await axios.get(
                `https://api.openweathermap.org/data/2.5/weather?lat=${p.location_lat}&lon=${p.location_lng}&units=metric&appid=${WEATHER_API_KEY}&lang=pt`
              );
              weatherData = res.data;
            }
          } catch (err) {
            console.warn('Erro ao buscar clima:', err);
          }

          const roadCondition = ['Excelente', 'Boa', 'Regular', 'Difícil'][
            Math.floor(Math.random() * 4)
          ];

          setSelectedProduct({
            ...p,
            weatherData,
            roadCondition,
          });
        });

        markers.current.push(marker);
      }
    });
  }, [filteredProducts, WEATHER_API_KEY]);

  // --- Funções ---

  const fetchProducts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;

      const filtered = (data || []).filter(
        (p: any) => p.location_lat !== null && p.location_lng !== null
      );

      const withImages = filtered.map((p: any) => ({
        ...p,
        image_url:
          Array.isArray(p.images) && p.images.length > 0
            ? p.images[0]
            : p.image_url || 'https://via.placeholder.com/600x400?text=Produto',
      }));

      setProducts(withImages);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
    }
  }, []);

  const handleSearch = useCallback(async (text: string) => {
    setSearchText(text);
    if (!text) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          text
        )}.json?access_token=${mapboxToken}&limit=5&country=AO`
      );
      const data = await response.json();
      setSearchResults(data.features || []);
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setSearchLoading(false);
    }
  }, [mapboxToken]);

  const selectSearchResult = useCallback((feature: any) => {
    const [lng, lat] = feature.center;
    map.current?.flyTo({ center: [lng, lat], zoom: 12 });
    setSearchResults([]);
    setSearchText(feature.place_name);
  }, []);

  const handleFavorite = useCallback((productId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(productId)) {
        newFavorites.delete(productId);
      } else {
        newFavorites.add(productId);
      }
      return newFavorites;
    });
  }, []);

  const handleContact = useCallback((product: Product) => {
    // Implementar sistema de mensagens
    console.log('Contactar:', product.farmer_name);
  }, []);

  if (mapError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-900 font-semibold mb-2">Erro ao Carregar Mapa</p>
            <p className="text-gray-600 text-sm">{mapError}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-white">
      {/* Mapa */}
      <div ref={mapContainer} className="absolute inset-0" />

      {/* Header */}
    <header className="absolute top-0 left-0 right-0 z-30 bg-white text-gray-800 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="text-gray-800 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <img src={agrilinkLogo} alt="AgriLink" className="h-10" />
          <h1 className="text-xl font-bold">Mapa de Produtos</h1>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-800 hover:bg-gray-100 rounded-full transition-colors duration-300"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-5 w-5" />
        </Button>
      </div>
    </header>


      {/* Barra de Pesquisa Moderna */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30 w-11/12 max-w-xl">
        <div className="relative">
          <div className="bg-white shadow-2xl rounded-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center px-5 py-4">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl mr-4">
                <Search className="h-5 w-5 text-white" />
              </div>
              <input
                type="text"
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Pesquisar localização, produto..."
                className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-base font-medium"
              />
              {searchLoading && (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent mr-2" />
              )}
              {searchText && (
                <button
                  onClick={() => {
                    setSearchText('');
                    setSearchResults([]);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              )}
            </div>
            
            {/* Quick Filters */}
            <div className="flex items-center gap-2 px-5 pb-4 overflow-x-auto">
              {['Milho', 'Feijão', 'Banana', 'Mandioca'].map((item) => (
                <button
                  key={item}
                  onClick={() => setFilters({ ...filters, productType: item })}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                    filters.productType === item
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {item}
                </button>
              ))}
              {filters.productType && (
                <button
                  onClick={() => setFilters({ ...filters, productType: '' })}
                  className="px-4 py-1.5 rounded-full text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 whitespace-nowrap"
                >
                  <X className="h-3 w-3 inline mr-1" />
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* Resultados de Busca */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl max-h-72 overflow-auto border border-gray-100 z-50">
              {searchResults.map((r, index) => (
                <button
                  key={r.id}
                  onClick={() => selectSearchResult(r)}
                  className={`w-full text-left p-4 hover:bg-green-50 transition-colors flex items-center gap-3 ${
                    index !== searchResults.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                    <MapPin className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{r.text || r.place_name?.split(',')[0]}</p>
                    <p className="text-sm text-gray-500 truncate">{r.place_name}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0 ml-auto" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Painel de Filtros Moderno */}
      {showFilters && (
        <div className="absolute top-52 left-4 z-40 bg-white rounded-2xl shadow-2xl p-6 w-80 border border-gray-100 animate-in slide-in-from-left duration-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                <Filter className="h-4 w-4 text-white" />
              </div>
              Filtros
            </h3>
            <button
              onClick={() => setShowFilters(false)}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <div className="space-y-6">
            {/* Tipo de Produto */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Tipo de Produto
              </label>
              <div className="relative">
                <Leaf className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Ex: Milho, Feijão..."
                  value={filters.productType}
                  onChange={(e) =>
                    setFilters({ ...filters, productType: e.target.value })
                  }
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
                />
              </div>
            </div>

            {/* Faixa de Preço */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Preço Máximo
              </label>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">0 AOA</span>
                  <span className="text-lg font-bold text-green-600">{filters.priceRange[1].toLocaleString()} AOA</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  value={filters.priceRange[1]}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      priceRange: [filters.priceRange[0], parseInt(e.target.value)],
                    })
                  }
                  className="w-full accent-green-600"
                />
              </div>
            </div>

            {/* Raio de Busca */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Raio de Busca
              </label>
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-500">5 km</span>
                  <span className="text-lg font-bold text-green-600">{filters.radius} km</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="200"
                  step="5"
                  value={filters.radius}
                  onChange={(e) =>
                    setFilters({ ...filters, radius: parseInt(e.target.value) })
                  }
                  className="w-full accent-green-600"
                />
              </div>
            </div>

            {/* Tipo de Usuário */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Mostrar
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'all', label: 'Todos', icon: Users },
                  { value: 'farmers', label: 'Agricultores', icon: Leaf },
                  { value: 'buyers', label: 'Compradores', icon: Briefcase },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setFilters({
                        ...filters,
                        userType: opt.value as FilterOptions['userType'],
                      })
                    }
                    className={`p-3 rounded-xl text-center transition-all ${
                      filters.userType === opt.value
                        ? 'bg-green-600 text-white shadow-lg'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <opt.icon className="h-5 w-5 mx-auto mb-1" />
                    <span className="text-xs font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={() => setShowFilters(false)}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-6 rounded-xl shadow-lg shadow-green-500/25"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aplicar Filtros
            </Button>
          </div>
        </div>
      )}

      {/* Painel de Produtos Encontrados */}
      <div className="absolute bottom-6 left-4 z-30 w-80">
        <Card className="shadow-2xl border-0 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 p-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-base font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Produtos Disponíveis
              </CardTitle>
              <Badge className="bg-white/20 text-white border-0 text-lg font-bold px-3">
                {filteredProducts.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-72 overflow-y-auto">
              {filteredProducts.length === 0 ? (
                <div className="p-6 text-center">
                  <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">Nenhum produto encontrado</p>
                </div>
              ) : (
                filteredProducts.slice(0, 6).map((p, index) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedProduct(p);
                      if (p.location_lat && p.location_lng) {
                        map.current?.flyTo({ center: [p.location_lng, p.location_lat], zoom: 14 });
                      }
                    }}
                    className={`w-full text-left p-4 hover:bg-green-50 transition-all flex items-center gap-3 ${
                      index !== Math.min(filteredProducts.length, 6) - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.product_type} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Leaf className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{p.product_type}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-green-600 font-bold text-sm">{p.price.toLocaleString()} AOA</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-500 text-xs">{p.quantity} kg</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <User className="h-3 w-3 text-gray-400" />
                        <span className="text-xs text-gray-500 truncate">{p.farmer_name}</span>
                      </div>
                    </div>
                    <ChevronDown className="h-4 w-4 text-gray-400 -rotate-90" />
                  </button>
                ))
              )}
            </div>
            {filteredProducts.length > 6 && (
              <div className="p-3 bg-gray-50 border-t border-gray-100">
                <p className="text-center text-sm text-gray-500">
                  +{filteredProducts.length - 6} outros produtos
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal do Produto */}
      {selectedProduct && (
        <ProductCard
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onContact={handleContact}
          onFavorite={handleFavorite}
        />
      )}

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-40 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4" />
            <p className="text-gray-700 font-medium">Carregando mapa...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;