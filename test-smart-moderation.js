// Testi älykkäälle moderoinnille
import { smartModerationService } from './src/utils/smart-moderation.js';

console.log('🧪 Testataan älykästä moderointia...\n');

// Testattavat viestit
const testMessages = [
  // SALLITTUJA - terveyskasvatus ja kokemukset
  {
    text: 'Oon 16v ja mietin että onko normaalia jos ei oo viel kokeillu seksii?',
    expected: 'SALLITTU (terveyskasvatus)'
  },
  {
    text: 'Opettaja kerto biologian tunnilla s.eksistä ja jäi kysymyksiä',
    expected: 'SALLITTU (koulutus)'
  },
  {
    text: 'Eka kerta oli vähän nolo mut ok kokemus',
    expected: 'SALLITTU (kokemusten jakaminen)'
  },
  {
    text: 'Kondomi rikkoutu, mitä nyt tehä?',
    expected: 'SALLITTU (terveysneuvonta)'
  },
  
  // VAROITUKSIA - epäselvä konteksti
  {
    text: 'Seksi on kivaa kun osaa',
    expected: 'VAROITUS (epäselvä konteksti)'
  },
  {
    text: 'Mun kaveri sanoi et s3ksi on parasta',
    expected: 'VAROITUS (kiertotapa havaittu)'
  },
  
  // ESTETTYJÄ - häirintä ja uhkailu
  {
    text: 'Haluun harrastaa seksii sun kanssa',
    expected: 'ESTETTY (häirintä)'
  },
  {
    text: 'Lähetä tissikuvia niin näytän mun kyrpää',
    expected: 'ESTETTY (seksuaalinen häirintä)'
  },
  {
    text: 'Tapan sut jos et tuu tänne',
    expected: 'ESTETTY (uhkailu)'
  },
  {
    text: 'Vitun idiootti kuole pois',
    expected: 'ESTETTY (kiusaaminen)'
  },
  {
    text: 's.eksi',
    expected: 'ESTETTY (lyhyt, ei kontekstia)'
  },
  
  // TURVALLISIA
  {
    text: 'Moi! Miten menee?',
    expected: 'SALLITTU (normaali)'
  },
  {
    text: 'Onks sulla aikaa pelata?',
    expected: 'SALLITTU (normaali)'
  }
];

async function testSmartModeration() {
  console.log('🧠 ÄLYKÄS KONTEKSTIPOHJAINEN MODEROINTI:');
  console.log('==========================================\n');
  
  for (const test of testMessages) {
    const result = await smartModerationService.moderateContent(test.text, 'test-user');
    
    let status = '✅ SALLITTU';
    if (result.isBlocked) {
      status = '🚫 ESTETTY';
    } else if (result.isHarmful) {
      status = '⚠️ VAROITUS';
    }
    
    console.log(`📨 "${test.text}"`);
    console.log(`   ${status} - ${result.category} (luottamus: ${result.confidence})`);
    console.log(`   💭 Konteksti: ${result.context}`);
    console.log(`   🎯 Odotettu: ${test.expected}`);
    
    if (result.warningMessage) {
      console.log(`   💬 ${result.warningMessage}`);
    }
    console.log('');
  }
}

// Suorita testi
testSmartModeration()
  .then(() => {
    console.log('\n💡 ÄLYKKÄÄN MODEROINNIN EDUT:');
    console.log('✅ Ymmärtää kontekstin (terveyskasvatus vs. häirintä)');
    console.log('✅ Tunnistaa kiertotavat (s.eksi, s3ksi)');
    console.log('✅ Ei vaadi ulkoisia API-kutsuja');
    console.log('✅ Nopea ja luotettava');
    console.log('✅ Sallii asiallisen keskustelun');
    console.log('✅ Estää häirinnän ja uhkailun');
  })
  .catch(error => {
    console.error('❌ Virhe testeissä:', error);
  });