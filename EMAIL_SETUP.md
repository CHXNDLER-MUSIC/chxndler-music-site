# Email Notifications Setup

This guide explains how to set up email notifications for HEARTVERSE order confirmations and shipping updates.

## 📧 Features

- **Order Confirmation Emails**: Automatically sent when users purchase items with HeartCoins
- **Shipping Notification Emails**: Can be sent when physical items are shipped
- **Responsive Email Templates**: Beautiful, mobile-friendly emails that match the HEARTVERSE aesthetic
- **Error Handling**: Graceful fallback if email sending fails (orders still process successfully)

## 🛠️ Configuration

### 1. Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# SMTP Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@chxndler.world
```

### 2. Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password as `SMTP_PASS`

### 3. Other Email Providers

For other email providers, update the `SMTP_HOST` and `SMTP_PORT`:

```bash
# Outlook/Hotmail
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587

# Yahoo
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587

# Custom SMTP
SMTP_HOST=your-smtp-server.com
SMTP_PORT=465  # or 587
```

## 🧪 Testing

Test your email configuration:

```bash
npx ts-node scripts/test-email-service.ts
```

This will send test emails to your configured email address.

## 📨 Email Types

### Order Confirmation Email
- Sent automatically after successful HeartCoin purchases
- Includes order details, HeartCoin amount, and shipping info (for physical items)
- Responsive design with HEARTVERSE branding

### Shipping Notification Email
- Sent when physical orders are shipped
- Includes tracking information and estimated delivery
- Can be triggered via admin interface or API

## 🔧 API Endpoints

### Send Order Confirmation
```bash
POST /api/orders/send-confirmation
{
  "orderId": "12345",
  "shippingInfo": { ... }  # Optional, for physical items
}
```

### Send Shipping Notification
```bash
POST /api/orders/send-shipping-notification
{
  "orderId": "12345",
  "trackingNumber": "1Z999AA1234567890",
  "shippingCarrier": "UPS",
  "estimatedDelivery": "2024-01-15"
}
```

## 🎨 Email Templates

The email templates are defined in `lib/emailService.ts` and include:

- **HEARTVERSE branding** with gradient headers
- **Dark theme** to match the site aesthetic
- **Responsive design** for mobile and desktop
- **Order details** with HeartCoin amounts
- **Shipping information** for physical items
- **Call-to-action buttons** linking back to the site

## 🔍 Troubleshooting

### Common Issues

1. **"Authentication failed"**
   - Verify your email and app password
   - Ensure 2FA is enabled for Gmail
   - Check that the app password is correctly set

2. **"Connection refused"**
   - Verify SMTP host and port
   - Check firewall/network restrictions
   - Try different ports (465, 587, 25)

3. **Emails not being received**
   - Check spam/junk folder
   - Verify the recipient email address
   - Check email provider's sending limits

### Debug Mode

Enable debug logging by setting:

```bash
NODE_ENV=development
```

This will log detailed email sending information to the console.

## 🔒 Security Best Practices

1. **Use App Passwords**: Never use your main email password
2. **Environment Variables**: Keep SMTP credentials in environment variables, never commit to code
3. **Rate Limiting**: Consider implementing rate limiting for email endpoints
4. **Validation**: Always validate email addresses before sending

## 🎯 Admin Interface

Use the `ShippingNotificationPanel` component to manually send shipping notifications:

```tsx
import ShippingNotificationPanel from '@/components/admin/ShippingNotificationPanel';

<ShippingNotificationPanel
  orderId="12345"
  itemName="HEARTVERSE Hat"
  customerName="John Doe"
  onNotificationSent={() => console.log('Email sent!')}
/>
```

## 🚀 Production Deployment

For production:

1. **Use a dedicated email service** (SendGrid, Mailgun, AWS SES)
2. **Set up proper DNS records** (SPF, DKIM, DMARC)
3. **Monitor email delivery rates**
4. **Implement retry logic** for failed sends
5. **Set up email bounce handling**

---

**Need help?** Check the console logs for detailed error messages or reach out for support!