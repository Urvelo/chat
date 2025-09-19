export default function AuthButtons({ onGoogleClick, onAnonymousClick }) {
  return (
    <div className="auth-buttons">
      {/* Google-nappi */}
      <button className="google-btn" onClick={onGoogleClick}>
        <img
          src="https://developers.google.com/identity/images/g-logo.png"
          alt="Google logo"
        />
        Jatka Google-tilillä
      </button>

      {/* Anonyymi-nappi */}
      <button className="anonymous-btn" onClick={onAnonymousClick}>
        👤 Jatka anonyymisti
      </button>
    </div>
  );
}
