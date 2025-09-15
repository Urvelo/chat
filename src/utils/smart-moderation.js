// Älykäs moderointi ilman ulkoisia API-kutsuja
// Käyttää sääntöpohjaista logiikkaa kontekstin ymmärtämiseen

class SmartModerationService {
  constructor() {
    console.log('🧠 Alustetaan älykäs moderointi (offline)...');
    
    // Sallitut kontekstit - nämä ovat OK vaikka sisältäisi "seksuaalisia" sanoja
    this.allowedContexts = [
      // Terveyskysymykset
      /onko normaalia/i,
      /mitä tarkoittaa/i,
      /opettaja.*kerto/i,
      /tunnilla.*puhu/i,
      /biologian.*tunti/i,
      /terveystieto/i,
      /seksiopetus/i,
      /kondomi/i,
      /ehkäisy/i,
      
      // Kokemuksista kertominen (ei häirintä)
      /eka.*kerta/i,
      /ensimmäinen.*kerta/i,
      /oon.*kokenut/i,
      /kokeilin.*kerran/i,
      /tapahtui.*että/i,
      /mun.*kokemus/i,
      
      // Kysymykset ja pohdinta
      /mietin.*että/i,
      /kysyn.*että/i,
      /tietääkö.*joku/i,
      /onks.*kellään/i,
      /voiks.*joku.*auttaa/i,
      
      // Keskustelu yleisesti
      /kaveri.*sanoi/i,
      /kuulin.*että/i,
      /luet.*jossain/i,
      /netti.*sanoo/i
    ];
    
    // Epäilyttävät kontekstit - nämä viittaavat häirintään
    this.harmfulContexts = [
      // Suorat ehdotukset
      /haluan.*kanssa/i,
      /tuu.*tekee/i,
      /mennään.*johonkin/i,
      /tapaa.*jossain/i,
      
      // Kuvien pyyntö/lähettäminen
      /lähetä.*kuv/i,
      /näytä.*mulle/i,
      /ota.*kuva/i,
      /kuvaa.*itses/i,
      /tissikuv/i,
      /alastonkuv/i,
      
      // Uhkailu ja väkivalta
      /tapan.*sut/i,
      /lyön.*sua/i,
      /tule.*tänne.*tai/i,
      /jos.*et.*niin/i,
      
      // Kiusaaminen
      /vitun.*idiootti/i,
      /kuole.*pois/i,
      /oot.*niin.*ruma/i,
      /kukaan.*ei.*tykkää/i
    ];
    
    // Seksuaaliset sanat ja niiden variantit
    this.sexualTerms = [
      // Perusmuodot ja kiertotavat
      { word: 'seksi', variants: ['s.eksi', 's3ksi', 'sęksi', 'seks1', 'sεksi'] },
      { word: 'pano', variants: ['p.ano', 'p4no', 'pąno'] },
      { word: 'nussiminen', variants: ['n.ussiminen', 'nuss1minen'] },
      { word: 'penis', variants: ['p.enis', 'pεnis', 'pen1s'] },
      { word: 'vagina', variants: ['v.agina', 'vag1na'] },
      { word: 'kyrpä', variants: ['k.yrpä', 'kyřpä', 'kyrp4'] },
      { word: 'kulli', variants: ['k.ulli', 'kull1'] },
      { word: 'pillua', variants: ['p.illua', 'pill0a'] },
      { word: 'tissit', variants: ['t.issit', 't1ssit'] },
      { word: 'rinnat', variants: ['r.innat', 'r1nnat'] }
    ];
    
    console.log('✅ Älykäs moderointi valmis (offline)!');
  }
  
  // Pääfunktio: älykäs konteksti-pohjainen moderointi
  async moderateContent(text, userId = 'anonymous') {
    console.log(`🧠 Moderoidaan älykkäästi käyttäjälle ${userId}:`, text.substring(0, 50) + '...');
    
    const analysis = this.analyzeContext(text);
    
    const result = {
      isHarmful: analysis.isHarmful,
      isBlocked: analysis.shouldBlock,
      warningMessage: analysis.warningMessage,
      category: analysis.category,
      confidence: analysis.confidence,
      reasons: analysis.reasons,
      context: analysis.context
    };

    // Logga tulos
    if (result.isHarmful) {
      console.log(`⚠️ Haitallista sisältöä havaittu:`, {
        category: result.category,
        confidence: result.confidence,
        blocked: result.isBlocked,
        context: result.context
      });
    } else {
      console.log('✅ Sisältö on turvallista');
    }

    return result;
  }
  
  // Analysoi tekstin konteksti
  analyzeContext(text) {
    const lowerText = text.toLowerCase();
    
    // 1. Tarkista onko teksti selvästi haitallinen (uhkailu, kiusaaminen)
    for (const pattern of this.harmfulContexts) {
      if (pattern.test(text)) {
        return {
          isHarmful: true,
          shouldBlock: true,
          category: this.categorizeHarm(pattern),
          confidence: 0.9,
          warningMessage: this.getWarningMessage(this.categorizeHarm(pattern)),
          reasons: ['Haitallinen konteksti havaittu'],
          context: 'Uhkailu tai häirintä'
        };
      }
    }
    
    // 2. Etsi seksuaalisia termejä (mukaan lukien kiertotavat)
    const foundSexualTerms = this.findSexualTerms(text);
    
    if (foundSexualTerms.length === 0) {
      // Ei seksuaalisia termejä -> turvallinen
      return {
        isHarmful: false,
        shouldBlock: false,
        category: 'safe',
        confidence: 0.95,
        warningMessage: null,
        reasons: [],
        context: 'Ei haitallista sisältöä'
      };
    }
    
    // 3. Löytyi seksuaalisia termejä - tarkista konteksti
    for (const pattern of this.allowedContexts) {
      if (pattern.test(text)) {
        return {
          isHarmful: false,
          shouldBlock: false,
          category: 'educational',
          confidence: 0.8,
          warningMessage: null,
          reasons: ['Seksuaalisia termejä sallitussa kontekstissa'],
          context: 'Terveyskasvatus tai kokemusten jakaminen'
        };
      }
    }
    
    // 4. Seksuaalisia termejä ilman sallittua kontekstia
    // Tarkista viestin pituus ja tyyli
    if (text.length < 10) {
      // Lyhyt viesti seksuaalisilla termeillä -> todennäköisesti haitallinen
      return {
        isHarmful: true,
        shouldBlock: true,
        category: 'sexual',
        confidence: 0.8,
        warningMessage: '⚠️ Chatissa ei sallita seksuaalista sisältöä. Tämä on nuorille tarkoitettu palvelu.',
        reasons: ['Lyhyt viesti seksuaalisilla termeillä'],
        context: 'Todennäköisesti sopimatonta'
      };
    }
    
    // 5. Pidempi teksti - anna varoitus mutta älä estä
    return {
      isHarmful: true,
      shouldBlock: false,
      category: 'sexual',
      confidence: 0.6,
      warningMessage: '⚠️ Muista että chat on nuorille. Pidä keskustelu asiallisena.',
      reasons: ['Seksuaalisia termejä epäselvässä kontekstissa'],
      context: 'Mahdollisesti sopimatonta, varoitus annettu'
    };
  }
  
  // Etsi seksuaalisia termejä ja niiden variantteja
  findSexualTerms(text) {
    const found = [];
    const lowerText = text.toLowerCase();
    
    for (const term of this.sexualTerms) {
      // Tarkista perusmuoto
      if (lowerText.includes(term.word)) {
        found.push(term.word);
      }
      
      // Tarkista variantit
      for (const variant of term.variants) {
        if (lowerText.includes(variant.toLowerCase())) {
          found.push(variant);
        }
      }
    }
    
    return found;
  }
  
  // Määritä haitan kategoria
  categorizeHarm(pattern) {
    const patternStr = pattern.toString();
    
    if (patternStr.includes('tapan|lyön|tule.*tänne')) return 'violence';
    if (patternStr.includes('vitun|kuole|ruma')) return 'bullying';
    if (patternStr.includes('kuva|näytä|tissikuv')) return 'sexual';
    
    return 'mixed';
  }
  
  // Hae varoitusviesti kategorialle
  getWarningMessage(category) {
    const messages = {
      'violence': '⚠️ Väkivalta ja uhkailu ovat kiellettyjä. Käyttäydy asiallisesti.',
      'bullying': '⚠️ Kiusaaminen ei ole sallittua. Ole kiltti muita kohtaan.',
      'sexual': '⚠️ Seksuaalinen häirintä on kiellettyä. Tämä on nuorille tarkoitettu palvelu.',
      'mixed': '⚠️ Viestisi sisältää sopimatonta sisältöä. Ole hyvä ja käyttäydy asiallisesti.'
    };
    
    return messages[category] || messages['mixed'];
  }

  // Wrapper moderateMessage-funktiolle yhteensopivuuden vuoksi
  async moderateMessage(text, userId = 'anonymous') {
    return this.moderateContent(text, userId);
  }

  // Wrapper moderateImage-funktiolle
  async moderateImage(imageUrl, userId = 'anonymous') {
    console.log(`🖼️ Kuvan moderointi ei ole käytössä älykkäässä versiossa`);
    return {
      isHarmful: false,
      isBlocked: false,
      warningMessage: null,
      category: 'safe',
      confidence: 0.5,
      reasons: ['Kuvan moderointi ohitettu'],
      context: 'Kuva-analyysi ei käytössä'
    };
  }
}

// Luo globaali instanssi
const smartModerationService = new SmartModerationService();

export { smartModerationService };
export default SmartModerationService;