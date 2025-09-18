// Supabase Configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔗 Supabase client alustettu');
console.log('📍 URL:', supabaseUrl);

// Google OAuth kirjautuminen
export const signInWithGoogle = async () => {
  try {
    console.log('🚀 Aloitetaan Google OAuth kirjautuminen...');
    
    // Pakota tuotanto redirect URL
    const redirectUrl = 'https://chatti.online/oauth-redirect.html';
    console.log('📍 Käytetään redirect URL:', redirectUrl);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });

    if (error) {
      console.error('❌ Google OAuth virhe:', error);
      throw error;
    }

    console.log('✅ Google OAuth aloitettu:', data);
    return data;
  } catch (error) {
    console.error('❌ Virhe Google kirjautumisessa:', error);
    throw error;
  }
};

// Kirjaudu ulos
export const signOut = async () => {
  try {
    console.log('🚪 Kirjaudutaan ulos...');
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Uloskirjautumis virhe:', error);
      throw error;
    }

    console.log('✅ Uloskirjautuminen onnistui');
  } catch (error) {
    console.error('❌ Virhe uloskirjautumisessa:', error);
    throw error;
  }
};

// Hae nykyinen käyttäjä
export const getCurrentUser = () => {
  return supabase.auth.getUser();
};

// Kuuntele auth-tilan muutoksia
export const onAuthStateChange = (callback) => {
  return supabase.auth.onAuthStateChange(callback);
};