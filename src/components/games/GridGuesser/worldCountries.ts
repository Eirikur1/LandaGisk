// All world countries with TopoJSON ids and computed bounding boxes.
// bbox = [west, south, east, north] in degrees.
// antimeridian: true means west > east (country crosses the antimeridian).

export type WorldCountryEntry = {
  id: string;   // ccn3, matches TopoJSON geometry id
  name: string;
  aliases: string[];
  bbox: [number, number, number, number]; // [west, south, east, north]
  antimeridian?: boolean;
};

export const WORLD_COUNTRY_LIST: WorldCountryEntry[] = [
  { id: "004", name: "Afghanistan", aliases: ["Afghānistān"], bbox: [60.47, 29.38, 74.89, 38.49] },
  { id: "008", name: "Albania", aliases: ["Shqipëri", "Shqipëria", "Shqipnia"], bbox: [19.27, 39.62, 21.06, 42.67] },
  { id: "012", name: "Algeria", aliases: ["Al Jazāʾir", "Algérie"], bbox: [-8.68, 18.97, 11.98, 37.09] },
  { id: "024", name: "Angola", aliases: [], bbox: [11.66, -18.04, 24.08, -4.37] },
  { id: "032", name: "Argentina", aliases: [], bbox: [-73.56, -55.06, -53.65, -21.83] },
  { id: "036", name: "Australia", aliases: [], bbox: [112.97, -43.64, 153.64, -10.67] },
  { id: "040", name: "Austria", aliases: ["Österreich"], bbox: [9.53, 46.37, 17.16, 49.02] },
  { id: "050", name: "Bangladesh", aliases: [], bbox: [88.01, 20.74, 92.67, 26.63] },
  { id: "056", name: "Belgium", aliases: ["België", "Belgique", "Belgien"], bbox: [2.55, 49.5, 6.41, 51.51] },
  { id: "064", name: "Bhutan", aliases: [], bbox: [88.75, 26.7, 92.12, 28.33] },
  { id: "068", name: "Bolivia", aliases: [], bbox: [-69.64, -22.9, -57.52, -9.68] },
  { id: "070", name: "Bosnia and Herzegovina", aliases: ["Bosnia", "BiH", "Bosnia & Herzegovina"], bbox: [15.73, 42.56, 19.62, 45.28] },
  { id: "072", name: "Botswana", aliases: [], bbox: [19.98, -26.91, 29.37, -17.78] },
  { id: "076", name: "Brazil", aliases: ["Brasil"], bbox: [-73.99, -33.75, -28.85, 5.27] },
  { id: "100", name: "Bulgaria", aliases: ["България"], bbox: [22.37, 41.23, 28.61, 44.23] },
  { id: "104", name: "Myanmar", aliases: ["Burma"], bbox: [92.19, 9.93, 101.17, 28.54] },
  { id: "116", name: "Cambodia", aliases: [], bbox: [102.33, 10.43, 107.63, 14.71] },
  { id: "120", name: "Cameroon", aliases: ["Cameroun"], bbox: [8.5, 1.66, 16.19, 12.39] },
  { id: "124", name: "Canada", aliases: [], bbox: [-141.0, 41.68, -52.65, 73.64] },
  { id: "140", name: "Central African Republic", aliases: ["CAR"], bbox: [14.42, 2.22, 27.46, 11.0] },
  { id: "144", name: "Sri Lanka", aliases: ["Ceylon"], bbox: [79.69, 5.92, 81.89, 9.83] },
  { id: "152", name: "Chile", aliases: [], bbox: [-75.72, -55.65, -66.42, -17.5] },
  { id: "156", name: "China", aliases: [], bbox: [73.5, 18.16, 134.77, 53.56] },
  { id: "170", name: "Colombia", aliases: [], bbox: [-78.99, -4.3, -66.87, 12.44] },
  { id: "178", name: "Republic of the Congo", aliases: ["Congo", "Congo-Brazzaville"], bbox: [11.09, -5.04, 18.65, 3.71] },
  { id: "180", name: "DR Congo", aliases: ["DRC", "Congo-Kinshasa", "Democratic Republic of the Congo", "Zaire"], bbox: [12.18, -13.46, 31.31, 5.39] },
  { id: "188", name: "Costa Rica", aliases: [], bbox: [-85.95, 5.5, -82.55, 11.22] },
  { id: "191", name: "Croatia", aliases: ["Hrvatska"], bbox: [13.49, 42.38, 19.44, 46.56] },
  { id: "192", name: "Cuba", aliases: [], bbox: [-84.97, 19.82, -74.13, 23.19] },
  { id: "196", name: "Cyprus", aliases: ["Kypros", "Kıbrıs"], bbox: [32.27, 34.57, 34.0, 35.71] },
  { id: "203", name: "Czechia", aliases: ["Czech Republic", "Czech", "Česko"], bbox: [12.09, 48.55, 18.86, 51.06] },
  { id: "204", name: "Benin", aliases: [], bbox: [0.77, 6.24, 3.84, 12.41] },
  { id: "208", name: "Denmark", aliases: ["Danmark"], bbox: [8.07, 54.56, 15.19, 57.75] },
  { id: "214", name: "Dominican Republic", aliases: [], bbox: [-71.99, 17.6, -68.32, 19.93] },
  { id: "218", name: "Ecuador", aliases: [], bbox: [-80.97, -5.02, -75.19, 1.68] },
  { id: "818", name: "Egypt", aliases: ["Misr", "Égypte"], bbox: [24.7, 22.0, 37.06, 31.67] },
  { id: "222", name: "El Salvador", aliases: [], bbox: [-90.1, 13.15, -87.72, 14.45] },
  { id: "231", name: "Ethiopia", aliases: [], bbox: [33.0, 3.42, 47.97, 14.9] },
  { id: "233", name: "Estonia", aliases: ["Eesti"], bbox: [21.84, 57.51, 28.21, 59.69] },
  { id: "246", name: "Finland", aliases: ["Suomi"], bbox: [19.98, 59.81, 31.58, 70.1] },
  { id: "250", name: "France", aliases: [], bbox: [-4.79, 42.33, 8.24, 51.09] },
  { id: "266", name: "Gabon", aliases: [], bbox: [8.7, -3.98, 14.5, 2.33] },
  { id: "276", name: "Germany", aliases: ["Deutschland"], bbox: [5.99, 47.3, 15.02, 55.1] },
  { id: "288", name: "Ghana", aliases: [], bbox: [-3.26, 4.74, 1.06, 11.17] },
  { id: "300", name: "Greece", aliases: ["Hellas", "Ελλάδα"], bbox: [19.37, 34.8, 28.24, 41.75] },
  { id: "320", name: "Guatemala", aliases: [], bbox: [-92.24, 13.74, -88.22, 17.82] },
  { id: "324", name: "Guinea", aliases: [], bbox: [-15.12, 7.19, -7.64, 12.67] },
  { id: "340", name: "Honduras", aliases: [], bbox: [-89.36, 12.98, -83.15, 16.0] },
  { id: "348", name: "Hungary", aliases: ["Magyarország"], bbox: [16.11, 45.74, 22.9, 48.59] },
  { id: "356", name: "India", aliases: [], bbox: [68.17, 8.07, 97.4, 35.51] },
  { id: "360", name: "Indonesia", aliases: [], bbox: [95.29, -10.36, 140.98, 5.48] },
  { id: "364", name: "Iran", aliases: ["Persia"], bbox: [44.03, 25.08, 63.33, 39.78] },
  { id: "368", name: "Iraq", aliases: [], bbox: [38.79, 29.1, 48.57, 37.39] },
  { id: "372", name: "Ireland", aliases: ["Éire"], bbox: [-10.47, 51.44, -6.0, 55.39] },
  { id: "376", name: "Israel", aliases: [], bbox: [34.27, 29.5, 35.9, 33.34] },
  { id: "380", name: "Italy", aliases: ["Italia"], bbox: [6.63, 36.65, 18.52, 47.1] },
  { id: "384", name: "Ivory Coast", aliases: ["Côte d'Ivoire", "Cote d'Ivoire"], bbox: [-8.6, 4.34, -2.49, 10.74] },
  { id: "388", name: "Jamaica", aliases: [], bbox: [-78.34, 17.7, -76.19, 18.52] },
  { id: "392", name: "Japan", aliases: ["Nippon", "Nihon"], bbox: [129.41, 31.03, 145.55, 45.55] },
  { id: "400", name: "Jordan", aliases: [], bbox: [34.92, 29.18, 39.3, 33.38] },
  { id: "398", name: "Kazakhstan", aliases: [], bbox: [50.27, 40.57, 87.36, 55.45] },
  { id: "404", name: "Kenya", aliases: [], bbox: [33.91, -4.72, 41.9, 5.02] },
  { id: "408", name: "North Korea", aliases: ["DPRK"], bbox: [124.27, 37.67, 130.78, 42.99] },
  { id: "410", name: "South Korea", aliases: ["Korea"], bbox: [126.12, 34.01, 129.47, 38.61] },
  { id: "414", name: "Kuwait", aliases: [], bbox: [46.57, 28.53, 48.42, 30.06] },
  { id: "418", name: "Laos", aliases: ["Lao PDR"], bbox: [100.12, 13.88, 107.56, 22.5] },
  { id: "422", name: "Lebanon", aliases: [], bbox: [35.12, 33.09, 36.61, 34.69] },
  { id: "426", name: "Lesotho", aliases: [], bbox: [27.01, -30.65, 29.46, -28.57] },
  { id: "428", name: "Latvia", aliases: ["Latvija"], bbox: [20.97, 55.66, 28.24, 57.97] },
  { id: "434", name: "Libya", aliases: [], bbox: [9.32, 19.5, 25.17, 33.17] },
  { id: "440", name: "Lithuania", aliases: ["Lietuva"], bbox: [21.0, 53.9, 26.88, 56.45] },
  { id: "442", name: "Luxembourg", aliases: [], bbox: [5.67, 49.44, 6.53, 50.19] },
  { id: "450", name: "Madagascar", aliases: [], bbox: [43.25, -25.6, 50.48, -11.95] },
  { id: "454", name: "Malawi", aliases: [], bbox: [32.69, -17.13, 35.92, -9.36] },
  { id: "458", name: "Malaysia", aliases: [], bbox: [99.64, 0.86, 119.27, 7.36] },
  { id: "466", name: "Mali", aliases: [], bbox: [-4.24, 10.15, 4.27, 25.0] },
  { id: "478", name: "Mauritania", aliases: [], bbox: [-17.07, 14.62, -4.83, 27.4] },
  { id: "484", name: "Mexico", aliases: ["México"], bbox: [-117.13, 14.53, -86.73, 32.72] },
  { id: "496", name: "Mongolia", aliases: [], bbox: [87.76, 41.6, 119.93, 52.15] },
  { id: "504", name: "Morocco", aliases: ["Maroc", "Al Maghrib"], bbox: [-13.17, 27.67, -0.99, 35.92] },
  { id: "508", name: "Mozambique", aliases: [], bbox: [30.22, -26.87, 40.84, -10.32] },
  { id: "516", name: "Namibia", aliases: [], bbox: [11.73, -28.97, 25.26, -16.94] },
  { id: "524", name: "Nepal", aliases: [], bbox: [80.06, 26.4, 88.2, 30.42] },
  { id: "528", name: "Netherlands", aliases: ["Holland", "Nederland"], bbox: [3.36, 50.75, 7.23, 53.56] },
  { id: "540", name: "New Caledonia", aliases: [], bbox: [163.97, -22.7, 167.84, -20.1] },
  { id: "558", name: "Nicaragua", aliases: [], bbox: [-87.67, 10.73, -83.15, 14.99] },
  { id: "562", name: "Niger", aliases: [], bbox: [2.15, 11.7, 15.9, 23.52] },
  { id: "566", name: "Nigeria", aliases: [], bbox: [2.69, 4.24, 14.68, 13.87] },
  { id: "578", name: "Norway", aliases: ["Norge", "Noreg"], bbox: [4.63, 57.98, 31.08, 71.22] },
  { id: "512", name: "Oman", aliases: [], bbox: [52.0, 16.65, 59.84, 26.4] },
  { id: "586", name: "Pakistan", aliases: [], bbox: [60.87, 23.69, 77.84, 37.13] },
  { id: "591", name: "Panama", aliases: [], bbox: [-82.97, 7.21, -77.24, 9.64] },
  { id: "598", name: "Papua New Guinea", aliases: ["PNG"], bbox: [140.84, -10.65, 155.03, -1.31] },
  { id: "600", name: "Paraguay", aliases: [], bbox: [-62.64, -27.55, -54.29, -19.29] },
  { id: "604", name: "Peru", aliases: [], bbox: [-81.41, -18.35, -68.67, -0.04] },
  { id: "608", name: "Philippines", aliases: [], bbox: [117.17, 5.58, 126.54, 18.56] },
  { id: "616", name: "Poland", aliases: ["Polska"], bbox: [14.07, 49.0, 24.15, 54.84] },
  { id: "620", name: "Portugal", aliases: [], bbox: [-9.5, 36.96, -6.19, 42.16] },
  { id: "630", name: "Puerto Rico", aliases: [], bbox: [-67.24, 17.95, -65.59, 18.52] },
  { id: "642", name: "Romania", aliases: ["România"], bbox: [22.08, 43.62, 29.7, 48.27] },
  { id: "643", name: "Russia", aliases: ["Russian Federation"], bbox: [19.6, 41.2, -169.73, 81.85], antimeridian: true },
  { id: "646", name: "Rwanda", aliases: [], bbox: [29.02, -2.84, 30.9, -1.05] },
  { id: "682", name: "Saudi Arabia", aliases: [], bbox: [36.47, 16.35, 55.67, 32.15] },
  { id: "686", name: "Senegal", aliases: [], bbox: [-17.63, 12.33, -11.47, 15.0] },
  { id: "694", name: "Sierra Leone", aliases: [], bbox: [-13.25, 6.79, -10.23, 10.0] },
  { id: "703", name: "Slovakia", aliases: ["Slovensko"], bbox: [16.83, 47.73, 22.56, 49.61] },
  { id: "705", name: "Slovenia", aliases: ["Slovenija"], bbox: [13.38, 45.43, 16.59, 46.88] },
  { id: "706", name: "Somalia", aliases: [], bbox: [40.98, -1.69, 51.41, 12.02] },
  { id: "710", name: "South Africa", aliases: [], bbox: [16.34, -34.82, 32.89, -22.13] },
  { id: "716", name: "Zimbabwe", aliases: [], bbox: [25.24, -22.42, 33.02, -15.64] },
  { id: "724", name: "Spain", aliases: ["España"], bbox: [-9.39, 35.95, 3.41, 43.75] },
  { id: "729", name: "Sudan", aliases: [], bbox: [23.89, 8.68, 38.41, 22.23] },
  { id: "752", name: "Sweden", aliases: ["Sverige"], bbox: [11.12, 55.33, 24.16, 69.11] },
  { id: "756", name: "Switzerland", aliases: ["Schweiz", "Suisse", "Swiss"], bbox: [5.96, 45.82, 10.49, 47.81] },
  { id: "760", name: "Syria", aliases: ["Syrian Arab Republic"], bbox: [35.73, 32.31, 42.36, 37.32] },
  { id: "762", name: "Tajikistan", aliases: [], bbox: [67.39, 36.67, 75.14, 41.04] },
  { id: "764", name: "Thailand", aliases: [], bbox: [97.34, 5.69, 105.64, 20.46] },
  { id: "768", name: "Togo", aliases: [], bbox: [0.0, 6.1, 1.87, 11.14] },
  { id: "788", name: "Tunisia", aliases: [], bbox: [7.52, 30.23, 11.49, 37.35] },
  { id: "792", name: "Turkey", aliases: ["Türkiye", "Türkei"], bbox: [25.62, 35.82, 44.79, 42.14] },
  { id: "800", name: "Uganda", aliases: [], bbox: [29.57, -1.48, 35.03, 4.22] },
  { id: "804", name: "Ukraine", aliases: ["Україна"], bbox: [22.14, 44.37, 40.16, 52.38] },
  { id: "784", name: "United Arab Emirates", aliases: ["UAE", "Emirates"], bbox: [51.58, 22.5, 56.4, 26.07] },
  { id: "826", name: "United Kingdom", aliases: ["UK", "Britain", "Great Britain", "England"], bbox: [-8.62, 49.86, 1.77, 60.86] },
  { id: "840", name: "United States", aliases: ["USA", "US", "America", "United States of America"], bbox: [172.49, 18.96, -66.99, 71.41], antimeridian: true },
  { id: "858", name: "Uruguay", aliases: [], bbox: [-58.44, -34.95, -53.11, -30.11] },
  { id: "860", name: "Uzbekistan", aliases: [], bbox: [55.98, 37.19, 73.14, 45.59] },
  { id: "862", name: "Venezuela", aliases: [], bbox: [-73.36, 0.72, -59.8, 12.16] },
  { id: "704", name: "Vietnam", aliases: ["Viet Nam"], bbox: [102.14, 8.6, 109.46, 23.35] },
  { id: "887", name: "Yemen", aliases: [], bbox: [42.6, 12.29, 54.48, 18.0] },
  { id: "894", name: "Zambia", aliases: [], bbox: [21.99, -18.08, 33.7, -8.22] },
  // Additional countries
  { id: "020", name: "Andorra", aliases: [], bbox: [1.41, 42.43, 1.79, 42.66] },
  { id: "028", name: "Antigua and Barbuda", aliases: ["Antigua"], bbox: [-61.9, 17.02, -61.67, 17.73] },
  { id: "031", name: "Azerbaijan", aliases: [], bbox: [44.79, 38.27, 50.37, 41.87] },
  { id: "044", name: "Bahamas", aliases: [], bbox: [-78.98, 20.91, -72.74, 27.04] },
  { id: "048", name: "Bahrain", aliases: [], bbox: [50.45, 25.79, 50.65, 26.24] },
  { id: "051", name: "Armenia", aliases: [], bbox: [43.58, 38.74, 46.59, 41.29] },
  { id: "052", name: "Barbados", aliases: [], bbox: [-59.65, 13.04, -59.42, 13.33] },
  { id: "084", name: "Belize", aliases: [], bbox: [-89.22, 15.89, -87.79, 18.49] },
  { id: "096", name: "Brunei", aliases: [], bbox: [114.2, 4.01, 115.36, 5.05] },
  { id: "108", name: "Burundi", aliases: [], bbox: [28.99, -4.47, 30.85, -2.3] },
  { id: "112", name: "Belarus", aliases: ["Byelorussia"], bbox: [23.18, 51.32, 32.78, 56.17] },
  { id: "132", name: "Cape Verde", aliases: ["Cabo Verde"], bbox: [-25.36, 14.8, -22.67, 17.19] },
  { id: "148", name: "Chad", aliases: [], bbox: [13.47, 7.46, 23.99, 23.47] },
  { id: "158", name: "Taiwan", aliases: ["Chinese Taipei"], bbox: [119.99, 21.9, 122.01, 25.3] },
  { id: "174", name: "Comoros", aliases: [], bbox: [43.22, -12.37, 44.53, -11.36] },
  { id: "188", name: "Costa Rica", aliases: [], bbox: [-85.95, 5.5, -82.56, 11.22] },
  { id: "384", name: "Ivory Coast", aliases: ["Côte d'Ivoire"], bbox: [-8.6, 4.34, -2.49, 10.74] },
  { id: "270", name: "Gambia", aliases: [], bbox: [-16.82, 13.05, -13.8, 13.83] },
  { id: "268", name: "Georgia", aliases: [], bbox: [40.01, 41.06, 46.64, 43.55] },
  { id: "308", name: "Grenada", aliases: [], bbox: [-61.8, 11.99, -61.59, 12.24] },
  { id: "328", name: "Guyana", aliases: [], bbox: [-61.41, 1.18, -57.14, 8.55] },
  { id: "332", name: "Haiti", aliases: [], bbox: [-74.46, 18.03, -71.64, 19.92] },
  { id: "352", name: "Iceland", aliases: ["Ísland"], bbox: [-24.55, 63.4, -13.5, 66.57] },
  { id: "376", name: "Israel", aliases: [], bbox: [34.27, 29.5, 35.9, 33.34] },
  { id: "388", name: "Jamaica", aliases: [], bbox: [-78.34, 17.7, -76.19, 18.52] },
  { id: "417", name: "Kyrgyzstan", aliases: [], bbox: [69.46, 39.19, 80.26, 43.23] },
  { id: "426", name: "Lesotho", aliases: [], bbox: [27.01, -30.65, 29.46, -28.57] },
  { id: "430", name: "Liberia", aliases: [], bbox: [-11.44, 4.35, -7.54, 8.56] },
  { id: "438", name: "Liechtenstein", aliases: [], bbox: [9.47, 47.05, 9.64, 47.27] },
  { id: "446", name: "Macau", aliases: ["Macao"], bbox: [113.53, 22.11, 113.59, 22.22] },
  { id: "462", name: "Maldives", aliases: [], bbox: [72.69, -0.71, 73.76, 7.1] },
  { id: "470", name: "Malta", aliases: [], bbox: [14.18, 35.79, 14.58, 36.08] },
  { id: "478", name: "Mauritania", aliases: [], bbox: [-17.07, 14.62, -4.83, 27.4] },
  { id: "480", name: "Mauritius", aliases: [], bbox: [57.31, -20.52, 57.79, -19.98] },
  { id: "484", name: "Mexico", aliases: ["México"], bbox: [-117.13, 14.53, -86.73, 32.72] },
  { id: "492", name: "Monaco", aliases: [], bbox: [7.37, 43.72, 7.44, 43.75] },
  { id: "496", name: "Mongolia", aliases: [], bbox: [87.76, 41.6, 119.93, 52.15] },
  { id: "498", name: "Moldova", aliases: [], bbox: [26.62, 45.49, 30.14, 48.49] },
  { id: "499", name: "Montenegro", aliases: ["Crna Gora"], bbox: [18.45, 41.88, 20.36, 43.56] },
  { id: "504", name: "Morocco", aliases: [], bbox: [-13.17, 27.67, -0.99, 35.92] },
  { id: "516", name: "Namibia", aliases: [], bbox: [11.73, -28.97, 25.26, -16.94] },
  { id: "520", name: "Nauru", aliases: [], bbox: [166.9, -0.56, 166.95, -0.5] },
  { id: "548", name: "Vanuatu", aliases: [], bbox: [166.53, -20.22, 169.88, -13.73] },
  { id: "554", name: "New Zealand", aliases: ["NZ", "Aotearoa"], bbox: [165.89, -52.57, -171.19, -8.55], antimeridian: true },
  { id: "566", name: "Nigeria", aliases: [], bbox: [2.69, 4.24, 14.68, 13.87] },
  { id: "579", name: "North Macedonia", aliases: ["Macedonia", "N. Macedonia"], bbox: [20.45, 40.84, 22.99, 42.37] },
  { id: "807", name: "North Macedonia", aliases: ["Macedonia", "N. Macedonia"], bbox: [20.45, 40.84, 22.99, 42.37] },
  { id: "585", name: "Palau", aliases: [], bbox: [131.13, 2.95, 134.72, 8.1] },
  { id: "591", name: "Panama", aliases: [], bbox: [-82.97, 7.21, -77.24, 9.64] },
  { id: "598", name: "Papua New Guinea", aliases: ["PNG"], bbox: [140.84, -10.65, 155.03, -1.31] },
  { id: "630", name: "Puerto Rico", aliases: [], bbox: [-67.24, 17.95, -65.59, 18.52] },
  { id: "634", name: "Qatar", aliases: [], bbox: [50.74, 24.56, 51.61, 26.17] },
  { id: "646", name: "Rwanda", aliases: [], bbox: [29.02, -2.84, 30.9, -1.05] },
  { id: "659", name: "Saint Kitts and Nevis", aliases: ["St Kitts"], bbox: [-62.86, 17.1, -62.54, 17.42] },
  { id: "662", name: "Saint Lucia", aliases: ["St Lucia"], bbox: [-61.08, 13.71, -60.87, 14.11] },
  { id: "670", name: "Saint Vincent and the Grenadines", aliases: ["St Vincent"], bbox: [-61.46, 12.58, -61.12, 13.38] },
  { id: "674", name: "San Marino", aliases: [], bbox: [12.41, 43.9, 12.52, 43.99] },
  { id: "678", name: "São Tomé and Príncipe", aliases: ["Sao Tome"], bbox: [6.46, -0.02, 7.47, 1.7] },
  { id: "688", name: "Serbia", aliases: ["Srbija"], bbox: [18.83, 42.24, 23.0, 46.19] },
  { id: "690", name: "Seychelles", aliases: [], bbox: [55.4, -9.76, 56.0, -4.26] },
  { id: "702", name: "Singapore", aliases: [], bbox: [103.64, 1.26, 104.0, 1.47] },
  { id: "706", name: "Somalia", aliases: [], bbox: [40.98, -1.69, 51.41, 12.02] },
  { id: "740", name: "Suriname", aliases: [], bbox: [-58.07, 1.82, -53.97, 6.01] },
  { id: "748", name: "Eswatini", aliases: ["Swaziland"], bbox: [30.79, -27.32, 32.13, -25.72] },
  { id: "776", name: "Tonga", aliases: [], bbox: [-175.36, -21.45, -173.92, -15.56] },
  { id: "780", name: "Trinidad and Tobago", aliases: ["Trinidad"], bbox: [-61.95, 10.0, -60.89, 10.9] },
  { id: "795", name: "Turkmenistan", aliases: [], bbox: [52.5, 35.27, 66.55, 42.77] },
  { id: "798", name: "Tuvalu", aliases: [], bbox: [176.06, -9.43, 179.87, -5.64] },
  { id: "800", name: "Uganda", aliases: [], bbox: [29.57, -1.48, 35.03, 4.22] },
  { id: "336", name: "Vatican City", aliases: ["Vatican", "Holy See"], bbox: [12.44, 41.9, 12.46, 41.91] },
  { id: "583", name: "Micronesia", aliases: ["FSM", "Federated States of Micronesia"], bbox: [138.07, 5.29, 163.04, 9.58] },
  { id: "090", name: "Solomon Islands", aliases: [], bbox: [155.51, -11.86, 166.84, -6.6] },
  { id: "624", name: "Guinea-Bissau", aliases: [], bbox: [-16.71, 10.93, -13.64, 12.69] },
  { id: "232", name: "Eritrea", aliases: [], bbox: [36.44, 12.36, 43.13, 18.0] },
  { id: "262", name: "Djibouti", aliases: [], bbox: [41.77, 10.94, 43.42, 12.71] },
  { id: "214", name: "Dominican Republic", aliases: [], bbox: [-71.99, 17.6, -68.32, 19.93] },
  { id: "226", name: "Equatorial Guinea", aliases: [], bbox: [8.05, 0.86, 11.35, 3.76] },
  { id: "238", name: "Falkland Islands", aliases: ["Malvinas"], bbox: [-61.35, -52.36, -57.72, -51.27] },
  { id: "242", name: "Fiji", aliases: [], bbox: [-180.0, -21.71, 180.0, -12.48] },
  { id: "288", name: "Ghana", aliases: [], bbox: [-3.26, 4.74, 1.06, 11.17] },
  { id: "304", name: "Greenland", aliases: ["Kalaallit Nunaat"], bbox: [-73.3, 59.77, -12.21, 83.63] },
  { id: "312", name: "Guadeloupe", aliases: [], bbox: [-61.81, 15.84, -61.0, 16.52] },
  { id: "316", name: "Guam", aliases: [], bbox: [144.62, 13.24, 144.96, 13.65] },
  { id: "191", name: "Croatia", aliases: ["Hrvatska"], bbox: [13.49, 42.38, 19.44, 46.56] },
  { id: "356", name: "India", aliases: [], bbox: [68.17, 8.07, 97.4, 35.51] },
];

// Deduplicate by id (keep first occurrence)
const seen = new Set<string>();
export const ALL_COUNTRIES: WorldCountryEntry[] = WORLD_COUNTRY_LIST.filter(c => {
  if (seen.has(c.id)) return false;
  seen.add(c.id);
  return true;
});

// World bbox
export const WORLD_BBOX: [number, number, number, number] = [-180, -90, 180, 90];

// Grid sizes (cols × rows over the full -180→180, -90→90 space)
export const GRID_SIZES = [
  { label: "Large",  cols: 9,  rows: 5  },  // ~40°×36° per cell
  { label: "Medium", cols: 13, rows: 7  },  // ~28°×26° per cell
  { label: "Small",  cols: 18, rows: 10 },  // ~20°×18° per cell
] as const;

export type GridSize = typeof GRID_SIZES[number];

/** Returns all countries whose bbox overlaps a given grid cell. */
export function countriesInCell(colIdx: number, rowIdx: number, cols: number, rows: number): WorldCountryEntry[] {
  const cellW = 360 / cols;
  const cellH = 180 / rows;
  const cellWest  = -180 + colIdx * cellW;
  const cellEast  = cellWest + cellW;
  // row 0 = top (north), increases downward
  const cellNorth = 90 - rowIdx * cellH;
  const cellSouth = cellNorth - cellH;

  return ALL_COUNTRIES.filter(({ bbox, antimeridian }) => {
    const [bw, bs, be, bn] = bbox;
    if (bs > cellNorth || bn < cellSouth) return false;
    if (antimeridian) {
      // Country spans antimeridian: it covers bw→180 AND -180→be
      return bw < cellEast || be > cellWest;
    }
    return bw < cellEast && be > cellWest;
  });
}

export function normalise(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function matchesCountry(input: string, country: WorldCountryEntry): boolean {
  const n = normalise(input);
  if (normalise(country.name) === n) return true;
  return country.aliases.some((a) => normalise(a) === n);
}
