using System.Security.Claims;

namespace HienMauAPI.Helpers
{
    public static class ClaimsExtensions
    {
        public static int? GetProfileId(this ClaimsPrincipal user)
        {
            var value = user.FindFirst("profileId")?.Value;
            return int.TryParse(value, out var id) ? id : null;
        }

        public static int? GetAccountId(this ClaimsPrincipal user)
        {
            var value = user.FindFirst("accountId")?.Value;
            return int.TryParse(value, out var id) ? id : null;
        }
    }
}
