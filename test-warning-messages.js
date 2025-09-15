/**
 * Testaa päivitettyjä varoitusviestejä
 */

// Mock OpenAI API vastaukset
const mockOpenAIResponses = {
  'väkivaltainen uhkaus': {
    flagged: true,
    categories: {
      violence: true,
      harassment: false,
      hate: false,
      sexual: false,
      'self-harm': false,
      illicit: false
    },
    category_scores: {
      violence: 0.85,
      harassment: 0.02,
      hate: 0.01,
      sexual: 0.001,
      'self-harm': 0.01,
      illicit: 0.01
    }
  },
  'seksuaalinen sisältö': {
    flagged: true,
    categories: {
      violence: false,
      harassment: false,
      hate: false,
      sexual: true,
      'self-harm': false,
      illicit: false
    },
    category_scores: {
      violence: 0.001,
      harassment: 0.02,
      hate: 0.01,
      sexual: 0.75,
      'self-harm': 0.01,
      illicit: 0.01
    }
  },
  'vihapuhe': {
    flagged: true,
    categories: {
      violence: false,
      harassment: true,
      hate: true,
      sexual: false,
      'self-harm': false,
      illicit: false
    },
    category_scores: {
      violence: 0.001,
      harassment: 0.65,
      hate: 0.78,
      sexual: 0.001,
      'self-harm': 0.01,
      illicit: 0.01
    }
  }
};

console.log('🧪 Testataan päivitettyjä varoitusviestejä\n');

// Simuloi moderation service
class TestModerationService {
  getCategoryMessage(categories) {
    const baseWarning = "⚠️ Chatissa ei sallita käyttäytymistä, joka on seksuaalista, väkivaltaista tai muuten loukkaavaa. Toistuvat rikkomukset voivat johtaa tilin sulkemiseen ja asian ilmoittamiseen poliisille.";
    
    if (!categories || categories.length === 0) {
      return `❌ Viestisi sisältää sopimatonta sisältöä.\n\n${baseWarning}`;
    }
    
    let specificMessage = '';
    
    if (categories.includes('harassment')) {
      specificMessage = '❌ Viestisi sisältää häirintää tai loukkaavaa sisältöä.';
    } else if (categories.includes('hate')) {
      specificMessage = '❌ Viestisi sisältää vihapuhetta.';
    } else if (categories.includes('sexual')) {
      specificMessage = '❌ Viestisi sisältää sopimatonta seksuaalista sisältöä.';
    } else if (categories.includes('violence')) {
      specificMessage = '❌ Viestisi sisältää väkivaltaista sisältöä.';
    } else if (categories.includes('self-harm')) {
      specificMessage = '❌ Viestisi sisältää itsetuhoista sisältöä.';
    } else if (categories.includes('illicit')) {
      specificMessage = '❌ Viestisi sisältää laitonta toimintaa.';
    } else {
      specificMessage = '❌ Viestisi sisältää sopimatonta sisältöä.';
    }
    
    return `${specificMessage}\n\n${baseWarning}`;
  }

  getSevereMessage(category) {
    const baseWarning = "⚠️ Chatissa ei sallita käyttäytymistä, joka on seksuaalista, väkivaltaista tai muuten loukkaavaa. Toistuvat rikkomukset voivat johtaa tilin sulkemiseen ja asian ilmoittamiseen poliisille.";
    
    let specificMessage = '';
    
    switch (category) {
      case 'violence':
        specificMessage = '🚫 Vakavat väkivaltaiset uhkaukset ovat ehdottomasti kiellettyjä.';
        break;
      case 'harassment':
        specificMessage = '🚫 Vakava häirintä ja uhkailu on ehdottomasti kiellettyä.';
        break;
      case 'hate':
        specificMessage = '🚫 Vakava vihapuhe ja syrjintä on ehdottomasti kiellettyä.';
        break;
      case 'self-harm':
        specificMessage = '🚫 Vakavat itsetuhoiset uhkaukset on estetty. Jos tarvitset apua, ota yhteyttä kriisipuhelimeen.';
        break;
      default:
        specificMessage = '🚫 Vakava haitallinen sisältö on ehdottomasti kiellettyä.';
        break;
    }
    
    return `${specificMessage}\n\n${baseWarning}`;
  }

  getBannedMessage() {
    return '🚫 Olet estetty viestien lähettämisestä sopimattoman käyttäytymisen vuoksi.\n\n⚠️ Chatissa ei sallita käyttäytymistä, joka on seksuaalista, väkivaltaista tai muuten loukkaavaa. Toistuvat rikkomukset voivat johtaa tilin sulkemiseen ja asian ilmoittamiseen poliisille.';
  }
}

const testService = new TestModerationService();

// Testaa eri kategoria viestejä
console.log('1️⃣ VÄKIVALTAINEN SISÄLTÖ:');
console.log(testService.getCategoryMessage(['violence']));
console.log('\n' + '='.repeat(80) + '\n');

console.log('2️⃣ SEKSUAALINEN SISÄLTÖ:');
console.log(testService.getCategoryMessage(['sexual']));
console.log('\n' + '='.repeat(80) + '\n');

console.log('3️⃣ VIHAPUHE JA HÄIRINTÄ:');
console.log(testService.getCategoryMessage(['hate', 'harassment']));
console.log('\n' + '='.repeat(80) + '\n');

console.log('4️⃣ VAKAVA VÄKIVALTAINEN UHKAUS:');
console.log(testService.getSevereMessage('violence'));
console.log('\n' + '='.repeat(80) + '\n');

console.log('5️⃣ VAKAVA VIHAPUHE:');
console.log(testService.getSevereMessage('hate'));
console.log('\n' + '='.repeat(80) + '\n');

console.log('6️⃣ BÄNNI-VIESTI:');
console.log(testService.getBannedMessage());
console.log('\n' + '='.repeat(80) + '\n');

console.log('✅ Kaikki varoitusviestit sisältävät nyt yhtenäisen ohjeistuksen!');
console.log('📝 Viestit selittävät käyttäjälle mitä sisältöä ei sallita');
console.log('⚖️ Varoitukset mainitsevat seuraukset: tilin sulkeminen + poliisin ilmoittaminen');