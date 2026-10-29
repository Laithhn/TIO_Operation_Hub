// A73: ISO 3166-1 alpha-2 code and UN M49 geographic region of every country a client can have (the list in Common/Countries.cs).
// Regions follow the UN M49 standard: its five regions, with Western Asia (the Middle East) kept apart from the rest of Asia,
// because most TIO clients are there. Kosovo has no ISO code (XK is the commonly used user-assigned code).

export type WorldRegion = 'Africa' | 'Americas' | 'Europe' | 'Western Asia' | 'Asia' | 'Oceania';
export const WORLD_REGIONS: { key: WorldRegion; label: string }[] = [
  { key: 'Western Asia', label: 'Western Asia (Middle East)' }, { key: 'Africa', label: 'Africa' }, { key: 'Europe', label: 'Europe' },
  { key: 'Asia', label: 'Asia (other)' }, { key: 'Americas', label: 'Americas' }, { key: 'Oceania', label: 'Oceania' }
];

const AF = 'Africa', AM = 'Americas', EU = 'Europe', WA = 'Western Asia', AS = 'Asia', OC = 'Oceania';
const T: Record<string, [string, WorldRegion]> = {
  Afghanistan: ['AF', AS], Albania: ['AL', EU], Algeria: ['DZ', AF], Andorra: ['AD', EU], Angola: ['AO', AF], 'Antigua and Barbuda': ['AG', AM],
  Argentina: ['AR', AM], Armenia: ['AM', WA], Australia: ['AU', OC], Austria: ['AT', EU], Azerbaijan: ['AZ', WA], Bahamas: ['BS', AM], Bahrain: ['BH', WA],
  Bangladesh: ['BD', AS], Barbados: ['BB', AM], Belarus: ['BY', EU], Belgium: ['BE', EU], Belize: ['BZ', AM], Benin: ['BJ', AF], Bhutan: ['BT', AS],
  Bolivia: ['BO', AM], 'Bosnia and Herzegovina': ['BA', EU], Botswana: ['BW', AF], Brazil: ['BR', AM], Brunei: ['BN', AS], Bulgaria: ['BG', EU],
  'Burkina Faso': ['BF', AF], Burundi: ['BI', AF], 'Cabo Verde': ['CV', AF], Cambodia: ['KH', AS], Cameroon: ['CM', AF], Canada: ['CA', AM],
  'Central African Republic': ['CF', AF], Chad: ['TD', AF], Chile: ['CL', AM], China: ['CN', AS], Colombia: ['CO', AM], Comoros: ['KM', AF], Congo: ['CG', AF],
  'Costa Rica': ['CR', AM], "Côte d'Ivoire": ['CI', AF], Croatia: ['HR', EU], Cuba: ['CU', AM], Cyprus: ['CY', WA], Czechia: ['CZ', EU],
  'Democratic Republic of the Congo': ['CD', AF], Denmark: ['DK', EU], Djibouti: ['DJ', AF], Dominica: ['DM', AM], 'Dominican Republic': ['DO', AM],
  Ecuador: ['EC', AM], Egypt: ['EG', AF], 'El Salvador': ['SV', AM], 'Equatorial Guinea': ['GQ', AF], Eritrea: ['ER', AF], Estonia: ['EE', EU],
  Eswatini: ['SZ', AF], Ethiopia: ['ET', AF], Fiji: ['FJ', OC], Finland: ['FI', EU], France: ['FR', EU], Gabon: ['GA', AF], Gambia: ['GM', AF],
  Georgia: ['GE', WA], Germany: ['DE', EU], Ghana: ['GH', AF], Greece: ['GR', EU], Greenland: ['GL', AM], Grenada: ['GD', AM], Guatemala: ['GT', AM],
  Guinea: ['GN', AF], 'Guinea-Bissau': ['GW', AF], Guyana: ['GY', AM], Haiti: ['HT', AM], Honduras: ['HN', AM], 'Hong Kong': ['HK', AS], Hungary: ['HU', EU],
  Iceland: ['IS', EU], India: ['IN', AS], Indonesia: ['ID', AS], Iran: ['IR', AS], Iraq: ['IQ', WA], Ireland: ['IE', EU], Israel: ['IL', WA], Italy: ['IT', EU],
  Jamaica: ['JM', AM], Japan: ['JP', AS], Jordan: ['JO', WA], Kazakhstan: ['KZ', AS], Kenya: ['KE', AF], Kiribati: ['KI', OC], Kosovo: ['XK', EU],
  Kuwait: ['KW', WA], Kyrgyzstan: ['KG', AS], Laos: ['LA', AS], Latvia: ['LV', EU], Lebanon: ['LB', WA], Lesotho: ['LS', AF], Liberia: ['LR', AF],
  Libya: ['LY', AF], Liechtenstein: ['LI', EU], Lithuania: ['LT', EU], Luxembourg: ['LU', EU], Macao: ['MO', AS], Madagascar: ['MG', AF], Malawi: ['MW', AF],
  Malaysia: ['MY', AS], Maldives: ['MV', AS], Mali: ['ML', AF], Malta: ['MT', EU], 'Marshall Islands': ['MH', OC], Mauritania: ['MR', AF],
  Mauritius: ['MU', AF], Mexico: ['MX', AM], Micronesia: ['FM', OC], Moldova: ['MD', EU], Monaco: ['MC', EU], Mongolia: ['MN', AS], Montenegro: ['ME', EU],
  Morocco: ['MA', AF], Mozambique: ['MZ', AF], Myanmar: ['MM', AS], Namibia: ['NA', AF], Nauru: ['NR', OC], Nepal: ['NP', AS], Netherlands: ['NL', EU],
  'New Zealand': ['NZ', OC], Nicaragua: ['NI', AM], Niger: ['NE', AF], Nigeria: ['NG', AF], 'North Korea': ['KP', AS], 'North Macedonia': ['MK', EU],
  Norway: ['NO', EU], Oman: ['OM', WA], Pakistan: ['PK', AS], Palau: ['PW', OC], Palestine: ['PS', WA], Panama: ['PA', AM], 'Papua New Guinea': ['PG', OC],
  Paraguay: ['PY', AM], Peru: ['PE', AM], Philippines: ['PH', AS], Poland: ['PL', EU], Portugal: ['PT', EU], 'Puerto Rico': ['PR', AM], Qatar: ['QA', WA],
  Romania: ['RO', EU], Russia: ['RU', EU], Rwanda: ['RW', AF], 'Saint Kitts and Nevis': ['KN', AM], 'Saint Lucia': ['LC', AM],
  'Saint Vincent and the Grenadines': ['VC', AM], Samoa: ['WS', OC], 'San Marino': ['SM', EU], 'São Tomé and Príncipe': ['ST', AF], 'Saudi Arabia': ['SA', WA],
  Senegal: ['SN', AF], Serbia: ['RS', EU], Seychelles: ['SC', AF], 'Sierra Leone': ['SL', AF], Singapore: ['SG', AS], Slovakia: ['SK', EU], Slovenia: ['SI', EU],
  'Solomon Islands': ['SB', OC], Somalia: ['SO', AF], 'South Africa': ['ZA', AF], 'South Korea': ['KR', AS], 'South Sudan': ['SS', AF], Spain: ['ES', EU],
  'Sri Lanka': ['LK', AS], Sudan: ['SD', AF], Suriname: ['SR', AM], Sweden: ['SE', EU], Switzerland: ['CH', EU], Syria: ['SY', WA], Taiwan: ['TW', AS],
  Tajikistan: ['TJ', AS], Tanzania: ['TZ', AF], Thailand: ['TH', AS], 'Timor-Leste': ['TL', AS], Togo: ['TG', AF], Tonga: ['TO', OC],
  'Trinidad and Tobago': ['TT', AM], Tunisia: ['TN', AF], 'Türkiye': ['TR', WA], Turkmenistan: ['TM', AS], Tuvalu: ['TV', OC], Uganda: ['UG', AF],
  Ukraine: ['UA', EU], 'United Arab Emirates': ['AE', WA], 'United Kingdom': ['GB', EU], 'United States': ['US', AM], Uruguay: ['UY', AM], Uzbekistan: ['UZ', AS],
  Vanuatu: ['VU', OC], 'Vatican City': ['VA', EU], Venezuela: ['VE', AM], Vietnam: ['VN', AS], 'Western Sahara': ['EH', AF], Yemen: ['YE', WA],
  Zambia: ['ZM', AF], Zimbabwe: ['ZW', AF]
};
const BY = new Map(Object.entries(T).map(([k, v]) => [k.toLowerCase(), v]));

/** ISO code and region of a country name as stored on clients; undefined for a name outside the list. */
export function countryInfo(name?: string | null): { iso: string; region: WorldRegion } | undefined {
  const v = name ? BY.get(name.trim().toLowerCase()) : undefined;
  return v ? { iso: v[0], region: v[1] } : undefined;
}

export const COUNTRY_NAMES = Object.keys(T);
