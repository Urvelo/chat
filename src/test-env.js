// Testaa environment variablet
console.log('🔍 Testing environment variables:');
console.log('VITE_IMGBB_API_KEY:', import.meta.env.VITE_IMGBB_API_KEY ? 'FOUND' : 'MISSING');
console.log('VITE_OPENAI_API_KEY:', import.meta.env.VITE_OPENAI_API_KEY ? 'FOUND' : 'MISSING');
console.log('VITE_MODERATION_LEVEL:', import.meta.env.VITE_MODERATION_LEVEL);

// Test image upload button conditions
const mockProfile = { age: 18 };
const mockRoom = { ready: true };
const mockUploading = false;
const mockBanned = false;

const isImageButtonDisabled = (
  !mockRoom.ready || 
  mockUploading || 
  mockBanned || 
  !import.meta.env.VITE_IMGBB_API_KEY || 
  !mockProfile?.age || 
  mockProfile.age < 18
);

console.log('🖼️ Image button disabled:', isImageButtonDisabled);
console.log('All conditions:', {
  roomReady: mockRoom.ready,
  uploading: mockUploading,
  banned: mockBanned,
  hasApiKey: !!import.meta.env.VITE_IMGBB_API_KEY,
  hasAge: !!mockProfile?.age,
  isOver18: mockProfile?.age >= 18
});