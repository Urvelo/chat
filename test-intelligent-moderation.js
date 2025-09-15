// Testi älykäs vs. yksinkertainen moderointi
import { simpleModerationService } from './src/utils/simple-moderation.js';

console.log('🧪 Testataan eri moderointitapoja...\n');

// Testattavat viestit
const testMessages = [
  // Sallittuja viestejä (kontekstipohjaisia)
  'Oon 16v ja mietin että onko normaalia jos ei oo viel kokeillu seksii?',
  'Opettaja kerto biologian tunnilla s.eksistä ja jäi kysymyksiä',
  'Onks seksuaalikasvatuksessa kerrottu teille kondomeista?',
  'Eka kerta oli vähän nolo mut ok kokemus',
  
  // Estettäviä viestejä
  'Haluun harrastaa s.eksiä sun kanssa',
  'Lähetä tissikuvia niin näytän mun k.yrpää',
  'Tapan sut jos et tuu tänne',
  'Vitun idiootti kuole pois',
  
  // Rajatapauksia
  's3ksi on kivaa',
  'Moi 😊',
  'Mun kaveri sanoi et vittu kun sattuu'
];

async function testSimpleModeration() {
  console.log('📝 YKSINKERTAINEN MODEROINTI (sanalista):');
  console.log('=====================================\n');
  
  for (const message of testMessages) {
    const result = await simpleModerationService.moderateContent(message, 'test-user');
    
    console.log(`📨 "${message}"`);
    console.log(`   ${result.isBlocked ? '🚫 ESTETTY' : '✅ SALLITTU'} - ${result.category || 'safe'} (${result.confidence})`);
    if (result.warningMessage) {
      console.log(`   💬 ${result.warningMessage}`);
    }
    console.log('');
  }
}

// Suorita testi
testSimpleModeration()
  .then(() => {
    console.log('\n💡 HUOMIOT:');
    console.log('- Yksinkertainen moderointi perustuu sanalistoihin');
    console.log('- Se ei ymmärrä kontekstia tai kiertotapoja hyvin');
    console.log('- Älykäs moderointi tarvitsisi OpenAI API:n toimiakseen');
    console.log('\n🔧 OpenAI-pohjainen moderointi vaatisi:');
    console.log('1. OpenAI API avaimen');
    console.log('2. Internet-yhteyden');
    console.log('3. API-kutsukustannukset (~$0.0001 per viesti)');
  })
  .catch(error => {
    console.error('❌ Virhe testeissä:', error);
  });