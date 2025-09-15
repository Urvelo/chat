// Browser Console Test - Herkempi moderation
console.log('🧪 HERKEMPI MODERATION TESTI');

// Funktio joka testaa herkemmän moderation toimivuuden
window.testSensitiveModerationInBrowser = async function() {
  console.log('\n🔍 Testataan herkempää moderationia...');
  
  try {
    const moderationService = window.moderationService;
    
    if (!moderationService) {
      console.error('❌ ModerationService ei ladattu');
      return;
    }
    
    console.log('\n📝 Testi 1: "tapan sut"');
    const result1 = await moderationService.moderateMessage('sensitive-test-1', 'tapan sut');
    console.log('  Action:', result1.action);
    console.log('  Warning:', result1.warning || 'Ei varoitusta');
    
    console.log('\n📝 Testi 2: "Olet tyhmä"');
    const result2 = await moderationService.moderateMessage('sensitive-test-2', 'Olet tyhmä');
    console.log('  Action:', result2.action);
    console.log('  Warning:', result2.warning || 'Ei varoitusta');
    
    console.log('\n📝 Testi 3: "vittu"');
    const result3 = await moderationService.moderateMessage('sensitive-test-3', 'vittu');
    console.log('  Action:', result3.action);
    console.log('  Warning:', result3.warning || 'Ei varoitusta');
    
    if (result1.warning || result2.warning || result3.warning) {
      console.log('\n✅ HERKEMPI MODERATION TOIMII! Varoituksia annetaan!');
    } else {
      console.log('\n⚠️ Herkempi moderation ei toimi vielä. Tarkista kynnysarvot.');
    }
    
  } catch (error) {
    console.error('❌ Virhe testissä:', error);
  }
};

console.log('\n💡 Suorita browser console:ssa: testSensitiveModerationInBrowser()');

// Testaa myös suoraan OpenAI API:a matalamilla arvoilla
window.testDirectAPIScores = async function() {
  console.log('\n🔬 Suora OpenAI API testi - katsotaan tarkat arvot:');
  
  const testTexts = ['tapan sut', 'vittu', 'Olet tyhmä', 'en pidä sinusta'];
  
  for (const text of testTexts) {
    try {
      const response = await fetch('http://127.0.0.1:5001/chat-d8df8/europe-west1/moderateText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            text: text,
            userId: 'api-test'
          }
        })
      });
      
      const result = await response.json();
      const data = result.result;
      
      console.log(`\n"${text}":`);
      console.log(`  Violence: ${(data.categoryScores?.violence || 0).toFixed(5)}`);
      console.log(`  Harassment: ${(data.categoryScores?.harassment || 0).toFixed(5)}`);
      console.log(`  Hate: ${(data.categoryScores?.hate || 0).toFixed(5)}`);
      console.log(`  Sexual: ${(data.categoryScores?.sexual || 0).toFixed(5)}`);
      
    } catch (error) {
      console.error(`❌ Virhe tekstille "${text}":`, error);
    }
  }
};

console.log('💡 Voit myös testata: testDirectAPIScores()');