#!/usr/bin/env node

/**
 * Test script for email service
 * Usage: npx ts-node scripts/test-email-service.ts
 * 
 * Make sure to set up your SMTP environment variables in .env.local:
 * SMTP_HOST=smtp.gmail.com
 * SMTP_PORT=587
 * SMTP_USER=your_email@gmail.com
 * SMTP_PASS=your_app_password
 * SMTP_FROM=noreply@chxndler.world
 */

import dotenv from 'dotenv';
import { emailService } from '../lib/emailService';
import type { OrderConfirmationData, ShippingNotificationData } from '../lib/emailService';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function testEmailService() {
  console.log('🧪 Testing HEARTVERSE Email Service\n');

  // Check if SMTP configuration is present
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ SMTP configuration missing!');
    console.log('Please set up your SMTP environment variables in .env.local:');
    console.log('SMTP_HOST=smtp.gmail.com');
    console.log('SMTP_PORT=587');
    console.log('SMTP_USER=your_email@gmail.com');
    console.log('SMTP_PASS=your_app_password');
    console.log('SMTP_FROM=noreply@chxndler.world');
    process.exit(1);
  }

  // Test data for order confirmation
  const orderConfirmationData: OrderConfirmationData = {
    orderId: 'TEST_123456',
    customerName: 'Test User',
    customerEmail: process.env.SMTP_USER!, // Send to yourself for testing
    itemName: 'HEARTVERSE Test Item',
    heartCoinsSpent: 20,
    isPhysicalItem: true,
    shippingAddress: {
      fullName: 'Test User',
      addressLine1: '123 Test Street',
      addressLine2: 'Apt 4B',
      city: 'Test City',
      state: 'TS',
      zip: '12345',
      country: 'United States'
    }
  };

  // Test data for shipping notification
  const shippingNotificationData: ShippingNotificationData = {
    orderId: 'TEST_123456',
    customerName: 'Test User',
    customerEmail: process.env.SMTP_USER!, // Send to yourself for testing
    itemName: 'HEARTVERSE Test Item',
    trackingNumber: 'TEST1234567890',
    shippingCarrier: 'USPS',
    estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString() // 7 days from now
  };

  console.log('📧 Testing Order Confirmation Email...');
  try {
    const confirmationSent = await emailService.sendOrderConfirmation(orderConfirmationData);
    if (confirmationSent) {
      console.log('✅ Order confirmation email sent successfully!');
    } else {
      console.log('❌ Order confirmation email failed to send');
    }
  } catch (error) {
    console.error('❌ Order confirmation email error:', error);
  }

  console.log('\n🚚 Testing Shipping Notification Email...');
  try {
    const shippingSent = await emailService.sendShippingNotification(shippingNotificationData);
    if (shippingSent) {
      console.log('✅ Shipping notification email sent successfully!');
    } else {
      console.log('❌ Shipping notification email failed to send');
    }
  } catch (error) {
    console.error('❌ Shipping notification email error:', error);
  }

  console.log('\n🎉 Email service testing complete!');
  console.log(`Check your inbox at ${process.env.SMTP_USER} for the test emails.`);
}

// Run the test
testEmailService().catch((error) => {
  console.error('💥 Test script error:', error);
  process.exit(1);
});