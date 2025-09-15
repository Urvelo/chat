// Testiskripti älykkäälle moderoinnille
// Testaa erilaisia viestejä ja konteksteja

const testCases = [
  // SALLITTUJA - konteksti on turvallinen
  {
    text: "mun kaverit puhuu seksistä koulussa ja mä en tiedä mitä se tarkoittaa",
    expected: "ALLOW",
    reason: "Nuori kysyy tietoa, ei seksuaalista sisältöä"
  },
  {
    text: "olin kerran testannut seksii mut se oli kamalaa",
    expected: "ALLOW", 
    reason: "Nuori kertoo kokemuksesta, ei rohkaise"
  },
  {
    text: "s.eksi on jotain mitä aikuiset tekee",
    expected: "ALLOW",
    reason: "Kiertotapa mutta konteksti asiallinen"
  },
  {
    text: "ope kerto meille seksivalistuksesta",
    expected: "ALLOW",
    reason: "Koulutuksellinen konteksti"
  },
  
  // VAROITUKSIA - epäsopivaa mutta ei vakavaa
  {
    text: "seksi on kivaa lol",
    expected: "WARN",
    reason: "Ei sopivia nuorille mutta ei uhkaavaa"
  },
  {
    text: "kattokaa pornoo netistä",
    expected: "WARN", 
    reason: "Rohkaisee sopimatonta sisältöä"
  },
  
  // ESTETTYJÄ - selvästi haitallista
  {
    text: "haluun panna sua",
    expected: "BLOCK",
    reason: "Seksuaalista häirintää"
  },
  {
    text: "lähettäisiks mulle alastonkuvia",
    expected: "BLOCK", 
    reason: "Pyytää sopimatonta sisältöä"
  },
  {
    text: "tapan sut jos et tee mitä sanon",
    expected: "BLOCK",
    reason: "Uhkailu ja väkivalta"
  }
];

console.log('🧪 Älykäs moderointi - testiskenaarioita\n');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: "${testCase.text}"`);
  console.log(`   Odotettu: ${testCase.expected}`);
  console.log(`   Syy: ${testCase.reason}`);
  console.log('');
});

console.log('📝 Tarvitaan AI joka ymmärtää:');
console.log('- Kontekstin (kysymys vs. häirintä)');
console.log('- Kiertotavat (s.eksi, s3ksi)'); 
console.log('- Tarkoituksen (opetus vs. rohkaisu)');
console.log('- Vakavuuden (tiedonhaku vs. uhkailu)');

export { testCases };