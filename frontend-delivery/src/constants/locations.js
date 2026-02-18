export const CANADIAN_PROVINCES = [
  { value: 'Alberta', label: 'Alberta' },
  { value: 'British Columbia', label: 'British Columbia' },
  { value: 'Manitoba', label: 'Manitoba' },
  { value: 'New Brunswick', label: 'New Brunswick' },
  { value: 'Newfoundland and Labrador', label: 'Newfoundland and Labrador' },
  { value: 'Nova Scotia', label: 'Nova Scotia' },
  { value: 'Ontario', label: 'Ontario' },
  { value: 'Prince Edward Island', label: 'Prince Edward Island' },
  { value: 'Quebec', label: 'Quebec' },
  { value: 'Saskatchewan', label: 'Saskatchewan' },
]

export const CITIES_BY_PROVINCE = {
  'Alberta': ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'St. Albert', 'Medicine Hat'],
  'British Columbia': ['Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond', 'Kelowna'],
  'Manitoba': ['Winnipeg', 'Brandon', 'Steinbach', 'Thompson'],
  'New Brunswick': ['Moncton', 'Saint John', 'Fredericton', 'Dieppe'],
  'Newfoundland and Labrador': ["St. John's", "Corner Brook", "Grand Falls-Windsor"],
  'Nova Scotia': ['Halifax', 'Dartmouth', 'Sydney', 'Truro'],
  'Ontario': ['Toronto', 'Ottawa', 'Mississauga', 'Hamilton', 'London', 'Kitchener'],
  'Prince Edward Island': ['Charlottetown', 'Summerside'],
  'Quebec': ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil'],
  'Saskatchewan': ['Saskatoon', 'Regina', 'Prince Albert', 'Moose Jaw'],
}

export const getCitiesForProvince = (province) => CITIES_BY_PROVINCE[province] || []
