import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export const countries: Country[] = [
  { code: 'AO', name: 'Angola', dialCode: '+244', flag: '🇦🇴' },
  { code: 'CD', name: 'RD Congo', dialCode: '+243', flag: '🇨🇩' },
  { code: 'ZA', name: 'África do Sul', dialCode: '+27', flag: '🇿🇦' },
  { code: 'GB', name: 'Reino Unido', dialCode: '+44', flag: '🇬🇧' },
];

interface CountryPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  selectedCountry: Country;
  onCountryChange: (country: Country) => void;
  placeholder?: string;
  required?: boolean;
}

export const CountryPhoneInput = ({
  value,
  onChange,
  selectedCountry,
  onCountryChange,
  placeholder = '900 000 000',
  required = false,
}: CountryPhoneInputProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove non-numeric characters except for spaces
    const cleaned = e.target.value.replace(/[^\d\s]/g, '');
    onChange(cleaned);
  };

  const getFullPhoneNumber = () => {
    if (!value) return '';
    return `${selectedCountry.dialCode} ${value}`;
  };

  return (
    <div className="flex gap-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-2 min-w-[120px] justify-between"
            type="button"
          >
            <span className="text-xl">{selectedCountry.flag}</span>
            <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[200px]">
          {countries.map((country) => (
            <DropdownMenuItem
              key={country.code}
              onClick={() => {
                onCountryChange(country);
                setIsOpen(false);
              }}
              className="flex items-center gap-3 cursor-pointer"
            >
              <span className="text-xl">{country.flag}</span>
              <span className="flex-1">{country.name}</span>
              <span className="text-muted-foreground text-sm">{country.dialCode}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Input
        type="tel"
        value={value}
        onChange={handlePhoneChange}
        placeholder={placeholder}
        className="flex-1"
        required={required}
      />
    </div>
  );
};

export default CountryPhoneInput;
