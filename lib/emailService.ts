import type { Transporter } from 'nodemailer';

export interface OrderConfirmationData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  itemName: string;
  heartCoinsSpent: number;
  shippingAddress?: {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  isPhysicalItem: boolean;
}

export interface ShippingNotificationData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  itemName: string;
  trackingNumber?: string;
  shippingCarrier?: string;
  estimatedDelivery?: string;
}

class EmailService {
  private transporter: Transporter | null = null;

  private async getTransporter(): Promise<Transporter> {
    if (!this.transporter) {
      // Dynamically import nodemailer to avoid build-time issues
      const nodemailer = await import('nodemailer');
      this.transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  async sendOrderConfirmation(orderData: OrderConfirmationData): Promise<boolean> {
    try {
      const { subject, html } = this.generateOrderConfirmationEmail(orderData);
      const transporter = await this.getTransporter();

      await transporter.sendMail({
        from: `"HEARTVERSE Store" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: orderData.customerEmail,
        subject,
        html,
      });

      if (process.env.NODE_ENV !== "production") console.log(`Order confirmation email sent to ${orderData.customerEmail} for order ${orderData.orderId}`);
      return true;
    } catch (error) {
      console.error('Failed to send order confirmation email:', error);
      return false;
    }
  }

  async sendShippingNotification(shippingData: ShippingNotificationData): Promise<boolean> {
    try {
      const { subject, html } = this.generateShippingNotificationEmail(shippingData);
      const transporter = await this.getTransporter();

      await transporter.sendMail({
        from: `"HEARTVERSE Store" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: shippingData.customerEmail,
        subject,
        html,
      });

      if (process.env.NODE_ENV !== "production") console.log(`Shipping notification email sent to ${shippingData.customerEmail} for order ${shippingData.orderId}`);
      return true;
    } catch (error) {
      console.error('Failed to send shipping notification email:', error);
      return false;
    }
  }

  private generateOrderConfirmationEmail(orderData: OrderConfirmationData) {
    const subject = `Order Confirmation #${orderData.orderId} - HEARTVERSE Store`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #0a0a0a;
              color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #4ECDC4, #FC54AF);
              padding: 30px 20px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .header h1 {
              margin: 0;
              color: #000;
              font-size: 28px;
              font-weight: bold;
              text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            .content {
              background-color: #1a1a1a;
              padding: 30px;
              border-radius: 0 0 10px 10px;
              border: 1px solid #333;
            }
            .order-details {
              background-color: #2a2a2a;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border: 1px solid #444;
            }
            .item-info {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 15px;
              background-color: #333;
              border-radius: 8px;
              margin: 10px 0;
            }
            .heartcoin {
              color: #F2EF1D;
              font-weight: bold;
              font-size: 18px;
            }
            .shipping-address {
              background-color: #2a2a2a;
              padding: 15px;
              border-radius: 8px;
              margin: 15px 0;
              border-left: 4px solid #4ECDC4;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding: 20px;
              color: #888;
              font-size: 14px;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #4ECDC4, #45b7b8);
              color: #000;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 25px;
              font-weight: bold;
              margin: 20px 0;
            }
            .highlight {
              color: #4ECDC4;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🎵 HEARTVERSE</h1>
            <p style="margin: 10px 0 0 0; color: #000; font-weight: bold;">Order Confirmation</p>
          </div>
          
          <div class="content">
            <h2>Thank you for your purchase, ${orderData.customerName}!</h2>
            <p>Your order has been successfully placed and is being processed. You're now part of the HEARTVERSE community!</p>
            
            <div class="order-details">
              <h3>Order Details</h3>
              <p><strong>Order ID:</strong> <span class="highlight">#${orderData.orderId}</span></p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
              
              <div class="item-info">
                <div>
                  <strong>${orderData.itemName}</strong>
                  <br>
                  <small>${orderData.isPhysicalItem ? 'Physical Item' : 'Digital Item'}</small>
                </div>
                <div class="heartcoin">
                  ${orderData.heartCoinsSpent} ♡
                </div>
              </div>
            </div>

            ${orderData.shippingAddress ? `
              <div class="order-details">
                <h3>Shipping Information</h3>
                <div class="shipping-address">
                  <strong>${orderData.shippingAddress.fullName}</strong><br>
                  ${orderData.shippingAddress.addressLine1}<br>
                  ${orderData.shippingAddress.addressLine2 ? orderData.shippingAddress.addressLine2 + '<br>' : ''}
                  ${orderData.shippingAddress.city}, ${orderData.shippingAddress.state} ${orderData.shippingAddress.zip}<br>
                  ${orderData.shippingAddress.country}
                </div>
                <p><em>We'll send you a shipping confirmation email with tracking information once your order ships.</em></p>
              </div>
            ` : `
              <div class="order-details">
                <h3>Digital Item</h3>
                <p>Your digital item has been added to your HEARTVERSE collection and is available immediately in your account.</p>
              </div>
            `}

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://chxndler.world'}" class="cta-button">
                Visit HEARTVERSE
              </a>
            </div>

            <p>Questions? Reply to this email and we'll help you out.</p>
            <p style="color: #4ECDC4; font-weight: bold;">Welcome to the HEARTVERSE family! 💙</p>
          </div>

          <div class="footer">
            <p>This email was sent by HEARTVERSE Store</p>
            <p>If you have any questions, please contact us at ${process.env.SMTP_FROM || 'support@chxndler.world'}</p>
          </div>
        </body>
      </html>
    `;

    return { subject, html };
  }

  private generateShippingNotificationEmail(shippingData: ShippingNotificationData) {
    const subject = `Your HEARTVERSE order is on its way! #${shippingData.orderId}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #0a0a0a;
              color: #ffffff;
            }
            .header {
              background: linear-gradient(135deg, #FC54AF, #4ECDC4);
              padding: 30px 20px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .header h1 {
              margin: 0;
              color: #000;
              font-size: 28px;
              font-weight: bold;
              text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            .content {
              background-color: #1a1a1a;
              padding: 30px;
              border-radius: 0 0 10px 10px;
              border: 1px solid #333;
            }
            .tracking-info {
              background-color: #2a2a2a;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border: 1px solid #444;
              text-align: center;
            }
            .tracking-number {
              font-size: 20px;
              font-weight: bold;
              color: #4ECDC4;
              margin: 10px 0;
            }
            .cta-button {
              display: inline-block;
              background: linear-gradient(135deg, #FC54AF, #e91e63);
              color: #fff;
              padding: 12px 30px;
              text-decoration: none;
              border-radius: 25px;
              font-weight: bold;
              margin: 20px 0;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding: 20px;
              color: #888;
              font-size: 14px;
            }
            .highlight {
              color: #FC54AF;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📦 HEARTVERSE</h1>
            <p style="margin: 10px 0 0 0; color: #000; font-weight: bold;">Shipping Notification</p>
          </div>
          
          <div class="content">
            <h2>Great news, ${shippingData.customerName}!</h2>
            <p>Your HEARTVERSE order <span class="highlight">#${shippingData.orderId}</span> has shipped and is on its way to you!</p>
            
            <div class="tracking-info">
              <h3>Tracking Information</h3>
              <p><strong>Item:</strong> ${shippingData.itemName}</p>
              ${shippingData.trackingNumber ? `
                <p><strong>Tracking Number:</strong></p>
                <div class="tracking-number">${shippingData.trackingNumber}</div>
                ${shippingData.shippingCarrier ? `<p><strong>Carrier:</strong> ${shippingData.shippingCarrier}</p>` : ''}
              ` : ''}
              ${shippingData.estimatedDelivery ? `
                <p><strong>Estimated Delivery:</strong> ${shippingData.estimatedDelivery}</p>
              ` : ''}
            </div>

            ${shippingData.trackingNumber ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="#" class="cta-button">Track Your Package</a>
              </div>
            ` : ''}

            <p>Your order will arrive soon! Keep an eye out for the delivery.</p>
            <p>Questions about your shipment? Reply to this email and we'll help you track it down.</p>
            <p style="color: #FC54AF; font-weight: bold;">Thanks for being part of the HEARTVERSE! 💫</p>
          </div>

          <div class="footer">
            <p>This email was sent by HEARTVERSE Store</p>
            <p>If you have any questions, please contact us at ${process.env.SMTP_FROM || 'support@chxndler.world'}</p>
          </div>
        </body>
      </html>
    `;

    return { subject, html };
  }
}

// Export a singleton instance
export const emailService = new EmailService();