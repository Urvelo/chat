import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getApp } from 'firebase/app';

// Turvallinen Firebase Functions moderation API
class ModerationService {
  constructor() {
    // Firebase Functions alustus - määritä oikea region
    const app = getApp();
    this.functions = getFunctions(app, 'europe-west1');
    
    // Jos kehitysympäristössä, yhdistä emulatoriin
    if (import.meta.env.DEV && false) { // Väliaikaisesti disabloitu CORS-ongelmien vuoksi
      try {
        connectFunctionsEmulator(this.functions, '127.0.0.1', 5001);
        console.log('🔧 Yhdistetty Firebase Functions emulatoriin (127.0.0.1:5001)');
      } catch (error) {
        console.log('⚠️ Functions emulator ei käytössä, käytetään live Firebase');
      }
    } else {
      console.log('🌐 Käytetään live Firebase Functions (europe-west1)');
    }
    
    // Käyttäjien moderation historia (session aikana)
    this.userViolations = new Map(); // userId -> {count: number, violations: array}
    this.bannedUsers = new Set(); // userId lista bännatyistä käyttäjistä
    
    // Esiladatut callable functions - VARMISTETAAN että ne toimivat
    this.initializeFunctions();
    
    console.log('🛡️ ModerationService alustettu Firebase Functions kanssa');
  }

  /**
   * Alustaa Firebase Functions - varmistaa yhteyden toimivuuden
   */
  async initializeFunctions() {
    try {
      // Luo callable functions
      this.moderateTextFn = httpsCallable(this.functions, 'moderateText');
      this.moderateImageFn = httpsCallable(this.functions, 'moderateImage');
      this.moderateContentFn = httpsCallable(this.functions, 'moderateContent');
      
      console.log('✅ Firebase Functions callables luotu onnistuneesti');
      
      // Testaa yhteys pienellä dummy-kutsulla
      if (import.meta.env.DEV) {
        this.testConnection();
      }
      
    } catch (error) {
      console.error('❌ Virhe Firebase Functions alustuksessa:', error);
      // Älä kaada sovellusta, jatka ilman moderationia
      this.functionsAvailable = false;
    }
  }

  /**
   * Testaa Functions yhteys
   */
  async testConnection() {
    try {
      console.log('� Testataan Firebase Functions yhteyttä...');
      
      const result = await this.moderateTextFn({
        text: 'hello test',
        userId: 'test-connection'
      });
      
      console.log('✅ Firebase Functions yhteys toimii!', result.data);
      this.functionsAvailable = true;
      
    } catch (error) {
      console.warn('⚠️ Firebase Functions ei saatavilla:', error.message);
      this.functionsAvailable = false;
    }
  }

  /**
   * Varmistettu moderation tekstille - FAIL SAFE
   */
  async moderateTextSafe(text, userId = 'anonymous') {
    // Perus validointi
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return { 
        isHarmful: false, 
        categories: {}, 
        flaggedCategories: [],
        source: 'validation'
      };
    }

    try {
      console.log(`🔍 Moderoidaan teksti käyttäjälle ${userId}:`, text.substring(0, 50) + '...');

      // Tarkista onko Functions käytössä
      if (this.functionsAvailable === false) {
        console.warn('⚠️ Firebase Functions ei käytössä - yritetään silti kutsua');
        // Älä salli automaattisesti, vaan yritä kutsu
      }

      // Kutsu Firebase Function
      const result = await this.moderateTextFn({
        text: text.trim(),
        userId: userId
      });

      const data = result.data;
      
      console.log('📊 Moderation tulos:', {
        flagged: data.isHarmful,
        categories: data.flaggedCategories || [],
        confidence: data.confidence?.toFixed(3) || 'N/A'
      });

      return {
        isHarmful: data.isHarmful || false,
        categories: data.categories || {},
        categoryScores: data.categoryScores || {},
        flaggedCategories: data.flaggedCategories || [],
        confidence: data.confidence || 0,
        source: 'firebase-functions'
      };

    } catch (error) {
      console.error('❌ Virhe text moderation:ssa:', error);
      
      // FAIL SAFE: Jos moderation epäonnistuu, salli sisältö
      // Tämä estää chatin kaatumisen API-ongelmissa
      return { 
        isHarmful: false, 
        categories: {}, 
        flaggedCategories: [],
        source: 'error-fallback',
        error: error.message
      };
    }
  }

  /**
   * Varmistettu moderation kuville - FAIL SAFE
   */
  async moderateImageSafe(imageUrl, userId = 'anonymous') {
    if (!imageUrl || typeof imageUrl !== 'string') {
      return { 
        isHarmful: false, 
        categories: {}, 
        flaggedCategories: [],
        source: 'validation'
      };
    }

    try {
      console.log(`🖼️ Moderoidaan kuva käyttäjälle ${userId}`);

      // Tarkista onko Functions käytössä
      if (this.functionsAvailable === false) {
        console.warn('⚠️ Firebase Functions ei käytössä - yritetään silti kutsua');
        // Älä salli automaattisesti, vaan yritä kutsu
      }

      const result = await this.moderateImageFn({
        imageUrl: imageUrl,
        userId: userId
      });

      const data = result.data;
      
      console.log('📊 Kuva moderation tulos:', {
        flagged: data.isHarmful,
        categories: data.flaggedCategories || []
      });

      return {
        isHarmful: data.isHarmful || false,
        categories: data.categories || {},
        categoryScores: data.categoryScores || {},
        flaggedCategories: data.flaggedCategories || [],
        confidence: data.confidence || 0,
        source: 'firebase-functions'
      };

    } catch (error) {
      console.error('❌ Virhe image moderation:ssa:', error);
      
      // FAIL SAFE: Salli kuva jos moderation epäonnistuu
      return { 
        isHarmful: false, 
        categories: {}, 
        flaggedCategories: [],
        source: 'error-fallback',
        error: error.message
      };
    }
  }

  /**
   * Tarkistaa onko käyttäjä bännatty
   * @param {string} userId - Käyttäjän ID
   * @returns {boolean}
   */
  isUserBanned(userId) {
    return this.bannedUsers.has(userId);
  }

  /**
   * Lisää rikkomus käyttäjälle
   * @param {string} userId - Käyttäjän ID
   * @param {object} violation - Rikkomus tiedot
   * @returns {number} - Rikkomusten määrä
   */
  addViolation(userId, violation) {
    if (!this.userViolations.has(userId)) {
      this.userViolations.set(userId, { count: 0, violations: [] });
    }
    
    const userViolations = this.userViolations.get(userId);
    userViolations.count++;
    userViolations.violations.push({
      ...violation,
      timestamp: Date.now()
    });
    
    console.log(`⚠️ Käyttäjä ${userId} rikkomus #${userViolations.count}:`, violation);
    
    // Kolmas rikkomus = bänni
    if (userViolations.count >= 3) {
      this.bannedUsers.add(userId);
      console.log(`🚫 Käyttäjä ${userId} bännatty! (3 rikkeitä)`);
    }
    
    return userViolations.count;
  }

  /**
   * PÄÄMESTARI FUNKTIO - Moderoi viestiä käyttäjäkohtaisilla portailla
   * 1. viesti: menee läpi vaikka olisi seksuaalista
   * 2. viesti: sumennetaan jos seksuaalista
   * 3. viesti: bänni jos mitään haitallista
   * @param {string} userId - Käyttäjän ID
   * @param {string} text - Viesti teksti (optional)
   * @param {string} imageUrl - Kuvan URL (optional)
   * @returns {Promise<{action: 'allow'|'blur'|'block', message?: string, isBlurred?: boolean}>}
   */
  async moderateMessage(userId, text = null, imageUrl = null) {
    try {
      // Tarkista onko käyttäjä bännatty
      if (this.isUserBanned(userId)) {
        return {
          action: 'block',
          message: '🚫 Olet estetty viestien lähettämisestä sopimattoman käyttäytymisen vuoksi.',
          reason: 'user-banned'
        };
      }

      // Jos ei sisältöä, salli
      if (!text && !imageUrl) {
        return { action: 'allow', reason: 'no-content' };
      }

      console.log(`🔍 Moderoidaan sisältö käyttäjälle ${userId}:`, {
        hasText: !!text,
        hasImage: !!imageUrl,
        violations: this.getUserViolationCount(userId)
      });

      // Moderoi sisältö turvallisesti
      let modResult;
      
      if (text && imageUrl) {
        // Molemmat: käytä kombinoitua moderationia
        modResult = await this.moderateContentSafe(text, imageUrl, userId);
      } else if (text) {
        // Vain teksti
        modResult = await this.moderateTextSafe(text, userId);
      } else if (imageUrl) {
        // Vain kuva
        modResult = await this.moderateImageSafe(imageUrl, userId);
      }
      
      // Jos moderation epäonnistui kokonaan, salli sisältö
      if (!modResult || modResult.source === 'error-fallback') {
        console.warn('⚠️ Moderation epäonnistui, sallitaan sisältö turvallisuussyistä');
        return { 
          action: 'allow', 
          reason: 'moderation-failed',
          warning: modResult?.error || 'Moderation ei saatavilla'
        };
      }
      
      // HERKEMPI MODERATION - Tarkista myös matalat signaalit
      const categoryScores = modResult.categoryScores || {};
      const suspiciousCheck = this.checkSuspiciousContent(categoryScores);
      
      // Jos on vakava uhkaus, estä suoraan riippumatta rikkomushistoriasta
      if (suspiciousCheck.severe) {
        this.addViolation(userId, {
          type: 'severe_threat',
          categories: [suspiciousCheck.severeCategory],
          content: text?.substring(0, 100) || '[kuva]',
          confidence: modResult.confidence,
          severity: 'high'
        });
        
        console.log(`🚫 VAKAVA UHKAUS estetty käyttäjältä ${userId}: ${suspiciousCheck.severeCategory}`);
        
        return {
          action: 'block',
          message: this.getSevereMessage(suspiciousCheck.severeCategory),
          reason: 'severe-threat',
          severity: 'high'
        };
      }
      
      // Jos sisältö on turvallista OpenAI:n mukaan, mutta on epäilyttäviä signaaleja
      if (!modResult.isHarmful) {
        if (suspiciousCheck.warnings.length > 0) {
          console.log(`⚠️ Heikot signaalit käyttäjälle ${userId}:`, suspiciousCheck.warnings);
          return { 
            action: 'allow', 
            reason: 'content-safe-with-warning',
            confidence: modResult.confidence,
            warning: `⚠️ Huom: ${suspiciousCheck.warnings.join(', ')}`
          };
        }
        
        return { 
          action: 'allow', 
          reason: 'content-safe',
          confidence: modResult.confidence 
        };
      }

      // SISÄLTÖ ON HAITALLISTA - sovella portaat
      const violationCount = this.getUserViolationCount(userId);
      const flaggedCategories = modResult.flaggedCategories || [];

      console.log(`⚠️ Käyttäjä ${userId} - rikkomus #${violationCount + 1}:`, {
        categories: flaggedCategories,
        confidence: modResult.confidence?.toFixed(3)
      });

      // PORRAS 1: Ensimmäinen viesti - anna anteeksi jos VAIN seksuaalista
      if (violationCount === 0) {
        const onlySexual = this.isOnlySexualContent(flaggedCategories);
        
        if (onlySexual) {
          console.log('📝 PORRAS 1: Ensimmäinen viesti, vain seksuaalista - sallitaan');
          return { 
            action: 'allow', 
            reason: 'first-sexual-forgiven',
            warning: '⚠️ Huom: Seksuaalinen sisältö ei ole toivottua' 
          };
        } else {
          // Muut kategoriat - lisää rikkomus ja estä
          this.addViolation(userId, {
            type: 'harmful_content',
            categories: flaggedCategories,
            content: text?.substring(0, 100) || '[kuva]',
            confidence: modResult.confidence
          });
          
          return {
            action: 'block',
            message: this.getCategoryMessage(flaggedCategories),
            reason: 'first-violation-harmful'
          };
        }
      }

      // PORRAS 2: Toinen viesti - sumentaa seksuaalisen sisällön
      if (violationCount === 1) {
        const isSexual = this.isSexualContent(flaggedCategories);
        
        if (isSexual && flaggedCategories.length <= 2) { // Maksimissaan 2 kategoriaa, molemmat seksuaalisia
          this.addViolation(userId, {
            type: 'sexual_content_blurred',
            categories: flaggedCategories,
            content: text?.substring(0, 100) || '[kuva]',
            confidence: modResult.confidence
          });
          
          console.log('🌫️ PORRAS 2: Toinen viesti - sumennetaan seksuaalinen sisältö');
          return {
            action: 'blur',
            message: '⚠️ Viestisi sisältää seksuaalista sisältöä ja on sumennettu.',
            isBlurred: true,
            reason: 'second-sexual-blurred'
          };
        } else {
          // Ei-seksuaalinen haitallinen sisältö - estä ja lisää rikkomus
          this.addViolation(userId, {
            type: 'harmful_content',
            categories: flaggedCategories,
            content: text?.substring(0, 100) || '[kuva]',
            confidence: modResult.confidence
          });
          
          return {
            action: 'block',
            message: this.getCategoryMessage(flaggedCategories),
            reason: 'second-violation-harmful'
          };
        }
      }

      // PORRAS 3+: Kolmas tai useampi viesti - kaikki haitallinen sisältö = bänni
      this.addViolation(userId, {
        type: 'final_violation_ban',
        categories: flaggedCategories,
        content: text?.substring(0, 100) || '[kuva]',
        confidence: modResult.confidence
      });

      console.log(`🚫 PORRAS 3: Käyttäjä ${userId} bännatty kolmannesta rikkeestä`);
      
      return {
        action: 'block',
        message: '🚫 Olet estetty viestien lähettämisestä sopimattoman käyttäytymisen vuoksi.',
        reason: 'banned-third-violation'
      };

    } catch (error) {
      console.error('❌ Kriittinen virhe moderateMessage:ssa:', error);
      
      // KRIITTINEN FAIL SAFE - älä koskaan kaada sovellusta
      return { 
        action: 'allow', 
        reason: 'critical-error',
        error: error.message,
        warning: 'Moderation epäonnistui - sisältö sallittu turvallisuussyistä'
      };
    }
  }

  /**
   * Tarkista epäilyttävää sisältöä matalien kynnysarvojen perusteella
   * @param {object} categoryScores - OpenAI:n kategoria-arvot
   * @returns {object} - {warnings: array, severe: boolean, severeCategory: string}
   */
  checkSuspiciousContent(categoryScores) {
    const warnings = [];
    let severe = false;
    let severeCategory = null;
    
    // HERKEMMÄT KYNNYSARVOT VAROITUKSILLE
    const thresholds = {
      violence: 0.0005,     // "tapan sut" = 0.001208 ✅ 
      harassment: 0.01,     // "olet ruma" = 0.056343 ✅
      hate: 0.001,          // "olet ruma" = 0.035133 ✅  
      sexual: 0.002,        // "tapan sut" = 0.003054 ✅
      'self-harm': 0.001,   // Itsetuhoisuus
      illicit: 0.01         // Laiton toiminta
    };
    
    // VAKAVAT UHKAUKSET - Korkeammat kynnysarvot suoraan estämiselle
    const severeThresholds = {
      violence: 0.05,       // "tapan sinut" = 0.082712 ✅ -> ESTO
      harassment: 0.1,      // Vakava häirintä 
      hate: 0.1,            // Vakava vihapuhe
      'self-harm': 0.05     // Vakava itsetuhoisuus
    };
    
    // Tarkista ensin vakavat uhkaukset
    Object.entries(severeThresholds).forEach(([category, threshold]) => {
      const score = categoryScores[category] || 0;
      
      if (score > threshold) {
        severe = true;
        severeCategory = category;
        const percentage = (score * 100).toFixed(1);
        console.log(`🚫 VAKAVA UHKAUS: ${category} ${percentage}%`);
      }
    });
    
    // Jos vakava uhkaus, älä anna pelkkiä varoituksia
    if (severe) {
      return { warnings: [], severe: true, severeCategory: severeCategory };
    }
    
    // Tarkista normaali varoitustaso
    Object.entries(thresholds).forEach(([category, threshold]) => {
      const score = categoryScores[category] || 0;
      
      if (score > threshold) {
        warnings.push(this.getSuspiciousWarning(category, score));
      }
    });
    
    return { warnings: warnings, severe: false, severeCategory: null };
  }

  /**
   * Hae varoitusviesti kategorian perusteella
   * @param {string} category - Kategoria
   * @param {number} score - Score-arvo
   * @returns {string} - Varoitusviesti
   */
  getSuspiciousWarning(category, score) {
    const percentage = (score * 100).toFixed(1);
    
    switch (category) {
      case 'violence':
        return `Mahdollista väkivaltaista sisältöä (${percentage}%)`;
      case 'harassment':
        return `Mahdollista häirintää (${percentage}%)`;
      case 'hate':
        return `Mahdollista vihapuhetta (${percentage}%)`;
      case 'sexual':
        return `Mahdollista seksuaalista sisältöä (${percentage}%)`;
      case 'self-harm':
        return `Mahdollista itsetuhoisuutta (${percentage}%)`;
      case 'illicit':
        return `Mahdollista laitonta sisältöä (${percentage}%)`;
      default:
        return `Epäilyttävää sisältöä (${percentage}%)`;
    }
  }

  /**
   * Hae vakavan uhkauksen virheilmoitus
   * @param {string} category - Vakava kategoria
   * @returns {string} - Virheilmoitus
   */
  getSevereMessage(category) {
    switch (category) {
      case 'violence':
        return '🚫 Vakavat väkivaltaiset uhkaukset ovat ehdottomasti kiellettyjä. Sinua on varoitettu.';
      case 'harassment':
        return '🚫 Vakava häirintä ja uhkailu on ehdottomasti kiellettyä.';
      case 'hate':
        return '🚫 Vakava vihapuhe ja syrjintä on ehdottomasti kiellettyä.';
      case 'self-harm':
        return '🚫 Vakavat itsetuhoiset uhkaukset on estetty. Jos tarvitset apua, ota yhteyttä kriisipuhelimeen.';
      default:
        return '🚫 Vakava haitallinen sisältö on ehdottomasti kiellettyä.';
    }
  }

  /**
   * Apufunktio: Tarkista onko sisältö VAIN seksuaalista
   */
  isOnlySexualContent(categories) {
    if (!categories || categories.length === 0) return false;
    
    return categories.length === 1 && 
           (categories.includes('sexual') || categories.includes('sexual/minors'));
  }

  /**
   * Apufunktio: Tarkista sisältääkö seksuaalista materiaalia
   */
  isSexualContent(categories) {
    if (!categories || categories.length === 0) return false;
    
    return categories.some(cat => 
      cat.includes('sexual') || cat === 'sexual/minors'
    );
  }

  /**
   * Apufunktio: Hae kategoriaan sopiva virheilmoitus
   */
  getCategoryMessage(categories) {
    if (!categories || categories.length === 0) {
      return '❌ Viestisi sisältää sopimatonta sisältöä';
    }
    
    if (categories.includes('harassment')) {
      return '❌ Viestisi sisältää häirintää tai loukkaavaa sisältöä';
    } else if (categories.includes('hate')) {
      return '❌ Viestisi sisältää vihapuhetta';
    } else if (categories.includes('sexual')) {
      return '❌ Viestisi sisältää sopimaton seksuaalista sisältöä';
    } else if (categories.includes('violence')) {
      return '❌ Viestisi sisältää väkivaltaista sisältöä';
    } else if (categories.includes('self-harm')) {
      return '❌ Viestisi sisältää itsetuhoista sisältöä';
    } else if (categories.includes('illicit')) {
      return '❌ Viestisi sisältää laitonta toimintaa';
    }
    
    return '❌ Viestisi sisältää sopimatonta sisältöä';
  }

  /**
   * Varmistettu kombinoitu moderation - FAIL SAFE
   */
  async moderateContentSafe(text, imageUrl, userId = 'anonymous') {
    try {
      console.log(`🔍 Moderoidaan kombinoitu sisältö käyttäjälle ${userId}`);

      // Tarkista onko Functions käytössä
      if (this.functionsAvailable === false) {
        console.warn('⚠️ Firebase Functions ei käytössä - yritetään silti kutsua');
        // Älä salli automaattisesti, vaan yritä kutsu
      }

      const result = await this.moderateContentFn({
        text: text || null,
        imageUrl: imageUrl || null,
        userId: userId
      });

      const data = result.data;
      
      console.log('📊 Kombinoitu moderation tulos:', {
        flagged: data.isHarmful,
        categories: data.flaggedCategories || [],
        appliedInputTypes: data.appliedInputTypes
      });

      return {
        isHarmful: data.isHarmful || false,
        categories: data.categories || {},
        categoryScores: data.categoryScores || {},
        flaggedCategories: data.flaggedCategories || [],
        appliedInputTypes: data.appliedInputTypes || {},
        confidence: data.confidence || 0,
        source: 'firebase-functions'
      };

    } catch (error) {
      console.error('❌ Virhe kombinoidussa moderation:ssa:', error);
      
      // FAIL SAFE: Salli sisältö jos moderation epäonnistuu
      return { 
        isHarmful: false, 
        categories: {}, 
        flaggedCategories: [],
        source: 'error-fallback',
        error: error.message
      };
    }
  }

  /**
   * Hae käyttäjän rikkomusten määrä
   * @param {string} userId - Käyttäjän ID
   * @returns {number}
   */
  getUserViolationCount(userId) {
    return this.userViolations.get(userId)?.count || 0;
  }

}

// Luo singleton instance
const moderationService = new ModerationService();

export default moderationService;

// Myös nimellinen export helpompaa käyttöä varten
export { moderationService };