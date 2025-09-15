// Testi: Päivitetyt kynnysarvot
console.log('🧪 Testataan päivitettyjä kynnysarvoja...\n');

// Simuloidaan checkSuspiciousContent funktio
function checkSuspiciousContent(categoryScores) {
  const warnings = [];
  
  const thresholds = {
    violence: 0.0005,     // "tapan sut" = 0.001208 ✅ 
    harassment: 0.01,     // "olet ruma" = 0.056343 ✅
    hate: 0.001,          // "olet ruma" = 0.035133 ✅  
    sexual: 0.002,        // "tapan sut" = 0.003054 ✅
    'self-harm': 0.001,
    illicit: 0.01
  };
  
  Object.entries(thresholds).forEach(([category, threshold]) => {
    const score = categoryScores[category] || 0;
    
    if (score > threshold) {
      const percentage = (score * 100).toFixed(2);
      warnings.push(`${category}: ${percentage}%`);
    }
  });
  
  return warnings;
}

// Testaa arvot jotka saimme OpenAI:lta
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
  const warnings = checkSuspiciousContent(testCase.scores);
  console.log(`"${testCase.text}"`);
  
  if (warnings.length > 0) {
    console.log(`  ⚠️ VAROITUKSET: ${warnings.join(', ')}`);
  } else {
    console.log(`  ✅ Ei varoituksia`);
  }
  console.log('');
});

console.log('🔄 Lataa sivu uudestaan testaamaan päivitettyjä arvoja!');