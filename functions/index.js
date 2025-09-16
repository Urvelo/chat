const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');

// Alusta Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Aseta globaalit asetukset
setGlobalOptions({
  region: 'europe-west1'
});

// OpenAI client - API avain tulee .env tiedostosta
let openaiClient = null;

const getOpenAIClient = () => {
  if (!openaiClient) {
    const { OpenAI } = require('openai');
    
    // Hae API avain environment variablesta
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
    
    console.log(`✅ Moderation result for user ${userId}:`, {
      flagged: result.flagged,
      categories: flaggedCategories,
      confidence: analysisResult.confidence.toFixed(3)
    });
    
    return analysisResult;
    
  } catch (error) {
    console.error('❌ Error in moderateText:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', 'Moderation failed', error.message);
  }
});

/**
 * Yhdistetty moderointi - VAIN TEKSTI (kuvia ei tarvita)
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
});