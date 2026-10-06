using System.Security.Cryptography;

namespace HienMauAPI.Helpers
{
    // Băm mật khẩu bằng PBKDF2-SHA256 (built-in .NET, không cần thư viện ngoài).
    // Định dạng lưu: {số vòng lặp}.{salt base64}.{khóa base64}
    public static class PasswordHasher
    {
        private const int SaltSize = 16;
        private const int KeySize = 32;
        private const int Iterations = 100_000;

        public static string Hash(string password)
        {
            var salt = RandomNumberGenerator.GetBytes(SaltSize);
            var key = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA256, KeySize);
            return $"{Iterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(key)}";
        }

        public static bool Verify(string password, string hashed)
        {
            var parts = hashed.Split('.');
            if (parts.Length != 3 || !int.TryParse(parts[0], out var iterations)) return false;

            try
            {
                var salt = Convert.FromBase64String(parts[1]);
                var key = Convert.FromBase64String(parts[2]);
                var keyToCheck = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, key.Length);
                return CryptographicOperations.FixedTimeEquals(keyToCheck, key);
            }
            catch (FormatException)
            {
                return false;
            }
        }
    }
}
