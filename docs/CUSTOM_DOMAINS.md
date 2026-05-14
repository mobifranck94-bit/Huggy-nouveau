# Custom Domain Setup Guide

## The Problem

When deploying apps, Huggy generates URLs like `my-app.huggy.fun` but they may not be accessible globally because:

1. The DNS record for `*.huggy.fun` (or your domain) doesn't point to Vercel
2. Vercel doesn't know about your domain

## Solutions

### Option 1: Use Vercel URL (Works Immediately)

The Vercel URL (e.g., `my-app-abc123.vercel.app`) works everywhere immediately after deployment. No setup required.

### Option 2: Enable Custom Domains Globally

To make `*.huggy.fun` (or your domain) work everywhere:

#### Step 1: Add Domain to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (or create one)
3. Go to **Settings** → **Domains**
4. Add your domain: `huggy.fun`
5. Vercel will give you instructions

#### Step 2: Configure DNS

Add these DNS records at your registrar (where you bought huggy.fun):

**For wildcard subdomains (recommended):**
```
Type:  CNAME
Name:  *
Value: cname.vercel-dns.com
TTL:   3600
```

**For the root domain:**
```
Type:  A
Name:  @
Value: 76.76.21.21
TTL:   3600
```

Or use CNAME flattening if your registrar supports it:
```
Type:  CNAME
Name:  @
Value: cname.vercel-dns.com
```

#### Step 3: Verify

After DNS propagates (can take up to 48 hours, usually 5-30 minutes):

```bash
# Check if DNS is set up correctly
dig my-app.huggy.fun CNAME

# Should return: cname.vercel-dns.com
```

## Environment Variables

Make sure your `.env` file has:

```env
# Required for deployment
VERCEL_TOKEN=your_vercel_token_here

# Optional: your custom domain (default: huggy.fun)
HUGGY_DOMAIN=huggy.fun
```

## How It Works

1. **Deployment**: App builds and deploys to Vercel
2. **Alias Assignment**: Server tries to assign `my-app.huggy.fun` as an alias
3. **DNS Resolution**: If DNS is configured, the alias works globally
4. **Fallback**: If DNS isn't ready, the Vercel URL always works

## Troubleshooting

### "Domain not found" error

- Add the domain in Vercel dashboard first
- Wait for DNS propagation
- Check with `dig your-domain.com CNAME`

### SSL Certificate Error

- Vercel provisions certificates automatically
- Can take a few minutes after first request

### URL works for me but not others

- DNS propagation takes time
- Different regions cache DNS differently
- Use a global DNS checker like https://dnschecker.org

## API Changes

The deploy API now returns:

```json
{
  "success": true,
  "url": "https://my-app.huggy.fun",  // Preferred URL (custom if alias assigned)
  "vercelUrl": "https://my-app-abc123.vercel.app",  // Always works
  "customUrl": "https://my-app.huggy.fun",  // Custom domain URL
  "slug": "my-app-abc123",
  "aliasAssigned": true,  // Whether custom domain alias was set
  "badgeEnabled": true
}
```

## Support

For issues with custom domains:
1. Check Vercel status: https://vercel-status.com
2. Verify DNS: https://dnschecker.org
3. Contact support with your slug and domain
