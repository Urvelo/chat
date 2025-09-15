// Testi: Vakavat uhkaukset - "tapan sinut" pitäisi estää suoraan
console.log('🧪 Testataan vakavien uhkausten tunnistusta...\n');

// Simuloi päivitetty checkSuspiciousContent
function checkSuspiciousContent(categoryScores) {
  const warnings = [];
  let severe = false;
  let severeCategory = null;
  
  const thresholds = {
    violence: 0.0005,
    harassment: 0.01,
    hate: 0.001,
    sexual: 0.002,
    'self-harm': 0.001,
    illicit: 0.01
  };
  
  const severeThresholds = {
    violence: 0.05,       // "tapan sinut" = 0.082712 ✅ -> ESTO
    harassment: 0.1,
    hate: 0.1,
    'self-harm': 0.05
  };
  
  // Tarkista vakavat uhkaukset ensin
  Object.entries(severeThresholds).forEach(([category, threshold]) => {
    const score = categoryScores[category] || 0;
    
    if (score > threshold) {
      severe = true;
      severeCategory = category;
      const percentage = (score * 100).toFixed(1);
      console.log(`🚫 VAKAVA UHKAUS: ${category} ${percentage}%`);
    }
  });
  
  if (severe) {
    return { warnings: [], severe: true, severeCategory: severeCategory };
  }
  
  // Normaali varoitustaso
  Object.entries(thresholds).forEach(([category, threshold]) => {
    const score = categoryScores[category] || 0;
    
    if (score > threshold) {
      const percentage = (score * 100).toFixed(2);
      warnings.push(`${category}: ${percentage}%`);
    }
  });
  
  return { warnings: warnings, severe: false, severeCategory: null };
}

// Testaa arvot
const testCases = [
  {
    text: 'tapan sut',
    scores: { violence: 0.001208, harassment: 0.000017, hate: 0.000011, sexual: 0.003054 }
  },
  {
    text: 'tapan sinut', 
    scores: { violence: 0.082712, harassment: 0.028399, hate: 0.001219, sexual: 0.020005 }
  },
  {
    text: 'olet ruma',
    scores: { violence: 0.000498, harassment: 0.056343, hate: 0.035133, sexual: 0.000819 }
  }
];

testCases.forEach(testCase => {
  const result = checkSuspiciousContent(testCase.scores);
  console.log(`"${testCase.text}"`);
  
  if (result.severe) {
    console.log(`  🚫 VAKAVA UHKAUS -> ESTETÄÄN SUORAAN`);
    console.log(`  Kategoria: ${result.severeCategory}`);
  } else if (result.warnings.length > 0) {
    console.log(`  ⚠️ VAROITUKSET: ${result.warnings.join(', ')}`);
  } else {
    console.log(`  ✅ Ei varoituksia`);
  }
  console.log('');
});

console.log('📊 YHTEENVETO:');
console.log('  "tapan sut" -> Varoitus');
console.log('  "tapan sinut" -> ESTETÄÄN (8.27% violence > 5.0%)');
console.log('  "olet ruma" -> Varoitus');
console.log('\n🔄 Lataa sivu uudestaan testaamaan!');