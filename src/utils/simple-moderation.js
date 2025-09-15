// Yksinkertainen ja nopea sanalista-pohjainen moderointi
// Ei vaadi ulkoisia API-kutsuja, toimii heti

class SimpleModerationService {
  constructor() {
    console.log('🛡️ Alustetaan yksinkertainen moderointi...');
    
    // Seksuaalisen sisällön sanat (suomeksi ja englanniksi)
    this.sexualWords = [
      // Suomeksi - vahvat
      'seksi', 'pano', 'nussiminen', 'vittu', 'mulkku', 'kyrpä', 'penis', 'vagina',
      'orgasmi', 'masturbointi', 'runkkaus', 'pillua', 'kulli', 'tissit', 'rinnat',
      
      // Suomeksi - keskivahvat  
      'rakastelu', 'intiimi', 'eroottinen', 'likainen', 'ruma',
      
      // Englanniksi - vahvat
      'sex', 'fuck', 'dick', 'cock', 'pussy', 'boobs', 'tits', 'ass', 'porn',
      'masturbat', 'orgasm', 'nude', 'naked', 'horny', 'cum', 'blowjob',
      
      // Lievemmät mutta epäsopivat nuorille
      'hot', 'sexy', 'babe', 'daddy', 'mommy'
    ];
    
    // Väkivaltainen sisältö
    this.violenceWords = [
      // Suomeksi
      'tapan', 'tappaa', 'kuolla', 'kuole', 'murha', 'väkivalta', 'lyön', 'hakkaan',
      'verta', 'kuolema', 'ampua', 'ammun', 'puukko', 'ase',
      
      // Englanniksi
      'kill', 'murder', 'death', 'die', 'blood', 'violence', 'shoot', 'gun',
      'knife', 'bomb', 'attack', 'hurt', 'pain', 'destroy'
    ];
    
    // Kiusaaminen ja uhkailu
    this.bullyingWords = [
      // Suomeksi
      'tyhmä', 'idiootti', 'homo', 'lesbo', 'nörtti', 'ruma', 'läski', 'laiha',
      'vitun', 'saatanan', 'paska', 'kiusaan', 'uhkaan', 'pelkää',
      
      // Englanniksi  
      'stupid', 'idiot', 'ugly', 'fat', 'hate', 'loser', 'freak', 'weird',
      'bully', 'threat', 'afraid', 'scare'
    ];
    
    // Huumeet ja alkoholi
    this.substanceWords = [
      'huumeet', 'kama', 'pilvi', 'kannabis', 'marijuana', 'kokaiini', 'amfetamiini',
      'ecstasy', 'mdma', 'lsd', 'alkoholi', 'viina', 'juoppo', 'kännissä',
      'drugs', 'weed', 'cocaine', 'heroin', 'drunk', 'alcohol', 'beer', 'wine'
    ];

    console.log('✅ Yksinkertainen moderointi valmis!');
  }

  // Pääfunktio: tarkistaa onko sisältö sopivaa
  async moderateContent(text, userId = 'anonymous') {
    console.log(`🔍 Moderoidaan sisältö käyttäjälle ${userId}:`, text.substring(0, 50) + '...');
    
    const lowerText = text.toLowerCase();
    const result = {
      isHarmful: false,
      isBlocked: false,
      warningMessage: null,
      category: null,
      confidence: 0,
      reasons: []
    };

    // Tarkista seksuaalinen sisältö
    const sexualMatch = this.checkCategory(lowerText, this.sexualWords, 'sexual');
    if (sexualMatch.found) {
      result.isHarmful = true;
      result.category = 'sexual';
      result.confidence = sexualMatch.confidence;
      result.reasons.push('Seksuaalista sisältöä');
      result.warningMessage = '⚠️ Chatissa ei sallita seksuaalista sisältöä. Tämä on nuorille tarkoitettu palvelu.';
      result.isBlocked = sexualMatch.confidence > 0.7; // Blokataan vahvat tapaukset
    }

    // Tarkista väkivalta
    const violenceMatch = this.checkCategory(lowerText, this.violenceWords, 'violence');
    if (violenceMatch.found && violenceMatch.confidence > sexualMatch.confidence) {
      result.isHarmful = true;
      result.category = 'violence';
      result.confidence = violenceMatch.confidence;
      result.reasons.push('Väkivaltaista sisältöä');
      result.warningMessage = '⚠️ Chatissa ei sallita väkivaltaista sisältöä tai uhkailua.';
      result.isBlocked = violenceMatch.confidence > 0.8; // Blokataan vakavat uhkaukset
    }

    // Tarkista kiusaaminen
    const bullyingMatch = this.checkCategory(lowerText, this.bullyingWords, 'bullying');
    if (bullyingMatch.found && bullyingMatch.confidence > result.confidence) {
      result.isHarmful = true;
      result.category = 'bullying';
      result.confidence = bullyingMatch.confidence;
      result.reasons.push('Kiusaamista tai haukkumista');
      result.warningMessage = '⚠️ Ole kiltti muita kohtaan. Kiusaaminen ei ole sallittua.';
      result.isBlocked = bullyingMatch.confidence > 0.9; // Blokataan vain vakavat tapaukset
    }

    // Tarkista päihteet
    const substanceMatch = this.checkCategory(lowerText, this.substanceWords, 'substance');
    if (substanceMatch.found && substanceMatch.confidence > result.confidence) {
      result.isHarmful = true;
      result.category = 'substance';
      result.confidence = substanceMatch.confidence;
      result.reasons.push('Päihteiden käyttöä');
      result.warningMessage = '⚠️ Chatissa ei puhuta huumeista tai alkoholista.';
      result.isBlocked = substanceMatch.confidence > 0.8;
    }

    // Logga tulos
    if (result.isHarmful) {
      console.log(`⚠️ Haitallista sisältöä havaittu:`, {
        category: result.category,
        confidence: result.confidence,
        blocked: result.isBlocked,
        reasons: result.reasons
      });
    } else {
      console.log('✅ Sisältö on turvallista');
    }

    return result;
  }

  // Apufunktio: tarkistaa yhtä kategoriaa
  checkCategory(text, wordList, categoryName) {
    let maxConfidence = 0;
    let foundWords = [];

    for (const word of wordList) {
      if (text.includes(word)) {
        foundWords.push(word);
        
        // Laske luottamustaso sanan perusteella
        let confidence = 0.5; // Perustaso
        
        // Vahvemmat sanat saavat korkeamman pisteen
        if (word.length >= 6) confidence += 0.2;
        if (this.isExactMatch(text, word)) confidence += 0.3;
        if (this.isStrongWord(word, categoryName)) confidence += 0.2;
        
        maxConfidence = Math.max(maxConfidence, confidence);
      }
    }

    return {
      found: foundWords.length > 0,
      confidence: Math.min(maxConfidence, 1.0),
      words: foundWords
    };
  }

  // Tarkistaa onko sana täsmälleen tekstissä (ei osa toista sanaa)
  isExactMatch(text, word) {
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    return regex.test(text);
  }

  // Määrittää onko sana "vahva" kyseisessä kategoriassa
  isStrongWord(word, category) {
    const strongWords = {
      sexual: ['seksi', 'pano', 'fuck', 'porn', 'masturbat'],
      violence: ['tapan', 'murha', 'kill', 'murder', 'ampua'],
      bullying: ['vitun', 'idiootti', 'stupid', 'hate'],
      substance: ['huumeet', 'kama', 'drugs', 'cocaine']
    };
    
    return strongWords[category]?.includes(word) || false;
  }

  // Wrapper moderateMessage-funktiolle yhteensopivuuden vuoksi
  async moderateMessage(text, userId = 'anonymous') {
    return this.moderateContent(text, userId);
  }

  // Wrapper moderateImage-funktiolle
  async moderateImage(imageUrl, userId = 'anonymous') {
    console.log(`🖼️ Kuvan moderointi ei ole käytössä yksinkertaisessa versiossa`);
    return {
      isHarmful: false,
      isBlocked: false,
      warningMessage: null,
      category: null,
      confidence: 0,
      reasons: ['Kuvan moderointi ohitettu']
    };
  }
}

// Luo globaali instanssi
const simpleModerationService = new SimpleModerationService();

export { simpleModerationService };
export default SimpleModerationService;