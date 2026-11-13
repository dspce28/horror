// End-screen recommendations. Films link to their Wikipedia articles (a stable discovery page: we don't claim
// where anything streams, which changes by country). Songs link to a YouTube Music search: nothing is embedded
// and nothing plays on this site.
import type { Lang } from '@/data/translations';

type L3 = Record<Lang, string>;
export interface Film { title: string; year: number; language: L3; about: L3; url: string }
export interface Song { title: string; artist: string; source: string; url: string }

const wiki = (page: string) => `https://en.wikipedia.org/wiki/${page}`;
const ytm = (q: string) => `https://music.youtube.com/search?q=${encodeURIComponent(q)}`;

export const FILMS: Film[] = [
  { title: 'Tumbbad', year: 2018, url: wiki('Tumbbad'),
    language: { en: 'Hindi', hi: 'हिंदी', gu: 'હિન્દી' },
    about: { en: 'A family, a cursed treasure and a god who was never meant to be worshipped. Rain-soaked folk horror.', hi: 'एक परिवार, एक शापित ख़ज़ाना और एक देवता जिसकी पूजा कभी नहीं होनी थी। बारिश में भीगी लोक-कथा जैसी हॉरर।', gu: 'એક પરિવાર, એક શાપિત ખજાનો અને એક દેવ જેની પૂજા ક્યારેય થવાની નહોતી. વરસાદમાં પલળેલી લોકકથા જેવી હોરર.' } },
  { title: 'Vash', year: 2023, url: wiki('Vash_(film)'),
    language: { en: 'Gujarati', hi: 'गुजराती', gu: 'ગુજરાતી' },
    about: { en: 'A stranger visits a family home and takes control of their daughter. Tight, cruel Gujarati horror.', hi: 'एक अजनबी घर आता है और परिवार की बेटी को अपने वश में कर लेता है। कसी हुई गुजराती हॉरर।', gu: 'એક અજાણ્યો માણસ ઘરે આવે છે અને પરિવારની દીકરીને વશમાં કરી લે છે. કસાયેલી ગુજરાતી હોરર.' } },
  { title: 'Bulbbul', year: 2020, url: wiki('Bulbbul'),
    language: { en: 'Hindi', hi: 'हिंदी', gu: 'હિન્દી' },
    about: { en: 'Bengal, the 1880s. Men are dying in the forest, and the village blames a chudail.', hi: 'बंगाल, 1880 का दशक। जंगल में आदमी मर रहे हैं, और गाँव एक चुड़ैल को दोष देता है।', gu: 'બંગાળ, 1880નો દાયકો. જંગલમાં પુરુષો મરી રહ્યા છે, અને ગામ એક ચુડેલને દોષ આપે છે.' } },
  { title: '13B', year: 2009, url: wiki('13B_(film)'),
    language: { en: 'Tamil / Hindi', hi: 'तमिल / हिंदी', gu: 'તમિલ / હિન્દી' },
    about: { en: 'A family moves into a new flat, and a TV serial starts predicting their lives.', hi: 'एक परिवार नए फ़्लैट में आता है, और एक टीवी सीरियल उनकी ज़िंदगी पहले से दिखाने लगता है।', gu: 'એક પરિવાર નવા ફ્લેટમાં રહેવા આવે છે, અને એક ટીવી સિરિયલ એમનું જીવન અગાઉથી બતાવવા લાગે છે.' } },
  { title: 'Bhoothakaalam', year: 2022, url: wiki('Bhoothakaalam'),
    language: { en: 'Malayalam', hi: 'मलयालम', gu: 'મલયાલમ' },
    about: { en: 'A mother and her son, a house, and grief that will not leave. Quiet and deeply unsettling.', hi: 'एक माँ, उसका बेटा, एक घर, और एक दुख जो जाता नहीं। धीमी और बेहद बेचैन करने वाली।', gu: 'એક મા, એનો દીકરો, એક ઘર, અને એક દુઃખ જે જતું નથી. ધીમી અને ખૂબ બેચેન કરનારી.' } },
  { title: 'Raat', year: 1992, url: wiki('Raat_(film)'),
    language: { en: 'Hindi / Telugu', hi: 'हिंदी / तेलुगु', gu: 'હિન્દી / તેલુગુ' },
    about: { en: 'A family moves into a new house and their daughter starts to change. Ram Gopal Varma\'s early horror.', hi: 'एक परिवार नए घर में आता है और उनकी बेटी बदलने लगती है। राम गोपाल वर्मा की शुरुआती हॉरर।', gu: 'એક પરિવાર નવા ઘરમાં આવે છે અને એમની દીકરી બદલાવા લાગે છે. રામ ગોપાલ વર્માની શરૂઆતની હોરર.' } },
  { title: 'The Others', year: 2001, url: wiki('The_Others_(2001_film)'),
    language: { en: 'English', hi: 'अंग्रेज़ी', gu: 'અંગ્રેજી' },
    about: { en: 'A mother and two children in a dark house, and the feeling that they are not alone.', hi: 'एक अँधेरे घर में एक माँ और दो बच्चे, और यह एहसास कि वे अकेले नहीं हैं।', gu: 'એક અંધારા ઘરમાં એક મા અને બે બાળકો, અને એવો અહેસાસ કે તેઓ એકલાં નથી.' } },
  { title: 'The Wailing', year: 2016, url: wiki('The_Wailing_(film)'),
    language: { en: 'Korean', hi: 'कोरियाई', gu: 'કોરિયન' },
    about: { en: 'A village policeman, a stranger in the hills, and a sickness that turns neighbours violent.', hi: 'गाँव का एक पुलिसवाला, पहाड़ों में एक अजनबी, और एक बीमारी जो पड़ोसियों को हिंसक बना देती है।', gu: 'ગામનો એક પોલીસવાળો, ટેકરીઓમાં એક અજાણ્યો, અને એક બીમારી જે પડોશીઓને હિંસક બનાવી દે છે.' } },
  { title: 'Shutter', year: 2004, url: wiki('Shutter_(2004_film)'),
    language: { en: 'Thai', hi: 'थाई', gu: 'થાઈ' },
    about: { en: 'After a hit-and-run on a dark road, a photographer finds a shape in every picture he takes.', hi: 'एक अँधेरी सड़क पर टक्कर के बाद, एक फ़ोटोग्राफ़र को हर तस्वीर में एक साया दिखने लगता है।', gu: 'એક અંધારા રસ્તા પર અકસ્માત પછી, એક ફોટોગ્રાફરને દરેક ફોટામાં એક પડછાયો દેખાવા લાગે છે.' } },
  { title: 'The Conjuring', year: 2013, url: wiki('The_Conjuring'),
    language: { en: 'English', hi: 'अंग्रेज़ी', gu: 'અંગ્રેજી' },
    about: { en: 'Two paranormal investigators and a farmhouse where something is waiting for the family.', hi: 'दो पैरानॉर्मल जाँचकर्ता और एक फ़ार्महाउस, जहाँ कुछ उस परिवार का इंतज़ार कर रहा है।', gu: 'બે પેરાનોર્મલ તપાસકર્તા અને એક ફાર્મહાઉસ, જ્યાં કંઈક એ પરિવારની રાહ જોઈ રહ્યું છે.' } },
];

export const SONGS: Song[] = [
  { title: 'Aayega Aanewala', artist: 'Lata Mangeshkar · Khemchand Prakash', source: 'Mahal (1949)', url: ytm('Aayega Aanewala Mahal Lata Mangeshkar') },
  { title: 'Kahin Deep Jale Kahin Dil', artist: 'Lata Mangeshkar · Hemant Kumar', source: 'Bees Saal Baad (1962)', url: ytm('Kahin Deep Jale Kahin Dil Bees Saal Baad') },
  { title: 'Naina Barse Rimjhim Rimjhim', artist: 'Lata Mangeshkar · Madan Mohan', source: 'Woh Kaun Thi? (1964)', url: ytm('Naina Barse Rimjhim Woh Kaun Thi') },
  { title: 'Gumnaam Hai Koi', artist: 'Lata Mangeshkar · Shankar–Jaikishan', source: 'Gumnaam (1965)', url: ytm('Gumnaam Hai Koi Lata Mangeshkar') },
  { title: 'Tumbbad (Original Score)', artist: 'Jesper Kyd', source: 'Tumbbad (2018)', url: ytm('Tumbbad soundtrack Jesper Kyd') },
  { title: 'Tubular Bells', artist: 'Mike Oldfield', source: 'The Exorcist (1973)', url: ytm('Tubular Bells Mike Oldfield') },
  { title: 'Halloween Theme', artist: 'John Carpenter', source: 'Halloween (1978)', url: ytm('Halloween Theme John Carpenter') },
  { title: 'Suspiria', artist: 'Goblin', source: 'Suspiria (1977)', url: ytm('Suspiria Goblin') },
  { title: 'Hereditary (Original Soundtrack)', artist: 'Colin Stetson', source: 'Hereditary (2018)', url: ytm('Hereditary soundtrack Colin Stetson') },
];
