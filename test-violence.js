// Testi: "tapan sut" moderation
// Testataan onko OpenAI tunnistaa tämän väkivaltaiseksi

const testText = "tapan sut";

console.log('🧪 Testataan tekstiä:', testText);

fetch('http://127.0.0.1:5001/chat-d8df8/europe-west1/moderateText', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    data: {
      text: testText,
      userId: 'violence-test-user'
    }
  })
})
.then(response => response.json())
.then(result => {
  console.log('\n📊 MODERATION TULOS:');
  console.log('Text:', testText);
  console.log('Flagged:', result.result?.isHarmful);
  console.log('Categories:', result.result?.flaggedCategories);
  console.log('Violence score:', result.result?.categoryScores?.violence);
  console.log('Harassment score:', result.result?.categoryScores?.harassment);
  
  if (result.result?.isHarmful) {
    console.log('✅ OpenAI TUNNISTI väkivaltaisen sisällön!');
  } else {
    console.log('❌ OpenAI EI tunnista tätä haitalliseksi');
    console.log('💡 Syy: Lyhyt slang ei välttämättä trigger moderationia');
  }
})
.catch(error => {
  console.error('❌ Virhe testissä:', error);
});