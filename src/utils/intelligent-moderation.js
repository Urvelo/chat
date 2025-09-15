// Älykäs konteksti-pohjainen moderointi OpenAI:lla
// Ymmärtää kiertotavat ja asiayhteyden

class IntelligentModerationService {
  constructor() {
    console.log('🧠 Alustetaan älykäs moderointi...');
    
    // OpenAI API avain - tämä pitää asettaa ympäristömuuttujana
    this.apiKey = process.env.OPENAI_API_KEY || 'your-openai-api-key-here';
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    
    console.log('✅ Älykäs moderointi valmis!');
  }

  // Pääfunktio: älykäs konteksti-pohjainen moderointi
  async moderateContent(text, userId = 'anonymous') {
    console.log(`🧠 Moderoidaan älykkäästi käyttäjälle ${userId}:`, text.substring(0, 50) + '...');
    
    try {
      // Kutsu OpenAI API:a kontekstin ymmärtämiseen
      const analysis = await this.analyzeWithAI(text);
      
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
      
    } catch (error) {
      console.error('❌ Virhe älykkäässä moderoinnissa:', error);
      
      // Fallback: käytä yksinkertaista suodatinta
      return this.fallbackModeration(text);
    }
  }

  // OpenAI API kutsu kontekstin analysointiin
  async analyzeWithAI(text) {
    const prompt = `
Analysoi seuraava suomenkielinen chattiviesti ja päätä onko se sopivaa nuorille (13-17v):

VIESTI: "${text}"

SÄÄNNÖT:
1. SALLITTU: Nuori kertoo kokemuksistaan informatiivisesti tai kysyy neuvoa
2. SALLITTU: Normaali keskustelu seksiopetuksesta, suhteista, kehityksestä
3. ESTETTY: Seksuaalinen häirintä, ehdotukset, kuvaukset
4. ESTETTY: Väkivalta, uhkailu, kiusaaminen
5. ESTETTY: Huumeet, alkoholi, laiton toiminta

HUOMIO:
- Tunnista kiertotavat (s.eksi, s3ksi, jne.)
- Ymmärrä konteksti, älä vain sanoja
- Nuorten terveysopetus on OK
- Häirintä ja sopimaton sisältö EI OK

Vastaa JSON-muodossa:
{
  "isHarmful": boolean,
  "shouldBlock": boolean,
  "category": "sexual|violence|bullying|substance|safe",
  "confidence": 0.0-1.0,
  "warningMessage": "varoitusteksti tai null",
  "reasons": ["syy1", "syy2"],
  "context": "lyhyt selitys miksi"
}`;

    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Halpa ja nopea malli
        messages: [
          {
            role: 'system',
            content: 'Olet moderointi-asiantuntija nuorten chat-palvelulle. Analysoi viestejä viisaasti ja konteksti huomioiden.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1, // Vähän vaihtelua, enemmän johdonmukaisuutta
        max_tokens: 300
      })
    });

    if (!response.ok) {
      throw new Error(`OpenAI API virhe: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    try {
      return JSON.parse(aiResponse);
    } catch (parseError) {
      console.error('Virhe AI-vastauksen parsinnassa:', aiResponse);
      throw new Error('AI-vastaus ei ole validi JSON');
    }
  }

  // Varmuuskopio yksinkertainen moderointi jos AI epäonnistuu
  fallbackModeration(text) {
    console.warn('🔄 Käytetään varmuuskopio moderointia');
    
    const lowerText = text.toLowerCase();
    
    // Perussanat joita etsitään
    const harmfulPatterns = [
      // Seksuaalinen häirintä (ei normaali keskustelu)
      /haluan.*sun.*kanssa/i,
      /lähetetään.*kuvia/i,
      /näytä.*rinnat/i,
      /seksi.*kanssa/i,
      
      // Väkivalta ja uhkailu
      /tapan.*sut/i,
      /murhan/i,
      /lyön.*sua/i,
      
      // Kiusaaminen
      /vitun.*idiootti/i,
      /kuole.*pois/i,
      /ruma.*läski/i
    ];

    for (const pattern of harmfulPatterns) {
      if (pattern.test(text)) {
        return {
          isHarmful: true,
          shouldBlock: true,
          category: 'mixed',
          confidence: 0.7,
          warningMessage: '⚠️ Viesti sisältää sopimatonta sisältöä nuorille.',
          reasons: ['Varmuuskopio moderointi havaitsi haitallista sisältöä'],
          context: 'Yksinkertainen suodatin aktivoitui'
        };
      }
    }

    return {
      isHarmful: false,
      shouldBlock: false,
      category: 'safe',
      confidence: 0.9,
      warningMessage: null,
      reasons: [],
      context: 'Varmuuskopio moderointi hyväksyi'
    };
  }

  // Wrapper moderateMessage-funktiolle yhteensopivuuden vuoksi
  async moderateMessage(text, userId = 'anonymous') {
    return this.moderateContent(text, userId);
  }

  // Wrapper moderateImage-funktiolle
  async moderateImage(imageUrl, userId = 'anonymous') {
    console.log(`🖼️ Kuvan moderointi ei ole vielä käytössä älykkäässä versiossa`);
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
const intelligentModerationService = new IntelligentModerationService();

export { intelligentModerationService };
export default IntelligentModerationService;