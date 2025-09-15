// Quick test - tarkista että moderation toimii chatissa
console.log('🔧 Chat Moderation - Nopea testi');

// Testaa että moderation service on ladattu
setTimeout(async () => {
  try {
    console.log('📡 Tarkistetaan moderation service...');
    
    // Kokeile importata suoraan
    const { moderationService } = await import('/src/utils/moderation.js');
    console.log('✅ ModerationService ladattu:', !!moderationService);
    
    // Testaa nopea moderation
    const testResult = await moderationService.moderateMessage('quick-test', 'tapan sut');
    console.log('🧪 "tapan sut" testi:', testResult);
    
    if (testResult.warning || testResult.action === 'block') {
      console.log('✅ MODERATION TOIMII! Löysi: ', testResult.action, testResult.warning);
    } else {
      console.log('❌ Moderation ei huomannut "tapan sut"');
    }
    
    // Testaa vakava uhkaus
    const severeTest = await moderationService.moderateMessage('severe-test', 'tapan sinut');
    console.log('🚫 "tapan sinut" testi:', severeTest);
    
    if (severeTest.action === 'block') {
      console.log('✅ VAKAVA UHKAUS ESTETTY!');
    } else {
      console.log('❌ Vakava uhkaus ei estetty');
    }
    
  } catch (error) {
    console.error('❌ Virhe moderation testissä:', error);
  }
}, 2000);

console.log('💡 Testit alkavat 2 sekunnin kuluttua...');