import Fingerprint2 from 'fingerprintjs2';

// Luo uniikki laitetunniste käyttäjän laitteelle
export const getDeviceFingerprint = () => {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.requestIdleCallback) {
      requestIdleCallback(() => {
        Fingerprint2.get((components) => {
          const values = components.map(component => component.value);
          const fingerprint = Fingerprint2.x64hash128(values.join(''), 31);
          resolve(fingerprint);
        });
      });
    } else {
      setTimeout(() => {
        Fingerprint2.get((components) => {
          const values = components.map(component => component.value);
          const fingerprint = Fingerprint2.x64hash128(values.join(''), 31);
          resolve(fingerprint);
        });
      }, 500);
    }
  });
};

// Tallenna fingerprint localStorageen välimuistia varten
export const getCachedFingerprint = async () => {
  const cached = localStorage.getItem('device_fingerprint');
  if (cached) {
    return cached;
  }
  
  const fingerprint = await getDeviceFingerprint();
  localStorage.setItem('device_fingerprint', fingerprint);
  return fingerprint;
};