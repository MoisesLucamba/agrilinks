import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import 'mapbox-gl/dist/mapbox-gl.css';
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

const ProductCard: React.FC<ProductCardProps> = ({ product, onClose, onContact, onFavorite }) => {
  const [isFavorited, setIsFavorited] = useState(false);

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
    onFavorite(product.id);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center px-4 py-6 overflow-y-auto">
      <Card className="w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-300">
        {/* Imagem do Produto */}
        <div className="relative h-64 md:h-80 overflow-hidden bg-gray-100">
          <img
            src={product.image_url}
            alt={product.product_type}
            className="w-full h-full object-cover"
          />
          <button
            className="absolute top-4 right-4 bg-white/90 hover:bg-white text-gray-900 p-2 rounded-full shadow-lg transition-all"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>

          {/* Badge de Status */}
          <div className="absolute top-4 left-4">
            <Badge className="bg-green-600 text-white">Disponível</Badge>
          </div>

          {/* Botão de Favorito */}
          <button
            className="absolute bottom-4 right-4 bg-white/90 hover:bg-white text-gray-900 p-2 rounded-full shadow-lg transition-all"
            onClick={handleFavorite}
          >
            <Heart
              className={`h-5 w-5 ${isFavorited ? 'fill-red-500 text-red-500' : ''}`}
            />
          </button>
        </div>

        <CardContent className="p-6 md:p-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Coluna Esquerda - Informações do Produto */}
            <div className="md:col-span-2 space-y-6">
              {/* Título e Preço */}
              <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  {product.product_type}
                </h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-green-600">
                    {product.price.toFixed(2)}
                  </span>
                  <span className="text-lg text-gray-600">Kz/kg</span>
                </div>
              </div>

              {/* Grid de Informações */}
              <div className="grid grid-cols-2 gap-4">
                {/* Quantidade */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-700 font-semibold mb-1">
                    <Package className="h-4 w-4" />
                    Quantidade
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{product.quantity} kg</p>
                </div>

                {/* Data de Colheita */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-700 font-semibold mb-1">
                    <Calendar className="h-4 w-4" />
                    Colheita
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {new Date(product.harvest_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>

                {/* Localização */}
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-2 text-purple-700 font-semibold mb-1">
                    <MapPin className="h-4 w-4" />
                    Localização
                  </div>
                  <p className="text-sm font-bold text-gray-900">
                    {product.municipality_id}, {product.province_id}
                  </p>
                </div>

                {/* Coordenadas */}
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-2 text-orange-700 font-semibold mb-1">
                    <Navigation className="h-4 w-4" />
                    GPS
                  </div>
                  <p className="text-xs font-mono text-gray-900">
                    {product.location_lat?.toFixed(4)}, {product.location_lng?.toFixed(4)}
                  </p>
                </div>
              </div>

              {/* Dados Climáticos */}
              {product.weatherData && (
                <div className="p-4 bg-gradient-to-r from-sky-50 to-cyan-50 rounded-lg border border-sky-200">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-sky-600" />
                    Condições Climáticas
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Droplet className="h-4 w-4 text-blue-500" />
                      <span className="text-sm text-gray-700">
                        Temp: {product.weatherData.main?.temp}°C
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Wind className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-700">
                        {product.weatherData.weather?.[0]?.description}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Estado da Estrada */}
              {product.roadCondition && (
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <span className="font-semibold text-gray-900">
                      Estado da Estrada: {product.roadCondition}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Coluna Direita - Informações do Agricultor */}
            <div className="space-y-4">
              {/* Card do Agricultor */}
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white">
                    <Leaf className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{product.farmer_name}</p>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${
                            i < (product.farmer_rating || 0)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Contato */}
                <div className="space-y-2">
                  {product.farmer_phone && (
                    <a
                      href={`tel:${product.farmer_phone}`}
                      className="flex items-center gap-2 p-2 bg-white rounded-lg hover:bg-green-100 transition-colors text-gray-700 text-sm"
                    >
                      <Phone className="h-4 w-4 text-green-600" />
                      {product.farmer_phone}
                    </a>
                  )}
                  {product.farmer_email && (
                    <a
                      href={`mailto:${product.farmer_email}`}
                      className="flex items-center gap-2 p-2 bg-white rounded-lg hover:bg-green-100 transition-colors text-gray-700 text-sm"
                    >
                      <Mail className="h-4 w-4 text-green-600" />
                      {product.farmer_email}
                    </a>
                  )}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="space-y-2">
                <Button
                  onClick={() => onContact(product)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-all"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contactar Agricultor
                </Button>
                <Button
                  variant="outline"
                  className="w-full border-green-200 text-green-700 hover:bg-green-50"
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Partilhar
                </Button>
              </div>

              {/* Informações Adicionais */}
              <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600 space-y-1">
                <p>✓ Produto verificado</p>
                <p>✓ Entrega disponível</p>
                <p>✓ Pagamento seguro</p>
              </div>
            </div>
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
      <header className="absolute top-0 left-0 right-0 z-30 bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Leaf className="h-8 w-8" />
            <h1 className="text-2xl font-bold">AGRI LINK - Mapa de Produtos</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-green-700 rounded-full"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Barra de Pesquisa */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-30 w-11/12 max-w-2xl">
        <div className="bg-white/95 backdrop-blur-md shadow-xl rounded-2xl border border-green-200 flex items-center px-4 py-3">
          <Search className="h-5 w-5 text-green-600 mr-3" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Pesquisar localização, produto..."
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500 text-lg"
          />
          {searchText && (
            <button
              onClick={() => {
                setSearchText('');
                setSearchResults([]);
              }}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>
          )}
        </div>

        {/* Resultados de Busca */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-white rounded-xl shadow-xl max-h-64 overflow-auto border border-green-200">
            {searchResults.map((r) => (
              <button
                key={r.id}
                onClick={() => selectSearchResult(r)}
                className="w-full text-left p-3 hover:bg-green-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <p className="font-medium text-gray-900">{r.place_name}</p>
                <p className="text-sm text-gray-500">{r.place_type}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Painel de Filtros */}
      {showFilters && (
        <div className="absolute top-56 left-4 z-30 bg-white rounded-xl shadow-xl p-6 max-w-xs border border-green-200">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Filter className="h-5 w-5 text-green-600" />
            Filtros
          </h3>

          <div className="space-y-4">
            {/* Tipo de Produto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Produto
              </label>
              <input
                type="text"
                placeholder="Ex: Milho, Feijão..."
                value={filters.productType}
                onChange={(e) =>
                  setFilters({ ...filters, productType: e.target.value })
                }
                className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Faixa de Preço */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preço: {filters.priceRange[0]} - {filters.priceRange[1]} Kz
              </label>
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
                className="w-full"
              />
            </div>

            {/* Raio de Busca */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Raio: {filters.radius} km
              </label>
              <input
                type="range"
                min="5"
                max="200"
                step="5"
                value={filters.radius}
                onChange={(e) =>
                  setFilters({ ...filters, radius: parseInt(e.target.value) })
                }
                className="w-full"
              />
            </div>

            {/* Tipo de Usuário */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mostrar
              </label>
              <select
                value={filters.userType}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    userType: e.target.value as FilterOptions['userType'],
                  })
                }
                className="w-full px-3 py-2 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Todos</option>
                <option value="farmers">Apenas Agricultores</option>
                <option value="buyers">Apenas Compradores</option>
              </select>
            </div>

            <Button
              onClick={() => setShowFilters(false)}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Aplicar Filtros
            </Button>
          </div>
        </div>
      )}

      {/* Informações de Produtos */}
      <div className="absolute bottom-6 left-6 z-30 bg-white rounded-xl shadow-xl p-4 max-w-xs border border-green-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">Produtos Encontrados</h3>
          <Badge className="bg-green-600 text-white">{filteredProducts.length}</Badge>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {filteredProducts.slice(0, 5).map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedProduct(p)}
              className="w-full text-left p-2 hover:bg-green-50 rounded-lg border border-gray-200 transition-colors"
            >
              <p className="font-medium text-gray-900 text-sm">{p.product_type}</p>
              <p className="text-xs text-green-600 font-semibold">{p.price.toFixed(2)} Kz/kg</p>
              <p className="text-xs text-gray-500">{p.farmer_name}</p>
            </button>
          ))}
          {filteredProducts.length > 5 && (
            <p className="text-xs text-gray-500 text-center py-2">
              +{filteredProducts.length - 5} produtos
            </p>
          )}
        </div>
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