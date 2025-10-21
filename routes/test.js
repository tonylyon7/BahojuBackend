import express from 'express';
import { sendEmail, testEmailConfiguration } from '../utils/emailService.js';

const router = express.Router();

// Test email configuration
router.get('/email-config', async (req, res) => {
  try {
    const isConfigured = await testEmailConfiguration();
    
    res.json({
      success: true,
      emailConfigured: isConfigured,
      message: isConfigured 
        ? 'Email service is properly configured' 
        : 'Email service not configured - using mock emails',
      environment: {
        EMAIL_USER: process.env.EMAIL_USER ? 'Set' : 'Not set',
        EMAIL_PASS: process.env.EMAIL_PASS ? 'Set' : 'Not set',
        EMAIL_SERVICE: process.env.EMAIL_SERVICE || 'gmail',
        EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing email configuration',
      error: error.message
    });
  }
});

// Test sending an email
router.post('/send-test-email', async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    const result = await sendEmail({
      to,
      subject: 'Test Email from Bahoju Tech',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #0573A0 0%, #15C4DB 100%); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Test Email</h1>
          </div>
          <div style="padding: 40px; background: #f8f9fa;">
            <h2 style="color: #333; margin-bottom: 20px;">Email Service Test</h2>
            <p style="color: #666; line-height: 1.6;">
              This is a test email to verify that the Bahoju Tech email service is working correctly.
            </p>
            <p style="color: #666; line-height: 1.6;">
              <strong>Sent at:</strong> ${new Date().toLocaleString()}
            </p>
          </div>
        </div>
      `,
      text: 'This is a test email from Bahoju Tech email service.'
    });

    res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId,
      isMock: result.messageId && result.messageId.startsWith('mock-')
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

export default router;
