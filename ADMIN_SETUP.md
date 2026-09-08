# Admin Panel Setup

## 1. Database Tables

Add the `webhook_logs` table to Supabase. Run this SQL in the Supabase SQL Editor:

```sql
-- Create webhook_logs table for audit trail
CREATE TABLE IF NOT EXISTS webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_email TEXT,
  payload JSONB,
  status TEXT DEFAULT 'received', -- success, failed, pending_retry
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_user_email ON webhook_logs(user_email);
```

## 2. Environment Variables

Add to your `.env` (local) or Render environment variables:

```
ADMIN_TOKEN=your-secret-admin-token-here
```

**Important:** Use a strong, random token. Example: `admin_sk_$(openssl rand -hex 16)`

## 3. Accessing the Admin Panel

### Local Development
1. Start your server with `ADMIN_TOKEN` set
2. Navigate to: `http://localhost:3000/?admin`
3. You'll be prompted for the `ADMIN_TOKEN` on first API call

### Production (grandimi.com)
1. Add `ADMIN_TOKEN` to Render environment variables
2. Navigate to: `https://grandimi.com/?admin`
3. Query parameter format: `?admin&token=your-admin-token`

Actually, the token is sent in the `Authorization` header (`Bearer <token>`), so it's safe in the request.

## 4. Admin Panel Features

### Dashboard
- Total users
- Premium users count
- Estimated MRR (Monthly Recurring Revenue)
- Webhooks received (total)
- Users created today

### Users Tab
- Search by email
- Filter by premium status
- Grant/revoke premium access
- Delete test users
- View detailed user info (predictions, Whop IDs, etc.)

### Subscriptions Tab
- View all active subscriptions
- Track subscription status (active, cancelled, expired)
- See expiration dates

### Webhooks Tab
- Audit trail of all Whop webhooks received
- View event type, user email, timestamp
- See full JSON payload
- Status: success, failed, pending_retry

## 5. Usage Examples

### Grant Premium to User
```bash
curl -X POST https://grandimi-api.onrender.com/api/admin/user/grant-premium \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user-uuid-here"}'
```

### Get Dashboard Stats
```bash
curl https://grandimi-api.onrender.com/api/admin/stats \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### View Webhook Logs
```bash
curl https://grandimi-api.onrender.com/api/admin/webhooks \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 6. Security Notes

- The admin panel is protected by the `ADMIN_TOKEN` environment variable
- All admin routes require the header: `Authorization: Bearer <ADMIN_TOKEN>`
- Admin token is **never** logged or exposed in errors
- Webhook logs are stored for audit purposes (not deleted)
- Only use the admin panel over HTTPS in production

## 7. Troubleshooting

**"failed to get stats" error:**
- Verify `ADMIN_TOKEN` is set in Render environment
- Check database connection (if tables don't exist yet)
- Look at server logs for detailed error

**Webhook logs are empty:**
- Webhooks log only after you've received at least one from Whop
- Check that `WHOP_WEBHOOK_SECRET` is correctly set (signature verification must pass)

**Can't access admin panel:**
- Make sure you're using `?admin` in the URL
- Verify the `Authorization: Bearer <token>` header is being sent
- Check that the token matches `ADMIN_TOKEN` in environment

## 8. Next Steps

1. Run the SQL to create `webhook_logs` table
2. Set `ADMIN_TOKEN` in Render
3. Redeploy the app
4. Visit `https://grandimi.com/?admin` with your token
5. Start managing users and monitoring webhooks!
