export interface YearPhoto {
  year: number;
  title: string;
  imageUrl: string;
  hint: string;
}

/**
 * Curated historical photos with known years.
 * All images are Wikimedia Commons direct file URLs (no /thumb/ paths).
 */
export const YEAR_PHOTOS: YearPhoto[] = [
  { year: 1903, title: 'Wright Flyer', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/86/First_flight2.jpg', hint: 'A historic moment in aviation history' },
  { year: 1969, title: 'Apollo 11', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/41/A_Man_on_the_Moon%2C_AS11-40-5903_%28cropped%29.jpg', hint: 'One small step for mankind' },
  { year: 1945, title: 'Raising the Flag on Iwo Jima', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b0/Raising_the_Flag_on_Iwo_Jima%2C_larger_-_edit1.jpg', hint: 'Marines plant the Stars and Stripes on a volcanic island' },
  { year: 1989, title: 'Fall of the Berlin Wall', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/West_and_East_Germans_at_the_Brandenburg_Gate_in_1989.jpg', hint: 'The end of a divided city' },
  { year: 1968, title: 'Earthrise', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a8/NASA-Apollo8-Dec24-Earthrise.jpg', hint: 'Earth seen from the Moon for the first time' },
  { year: 1937, title: 'Hindenburg disaster', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Hindenburg_disaster.jpg', hint: 'The end of an era in airship travel' },
  { year: 1972, title: 'The Blue Marble', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/70/The_Blue_Marble%2C_AS17-148-22727.jpg', hint: 'Earth photographed from space during an Apollo mission' },
  { year: 1944, title: 'Normandy landings', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Into_the_Jaws_of_Death_23-0455M_edit.jpg', hint: 'Allied troops storm the beaches in northern France' },
  { year: 1986, title: 'Space Shuttle Challenger disaster', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Challenger_explosion.jpg', hint: 'A tragic day for the U.S. space program' },
  { year: 1953, title: 'First summit of Everest', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Tenzing_Norgay_%28cropped%29.jpg', hint: 'First confirmed ascent of the world\'s highest peak' },
  { year: 1961, title: 'Yuri Gagarin', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d8/Yuri_Gagarin_with_awards_%28cropped%29_2.jpg', hint: 'The first human to journey into outer space' },
  { year: 1962, title: 'Cuban Missile Crisis', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/8/8a/PGM-19A_Jupiter_missile-02.jpg', hint: 'A confrontation that brought the world to the brink of nuclear war' },
  { year: 1957, title: 'Sputnik 1', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b7/%D0%9F%D0%B5%D1%80%D0%B2%D1%8B%D0%B9_%D0%B2_%D0%BC%D0%B8%D1%80%D0%B5_%D0%B8%D1%81%D0%BA%D1%83%D1%81%D1%81%D1%82%D0%B2%D0%B5%D0%BD%D0%BD%D1%8B%D0%B9_%D1%81%D0%BF%D1%83%D1%82%D0%BD%D0%B8%D0%BA_%D0%97%D0%B5%D0%BC%D0%BB%D0%B8.jpg', hint: 'The first artificial satellite launched into orbit' },
  { year: 1980, title: 'Mount St. Helens eruption', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/d1/MSH80_eruption_mount_st_helens_05-18-80-dramatic-edit.jpg', hint: 'A devastating volcanic eruption in Washington State' },
  { year: 1927, title: 'Charles Lindbergh', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b3/Charles_Lindbergh_%28Harris_%26_Ewing_photo%2C_cropped%29.jpg', hint: 'The first solo non-stop transatlantic flight' },
  { year: 1929, title: 'Wall Street crash', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Crowd_outside_nyse.jpg', hint: 'Panic in the financial district of New York' },
  { year: 1963, title: 'March on Washington', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/67/Civil_rights_march_on_Washington%2C_D.C._from_Lincoln_%28cropped%29.jpg', hint: 'A landmark civil rights gathering in Washington D.C.' },
  { year: 1914, title: 'Assassination of Archduke Franz Ferdinand', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/DC-1914-27-d-Sarajevo-cropped.jpg', hint: 'The spark that ignited a world war' },
  { year: 1954, title: 'Roger Bannister four-minute mile', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Roger_Bannister_2.jpg', hint: 'The first human to run a mile in under four minutes' },
  { year: 1919, title: 'Paris Peace Conference', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/4/40/Paris_Peace_Conference.jpg', hint: 'World leaders negotiate the treaty that ended WWI' },
  { year: 1990, title: 'Nelson Mandela released', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/02/Nelson_Mandela_1994.jpg', hint: 'South Africa\'s most famous political prisoner walks free' },
  { year: 1955, title: 'Rosa Parks', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Rosa_Parks%2C_November_1956_%28cropped%29.jpg', hint: 'A civil rights icon in Montgomery, Alabama' },
  { year: 1989, title: 'Tank Man, Tiananmen Square', imageUrl: 'https://upload.wikimedia.org/wikipedia/en/d/dd/Tank_Man_%28Tiananmen_Square_protester%29.jpg', hint: 'One man vs. a column of tanks in Beijing' },
  { year: 1950, title: 'Korean War', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/7b/Chosin.jpg', hint: 'Soldiers in a brutal winter conflict on the Korean peninsula' },
  { year: 1975, title: 'Fall of Saigon', imageUrl: 'https://upload.wikimedia.org/wikipedia/en/9/95/Saigon-hubert-van-es.jpg', hint: 'The chaotic end of a long conflict in Southeast Asia' },
  { year: 1906, title: 'San Francisco earthquake', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Post-and-Grant-Avenue-Look.jpg', hint: 'The aftermath of a devastating earthquake in California' },
  { year: 1963, title: 'JFK assassination', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/59/JFK_Motorcade_GettyImages-517330536.jpg', hint: 'A president is shot in Dallas, Texas' },
  { year: 1936, title: 'Migrant Mother', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/5/54/Lange-MigrantMother02.jpg', hint: 'An iconic photograph of hardship during the Great Depression' },
  { year: 1912, title: 'RMS Titanic', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/6/6d/RMS_Titanic_3_%28cropped_to_ship%29.jpg', hint: 'The world\'s most famous shipwreck, on its maiden voyage' },
  { year: 1945, title: 'Victory over Japan Day', imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/04/Surrender_of_Japan_-_USS_Missouri_%28restored%29.jpg', hint: 'Celebrations marking the end of a world war' },
];
