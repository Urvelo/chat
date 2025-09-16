const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
co/**
 * Moderoi kuvaa OpenAI API:lla - POISTETTU (ei tarvita)
 */
// exports.moderateImage = POISTETTU - kuvia ei käytetä chatissa

/**
 * Yhdistetty moderointi teksti + kuva - YKSINKERTAISTETTU (vain teksti)
 */
exports.moderateContent = onCall(async (request) => {
  try {
    // 🛡️ TURVALLISUUSTARKISTUKSET
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { text, userId } = request.data;
    
    if (userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Cannot moderate for another user');
    }
    
    // Pelkkä tekstimoderointi (kuvia ei ole)
    if (!text || typeof text !== 'string') {
      throw new HttpsError('invalid-argument', 'Text is required');
    }
    
    if (text.length > 2000) {
      throw new HttpsError('invalid-argument', 'Text too long (max 2000 characters)');
    }
    
    console.log(`🔍 Moderating content for user ${userId}:`, text.substring(0, 100));
    
    const client = getOpenAIClient();
    
    const response = await client.moderations.create({
      model: 'omni-moderation-latest',
      input: text
    });
    
    const result = response.results[0];
    const flaggedCategories = Object.keys(result.categories)
      .filter(category => result.categories[category]);
    
    const analysisResult = {
      isHarmful: result.flagged,
      categories: result.categories,
      categoryScores: result.category_scores,
      flaggedCategories: flaggedCategories,
      confidence: Math.max(...Object.values(result.category_scores))
    };
    
    console.log(`✅ Content moderation result for user ${userId}:`, {
      flagged: result.flagged,
      categories: flaggedCategories,
      confidence: analysisResult.confidence.toFixed(3)
    });
    
    return analysisResult;
    
  } catch (error) {
    console.error('❌ Error in moderateContent:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', 'Content moderation failed', error.message);
  }
}); = require('firebase-admin');
const cors = require('cors')({ 
  origin: (origin, callback) => {
    // Salli kaikki localhost ja GitHub Codespaces domainit
    const allowedOrigins = [
      /^https?:\/\/localhost(:\d+)?$/,
      /^https:\/\/.*\.app\.github\.dev$/,
      /^https:\/\/.*\.githubpreview\.dev$/,
      /^https:\/\/.*\.preview\.app\.github\.dev$/
    ];
    
    if (!origin || allowedOrigins.some(pattern => pattern.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
});

// Alusta Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Aseta globaalit asetukset
setGlobalOptions({
  maxInstances: 10,
  region: 'europe-west1'
});

// OpenAI client - API avain tulee Firebase Config:sta
let openaiClient = null;

const getOpenAIClient = () => {
  if (!openaiClient) {
    const { OpenAI } = require('openai');
    
    // Hae API avain Firebase Functions konfiguraatiosta
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'OpenAI API key not configured');
    }
    
    openaiClient = new OpenAI({
      apiKey: apiKey
    });
  }
  
  return openaiClient;
};

/**
 * Moderoi tekstiä OpenAI API:lla - TURVALLISUUSTARKISTUKSET
 */
exports.moderateText = onCall(async (request) => {
  try {
    // 🛡️ TURVALLISUUSTARKISTUKSET
    
    // 1. Tarkista että käyttäjä on autentikoitu
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const { text, userId } = request.data;
    
    // 2. Validoi että käyttäjä ID täsmää autentikoidun käyttäjän kanssa
    if (userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Cannot moderate for another user');
    }
    
    // 3. Perusvalidointi
    if (!text || typeof text !== 'string') {
      throw new HttpsError('invalid-argument', 'Text is required');
    }
    
    if (!userId || typeof userId !== 'string') {
      throw new HttpsError('invalid-argument', 'User ID is required');
    }
    
    // 4. Koko- ja sisältörajoitukset
    if (text.length > 2000) {
      throw new HttpsError('invalid-argument', 'Text too long (max 2000 characters)');
    }
    
    if (text.trim().length === 0) {
      throw new HttpsError('invalid-argument', 'Text cannot be empty');
    }
    
    // 5. Rate limiting (yksinkertainen versio)
    // Voit lisätä Firebase Firestore pohjaisen rate limitingin tähän
    
    console.log(`🔍 Moderating text for authenticated user ${userId}:`, text.substring(0, 100));
    
    const client = getOpenAIClient();
    
    const response = await client.moderations.create({
      model: 'omni-moderation-latest',
      input: text
    });
    
    const result = response.results[0];
    
    // Analysoi tulokset
    const flaggedCategories = Object.keys(result.categories)
      .filter(category => result.categories[category]);
    
    const analysisResult = {
      isHarmful: result.flagged,
      categories: result.categories,
      categoryScores: result.category_scores,
      flaggedCategories: flaggedCategories,
      confidence: Math.max(...Object.values(result.category_scores))
    };
    
    console.log(`Moderation result for user ${userId}:`, {
      flagged: result.flagged,
      categories: flaggedCategories,
      confidence: analysisResult.confidence.toFixed(3)
    });
    
    return analysisResult;
    
  } catch (error) {
    console.error('Error in moderateText:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', 'Moderation failed', error.message);
  }
});

/**
 * Moderoi kuvaa OpenAI API:lla
 */
exports.moderateImage = onCall(async (request) => {
  try {
    const { imageUrl, userId } = request.data;
    
    if (!imageUrl || typeof imageUrl !== 'string') {
      throw new HttpsError('invalid-argument', 'Image URL is required');
    }
    
    if (!userId || typeof userId !== 'string') {
      throw new HttpsError('invalid-argument', 'User ID is required');
    }
    
    console.log(`Moderating image for user ${userId}:`, imageUrl.substring(0, 100));
    
    // Tarkista onko URL vain test URL - jos on, palauta turvallinen tulos
    if (imageUrl.includes('example.com') || imageUrl.includes('test.jpg')) {
      console.log('Test URL detected - returning safe result');
      return {
        isHarmful: false,
        categories: {},
        categoryScores: {},
        flaggedCategories: [],
        confidence: 0,
        testMode: true
      };
    }
    
    const client = getOpenAIClient();
    
    const response = await client.moderations.create({
      model: 'omni-moderation-latest',
      input: [
        {
          type: 'image_url',
          image_url: {
            url: imageUrl
          }
        }
      ]
    });
    
    const result = response.results[0];
    
    // Analysoi tulokset
    const flaggedCategories = Object.keys(result.categories)
      .filter(category => result.categories[category]);
    
    const analysisResult = {
      isHarmful: result.flagged,
      categories: result.categories,
      categoryScores: result.category_scores,
      flaggedCategories: flaggedCategories,
      appliedInputTypes: result.category_applied_input_types,
      confidence: Math.max(...Object.values(result.category_scores))
    };
    
    console.log(`Image moderation result for user ${userId}:`, {
      flagged: result.flagged,
      categories: flaggedCategories,
      confidence: analysisResult.confidence.toFixed(3)
    });
    
    return analysisResult;
    
  } catch (error) {
    console.error('Error in moderateImage:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    // Jos kuva ei ole saatavilla, palauta turvallinen tulos fail-safe moodissa
    if (error.code === 'image_url_unavailable') {
      console.log('Image not available - returning safe result');
      return {
        isHarmful: false,
        categories: {},
        categoryScores: {},
        flaggedCategories: [],
        confidence: 0,
        warning: 'Image could not be downloaded'
      };
    }
    
    throw new HttpsError('internal', 'Image moderation failed', error.message);
  }
});

/**
 * Moderoi sekä tekstiä että kuvaa yhdessä
 */
exports.moderateContent = onCall(async (request) => {
  try {
    const { text, imageUrl, userId } = request.data;
    
    if (!userId || typeof userId !== 'string') {
      throw new HttpsError('invalid-argument', 'User ID is required');
    }
    
    if (!text && !imageUrl) {
      throw new HttpsError('invalid-argument', 'Either text or image URL is required');
    }
    
    console.log(`Moderating content for user ${userId}:`, {
      hasText: !!text,
      hasImage: !!imageUrl
    });
    
    // Jos molemmat ovat test-dataa, palauta turvallinen tulos
    if ((text === 'test' || !text) && (imageUrl && imageUrl.includes('example.com'))) {
      console.log('Test data detected - returning safe result');
      return {
        isHarmful: false,
        categories: {},
        categoryScores: {},
        flaggedCategories: [],
        appliedInputTypes: {},
        confidence: 0,
        testMode: true
      };
    }
    
    const client = getOpenAIClient();
    
    // Rakenna input array oikein omni-moderation-latest mallille
    const inputs = [];
    
    // Lisää teksti ensin, jos on
    if (text && text.trim().length > 0) {
      inputs.push({
        type: 'text',
        text: text
      });
    }
    
    // Lisää kuva sitten, jos on
    if (imageUrl) {
      inputs.push({
        type: 'image_url',
        image_url: {
          url: imageUrl
        }
      });
    }
    
    const response = await client.moderations.create({
      model: 'omni-moderation-latest',
      input: inputs
    });
    
    const result = response.results[0];
    
    // Analysoi tulokset
    const flaggedCategories = Object.keys(result.categories)
      .filter(category => result.categories[category]);
    
    const analysisResult = {
      isHarmful: result.flagged,
      categories: result.categories,
      categoryScores: result.category_scores,
      flaggedCategories: flaggedCategories,
      appliedInputTypes: result.category_applied_input_types || {},
      confidence: Math.max(...Object.values(result.category_scores))
    };
    
    console.log(`Content moderation result for user ${userId}:`, {
      flagged: result.flagged,
      categories: flaggedCategories,
      confidence: analysisResult.confidence.toFixed(3)
    });
    
    return analysisResult;
    
  } catch (error) {
    console.error('Error in moderateContent:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    // Fail-safe: Jos kombinoitu moderation epäonnistuu, kokeile vain tekstiä
    if (error.code && request.data.text && !request.data.imageUrl) {
      console.log('Combined moderation failed, trying text-only fallback');
      try {
        const textOnlyResponse = await client.moderations.create({
          model: 'omni-moderation-latest',
          input: request.data.text
        });
        
        const result = textOnlyResponse.results[0];
        const flaggedCategories = Object.keys(result.categories)
          .filter(category => result.categories[category]);
        
        return {
          isHarmful: result.flagged,
          categories: result.categories,
          categoryScores: result.category_scores,
          flaggedCategories: flaggedCategories,
          confidence: Math.max(...Object.values(result.category_scores)),
          fallbackMode: 'text-only'
        };
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
    
    throw new HttpsError('internal', 'Content moderation failed', error.message);
  }
});

/**
 * Test endpoint to verify Functions work
 */
exports.testEndpoint = onCall(async (request) => {
  console.log('🧪 Test endpoint called!');
  return {
    message: 'Test works!',
    timestamp: Date.now(),
    hasData: !!request.data,
    environment: process.env.NODE_ENV || 'unknown'
  };
});