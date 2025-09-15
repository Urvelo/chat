// Testi simple-moderation.js:lle
import { simpleModerationService } from './src/utils/simple-moderation.js';

console.log('🧪 Testataan moderation-palvelua...');

async function testModeration() {
  try {
    const result1 = await simpleModerationService.moderateContent('moi', 'test-user');
    console.log('Test 1 (moi):', result1);
    
    const result2 = await simpleModerationService.moderateContent('seksi', 'test-user');
    console.log('Test 2 (seksi):', result2);
    
    console.log('✅ Testit suoritettu!');
  } catch (error) {
    console.error('❌ Virhe testeissä:', error);
  }
}

testModeration();