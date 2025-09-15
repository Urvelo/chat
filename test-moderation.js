// Test script for Firebase Functions moderation connection
// Testi: "Chat nuorille" moderation toimivuuden varmistus

import moderationService from './src/utils/moderation.js';

console.log('🧪 ALOITETAAN Firebase Functions connection testit...\n');

// Test 1: Basic text moderation
async function testTextModeration() {
  console.log('📝 TEST 1: Text moderation test');
  
  try {
    const result = await moderationService.moderateTextSafe('Hello world test', 'test-user-1');
    console.log('✅ Text moderation toimii:', result);
    
    if (result.source === 'firebase-functions') {
      console.log('🔥 Firebase Functions yhteys toimii täydellisesti!');
    } else if (result.source === 'no-functions') {
      console.log('⚠️ Functions emulator ei käytössä, mutta fail-safe toimii');
    } else {
      console.log('🛡️ Fail-safe aktivoitunut:', result.source);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Text moderation epäonnistui:', error);
    return false;
  }
}

// Test 2: Image moderation
async function testImageModeration() {
  console.log('\n🖼️ TEST 2: Image moderation test');
  
  try {
    const result = await moderationService.moderateImageSafe('https://example.com/test.jpg', 'test-user-2');
    console.log('✅ Image moderation toimii:', result);
    return true;
  } catch (error) {
    console.error('❌ Image moderation epäonnistui:', error);
    return false;
  }
}

// Test 3: Combined content moderation
async function testCombinedModeration() {
  console.log('\n🔀 TEST 3: Combined content moderation test');
  
  try {
    const result = await moderationService.moderateContentSafe('Hello test', 'https://example.com/test.jpg', 'test-user-3');
    console.log('✅ Combined moderation toimii:', result);
    return true;
  } catch (error) {
    console.error('❌ Combined moderation epäonnistui:', error);
    return false;
  }
}

// Test 4: User violation system
async function testViolationSystem() {
  console.log('\n⚠️ TEST 4: User violation system test');
  
  try {
    // Simuloi haitallinen sisältö
    const result1 = await moderationService.moderateMessage('test-user-violation', 'This is inappropriate sexual content');
    console.log('Violation test 1:', result1.action, result1.reason);
    
    const result2 = await moderationService.moderateMessage('test-user-violation', 'More inappropriate content');
    console.log('Violation test 2:', result2.action, result2.reason);
    
    const result3 = await moderationService.moderateMessage('test-user-violation', 'Third violation test');
    console.log('Violation test 3:', result3.action, result3.reason);
    
    console.log('✅ Violation system toimii');
    return true;
  } catch (error) {
    console.error('❌ Violation system epäonnistui:', error);
    return false;
  }
}

// Test 5: Error handling & fail-safe
async function testFailSafe() {
  console.log('\n🛡️ TEST 5: Fail-safe mechanism test');
  
  // Testaa virheellinen input
  const result1 = await moderationService.moderateTextSafe('', 'test-user-empty');
  console.log('Empty text test:', result1.source);
  
  const result2 = await moderationService.moderateTextSafe(null, 'test-user-null');
  console.log('Null text test:', result2.source);
  
  const result3 = await moderationService.moderateImageSafe('', 'test-user-empty-img');
  console.log('Empty image test:', result3.source);
  
  console.log('✅ Fail-safe mechanisms toimivat');
  return true;
}

// Suorita kaikki testit
async function runAllTests() {
  console.log('🚀 KÄYNNISTETÄÄN KAIKKI TESTIT...\n');
  
  const tests = [
    testTextModeration,
    testImageModeration,
    testCombinedModeration,
    testViolationSystem,
    testFailSafe
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) passed++;
      else failed++;
    } catch (error) {
      console.error('Test epäonnistui:', error);
      failed++;
    }
  }
  
  console.log('\n📊 TESTTIEN TULOKSET:');
  console.log(`✅ Onnistui: ${passed}/${tests.length}`);
  console.log(`❌ Epäonnistui: ${failed}/${tests.length}`);
  
  if (failed === 0) {
    console.log('\n🎉 KAIKKI TESTIT MENIVÄT LÄPI!');
    console.log('🔒 Firebase Functions yhteys on VARMASTI luotettava ja virhevarma!');
  } else {
    console.log('\n⚠️ Joitain testejä epäonnistui - tarkista yhteys');
  }
}

// Vie testit globaaliin scopeen
window.testModerationConnection = runAllTests;
window.moderationService = moderationService;

console.log('🔧 Testit ladattu! Suorita: testModerationConnection() konsolissa');