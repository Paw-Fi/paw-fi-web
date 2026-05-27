type TimezonePoint = {
  countryCode: string;
  lat: number;
  lon: number;
};

/**
 * Single source of truth:
 * - countryCode for flag display
 * - approximate anchor lat/lon for map display
 *
 * Notes:
 * - Coordinates are approximate city/timezone anchors, not polygon centroids.
 * - They are converted to your 0-100 map space by projectToMap().
 * - Includes common aliases where relevant (for example Europe/Kiev + Europe/Kyiv).
 */
const TIMEZONE_DATA: Record<string, TimezonePoint> = {
  // =========================
  // North America – United States
  // =========================
  "America/New_York":                { countryCode: "US", lat:  40.7128, lon:  -74.0060 },
  "America/Chicago":                 { countryCode: "US", lat:  41.8781, lon:  -87.6298 },
  "America/Denver":                  { countryCode: "US", lat:  39.7392, lon: -104.9903 },
  "America/Los_Angeles":             { countryCode: "US", lat:  34.0522, lon: -118.2437 },
  "America/Phoenix":                 { countryCode: "US", lat:  33.4484, lon: -112.0740 },
  "America/Anchorage":               { countryCode: "US", lat:  61.2181, lon: -149.9003 },
  "America/Juneau":                  { countryCode: "US", lat:  58.3005, lon: -134.4197 },
  "America/Sitka":                   { countryCode: "US", lat:  57.0531, lon: -135.3300 },
  "America/Metlakatla":              { countryCode: "US", lat:  55.1288, lon: -131.5722 },
  "America/Yakutat":                 { countryCode: "US", lat:  59.5469, lon: -139.7273 },
  "America/Nome":                    { countryCode: "US", lat:  64.5011, lon: -165.4064 },
  "America/Adak":                    { countryCode: "US", lat:  51.8800, lon: -176.6580 },
  "America/Honolulu":                { countryCode: "US", lat:  21.3069, lon: -157.8583 },
  "America/Kentucky/Louisville":     { countryCode: "US", lat:  38.2527, lon:  -85.7585 },
  "America/Kentucky/Monticello":     { countryCode: "US", lat:  36.8298, lon:  -84.8493 },
  "America/Indiana/Indianapolis":    { countryCode: "US", lat:  39.7684, lon:  -86.1581 },
  "America/Indiana/Vincennes":       { countryCode: "US", lat:  38.6773, lon:  -87.5286 },
  "America/Indiana/Winamac":         { countryCode: "US", lat:  41.0514, lon:  -86.6033 },
  "America/Indiana/Marengo":         { countryCode: "US", lat:  38.3659, lon:  -86.3439 },
  "America/Indiana/Petersburg":      { countryCode: "US", lat:  38.4920, lon:  -87.2786 },
  "America/Indiana/Vevay":           { countryCode: "US", lat:  38.7478, lon:  -85.0672 },
  "America/Indiana/Tell_City":       { countryCode: "US", lat:  37.9512, lon:  -86.7617 },
  "America/Indiana/Knox":            { countryCode: "US", lat:  41.2959, lon:  -86.6250 },
  "America/North_Dakota/Center":     { countryCode: "US", lat:  47.1164, lon: -101.2996 },
  "America/North_Dakota/New_Salem":  { countryCode: "US", lat:  46.8452, lon: -101.4121 },
  "America/North_Dakota/Beulah":     { countryCode: "US", lat:  47.2636, lon: -101.7790 },
  "Pacific/Pago_Pago":               { countryCode: "AS", lat: -14.2710, lon: -170.1322 }, // American Samoa
  "Pacific/Honolulu":                { countryCode: "US", lat:  21.3069, lon: -157.8583 },

  // =========================
  // North America – Canada
  // =========================
  "America/Toronto":                 { countryCode: "CA", lat:  43.6532, lon:  -79.3832 },
  "America/Vancouver":               { countryCode: "CA", lat:  49.2827, lon: -123.1207 },
  "America/Montreal":                { countryCode: "CA", lat:  45.5017, lon:  -73.5673 },
  "America/Edmonton":                { countryCode: "CA", lat:  53.5461, lon: -113.4938 },
  "America/Winnipeg":                { countryCode: "CA", lat:  49.8951, lon:  -97.1384 },
  "America/Halifax":                 { countryCode: "CA", lat:  44.6488, lon:  -63.5752 },
  "America/St_Johns":                { countryCode: "CA", lat:  47.5615, lon:  -52.7126 },
  "America/Regina":                  { countryCode: "CA", lat:  50.4452, lon: -104.6189 },
  "America/Swift_Current":           { countryCode: "CA", lat:  50.2881, lon: -107.7939 },
  "America/Dawson_Creek":            { countryCode: "CA", lat:  55.7596, lon: -120.2377 },
  "America/Fort_Nelson":             { countryCode: "CA", lat:  58.8053, lon: -122.6972 },
  "America/Creston":                 { countryCode: "CA", lat:  49.0956, lon: -116.5131 },
  "America/Whitehorse":              { countryCode: "CA", lat:  60.7212, lon: -135.0568 },
  "America/Dawson":                  { countryCode: "CA", lat:  64.0600, lon: -139.4333 },
  "America/Glace_Bay":               { countryCode: "CA", lat:  46.1968, lon:  -59.9573 },
  "America/Moncton":                 { countryCode: "CA", lat:  46.0878, lon:  -64.7782 },
  "America/Goose_Bay":               { countryCode: "CA", lat:  53.3156, lon:  -60.4158 },
  "America/Blanc-Sablon":            { countryCode: "CA", lat:  51.4240, lon:  -57.1260 },
  "America/Iqaluit":                 { countryCode: "CA", lat:  63.7467, lon:  -68.5170 },
  "America/Rankin_Inlet":            { countryCode: "CA", lat:  62.8069, lon:  -92.0853 },
  "America/Resolute":                { countryCode: "CA", lat:  74.6973, lon:  -94.8292 },
  "America/Cambridge_Bay":           { countryCode: "CA", lat:  69.1169, lon: -105.0524 },
  "America/Inuvik":                  { countryCode: "CA", lat:  68.3607, lon: -133.7230 },

  // =========================
  // North America – Mexico
  // =========================
  "America/Mexico_City":             { countryCode: "MX", lat:  19.4326, lon:  -99.1332 },
  "America/Guadalajara":             { countryCode: "MX", lat:  20.6597, lon: -103.3496 },
  "America/Monterrey":               { countryCode: "MX", lat:  25.6866, lon: -100.3161 },
  "America/Tijuana":                 { countryCode: "MX", lat:  32.5149, lon: -117.0382 },
  "America/Cancun":                  { countryCode: "MX", lat:  21.1619, lon:  -86.8515 },
  "America/Merida":                  { countryCode: "MX", lat:  20.9674, lon:  -89.5926 },
  "America/Chihuahua":               { countryCode: "MX", lat:  28.6353, lon: -106.0889 },
  "America/Ciudad_Juarez":           { countryCode: "MX", lat:  31.6904, lon: -106.4245 },
  "America/Ojinaga":                 { countryCode: "MX", lat:  29.5672, lon: -104.4080 },
  "America/Hermosillo":              { countryCode: "MX", lat:  29.0729, lon: -110.9559 },
  "America/Mazatlan":                { countryCode: "MX", lat:  23.2494, lon: -106.4111 },
  "America/Bahia_Banderas":          { countryCode: "MX", lat:  20.8001, lon: -105.5000 },
  "America/Matamoros":               { countryCode: "MX", lat:  25.8691, lon:  -97.5025 },

  // =========================
  // Central America & Caribbean
  // =========================
  "America/Panama":                  { countryCode: "PA", lat:   8.9824, lon:  -79.5199 },
  "America/Costa_Rica":              { countryCode: "CR", lat:   9.9281, lon:  -84.0907 },
  "America/Guatemala":               { countryCode: "GT", lat:  14.6349, lon:  -90.5069 },
  "America/Belize":                  { countryCode: "BZ", lat:  17.2510, lon:  -88.7590 },
  "America/El_Salvador":             { countryCode: "SV", lat:  13.6929, lon:  -89.2182 },
  "America/Managua":                 { countryCode: "NI", lat:  12.1364, lon:  -86.2964 },
  "America/Tegucigalpa":             { countryCode: "HN", lat:  14.0723, lon:  -87.2024 },
  "America/Jamaica":                 { countryCode: "JM", lat:  17.9712, lon:  -76.7936 },
  "America/Havana":                  { countryCode: "CU", lat:  23.1136, lon:  -82.3666 },
  "America/Santo_Domingo":           { countryCode: "DO", lat:  18.4861, lon:  -69.9312 },
  "America/Puerto_Rico":             { countryCode: "PR", lat:  18.4655, lon:  -66.1057 },
  "America/Nassau":                  { countryCode: "BS", lat:  25.0343, lon:  -77.3963 },
  "America/Port-au-Prince":          { countryCode: "HT", lat:  18.5944, lon:  -72.3074 },
  "America/Port_of_Spain":           { countryCode: "TT", lat:  10.6918, lon:  -61.2225 },
  "America/Barbados":                { countryCode: "BB", lat:  13.1939, lon:  -59.5432 },
  "America/Martinique":              { countryCode: "MQ", lat:  14.6415, lon:  -61.0242 },
  "America/Guadeloupe":              { countryCode: "GP", lat:  16.2650, lon:  -61.5510 },
  "America/St_Lucia":                { countryCode: "LC", lat:  14.0101, lon:  -60.9870 },
  "America/St_Vincent":              { countryCode: "VC", lat:  13.2528, lon:  -61.1971 },
  "America/St_Kitts":                { countryCode: "KN", lat:  17.3026, lon:  -62.7177 },
  "America/Antigua":                 { countryCode: "AG", lat:  17.1274, lon:  -61.8468 },
  "America/Dominica":                { countryCode: "DM", lat:  15.4150, lon:  -61.3710 },
  "America/Grenada":                 { countryCode: "GD", lat:  12.0561, lon:  -61.7488 },
  "America/Montserrat":              { countryCode: "MS", lat:  16.7425, lon:  -62.1874 },
  "America/Anguilla":                { countryCode: "AI", lat:  18.2206, lon:  -63.0686 },
  "America/Aruba":                   { countryCode: "AW", lat:  12.5211, lon:  -69.9683 },
  "America/Curacao":                 { countryCode: "CW", lat:  12.1696, lon:  -68.9900 },
  "America/Kralendijk":              { countryCode: "BQ", lat:  12.1502, lon:  -68.2816 },
  "America/Lower_Princes":           { countryCode: "SX", lat:  18.0425, lon:  -63.0548 },
  "America/Tortola":                 { countryCode: "VG", lat:  18.4307, lon:  -64.6235 },
  "America/St_Thomas":               { countryCode: "VI", lat:  18.3381, lon:  -64.8941 },
  "America/Cayman":                  { countryCode: "KY", lat:  19.3133, lon:  -81.2546 },
  "America/Turks_and_Caicos":        { countryCode: "TC", lat:  21.6940, lon:  -71.7979 },
  "Atlantic/Bermuda":                { countryCode: "BM", lat:  32.3078, lon:  -64.7505 },

  // =========================
  // South America
  // =========================
  "America/Sao_Paulo":               { countryCode: "BR", lat: -23.5505, lon:  -46.6333 },
  "America/Rio_de_Janeiro":          { countryCode: "BR", lat: -22.9068, lon:  -43.1729 },
  "America/Fortaleza":               { countryCode: "BR", lat:  -3.7172, lon:  -38.5433 },
  "America/Recife":                  { countryCode: "BR", lat:  -8.0476, lon:  -34.8770 },
  "America/Belem":                   { countryCode: "BR", lat:  -1.4558, lon:  -48.5044 },
  "America/Manaus":                  { countryCode: "BR", lat:  -3.1190, lon:  -60.0217 },
  "America/Porto_Velho":             { countryCode: "BR", lat:  -8.7612, lon:  -63.9004 },
  "America/Cuiaba":                  { countryCode: "BR", lat: -15.5989, lon:  -56.0949 },
  "America/Campo_Grande":            { countryCode: "BR", lat: -20.4697, lon:  -54.6201 },
  "America/Maceio":                  { countryCode: "BR", lat:  -9.6658, lon:  -35.7350 },
  "America/Santarem":                { countryCode: "BR", lat:  -2.4435, lon:  -54.7081 },
  "America/Araguaina":               { countryCode: "BR", lat:  -7.1917, lon:  -48.2044 },
  "America/Bahia":                   { countryCode: "BR", lat: -12.9714, lon:  -38.5014 },
  "America/Boa_Vista":               { countryCode: "BR", lat:   2.8235, lon:  -60.6758 },
  "America/Eirunepe":                { countryCode: "BR", lat:  -6.6600, lon:  -69.8650 },
  "America/Rio_Branco":              { countryCode: "BR", lat:  -9.9754, lon:  -67.8249 },
  "America/Noronha":                 { countryCode: "BR", lat:  -3.8540, lon:  -32.4230 },
  "America/Buenos_Aires":            { countryCode: "AR", lat: -34.6037, lon:  -58.3816 },
  "America/Argentina/Buenos_Aires":  { countryCode: "AR", lat: -34.6037, lon:  -58.3816 },
  "America/Argentina/Cordoba":       { countryCode: "AR", lat: -31.4201, lon:  -64.1888 },
  "America/Argentina/Salta":         { countryCode: "AR", lat: -24.7859, lon:  -65.4117 },
  "America/Argentina/Jujuy":         { countryCode: "AR", lat: -24.1858, lon:  -65.2995 },
  "America/Argentina/Tucuman":       { countryCode: "AR", lat: -26.8083, lon:  -65.2176 },
  "America/Argentina/Catamarca":     { countryCode: "AR", lat: -28.4696, lon:  -65.7795 },
  "America/Argentina/La_Rioja":      { countryCode: "AR", lat: -29.4137, lon:  -66.8558 },
  "America/Argentina/San_Juan":      { countryCode: "AR", lat: -31.5375, lon:  -68.5364 },
  "America/Argentina/Mendoza":       { countryCode: "AR", lat: -32.8908, lon:  -68.8272 },
  "America/Argentina/San_Luis":      { countryCode: "AR", lat: -33.2950, lon:  -66.3356 },
  "America/Argentina/Rio_Gallegos":  { countryCode: "AR", lat: -51.6226, lon:  -69.2181 },
  "America/Argentina/Ushuaia":       { countryCode: "AR", lat: -54.8019, lon:  -68.3030 },
  "America/Santiago":                { countryCode: "CL", lat: -33.4489, lon:  -70.6693 },
  "Pacific/Easter":                  { countryCode: "CL", lat: -27.1127, lon: -109.3497 },
  "America/Lima":                    { countryCode: "PE", lat: -12.0464, lon:  -77.0428 },
  "America/Bogota":                  { countryCode: "CO", lat:   4.7110, lon:  -74.0721 },
  "America/Caracas":                 { countryCode: "VE", lat:  10.4806, lon:  -66.9036 },
  "America/Quito":                   { countryCode: "EC", lat:  -0.1807, lon:  -78.4678 },
  "America/Guayaquil":               { countryCode: "EC", lat:  -2.1900, lon:  -79.8875 },
  "America/La_Paz":                  { countryCode: "BO", lat: -16.4897, lon:  -68.1193 },
  "America/Asuncion":                { countryCode: "PY", lat: -25.2637, lon:  -57.5759 },
  "America/Montevideo":              { countryCode: "UY", lat: -34.9011, lon:  -56.1645 },
  "America/Cayenne":                 { countryCode: "GF", lat:   4.9372, lon:  -52.3260 }, // French Guiana
  "America/Guyana":                  { countryCode: "GY", lat:   6.8013, lon:  -58.1551 },
  "America/Paramaribo":              { countryCode: "SR", lat:   5.8520, lon:  -55.2038 },
  "America/Punta_Arenas":            { countryCode: "CL", lat: -53.1638, lon:  -70.9171 },

  // =========================
  // Atlantic
  // =========================
  "Atlantic/Azores":                 { countryCode: "PT", lat:  37.7412, lon:  -25.6756 },
  "Atlantic/Cape_Verde":             { countryCode: "CV", lat:  14.9330, lon:  -23.5133 },
  "Atlantic/Madeira":                { countryCode: "PT", lat:  32.7607, lon:  -16.9595 },
  "Atlantic/Canary":                 { countryCode: "ES", lat:  28.1235, lon:  -15.4363 },
  "Atlantic/Faroe":                  { countryCode: "FO", lat:  62.0000, lon:   -6.7908 },
  "Atlantic/Reykjavik":              { countryCode: "IS", lat:  64.1355, lon:  -21.8954 },
  "Atlantic/South_Georgia":          { countryCode: "GS", lat: -54.2697, lon:  -36.5116 },
  "Atlantic/Stanley":                { countryCode: "FK", lat: -51.6973, lon:  -57.8540 }, // Falkland Islands
  "Atlantic/St_Helena":              { countryCode: "SH", lat: -15.9650, lon:   -5.7089 },

  // =========================
  // Europe – Western
  // =========================
  "Europe/London":                   { countryCode: "GB", lat:  51.5074, lon:   -0.1278 },
  "Europe/Dublin":                   { countryCode: "IE", lat:  53.3498, lon:   -6.2603 },
  "Europe/Lisbon":                   { countryCode: "PT", lat:  38.7223, lon:   -9.1393 },
  "Europe/Madrid":                   { countryCode: "ES", lat:  40.4168, lon:   -3.7038 },
  "Europe/Paris":                    { countryCode: "FR", lat:  48.8566, lon:    2.3522 },
  "Europe/Monaco":                   { countryCode: "MC", lat:  43.7384, lon:    7.4246 },
  "Europe/Andorra":                  { countryCode: "AD", lat:  42.5063, lon:    1.5218 },
  "Europe/Amsterdam":                { countryCode: "NL", lat:  52.3676, lon:    4.9041 },
  "Europe/Brussels":                 { countryCode: "BE", lat:  50.8503, lon:    4.3517 },
  "Europe/Luxembourg":               { countryCode: "LU", lat:  49.6116, lon:    6.1319 },
  "Europe/Zurich":                   { countryCode: "CH", lat:  47.3769, lon:    8.5417 },
  "Europe/Vaduz":                    { countryCode: "LI", lat:  47.1410, lon:    9.5215 },
  "Europe/Berlin":                   { countryCode: "DE", lat:  52.5200, lon:   13.4050 },
  "Europe/Vienna":                   { countryCode: "AT", lat:  48.2082, lon:   16.3738 },
  "Europe/Rome":                     { countryCode: "IT", lat:  41.9028, lon:   12.4964 },
  "Europe/San_Marino":               { countryCode: "SM", lat:  43.9424, lon:   12.4578 },
  "Europe/Vatican":                  { countryCode: "VA", lat:  41.9029, lon:   12.4534 },
  "Europe/Malta":                    { countryCode: "MT", lat:  35.8997, lon:   14.5147 },
  "Europe/Gibraltar":                { countryCode: "GI", lat:  36.1408, lon:   -5.3536 },

  // =========================
  // Europe – Nordic
  // =========================
  "Europe/Stockholm":                { countryCode: "SE", lat:  59.3293, lon:   18.0686 },
  "Europe/Oslo":                     { countryCode: "NO", lat:  59.9139, lon:   10.7522 },
  "Europe/Copenhagen":               { countryCode: "DK", lat:  55.6761, lon:   12.5683 },
  "Europe/Helsinki":                 { countryCode: "FI", lat:  60.1699, lon:   24.9384 },
  "Europe/Mariehamn":                { countryCode: "AX", lat:  60.0973, lon:   19.9348 }, // Åland

  // =========================
  // Europe – Central & Eastern
  // =========================
  "Europe/Prague":                   { countryCode: "CZ", lat:  50.0755, lon:   14.4378 },
  "Europe/Bratislava":               { countryCode: "SK", lat:  48.1486, lon:   17.1077 },
  "Europe/Warsaw":                   { countryCode: "PL", lat:  52.2297, lon:   21.0122 },
  "Europe/Budapest":                 { countryCode: "HU", lat:  47.4979, lon:   19.0402 },
  "Europe/Zagreb":                   { countryCode: "HR", lat:  45.8150, lon:   15.9819 },
  "Europe/Ljubljana":                { countryCode: "SI", lat:  46.0569, lon:   14.5058 },
  "Europe/Belgrade":                 { countryCode: "RS", lat:  44.8176, lon:   20.4633 },
  "Europe/Sarajevo":                 { countryCode: "BA", lat:  43.8563, lon:   18.4131 },
  "Europe/Skopje":                   { countryCode: "MK", lat:  41.9973, lon:   21.4280 },
  "Europe/Tirane":                   { countryCode: "AL", lat:  41.3275, lon:   19.8187 },
  "Europe/Podgorica":                { countryCode: "ME", lat:  42.4304, lon:   19.2594 },
  "Europe/Bucharest":                { countryCode: "RO", lat:  44.4268, lon:   26.1025 },
  "Europe/Sofia":                    { countryCode: "BG", lat:  42.6977, lon:   23.3219 },
  "Europe/Athens":                   { countryCode: "GR", lat:  37.9838, lon:   23.7275 },
  "Europe/Nicosia":                  { countryCode: "CY", lat:  35.1856, lon:   33.3823 },
  "Asia/Nicosia":                    { countryCode: "CY", lat:  35.1856, lon:   33.3823 },
  "Asia/Famagusta":                  { countryCode: "CY", lat:  35.1264, lon:   33.9481 },
  "Europe/Istanbul":                 { countryCode: "TR", lat:  41.0082, lon:   28.9784 },
  "Asia/Istanbul":                   { countryCode: "TR", lat:  41.0082, lon:   28.9784 }, // alias

  // =========================
  // Europe – Baltic States
  // =========================
  "Europe/Tallinn":                  { countryCode: "EE", lat:  59.4370, lon:   24.7536 },
  "Europe/Riga":                     { countryCode: "LV", lat:  56.9460, lon:   24.1059 },
  "Europe/Vilnius":                  { countryCode: "LT", lat:  54.6872, lon:   25.2797 },
  "Europe/Kaliningrad":              { countryCode: "RU", lat:  54.7104, lon:   20.4522 },

  // =========================
  // Europe – Eastern / CIS
  // =========================
  "Europe/Kiev":                     { countryCode: "UA", lat:  50.4501, lon:   30.5234 }, // legacy alias
  "Europe/Kyiv":                     { countryCode: "UA", lat:  50.4501, lon:   30.5234 },
  "Europe/Uzhgorod":                 { countryCode: "UA", lat:  48.6239, lon:   22.2950 },
  "Europe/Zaporozhye":               { countryCode: "UA", lat:  47.8388, lon:   35.1396 },
  "Europe/Minsk":                    { countryCode: "BY", lat:  53.9000, lon:   27.5590 },
  "Europe/Moscow":                   { countryCode: "RU", lat:  55.7558, lon:   37.6173 },
  "Europe/Simferopol":               { countryCode: "UA", lat:  44.9521, lon:   34.1024 },
  "Europe/Chisinau":                 { countryCode: "MD", lat:  47.0105, lon:   28.8638 },
  "Europe/Tiraspol":                 { countryCode: "MD", lat:  46.8403, lon:   29.6433 },

  // =========================
  // Russia
  // =========================
  "Europe/Samara":                   { countryCode: "RU", lat:  53.1959, lon:   50.1002 },
  "Europe/Volgograd":                { countryCode: "RU", lat:  48.7080, lon:   44.5133 },
  "Europe/Astrakhan":                { countryCode: "RU", lat:  46.3497, lon:   48.0408 },
  "Europe/Saratov":                  { countryCode: "RU", lat:  51.5924, lon:   45.9601 },
  "Europe/Ulyanovsk":                { countryCode: "RU", lat:  54.3179, lon:   48.3953 },
  "Europe/Kirov":                    { countryCode: "RU", lat:  58.6035, lon:   49.6680 },
  "Asia/Yekaterinburg":              { countryCode: "RU", lat:  56.8389, lon:   60.6057 },
  "Asia/Omsk":                       { countryCode: "RU", lat:  54.9885, lon:   73.3242 },
  "Asia/Novosibirsk":                { countryCode: "RU", lat:  54.9833, lon:   82.8964 },
  "Asia/Barnaul":                    { countryCode: "RU", lat:  53.3606, lon:   83.7636 },
  "Asia/Tomsk":                      { countryCode: "RU", lat:  56.4846, lon:   84.9480 },
  "Asia/Novokuznetsk":               { countryCode: "RU", lat:  53.7557, lon:   87.1099 },
  "Asia/Krasnoyarsk":                { countryCode: "RU", lat:  56.0153, lon:   92.8932 },
  "Asia/Irkutsk":                    { countryCode: "RU", lat:  52.2978, lon:  104.2964 },
  "Asia/Chita":                      { countryCode: "RU", lat:  52.0336, lon:  113.5015 },
  "Asia/Yakutsk":                    { countryCode: "RU", lat:  62.0355, lon:  129.6755 },
  "Asia/Khandyga":                   { countryCode: "RU", lat:  62.6564, lon:  135.5530 },
  "Asia/Vladivostok":                { countryCode: "RU", lat:  43.1155, lon:  131.8855 },
  "Asia/Ust-Nera":                   { countryCode: "RU", lat:  64.5603, lon:  143.2000 },
  "Asia/Magadan":                    { countryCode: "RU", lat:  59.5680, lon:  150.7950 },
  "Asia/Sakhalin":                   { countryCode: "RU", lat:  50.6881, lon:  142.7686 },
  "Asia/Srednekolymsk":              { countryCode: "RU", lat:  67.4598, lon:  153.7140 },
  "Asia/Kamchatka":                  { countryCode: "RU", lat:  53.1042, lon:  158.7010 },
  "Asia/Anadyr":                     { countryCode: "RU", lat:  64.7340, lon:  177.5136 },

  // =========================
  // Middle East
  // =========================
  "Asia/Dubai":                      { countryCode: "AE", lat:  25.2048, lon:   55.2708 },
  "Asia/Muscat":                     { countryCode: "OM", lat:  23.5880, lon:   58.3829 },
  "Asia/Riyadh":                     { countryCode: "SA", lat:  24.7136, lon:   46.6753 },
  "Asia/Bahrain":                    { countryCode: "BH", lat:  26.0667, lon:   50.5577 },
  "Asia/Kuwait":                     { countryCode: "KW", lat:  29.3697, lon:   47.9783 },
  "Asia/Qatar":                      { countryCode: "QA", lat:  25.2854, lon:   51.5310 },
  "Asia/Tehran":                     { countryCode: "IR", lat:  35.6892, lon:   51.3890 },
  "Asia/Baghdad":                    { countryCode: "IQ", lat:  33.3152, lon:   44.3661 },
  "Asia/Aden":                       { countryCode: "YE", lat:  12.7855, lon:   45.0187 },
  "Asia/Damascus":                   { countryCode: "SY", lat:  33.5138, lon:   36.2765 },
  "Asia/Beirut":                     { countryCode: "LB", lat:  33.8938, lon:   35.5018 },
  "Asia/Amman":                      { countryCode: "JO", lat:  31.9454, lon:   35.9284 },
  "Asia/Jerusalem":                  { countryCode: "IL", lat:  31.7683, lon:   35.2137 },
  "Asia/Tel_Aviv":                   { countryCode: "IL", lat:  32.0853, lon:   34.7818 }, // alias
  "Asia/Gaza":                       { countryCode: "PS", lat:  31.5017, lon:   34.4674 },
  "Asia/Hebron":                     { countryCode: "PS", lat:  31.5326, lon:   35.0998 },

  // =========================
  // Asia – South
  // =========================
  "Asia/Karachi":                    { countryCode: "PK", lat:  24.8607, lon:   67.0011 },
  "Asia/Mumbai":                     { countryCode: "IN", lat:  19.0760, lon:   72.8777 },
  "Asia/Delhi":                      { countryCode: "IN", lat:  28.6139, lon:   77.2090 },
  "Asia/Kolkata":                    { countryCode: "IN", lat:  22.5726, lon:   88.3639 },
  "Asia/Calcutta":                   { countryCode: "IN", lat:  22.5726, lon:   88.3639 }, // alias
  "Asia/Bangalore":                  { countryCode: "IN", lat:  12.9716, lon:   77.5946 },
  "Asia/Chennai":                    { countryCode: "IN", lat:  13.0827, lon:   80.2707 },
  "Asia/Hyderabad":                  { countryCode: "IN", lat:  17.3850, lon:   78.4867 },
  "Asia/Dhaka":                      { countryCode: "BD", lat:  23.8103, lon:   90.4125 },
  "Asia/Colombo":                    { countryCode: "LK", lat:   6.9271, lon:   79.8612 },
  "Asia/Kathmandu":                  { countryCode: "NP", lat:  27.7172, lon:   85.3240 },
  "Asia/Thimphu":                    { countryCode: "BT", lat:  27.4728, lon:   89.6390 },
  "Asia/Male":                       { countryCode: "MV", lat:   4.1755, lon:   73.5093 },
  "Asia/Kabul":                      { countryCode: "AF", lat:  34.5553, lon:   69.2075 },

  // =========================
  // Asia – Central
  // =========================
  "Asia/Tashkent":                   { countryCode: "UZ", lat:  41.2995, lon:   69.2401 },
  "Asia/Samarkand":                  { countryCode: "UZ", lat:  39.6542, lon:   66.9597 },
  "Asia/Almaty":                     { countryCode: "KZ", lat:  43.2220, lon:   76.8512 },
  "Asia/Qyzylorda":                  { countryCode: "KZ", lat:  44.8488, lon:   65.4823 },
  "Asia/Atyrau":                     { countryCode: "KZ", lat:  47.1070, lon:   51.9189 },
  "Asia/Oral":                       { countryCode: "KZ", lat:  51.2333, lon:   51.3667 },
  "Asia/Aqtau":                      { countryCode: "KZ", lat:  43.6505, lon:   51.1725 },
  "Asia/Aqtobe":                     { countryCode: "KZ", lat:  50.2839, lon:   57.1670 },
  "Asia/Ashgabat":                   { countryCode: "TM", lat:  37.9601, lon:   58.3261 },
  "Asia/Baku":                       { countryCode: "AZ", lat:  40.4093, lon:   49.8671 },
  "Asia/Tbilisi":                    { countryCode: "GE", lat:  41.7151, lon:   44.8271 },
  "Asia/Yerevan":                    { countryCode: "AM", lat:  40.1792, lon:   44.4991 },
  "Asia/Dushanbe":                   { countryCode: "TJ", lat:  38.5598, lon:   68.7737 },
  "Asia/Bishkek":                    { countryCode: "KG", lat:  42.8746, lon:   74.5698 },

  // =========================
  // Asia – Southeast
  // =========================
  "Asia/Bangkok":                    { countryCode: "TH", lat:  13.7563, lon:  100.5018 },
  "Asia/Phnom_Penh":                 { countryCode: "KH", lat:  11.5564, lon:  104.9282 },
  "Asia/Vientiane":                  { countryCode: "LA", lat:  17.9757, lon:  102.6331 },
  "Asia/Yangon":                     { countryCode: "MM", lat:  16.8661, lon:   96.1951 },
  "Asia/Rangoon":                    { countryCode: "MM", lat:  16.8661, lon:   96.1951 }, // alias
  "Asia/Ho_Chi_Minh":                { countryCode: "VN", lat:  10.8231, lon:  106.6297 },
  "Asia/Saigon":                     { countryCode: "VN", lat:  10.8231, lon:  106.6297 }, // alias
  "Asia/Hanoi":                      { countryCode: "VN", lat:  21.0278, lon:  105.8342 },
  "Asia/Jakarta":                    { countryCode: "ID", lat:  -6.2088, lon:  106.8456 },
  "Asia/Pontianak":                  { countryCode: "ID", lat:  -0.0263, lon:  109.3425 },
  "Asia/Makassar":                   { countryCode: "ID", lat:  -5.1477, lon:  119.4327 },
  "Asia/Jayapura":                   { countryCode: "ID", lat:  -2.5916, lon:  140.6690 },
  "Asia/Kuala_Lumpur":               { countryCode: "MY", lat:   3.1390, lon:  101.6869 },
  "Asia/Kuching":                    { countryCode: "MY", lat:   1.5535, lon:  110.3593 },
  "Asia/Singapore":                  { countryCode: "SG", lat:   1.3521, lon:  103.8198 },
  "Asia/Manila":                     { countryCode: "PH", lat:  14.5995, lon:  120.9842 },
  "Asia/Brunei":                     { countryCode: "BN", lat:   4.9031, lon:  114.9398 },
  "Asia/Dili":                       { countryCode: "TL", lat:  -8.5569, lon:  125.5789 }, // Timor-Leste

  // =========================
  // Asia – East
  // =========================
  "Asia/Tokyo":                      { countryCode: "JP", lat:  35.6762, lon:  139.6503 },
  "Asia/Shanghai":                   { countryCode: "CN", lat:  31.2304, lon:  121.4737 },
  "Asia/Beijing":                    { countryCode: "CN", lat:  39.9042, lon:  116.4074 },
  "Asia/Chongqing":                  { countryCode: "CN", lat:  29.5630, lon:  106.5516 },
  "Asia/Harbin":                     { countryCode: "CN", lat:  45.8038, lon:  126.5349 },
  "Asia/Kashgar":                    { countryCode: "CN", lat:  39.4704, lon:   75.9897 },
  "Asia/Urumqi":                     { countryCode: "CN", lat:  43.8256, lon:   87.6168 },
  "Asia/Hong_Kong":                  { countryCode: "HK", lat:  22.3193, lon:  114.1694 },
  "Asia/Macau":                      { countryCode: "MO", lat:  22.1987, lon:  113.5439 },
  "Asia/Macao":                      { countryCode: "MO", lat:  22.1987, lon:  113.5439 }, // alias
  "Asia/Taipei":                     { countryCode: "TW", lat:  25.0330, lon:  121.5654 },
  "Asia/Seoul":                      { countryCode: "KR", lat:  37.5665, lon:  126.9780 },
  "Asia/Pyongyang":                  { countryCode: "KP", lat:  39.0392, lon:  125.7625 },
  "Asia/Ulaanbaatar":                { countryCode: "MN", lat:  47.8864, lon:  106.9057 },
  "Asia/Choibalsan":                 { countryCode: "MN", lat:  48.0705, lon:  114.5363 },
  "Asia/Hovd":                       { countryCode: "MN", lat:  48.0060, lon:   91.6420 },

  // =========================
  // Oceania / Australia
  // =========================
  "Australia/Sydney":                { countryCode: "AU", lat: -33.8688, lon:  151.2093 },
  "Australia/Melbourne":             { countryCode: "AU", lat: -37.8136, lon:  144.9631 },
  "Australia/Brisbane":              { countryCode: "AU", lat: -27.4698, lon:  153.0251 },
  "Australia/Perth":                 { countryCode: "AU", lat: -31.9505, lon:  115.8605 },
  "Australia/Adelaide":              { countryCode: "AU", lat: -34.9285, lon:  138.6007 },
  "Australia/Darwin":                { countryCode: "AU", lat: -12.4634, lon:  130.8456 },
  "Australia/Hobart":                { countryCode: "AU", lat: -42.8821, lon:  147.3272 },
  "Australia/Lord_Howe":             { countryCode: "AU", lat: -31.5509, lon:  159.0862 },
  "Australia/Lindeman":              { countryCode: "AU", lat: -20.4472, lon:  149.0388 },
  "Australia/Eucla":                 { countryCode: "AU", lat: -31.6745, lon:  128.8801 },
  "Australia/Broken_Hill":           { countryCode: "AU", lat: -31.9580, lon:  141.4545 },
  "Australia/Currie":                { countryCode: "AU", lat: -39.9300, lon:  143.8500 },

  // =========================
  // Oceania – New Zealand & Pacific
  // =========================
  "Pacific/Auckland":                { countryCode: "NZ", lat: -36.8509, lon:  174.7645 },
  "Pacific/Chatham":                 { countryCode: "NZ", lat: -44.0000, lon: -176.5500 },
  "Pacific/Fiji":                    { countryCode: "FJ", lat: -18.1248, lon:  178.4501 },
  "Pacific/Guam":                    { countryCode: "GU", lat:  13.4443, lon:  144.7937 },
  "Pacific/Saipan":                  { countryCode: "MP", lat:  15.1835, lon:  145.7450 }, // CNMI
  "Pacific/Port_Moresby":            { countryCode: "PG", lat:  -9.4438, lon:  147.1803 }, // Papua New Guinea
  "Pacific/Bougainville":            { countryCode: "PG", lat:  -6.2162, lon:  155.5669 },
  "Pacific/Guadalcanal":             { countryCode: "SB", lat:  -9.4281, lon:  160.0563 }, // Solomon Islands
  "Pacific/Efate":                   { countryCode: "VU", lat: -17.7333, lon:  168.3210 }, // Vanuatu
  "Pacific/Noumea":                  { countryCode: "NC", lat: -22.2758, lon:  166.4580 }, // New Caledonia
  "Pacific/Norfolk":                 { countryCode: "NF", lat: -29.0408, lon:  167.9547 },
  "Pacific/Nauru":                   { countryCode: "NR", lat:  -0.5228, lon:  166.9315 },
  "Pacific/Tarawa":                  { countryCode: "KI", lat:   1.3290, lon:  172.9757 }, // Kiribati
  "Pacific/Enderbury":               { countryCode: "KI", lat:  -3.1300, lon: -171.0900 },
  "Pacific/Kiritimati":              { countryCode: "KI", lat:   1.8721, lon: -157.4769 },
  "Pacific/Majuro":                  { countryCode: "MH", lat:   7.0900, lon:  171.3800 }, // Marshall Islands
  "Pacific/Kwajalein":               { countryCode: "MH", lat:   8.7200, lon:  167.7300 },
  "Pacific/Pohnpei":                 { countryCode: "FM", lat:   6.9248, lon:  158.1610 }, // Micronesia
  "Pacific/Kosrae":                  { countryCode: "FM", lat:   5.3097, lon:  162.9814 },
  "Pacific/Chuuk":                   { countryCode: "FM", lat:   7.4467, lon:  151.8467 },
  "Pacific/Palau":                   { countryCode: "PW", lat:   7.5150, lon:  134.5825 },
  "Pacific/Tonga":                   { countryCode: "TO", lat: -21.1789, lon: -175.1982 },
  "Pacific/Samoa":                   { countryCode: "WS", lat: -13.7590, lon: -172.1046 },
  "Pacific/Apia":                    { countryCode: "WS", lat: -13.8506, lon: -171.7514 },
  "Pacific/Fakaofo":                 { countryCode: "TK", lat:  -9.3653, lon: -171.2167 }, // Tokelau
  "Pacific/Wallis":                  { countryCode: "WF", lat: -13.2810, lon: -176.1760 }, // Wallis & Futuna
  "Pacific/Tahiti":                  { countryCode: "PF", lat: -17.6509, lon: -149.4260 }, // French Polynesia
  "Pacific/Marquesas":               { countryCode: "PF", lat:  -9.4000, lon: -139.0300 },
  "Pacific/Gambier":                 { countryCode: "PF", lat: -23.1200, lon: -134.9700 },
  "Pacific/Niue":                    { countryCode: "NU", lat: -19.0544, lon: -169.8672 },
  "Pacific/Rarotonga":               { countryCode: "CK", lat: -21.2367, lon: -159.7777 }, // Cook Islands
  "Pacific/Pitcairn":                { countryCode: "PN", lat: -25.0662, lon: -130.1027 },
  "Pacific/Johnston":                { countryCode: "UM", lat:  16.7290, lon: -169.5330 }, // US Minor Outlying Islands
  "Pacific/Midway":                  { countryCode: "UM", lat:  28.2018, lon: -177.3756 },
  "Pacific/Wake":                    { countryCode: "UM", lat:  19.2820, lon:  166.6470 },
  "Pacific/Funafuti":                { countryCode: "TV", lat:  -8.5243, lon:  179.1942 }, // Tuvalu

  // =========================
  // Africa – Northern
  // =========================
  "Africa/Cairo":                    { countryCode: "EG", lat:  30.0444, lon:   31.2357 },
  "Africa/Casablanca":               { countryCode: "MA", lat:  33.5731, lon:   -7.5898 },
  "Africa/El_Aaiun":                 { countryCode: "EH", lat:  27.1536, lon:  -13.2033 }, // Western Sahara
  "Africa/Tunis":                    { countryCode: "TN", lat:  36.8065, lon:   10.1815 },
  "Africa/Algiers":                  { countryCode: "DZ", lat:  36.7538, lon:    3.0588 },
  "Africa/Tripoli":                  { countryCode: "LY", lat:  32.8872, lon:   13.1913 },

  // =========================
  // Africa – West
  // =========================
  "Africa/Dakar":                    { countryCode: "SN", lat:  14.7167, lon:  -17.4677 },
  "Africa/Conakry":                  { countryCode: "GN", lat:   9.6412, lon:  -13.5784 },
  "Africa/Freetown":                 { countryCode: "SL", lat:   8.4657, lon:  -13.2317 },
  "Africa/Monrovia":                 { countryCode: "LR", lat:   6.2907, lon:  -10.7605 },
  "Africa/Abidjan":                  { countryCode: "CI", lat:   5.3599, lon:   -4.0082 },
  "Africa/Accra":                    { countryCode: "GH", lat:   5.6037, lon:   -0.1870 },
  "Africa/Lome":                     { countryCode: "TG", lat:   6.1319, lon:    1.2228 },
  "Africa/Porto-Novo":               { countryCode: "BJ", lat:   6.4969, lon:    2.6289 },
  "Africa/Lagos":                    { countryCode: "NG", lat:   6.5244, lon:    3.3792 },
  "Africa/Niamey":                   { countryCode: "NE", lat:  13.5116, lon:    2.1254 },
  "Africa/Ouagadougou":              { countryCode: "BF", lat:  12.3714, lon:   -1.5197 },
  "Africa/Bamako":                   { countryCode: "ML", lat:  12.6392, lon:   -8.0029 },
  "Africa/Nouakchott":               { countryCode: "MR", lat:  18.0735, lon:  -15.9582 },
  "Africa/Bissau":                   { countryCode: "GW", lat:  11.8636, lon:  -15.5977 },
  "Africa/Banjul":                   { countryCode: "GM", lat:  13.4549, lon:  -16.5790 },

  // =========================
  // Africa – Central
  // =========================
  "Africa/Malabo":                   { countryCode: "GQ", lat:   3.7504, lon:    8.7371 },
  "Africa/Libreville":               { countryCode: "GA", lat:   0.4162, lon:    9.4673 },
  "Africa/Yaounde":                  { countryCode: "CM", lat:   3.8480, lon:   11.5021 },
  "Africa/Bangui":                   { countryCode: "CF", lat:   4.3947, lon:   18.5582 },
  "Africa/N'Djamena":                { countryCode: "TD", lat:  12.1348, lon:   15.0557 },
  "Africa/Brazzaville":              { countryCode: "CG", lat:  -4.2634, lon:   15.2429 },
  "Africa/Kinshasa":                 { countryCode: "CD", lat:  -4.4419, lon:   15.2663 },
  "Africa/Lubumbashi":               { countryCode: "CD", lat: -11.6647, lon:   27.4794 },
  "Africa/Sao_Tome":                 { countryCode: "ST", lat:   0.3365, lon:    6.7273 }, // São Tomé and Príncipe
  "Africa/Luanda":                   { countryCode: "AO", lat:  -8.8390, lon:   13.2894 },

  // =========================
  // Africa – East
  // =========================
  "Africa/Khartoum":                 { countryCode: "SD", lat:  15.5007, lon:   32.5599 },
  "Africa/Juba":                     { countryCode: "SS", lat:   4.8594, lon:   31.5713 },
  "Africa/Addis_Ababa":              { countryCode: "ET", lat:   8.9806, lon:   38.7578 },
  "Africa/Asmara":                   { countryCode: "ER", lat:  15.3229, lon:   38.9251 },
  "Africa/Djibouti":                 { countryCode: "DJ", lat:  11.5720, lon:   43.1456 },
  "Africa/Mogadishu":                { countryCode: "SO", lat:   2.0469, lon:   45.3182 },
  "Africa/Nairobi":                  { countryCode: "KE", lat:  -1.2921, lon:   36.8219 },
  "Africa/Kampala":                  { countryCode: "UG", lat:   0.3476, lon:   32.5825 },
  "Africa/Kigali":                   { countryCode: "RW", lat:  -1.9441, lon:   30.0619 },
  "Africa/Bujumbura":                { countryCode: "BI", lat:  -3.3614, lon:   29.3599 },
  "Africa/Dar_es_Salaam":            { countryCode: "TZ", lat:  -6.7924, lon:   39.2083 },
  "Indian/Comoro":                   { countryCode: "KM", lat: -11.6455, lon:   43.3333 },
  "Indian/Antananarivo":             { countryCode: "MG", lat: -18.8792, lon:   47.5079 }, // Madagascar
  "Indian/Mayotte":                  { countryCode: "YT", lat: -12.8275, lon:   45.1662 },
  "Indian/Reunion":                  { countryCode: "RE", lat: -21.1151, lon:   55.5364 },
  "Indian/Mauritius":                { countryCode: "MU", lat: -20.1609, lon:   57.4991 },

  // =========================
  // Africa – Southern
  // =========================
  "Africa/Lusaka":                   { countryCode: "ZM", lat: -15.3875, lon:   28.3228 },
  "Africa/Harare":                   { countryCode: "ZW", lat: -17.8252, lon:   31.0335 },
  "Africa/Maputo":                   { countryCode: "MZ", lat: -25.9692, lon:   32.5732 },
  "Africa/Johannesburg":             { countryCode: "ZA", lat: -26.2041, lon:   28.0473 },
  "Africa/Mbabane":                  { countryCode: "SZ", lat: -26.3054, lon:   31.1367 },
  "Africa/Maseru":                   { countryCode: "LS", lat: -29.3167, lon:   27.4833 },
  "Africa/Windhoek":                 { countryCode: "NA", lat: -22.5609, lon:   17.0658 },
  "Africa/Gaborone":                 { countryCode: "BW", lat: -24.6282, lon:   25.9231 },
  "Africa/Blantyre":                 { countryCode: "MW", lat: -15.7861, lon:   35.0058 },

  // =========================
  // Indian Ocean
  // =========================
  "Indian/Maldives":                 { countryCode: "MV", lat:   4.1755, lon:   73.5093 },
  "Indian/Chagos":                   { countryCode: "IO", lat:  -7.3195, lon:   72.4224 }, // BIOT
  "Indian/Christmas":                { countryCode: "CX", lat: -10.4475, lon:  105.6904 },
  "Indian/Cocos":                    { countryCode: "CC", lat: -12.1642, lon:   96.8700 },
  "Indian/Kerguelen":                { countryCode: "TF", lat: -49.3500, lon:   70.2167 }, // French Southern Territories
  "Indian/Mahe":                     { countryCode: "SC", lat:  -4.6191, lon:   55.4513 }, // Seychelles

  // =========================
  // Antarctica
  // =========================
  "Antarctica/McMurdo":              { countryCode: "AQ", lat: -77.8500, lon:  166.6670 },
  "Antarctica/South_Pole":           { countryCode: "AQ", lat: -90.0000, lon:    0.0000 },
  "Antarctica/Rothera":              { countryCode: "AQ", lat: -67.5683, lon:  -68.1330 },
  "Antarctica/Palmer":               { countryCode: "AQ", lat: -64.7741, lon:  -64.0536 },
  "Antarctica/Mawson":               { countryCode: "AQ", lat: -67.6027, lon:   62.8738 },
  "Antarctica/Davis":                { countryCode: "AQ", lat: -68.5766, lon:   77.9674 },
  "Antarctica/Casey":                { countryCode: "AQ", lat: -66.2828, lon:  110.5278 },
  "Antarctica/Vostok":               { countryCode: "AQ", lat: -78.4645, lon:  106.8340 },
  "Antarctica/DumontDUrville":       { countryCode: "AQ", lat: -66.6630, lon:  140.0010 },
  "Antarctica/Syowa":                { countryCode: "AQ", lat: -69.0067, lon:   39.5900 },
  "Antarctica/Troll":                { countryCode: "AQ", lat: -72.0117, lon:    2.5350 },
  "Antarctica/Macquarie":            { countryCode: "AU", lat: -54.6200, lon:  158.8500 },

  // =========================
  // UTC / Etc
  // =========================
  "UTC":                             { countryCode: "UN", lat:   0.0000, lon:    0.0000 },
  "Etc/UTC":                         { countryCode: "UN", lat:   0.0000, lon:    0.0000 },
  "Etc/GMT":                         { countryCode: "UN", lat:   0.0000, lon:    0.0000 },
  "Etc/GMT+0":                       { countryCode: "UN", lat:   0.0000, lon:    0.0000 },
  "Etc/GMT+1":                       { countryCode: "UN", lat:   0.0000, lon:  -15.0000 },
  "Etc/GMT+2":                       { countryCode: "UN", lat:   0.0000, lon:  -30.0000 },
  "Etc/GMT+3":                       { countryCode: "UN", lat:   0.0000, lon:  -45.0000 },
  "Etc/GMT+4":                       { countryCode: "UN", lat:   0.0000, lon:  -60.0000 },
  "Etc/GMT+5":                       { countryCode: "UN", lat:   0.0000, lon:  -75.0000 },
  "Etc/GMT+6":                       { countryCode: "UN", lat:   0.0000, lon:  -90.0000 },
  "Etc/GMT+7":                       { countryCode: "UN", lat:   0.0000, lon: -105.0000 },
  "Etc/GMT+8":                       { countryCode: "UN", lat:   0.0000, lon: -120.0000 },
  "Etc/GMT+9":                       { countryCode: "UN", lat:   0.0000, lon: -135.0000 },
  "Etc/GMT+10":                      { countryCode: "UN", lat:   0.0000, lon: -150.0000 },
  "Etc/GMT+11":                      { countryCode: "UN", lat:   0.0000, lon: -165.0000 },
  "Etc/GMT+12":                      { countryCode: "UN", lat:   0.0000, lon: -180.0000 },
  "Etc/GMT-1":                       { countryCode: "UN", lat:   0.0000, lon:   15.0000 },
  "Etc/GMT-2":                       { countryCode: "UN", lat:   0.0000, lon:   30.0000 },
  "Etc/GMT-3":                       { countryCode: "UN", lat:   0.0000, lon:   45.0000 },
  "Etc/GMT-4":                       { countryCode: "UN", lat:   0.0000, lon:   60.0000 },
  "Etc/GMT-5":                       { countryCode: "UN", lat:   0.0000, lon:   75.0000 },
  "Etc/GMT-6":                       { countryCode: "UN", lat:   0.0000, lon:   90.0000 },
  "Etc/GMT-7":                       { countryCode: "UN", lat:   0.0000, lon:  105.0000 },
  "Etc/GMT-8":                       { countryCode: "UN", lat:   0.0000, lon:  120.0000 },
  "Etc/GMT-9":                       { countryCode: "UN", lat:   0.0000, lon:  135.0000 },
  "Etc/GMT-10":                      { countryCode: "UN", lat:   0.0000, lon:  150.0000 },
  "Etc/GMT-11":                      { countryCode: "UN", lat:   0.0000, lon:  165.0000 },
  "Etc/GMT-12":                      { countryCode: "UN", lat:   0.0000, lon:  180.0000 },
  "Etc/GMT-13":                      { countryCode: "UN", lat:   0.0000, lon:  195.0000 },
  "Etc/GMT-14":                      { countryCode: "UN", lat:   0.0000, lon:  210.0000 },
};

/**
 * Optional aliases for timezone strings that may appear in app/user data.
 * Keeps your lookups resilient without polluting the core dataset.
 */
const TIMEZONE_ALIASES: Record<string, string> = {
  // United States
  "US/Eastern":                   "America/New_York",
  "US/Central":                   "America/Chicago",
  "US/Mountain":                  "America/Denver",
  "US/Pacific":                   "America/Los_Angeles",
  "US/Arizona":                   "America/Phoenix",
  "US/Alaska":                    "America/Anchorage",
  "US/Hawaii":                    "America/Honolulu",
  "US/Aleutian":                  "America/Adak",
  "US/Samoa":                     "Pacific/Pago_Pago",

  // Canada
  "Canada/Eastern":               "America/Toronto",
  "Canada/Central":               "America/Winnipeg",
  "Canada/Mountain":              "America/Edmonton",
  "Canada/Pacific":               "America/Vancouver",
  "Canada/Atlantic":              "America/Halifax",
  "Canada/Newfoundland":          "America/St_Johns",
  "Canada/Saskatchewan":          "America/Regina",
  "Canada/Yukon":                 "America/Whitehorse",

  // Australia
  "Australia/ACT":                "Australia/Sydney",
  "Australia/NSW":                "Australia/Sydney",
  "Australia/Victoria":           "Australia/Melbourne",
  "Australia/Queensland":         "Australia/Brisbane",
  "Australia/West":               "Australia/Perth",
  "Australia/South":              "Australia/Adelaide",
  "Australia/North":              "Australia/Darwin",
  "Australia/Tasmania":           "Australia/Hobart",
  "Australia/LHI":                "Australia/Lord_Howe",

  // Europe
  "Europe/Kiev":                  "Europe/Kyiv",         // prefer modern spelling internally

  // Asia
  "Asia/Calcutta":                "Asia/Kolkata",
  "Asia/Rangoon":                 "Asia/Yangon",
  "Asia/Saigon":                  "Asia/Ho_Chi_Minh",
  "Asia/Istanbul":                "Europe/Istanbul",
  "Asia/Tel_Aviv":                "Asia/Jerusalem",

  // Legacy / misc
  "Greenwich":                    "UTC",
  "Universal":                    "UTC",
  "Zulu":                         "UTC",
  "UCT":                          "UTC",
  "MET":                          "Europe/Paris",
  "WET":                          "Europe/Lisbon",
  "CET":                          "Europe/Paris",
  "EET":                          "Europe/Athens",
  "GB":                           "Europe/London",
  "GB-Eire":                      "Europe/London",
  "Eire":                         "Europe/Dublin",
  "Iceland":                      "Atlantic/Reykjavik",
  "Iran":                         "Asia/Tehran",
  "Israel":                       "Asia/Jerusalem",
  "Turkey":                       "Europe/Istanbul",
  "Egypt":                        "Africa/Cairo",
  "Libya":                        "Africa/Tripoli",
  "Cuba":                         "America/Havana",
  "Jamaica":                      "America/Jamaica",
  "Japan":                        "Asia/Tokyo",
  "ROK":                          "Asia/Seoul",
  "PRC":                          "Asia/Shanghai",
  "ROC":                          "Asia/Taipei",
  "Singapore":                    "Asia/Singapore",
  "Hongkong":                     "Asia/Hong_Kong",
  "NZ":                           "Pacific/Auckland",
  "NZ-CHAT":                      "Pacific/Chatham",
  "W-SU":                         "Europe/Moscow",
  "Poland":                       "Europe/Warsaw",
  "Portugal":                     "Europe/Lisbon",
};

function normalizeTimezone(timezone: string): string {
  return TIMEZONE_ALIASES[timezone] ?? timezone;
}

/**
 * Convert lat/lon to your UI's 0-100 map space.
 * Assumes a simple equirectangular world map.
 */
function projectToMap(lat: number, lon: number): { x: number; y: number } {
  const x = ((lon + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;

  return {
    x: Math.max(0, Math.min(100, Number(x.toFixed(2)))),
    y: Math.max(0, Math.min(100, Number(y.toFixed(2)))),
  };
}

// Map timezones to ISO country codes for flag display
export function getCountryCodeFromTimezone(timezone: string): string | null {
  const normalized = normalizeTimezone(timezone);
  return TIMEZONE_DATA[normalized]?.countryCode ?? null;
}

// Generate FlagCDN URL for a country code
export function getFlagUrl(countryCode: string, size: number = 24): string {
  return `https://flagcdn.com/w${size}/${countryCode.toLowerCase()}.webp`;
}

// Get raw lat/lon for DottedMap component
export function getTimezoneLatLon(
  timezone: string
): { lat: number; lon: number } | null {
  const normalized = normalizeTimezone(timezone);
  const entry = TIMEZONE_DATA[normalized];
  return entry ? { lat: entry.lat, lon: entry.lon } : null;
}

// Approximate timezone coordinates for map display (0-100 scale)
export function getTimezoneCoordinates(
  timezone: string
): { x: number; y: number } | null {
  const normalized = normalizeTimezone(timezone);
  const entry = TIMEZONE_DATA[normalized];

  if (entry) {
    return projectToMap(entry.lat, entry.lon);
  }

  // Fallback to region-based coordinates if specific city isn't found
  const region = normalized.split("/")[0];
  const regionCoords: Record<string, { x: number; y: number }> = {
    America:    { x: 22, y: 42 },
    Europe:     { x: 52, y: 27 },
    Asia:       { x: 72, y: 34 },
    Australia:  { x: 84, y: 68 },
    Pacific:    { x: 92, y: 52 },
    Africa:     { x: 53, y: 46 },
    Atlantic:   { x: 42, y: 35 },
    Indian:     { x: 68, y: 52 },
    Antarctica: { x: 50, y: 95 },
    Arctic:     { x: 50, y:  5 },
    Etc:        { x: 50, y: 50 },
  };

  return regionCoords[region] ?? { x: 50, y: 50 };
}
