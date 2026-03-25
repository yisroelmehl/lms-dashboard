/**
 * Full list of countries with ISO 3166-1 alpha-2 codes
 * and US states with USPS abbreviations.
 * Used in shipment forms for DHL and other carriers.
 */

export interface Country {
  code: string;        // ISO 3166-1 alpha-2
  name: string;        // English name
  hebrewName: string;  // Hebrew name
  postalCodePattern?: RegExp;  // Validation pattern for postal codes
  postalCodeExample?: string;  // Example postal code
  requiresState?: boolean;     // Whether state/province is required (e.g. US, CA)
}

export interface USState {
  code: string;  // 2-letter USPS abbreviation
  name: string;  // Full English name
}

// Frequently-used countries first, then alphabetical
export const COUNTRIES: Country[] = [
  // ── Most common destinations ──
  { code: "IL", name: "Israel", hebrewName: "ישראל", postalCodePattern: /^\d{7}$/, postalCodeExample: "5120149" },
  { code: "US", name: "United States", hebrewName: "ארה״ב", postalCodePattern: /^\d{5}(-\d{4})?$/, postalCodeExample: "10001", requiresState: true },
  { code: "CA", name: "Canada", hebrewName: "קנדה", postalCodePattern: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, postalCodeExample: "M5V 2T6", requiresState: true },
  { code: "GB", name: "United Kingdom", hebrewName: "בריטניה", postalCodePattern: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, postalCodeExample: "SW1A 1AA" },
  { code: "FR", name: "France", hebrewName: "צרפת", postalCodePattern: /^\d{5}$/, postalCodeExample: "75001" },
  { code: "DE", name: "Germany", hebrewName: "גרמניה", postalCodePattern: /^\d{5}$/, postalCodeExample: "10115" },
  { code: "BE", name: "Belgium", hebrewName: "בלגיה", postalCodePattern: /^\d{4}$/, postalCodeExample: "1000" },
  { code: "NL", name: "Netherlands", hebrewName: "הולנד", postalCodePattern: /^\d{4}\s?[A-Z]{2}$/i, postalCodeExample: "1012 AB" },
  { code: "AU", name: "Australia", hebrewName: "אוסטרליה", postalCodePattern: /^\d{4}$/, postalCodeExample: "2000", requiresState: true },
  
  // ── Alphabetical: remaining countries ──
  { code: "AF", name: "Afghanistan", hebrewName: "אפגניסטן" },
  { code: "AL", name: "Albania", hebrewName: "אלבניה" },
  { code: "DZ", name: "Algeria", hebrewName: "אלג׳יריה" },
  { code: "AD", name: "Andorra", hebrewName: "אנדורה", postalCodePattern: /^AD\d{3}$/i, postalCodeExample: "AD100" },
  { code: "AO", name: "Angola", hebrewName: "אנגולה" },
  { code: "AG", name: "Antigua and Barbuda", hebrewName: "אנטיגואה וברבודה" },
  { code: "AR", name: "Argentina", hebrewName: "ארגנטינה", postalCodePattern: /^[A-Z]\d{4}[A-Z]{3}$/i, postalCodeExample: "C1420" },
  { code: "AM", name: "Armenia", hebrewName: "ארמניה" },
  { code: "AT", name: "Austria", hebrewName: "אוסטריה", postalCodePattern: /^\d{4}$/, postalCodeExample: "1010" },
  { code: "AZ", name: "Azerbaijan", hebrewName: "אזרבייג׳ן" },
  { code: "BS", name: "Bahamas", hebrewName: "בהאמה" },
  { code: "BH", name: "Bahrain", hebrewName: "בחריין" },
  { code: "BD", name: "Bangladesh", hebrewName: "בנגלדש" },
  { code: "BB", name: "Barbados", hebrewName: "ברבדוס" },
  { code: "BY", name: "Belarus", hebrewName: "בלארוס" },
  { code: "BZ", name: "Belize", hebrewName: "בליז" },
  { code: "BJ", name: "Benin", hebrewName: "בנין" },
  { code: "BT", name: "Bhutan", hebrewName: "בהוטן" },
  { code: "BO", name: "Bolivia", hebrewName: "בוליביה" },
  { code: "BA", name: "Bosnia and Herzegovina", hebrewName: "בוסניה והרצגובינה" },
  { code: "BW", name: "Botswana", hebrewName: "בוצוואנה" },
  { code: "BR", name: "Brazil", hebrewName: "ברזיל", postalCodePattern: /^\d{5}-?\d{3}$/, postalCodeExample: "01001-000" },
  { code: "BN", name: "Brunei", hebrewName: "ברוניי" },
  { code: "BG", name: "Bulgaria", hebrewName: "בולגריה" },
  { code: "KH", name: "Cambodia", hebrewName: "קמבודיה" },
  { code: "CM", name: "Cameroon", hebrewName: "קמרון" },
  { code: "CL", name: "Chile", hebrewName: "צ׳ילה" },
  { code: "CN", name: "China", hebrewName: "סין", postalCodePattern: /^\d{6}$/, postalCodeExample: "100000" },
  { code: "CO", name: "Colombia", hebrewName: "קולומביה" },
  { code: "CR", name: "Costa Rica", hebrewName: "קוסטה ריקה" },
  { code: "HR", name: "Croatia", hebrewName: "קרואטיה" },
  { code: "CY", name: "Cyprus", hebrewName: "קפריסין" },
  { code: "CZ", name: "Czech Republic", hebrewName: "צ׳כיה", postalCodePattern: /^\d{3}\s?\d{2}$/, postalCodeExample: "110 00" },
  { code: "DK", name: "Denmark", hebrewName: "דנמרק", postalCodePattern: /^\d{4}$/, postalCodeExample: "1050" },
  { code: "DO", name: "Dominican Republic", hebrewName: "הרפובליקה הדומיניקנית" },
  { code: "EC", name: "Ecuador", hebrewName: "אקוודור" },
  { code: "EG", name: "Egypt", hebrewName: "מצרים" },
  { code: "SV", name: "El Salvador", hebrewName: "אל סלבדור" },
  { code: "EE", name: "Estonia", hebrewName: "אסטוניה" },
  { code: "ET", name: "Ethiopia", hebrewName: "אתיופיה" },
  { code: "FI", name: "Finland", hebrewName: "פינלנד", postalCodePattern: /^\d{5}$/, postalCodeExample: "00100" },
  { code: "GA", name: "Gabon", hebrewName: "גבון" },
  { code: "GE", name: "Georgia", hebrewName: "גאורגיה" },
  { code: "GH", name: "Ghana", hebrewName: "גאנה" },
  { code: "GR", name: "Greece", hebrewName: "יוון", postalCodePattern: /^\d{3}\s?\d{2}$/, postalCodeExample: "105 57" },
  { code: "GT", name: "Guatemala", hebrewName: "גואטמלה" },
  { code: "GY", name: "Guyana", hebrewName: "גיאנה" },
  { code: "HT", name: "Haiti", hebrewName: "האיטי" },
  { code: "HN", name: "Honduras", hebrewName: "הונדורס" },
  { code: "HK", name: "Hong Kong", hebrewName: "הונג קונג" },
  { code: "HU", name: "Hungary", hebrewName: "הונגריה", postalCodePattern: /^\d{4}$/, postalCodeExample: "1011" },
  { code: "IS", name: "Iceland", hebrewName: "איסלנד" },
  { code: "IN", name: "India", hebrewName: "הודו", postalCodePattern: /^\d{6}$/, postalCodeExample: "110001" },
  { code: "ID", name: "Indonesia", hebrewName: "אינדונזיה" },
  { code: "IE", name: "Ireland", hebrewName: "אירלנד" },
  { code: "IT", name: "Italy", hebrewName: "איטליה", postalCodePattern: /^\d{5}$/, postalCodeExample: "00100" },
  { code: "JM", name: "Jamaica", hebrewName: "ג׳מייקה" },
  { code: "JP", name: "Japan", hebrewName: "יפן", postalCodePattern: /^\d{3}-?\d{4}$/, postalCodeExample: "100-0001" },
  { code: "JO", name: "Jordan", hebrewName: "ירדן" },
  { code: "KZ", name: "Kazakhstan", hebrewName: "קזחסטן" },
  { code: "KE", name: "Kenya", hebrewName: "קניה" },
  { code: "KR", name: "South Korea", hebrewName: "דרום קוריאה", postalCodePattern: /^\d{5}$/, postalCodeExample: "03000" },
  { code: "KW", name: "Kuwait", hebrewName: "כווית" },
  { code: "LV", name: "Latvia", hebrewName: "לטביה" },
  { code: "LB", name: "Lebanon", hebrewName: "לבנון" },
  { code: "LT", name: "Lithuania", hebrewName: "ליטא" },
  { code: "LU", name: "Luxembourg", hebrewName: "לוקסמבורג" },
  { code: "MO", name: "Macau", hebrewName: "מקאו" },
  { code: "MY", name: "Malaysia", hebrewName: "מלזיה" },
  { code: "MT", name: "Malta", hebrewName: "מלטה" },
  { code: "MU", name: "Mauritius", hebrewName: "מאוריציוס" },
  { code: "MX", name: "Mexico", hebrewName: "מקסיקו", postalCodePattern: /^\d{5}$/, postalCodeExample: "01000" },
  { code: "MD", name: "Moldova", hebrewName: "מולדובה" },
  { code: "MC", name: "Monaco", hebrewName: "מונקו" },
  { code: "MN", name: "Mongolia", hebrewName: "מונגוליה" },
  { code: "ME", name: "Montenegro", hebrewName: "מונטנגרו" },
  { code: "MA", name: "Morocco", hebrewName: "מרוקו" },
  { code: "MZ", name: "Mozambique", hebrewName: "מוזמביק" },
  { code: "MM", name: "Myanmar", hebrewName: "מיאנמר" },
  { code: "NA", name: "Namibia", hebrewName: "נמיביה" },
  { code: "NP", name: "Nepal", hebrewName: "נפאל" },
  { code: "NZ", name: "New Zealand", hebrewName: "ניו זילנד", postalCodePattern: /^\d{4}$/, postalCodeExample: "6011" },
  { code: "NI", name: "Nicaragua", hebrewName: "ניקרגואה" },
  { code: "NG", name: "Nigeria", hebrewName: "ניגריה" },
  { code: "MK", name: "North Macedonia", hebrewName: "מקדוניה הצפונית" },
  { code: "NO", name: "Norway", hebrewName: "נורבגיה", postalCodePattern: /^\d{4}$/, postalCodeExample: "0001" },
  { code: "OM", name: "Oman", hebrewName: "עומאן" },
  { code: "PK", name: "Pakistan", hebrewName: "פקיסטן" },
  { code: "PA", name: "Panama", hebrewName: "פנמה" },
  { code: "PY", name: "Paraguay", hebrewName: "פרגוואי" },
  { code: "PE", name: "Peru", hebrewName: "פרו" },
  { code: "PH", name: "Philippines", hebrewName: "הפיליפינים" },
  { code: "PL", name: "Poland", hebrewName: "פולין", postalCodePattern: /^\d{2}-?\d{3}$/, postalCodeExample: "00-001" },
  { code: "PT", name: "Portugal", hebrewName: "פורטוגל", postalCodePattern: /^\d{4}-?\d{3}$/, postalCodeExample: "1000-001" },
  { code: "QA", name: "Qatar", hebrewName: "קטאר" },
  { code: "RO", name: "Romania", hebrewName: "רומניה" },
  { code: "RU", name: "Russia", hebrewName: "רוסיה" },
  { code: "RW", name: "Rwanda", hebrewName: "רואנדה" },
  { code: "SA", name: "Saudi Arabia", hebrewName: "ערב הסעודית" },
  { code: "SN", name: "Senegal", hebrewName: "סנגל" },
  { code: "RS", name: "Serbia", hebrewName: "סרביה" },
  { code: "SG", name: "Singapore", hebrewName: "סינגפור", postalCodePattern: /^\d{6}$/, postalCodeExample: "018956" },
  { code: "SK", name: "Slovakia", hebrewName: "סלובקיה" },
  { code: "SI", name: "Slovenia", hebrewName: "סלובניה" },
  { code: "ZA", name: "South Africa", hebrewName: "דרום אפריקה", postalCodePattern: /^\d{4}$/, postalCodeExample: "0001" },
  { code: "ES", name: "Spain", hebrewName: "ספרד", postalCodePattern: /^\d{5}$/, postalCodeExample: "28001" },
  { code: "LK", name: "Sri Lanka", hebrewName: "סרי לנקה" },
  { code: "SE", name: "Sweden", hebrewName: "שוודיה", postalCodePattern: /^\d{3}\s?\d{2}$/, postalCodeExample: "111 22" },
  { code: "CH", name: "Switzerland", hebrewName: "שוויץ", postalCodePattern: /^\d{4}$/, postalCodeExample: "3000" },
  { code: "TW", name: "Taiwan", hebrewName: "טייוואן" },
  { code: "TZ", name: "Tanzania", hebrewName: "טנזניה" },
  { code: "TH", name: "Thailand", hebrewName: "תאילנד", postalCodePattern: /^\d{5}$/, postalCodeExample: "10100" },
  { code: "TT", name: "Trinidad and Tobago", hebrewName: "טרינידד וטובגו" },
  { code: "TN", name: "Tunisia", hebrewName: "תוניסיה" },
  { code: "TR", name: "Turkey", hebrewName: "טורקיה", postalCodePattern: /^\d{5}$/, postalCodeExample: "06100" },
  { code: "UA", name: "Ukraine", hebrewName: "אוקראינה" },
  { code: "AE", name: "United Arab Emirates", hebrewName: "איחוד האמירויות" },
  { code: "UY", name: "Uruguay", hebrewName: "אורוגוואי" },
  { code: "UZ", name: "Uzbekistan", hebrewName: "אוזבקיסטן" },
  { code: "VE", name: "Venezuela", hebrewName: "ונצואלה" },
  { code: "VN", name: "Vietnam", hebrewName: "ויאטנם" },
  { code: "ZM", name: "Zambia", hebrewName: "זמביה" },
  { code: "ZW", name: "Zimbabwe", hebrewName: "זימבבואה" },
];

export const US_STATES: USState[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  // Territories
  { code: "DC", name: "District of Columbia" },
  { code: "PR", name: "Puerto Rico" },
  { code: "VI", name: "U.S. Virgin Islands" },
  { code: "GU", name: "Guam" },
];

// Canadian provinces (for future use if needed)
export const CA_PROVINCES = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

// Australian states
export const AU_STATES = [
  { code: "ACT", name: "Australian Capital Territory" },
  { code: "NSW", name: "New South Wales" },
  { code: "NT", name: "Northern Territory" },
  { code: "QLD", name: "Queensland" },
  { code: "SA", name: "South Australia" },
  { code: "TAS", name: "Tasmania" },
  { code: "VIC", name: "Victoria" },
  { code: "WA", name: "Western Australia" },
];

/**
 * Get the display label for a country code
 */
export function getCountryLabel(code: string): string {
  const c = COUNTRIES.find((c) => c.code === code);
  return c ? `${c.name} - ${c.hebrewName}` : code;
}

/**
 * Get states/provinces for a country, if applicable
 */
export function getStatesForCountry(countryCode: string): { code: string; name: string }[] | null {
  switch (countryCode) {
    case "US": return US_STATES;
    case "CA": return CA_PROVINCES;
    case "AU": return AU_STATES;
    default: return null;
  }
}

/**
 * Validate a postal code for a given country.
 * Returns null if valid, or a Hebrew error message if invalid.
 */
export function validatePostalCode(countryCode: string, postalCode: string): string | null {
  if (!postalCode) return null; // Don't validate empty (other validation handles required)
  
  const country = COUNTRIES.find((c) => c.code === countryCode);
  if (!country?.postalCodePattern) return null; // No pattern = no validation
  
  if (!country.postalCodePattern.test(postalCode)) {
    return `מיקוד לא תקין עבור ${country.hebrewName}. דוגמה: ${country.postalCodeExample}`;
  }
  
  return null;
}
