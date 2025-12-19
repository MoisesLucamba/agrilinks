export interface Municipality {
  id: string;
  name: string;
}

export interface Province {
  id: string;
  name: string;
  municipalities: Municipality[];
}

export interface CountryLocations {
  [countryCode: string]: Province[];
}

// Angola provinces
const angolaProvinces: Province[] = [
  {
    id: "bengo", name: "Bengo",
    municipalities: [
      { id: "ambriz", name: "Ambriz" },
      { id: "dande", name: "Dande" },
      { id: "nambuangongo", name: "Nambuangongo" },
      { id: "pango-aluquem", name: "Pango Aluquém" }
    ]
  },
  {
    id: "benguela", name: "Benguela",
    municipalities: [
      { id: "benguela-city", name: "Benguela" },
      { id: "lobito", name: "Lobito" },
      { id: "catumbela", name: "Catumbela" },
      { id: "cubal", name: "Cubal" }
    ]
  },
  {
    id: "bie", name: "Bié",
    municipalities: [
      { id: "cuito", name: "Cuíto" },
      { id: "andulo", name: "Andulo" },
      { id: "camacupa", name: "Camacupa" }
    ]
  },
  {
    id: "cabinda", name: "Cabinda",
    municipalities: [
      { id: "cabinda-city", name: "Cabinda" },
      { id: "cacongo", name: "Cacongo" },
      { id: "buco-zau", name: "Buco-Zau" }
    ]
  },
  {
    id: "huambo", name: "Huambo",
    municipalities: [
      { id: "huambo-city", name: "Huambo" },
      { id: "caala", name: "Caála" },
      { id: "bailundo", name: "Bailundo" }
    ]
  },
  {
    id: "huila", name: "Huíla",
    municipalities: [
      { id: "lubango", name: "Lubango" },
      { id: "matala", name: "Matala" },
      { id: "chibia", name: "Chibia" }
    ]
  },
  {
    id: "luanda", name: "Luanda",
    municipalities: [
      { id: "luanda-city", name: "Luanda" },
      { id: "viana", name: "Viana" },
      { id: "cacuaco", name: "Cacuaco" },
      { id: "belas", name: "Belas" },
      { id: "talatona", name: "Talatona" }
    ]
  },
  {
    id: "malanje", name: "Malanje",
    municipalities: [
      { id: "malanje-city", name: "Malanje" },
      { id: "cacuso", name: "Cacuso" }
    ]
  },
  {
    id: "moxico", name: "Moxico",
    municipalities: [
      { id: "luena", name: "Luena" },
      { id: "luau", name: "Luau" }
    ]
  },
  {
    id: "namibe", name: "Namibe",
    municipalities: [
      { id: "mocamedes", name: "Moçâmedes" },
      { id: "tombua", name: "Tômbua" }
    ]
  },
  {
    id: "uige", name: "Uíge",
    municipalities: [
      { id: "uige-city", name: "Uíge" },
      { id: "negage", name: "Negage" }
    ]
  },
  {
    id: "zaire", name: "Zaire",
    municipalities: [
      { id: "mbanza-congo", name: "Mbanza Congo" },
      { id: "soio", name: "Soio" }
    ]
  }
];

// DR Congo provinces
const congoProvinces: Province[] = [
  {
    id: "kinshasa", name: "Kinshasa",
    municipalities: [
      { id: "gombe", name: "Gombe" },
      { id: "lingwala", name: "Lingwala" },
      { id: "barumbu", name: "Barumbu" },
      { id: "kinshasa-city", name: "Kinshasa" }
    ]
  },
  {
    id: "kongo-central", name: "Kongo Central",
    municipalities: [
      { id: "matadi", name: "Matadi" },
      { id: "boma", name: "Boma" },
      { id: "muanda", name: "Muanda" }
    ]
  },
  {
    id: "katanga", name: "Haut-Katanga",
    municipalities: [
      { id: "lubumbashi", name: "Lubumbashi" },
      { id: "likasi", name: "Likasi" },
      { id: "kolwezi", name: "Kolwezi" }
    ]
  },
  {
    id: "nord-kivu", name: "Nord-Kivu",
    municipalities: [
      { id: "goma", name: "Goma" },
      { id: "butembo", name: "Butembo" },
      { id: "beni", name: "Beni" }
    ]
  },
  {
    id: "sud-kivu", name: "Sud-Kivu",
    municipalities: [
      { id: "bukavu", name: "Bukavu" },
      { id: "uvira", name: "Uvira" }
    ]
  },
  {
    id: "kasai", name: "Kasaï",
    municipalities: [
      { id: "tshikapa", name: "Tshikapa" },
      { id: "kananga", name: "Kananga" }
    ]
  },
  {
    id: "equateur", name: "Équateur",
    municipalities: [
      { id: "mbandaka", name: "Mbandaka" },
      { id: "gemena", name: "Gemena" }
    ]
  }
];

// South Africa provinces
const southAfricaProvinces: Province[] = [
  {
    id: "gauteng", name: "Gauteng",
    municipalities: [
      { id: "johannesburg", name: "Johannesburg" },
      { id: "pretoria", name: "Pretoria" },
      { id: "soweto", name: "Soweto" },
      { id: "sandton", name: "Sandton" }
    ]
  },
  {
    id: "western-cape", name: "Western Cape",
    municipalities: [
      { id: "cape-town", name: "Cape Town" },
      { id: "stellenbosch", name: "Stellenbosch" },
      { id: "paarl", name: "Paarl" }
    ]
  },
  {
    id: "kwazulu-natal", name: "KwaZulu-Natal",
    municipalities: [
      { id: "durban", name: "Durban" },
      { id: "pietermaritzburg", name: "Pietermaritzburg" },
      { id: "richards-bay", name: "Richards Bay" }
    ]
  },
  {
    id: "eastern-cape", name: "Eastern Cape",
    municipalities: [
      { id: "port-elizabeth", name: "Port Elizabeth" },
      { id: "east-london", name: "East London" }
    ]
  },
  {
    id: "limpopo", name: "Limpopo",
    municipalities: [
      { id: "polokwane", name: "Polokwane" },
      { id: "tzaneen", name: "Tzaneen" }
    ]
  },
  {
    id: "mpumalanga", name: "Mpumalanga",
    municipalities: [
      { id: "nelspruit", name: "Nelspruit" },
      { id: "witbank", name: "Witbank" }
    ]
  },
  {
    id: "free-state", name: "Free State",
    municipalities: [
      { id: "bloemfontein", name: "Bloemfontein" },
      { id: "welkom", name: "Welkom" }
    ]
  },
  {
    id: "north-west", name: "North West",
    municipalities: [
      { id: "rustenburg", name: "Rustenburg" },
      { id: "klerksdorp", name: "Klerksdorp" }
    ]
  },
  {
    id: "northern-cape", name: "Northern Cape",
    municipalities: [
      { id: "kimberley", name: "Kimberley" },
      { id: "upington", name: "Upington" }
    ]
  }
];

// UK regions/counties
const ukProvinces: Province[] = [
  {
    id: "london", name: "London",
    municipalities: [
      { id: "central-london", name: "Central London" },
      { id: "westminster", name: "Westminster" },
      { id: "camden", name: "Camden" },
      { id: "greenwich", name: "Greenwich" }
    ]
  },
  {
    id: "south-east", name: "South East",
    municipalities: [
      { id: "brighton", name: "Brighton" },
      { id: "oxford", name: "Oxford" },
      { id: "reading", name: "Reading" }
    ]
  },
  {
    id: "north-west", name: "North West",
    municipalities: [
      { id: "manchester", name: "Manchester" },
      { id: "liverpool", name: "Liverpool" },
      { id: "preston", name: "Preston" }
    ]
  },
  {
    id: "west-midlands", name: "West Midlands",
    municipalities: [
      { id: "birmingham", name: "Birmingham" },
      { id: "coventry", name: "Coventry" }
    ]
  },
  {
    id: "yorkshire", name: "Yorkshire",
    municipalities: [
      { id: "leeds", name: "Leeds" },
      { id: "sheffield", name: "Sheffield" },
      { id: "york", name: "York" }
    ]
  },
  {
    id: "scotland", name: "Scotland",
    municipalities: [
      { id: "edinburgh", name: "Edinburgh" },
      { id: "glasgow", name: "Glasgow" },
      { id: "aberdeen", name: "Aberdeen" }
    ]
  },
  {
    id: "wales", name: "Wales",
    municipalities: [
      { id: "cardiff", name: "Cardiff" },
      { id: "swansea", name: "Swansea" }
    ]
  },
  {
    id: "northern-ireland", name: "Northern Ireland",
    municipalities: [
      { id: "belfast", name: "Belfast" },
      { id: "derry", name: "Derry" }
    ]
  }
];

export const countryLocations: CountryLocations = {
  AO: angolaProvinces,
  CD: congoProvinces,
  ZA: southAfricaProvinces,
  GB: ukProvinces
};

export const getProvincesForCountry = (countryCode: string): Province[] => {
  return countryLocations[countryCode] || [];
};

export const getProvinceLabel = (countryCode: string): string => {
  const labels: { [key: string]: string } = {
    AO: 'Província',
    CD: 'Province',
    ZA: 'Province',
    GB: 'Region'
  };
  return labels[countryCode] || 'Province';
};

export const getMunicipalityLabel = (countryCode: string): string => {
  const labels: { [key: string]: string } = {
    AO: 'Município',
    CD: 'Commune',
    ZA: 'City',
    GB: 'City'
  };
  return labels[countryCode] || 'City';
};
