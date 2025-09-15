// Testi: Herkempi moderation "tapan sut" kanssa
// Nyt pitäisi antaa varoitus!

console.log('🧪 Testataan herkempää moderationia...\n');

async function testSensitiveModeration() {
  try {
    // Lataa päivitetty moderation service
    const { moderationService } = await import('/src/utils/moderation.js');
    
    console.log('🔍 Testataan: "tapan sut"');
    
    const result = await moderationService.moderateMessage('test-user-sensitive', 'tapan sut');
    
    console.log('📊 TULOS:');
    console.log('  Action:', result.action);
    console.log('  Reason:', result.reason);
    console.log('  Warning:', result.warning || 'Ei varoitusta');
    console.log('  Confidence:', result.confidence?.toFixed(4) || 'N/A');
    
    if (result.warning) {
      console.log('\n✅ TOIMII! Herkempi moderation antoi varoituksen!');
    } else {
      console.log('\n❌ Ei varoitusta. Tarkista kynnysarvot.');
    }
    
    // Testaa myös muita heikkoja signaaleja
    console.log('\n🔍 Testataan muita heikkoja signaaleja:');
    
    const testCases = [
      'vittu',
      'paska',
      'Olet tyhmä',
      'en pidä sinusta'
    ];
    
    for (const testText of testCases) {
      const testResult = await moderationService.moderateMessage(`test-user-${testText}`, testText);
      console.log(`"${testText}" -> ${testResult.warning ? '⚠️ ' + testResult.warning : '✅ Ei varoitusta'}`);
    }
    
  } catch (error) {
    console.error('❌ Virhe testissä:', error);
  }
}

testSensitiveModeration();