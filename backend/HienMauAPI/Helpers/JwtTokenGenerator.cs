using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using HienMauAPI.Entities;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace HienMauAPI.Helpers
{
    public interface IJwtTokenGenerator
    {
        (string token, DateTime expiresAt) GenerateToken(TaiKhoan account, int? profileId);
    }

    public class JwtTokenGenerator : IJwtTokenGenerator
    {
        private readonly JwtSettings _settings;

        public JwtTokenGenerator(IOptions<JwtSettings> settings)
        {
            _settings = settings.Value;
        }

        public (string token, DateTime expiresAt) GenerateToken(TaiKhoan account, int? profileId)
        {
            var expiresAt = DateTime.UtcNow.AddMinutes(_settings.ExpiryMinutes);

            var claims = new List<Claim>
            {
                new(JwtRegisteredClaimNames.Sub, account.Username),
                new("accountId", account.Id.ToString()),
                new(ClaimTypes.Role, account.Role),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            if (profileId.HasValue)
                claims.Add(new Claim("profileId", profileId.Value.ToString()));

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.SecretKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var token = new JwtSecurityToken(
                issuer: _settings.Issuer,
                audience: _settings.Audience,
                claims: claims,
                expires: expiresAt,
                signingCredentials: creds
            );

            return (new JwtSecurityTokenHandler().WriteToken(token), expiresAt);
        }
    }
}
