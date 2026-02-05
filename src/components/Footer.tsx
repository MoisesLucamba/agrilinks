import { Mail, Phone, MapPin, Facebook, Instagram, Linkedin } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#2D3277] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-2xl font-bold mb-4 text-[#FFF159]">OrbisLink</h3>
            <p className="text-white/80 mb-4">
              Conectando produtores a grandes compradores com transparência,
              qualidade e eficiência no mercado agrícola.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-white/60 hover:text-[#FFF159] transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-white/60 hover:text-[#FFF159] transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-white/60 hover:text-[#FFF159] transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Links Rápidos</h4>
            <ul className="space-y-2">
              <li>
                <a href="#como-funciona" className="text-white/80 hover:text-[#FFF159] transition-colors">
                  Como Funciona
                </a>
              </li>
              <li>
                <a href="#catalogo" className="text-white/80 hover:text-[#FFF159] transition-colors">
                  Catálogo
                </a>
              </li>
              <li>
                <a href="#pedidos" className="text-white/80 hover:text-[#FFF159] transition-colors">
                  Fazer Pedido
                </a>
              </li>
              <li>
                <a href="#sobre" className="text-white/80 hover:text-[#FFF159] transition-colors">
                  Sobre Nós
                </a>
              </li>
              <li>
                <a href="#contato" className="text-white/80 hover:text-[#FFF159] transition-colors">
                  Contato
                </a>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Nossos Serviços</h4>
            <ul className="space-y-2 text-white/80">
              <li>Venda de Grãos em Larga Escala</li>
              <li>Frutas e Vegetais Frescos</li>
              <li>Proteínas de Qualidade</li>
              <li>Logística e Entrega</li>
              <li>Consultoria Comercial</li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contato</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-[#FFF159]" />
                <span className="text-white/80">+244 922 717 574 / 935358417</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-[#FFF159]" />
                <span className="text-white/80">contacts.orbislink@gmail.com</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-[#FFF159]" />
                <span className="text-white/80">
                  Luanda, Angola<br />
                  Zona Industrial
                </span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-white/10 rounded-lg">
              <p className="text-sm text-primary-foreground/90">
                <strong>Horário:</strong><br />
                Segunda a Sexta: 8h às 18h
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-primary-light mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-white/60 text-sm">
            © {currentYear} OrbisLink. Todos os direitos reservados.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="text-white/60 hover:text-[#FFF159] text-sm transition-colors">
              Política de Privacidade
            </a>
            <a href="#" className="text-white/60 hover:text-[#FFF159] text-sm transition-colors">
              Termos de Uso
            </a>
            <a href="#" className="text-white/60 hover:text-[#FFF159] text-sm transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
