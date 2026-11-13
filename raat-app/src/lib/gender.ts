import type { Gender } from '@/data/translations';

// A first guess only. The visitor sees the choice on the entry screen and can change it with one tap.
const FEMALE = new Set(
  'priya pooja puja neha anjali riya ria isha kavya divya sneha shreya aarti arti aarohi ananya krupa khushi nisha komal payal hetal heena hina jinal dhara bhavna bhavana bhumi mansi kinjal foram nidhi ruchi rupal trupti falguni krina hiral urvi vidhi zeel janvi jahnavi tanvi sakshi swati shweta sonal sejal mitali megha meera mira radha sita gita geeta rekha asha usha lata kajal karishma sana sara fatima ayesha zoya simran harpreet manpreet jaspreet nikita ankita aditi deepa deepika dipika jyoti kiran kirti pinal disha dimple binal hemali hemangi juhi kruti mahi mohini nirali palak pallavi rinku riddhi siddhi shruti shivani shital sheetal shilpa smita sonia tejal toral twinkle vaishali vibha yashvi yesha zarna'
    .split(/\s+/).filter((n) => !n.endsWith('?')),
);
const MALE = new Set(
  'krishna aditya surya shiva rama ravi hari ali sai mani rishi giri kavi bali chaitanya rohan rahul amit sumit ankit nikhil jignesh hitesh mehul dhaval chirag parth harsh yash raj vijay ajay sanjay manoj kunal karan arjun vivek kishan bharat dev dhruv neel jay om ram shyam mohan sohan ramesh suresh mahesh dinesh rakesh'
    .split(/\s+/),
);

export function guessGender(name: string): Gender {
  const n = name.trim().toLowerCase().split(/\s+/)[0] ?? '';
  if (!n) return 'm';
  if (MALE.has(n)) return 'm';
  if (FEMALE.has(n)) return 'f';
  // Devanagari / Gujarati names ending in the long ā or ī vowel sign are usually female.
  if (/[ाीાી]$/.test(n)) return 'f';
  if (/(ika|ita|ini|ali|shree|shri|ee|ben)$/.test(n)) return 'f';
  if (/[ai]$/.test(n) && n.length > 3) return 'f';
  return 'm';
}

/** Which protagonist photograph to show. Neutral grammar still needs one of the two people on screen: follow the name. */
export function visualGender(gender: Gender, name: string): 'm' | 'f' {
  if (gender !== 'n') return gender;
  return guessGender(name) === 'f' ? 'f' : 'm';
}
