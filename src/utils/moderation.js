import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';

// Turvallinen Firebase Functions moderation API
class ModerationService {
  constructor() {
    // Firebase Functions alustus
    this.functions = getFunctions();
    
    // Jos kehitysympäristössä, yhdistä emulatoriin
    if (import.meta.env.DEV) {
      try {
        connectFunctionsEmulator(this.functions, 'localhost', 5001);
        console.log('🔧 Yhdistetty Firebase Functions emulatoriin');
      } catch (error) {
        console.log('⚠️ Functions emulator ei käytössä, käytetään live Firebase');
      }
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
        console.warn('⚠️ Firebase Functions ei käytössä - sallitaan teksti');
        return { 
          isHarmful: false, 
          categories: {}, 
          flaggedCategories: [],
          source: 'no-functions',
          warning: 'Moderation ei käytössä'
        };
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
        console.warn('⚠️ Firebase Functions ei käytössä - sallitaan kuva');
        return { 
          isHarmful: false, 
          categories: {}, 
          flaggedCategories: [],
          source: 'no-functions',
          warning: 'Moderation ei käytössä'
        };
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
      
      // Jos sisältö on turvallista, salli
      if (!modResult.isHarmful) {
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
        console.warn('⚠️ Firebase Functions ei käytössä - sallitaan sisältö');
        return { 
          isHarmful: false, 
          categories: {}, 
          flaggedCategories: [],
          source: 'no-functions',
          warning: 'Moderation ei käytössä'
        };
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