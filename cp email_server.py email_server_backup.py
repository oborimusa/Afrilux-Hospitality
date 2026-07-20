from flask import Flask, request, jsonify
from flask_cors import CORS
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

app = Flask(__name__)
CORS(app)  # Allow frontend to call this API

# ========== EMAIL CONFIGURATION ==========
# Replace with your email details
SMTP_SERVER = "smtp.gmail.com"  # For Gmail
SMTP_PORT = 587
EMAIL_ADDRESS = "your_email@gmail.com"  # Your sending email
EMAIL_PASSWORD = "your_app_password"  # App password (not regular password)

# For other email providers:
# Gmail: smtp.gmail.com, port 587
# Yahoo: smtp.mail.yahoo.com, port 587
# Outlook: smtp-mail.outlook.com, port 587

def send_job_application_email(application_data):
    """
    Send job application email to recruiter
    """
    try:
        # Create email
        msg = MIMEMultipart()
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = "acquire@jobpitality.com"  # Your recruitment email
        msg['Subject'] = f"New Job Application: {application_data['job_title']} at {application_data['company']}"
        
        # Email body
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2 style="color: #ff9e00;">New Job Application Received</h2>
            
            <p>You have received a new job application from Jobpitality.</p>
            
            <h3>Candidate Details:</h3>
            <table style="border-collapse: collapse; width: 100%;">
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Name:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{application_data['from_name']}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{application_data['from_email']}</td>
                </tr>
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Phone:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{application_data['phone']}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Qualification:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{application_data['qualification']}</td>
                </tr>
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Experience:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{application_data['experience']}</td>
                </tr>
            </table>
            
            <h3>Job Details:</h3>
            <table style="border-collapse: collapse; width: 100%;">
                <tr style="background-color: #f2f2f2;">
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Position:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{application_data['job_title']}</td>
                </tr>
                <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;"><strong>Company:</strong></td>
                    <td style="padding: 8px; border: 1px solid #ddd;">{application_data['company']}</td>
                </tr>
            </table>
            
            <h3>Message from Candidate:</h3>
            <p style="background-color: #f9f9f9; padding: 10px; border-left: 3px solid #ff9e00;">
                {application_data['message']}
            </p>
            
            <hr>
            <p style="font-size: 12px; color: #666;">
                This application was submitted via Jobpitality website.
                <br>Date: {application_data.get('date', 'N/A')}
            </p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Send email
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.send_message(msg)
        
        # Also send confirmation to applicant
        send_confirmation_email(application_data)
        
        return True, "Email sent successfully"
        
    except Exception as e:
        print(f"Error sending email: {e}")
        return False, str(e)

def send_confirmation_email(application_data):
    """
    Send confirmation email to the applicant
    """
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_ADDRESS
        msg['To'] = application_data['from_email']
        msg['Subject'] = f"Application Received - {application_data['job_title']} at {application_data['company']}"
        
        body = f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2 style="color: #ff9e00;">Application Received!</h2>
            
            <p>Dear {application_data['from_name']},</p>
            
            <p>Thank you for applying for the <strong>{application_data['job_title']}</strong> position at <strong>{application_data['company']}</strong>.</p>
            
            <p>We have received your application and our recruitment team will review it shortly.</p>
            
            <p><strong>Next Steps:</strong></p>
            <ul>
                <li>We will review your application within 2-3 business days</li>
                <li>If shortlisted, you will be contacted for an interview</li>
                <li>Check your email regularly for updates</li>
            </ul>
            
            <p>If you have any questions, please contact us at acquire@jobpitality.com or call +234 803 966 1354.</p>
            
            <br>
            <p>Best regards,<br>
            <strong>Jobpitality Recruitment Team</strong></p>
            
            <hr>
            <p style="font-size: 12px; color: #666;">
                This is an automated confirmation. Please do not reply directly to this email.
            </p>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_ADDRESS, EMAIL_PASSWORD)
            server.send_message(msg)
            
    except Exception as e:
        print(f"Error sending confirmation: {e}")

# ========== API ENDPOINT ==========
@app.route('/api/submit-application', methods=['POST'])
def submit_application():
    try:
        data = request.json
        
        # Add date to data
        from datetime import datetime
        data['date'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Send email
        success, message = send_job_application_email(data)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Application submitted successfully!'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': message
            }), 500
            
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'OK', 'message': 'Email server is running'}), 200

# ========== RUN SERVER ==========
if __name__ == '__main__':
    print("=" * 50)
    print("📧 Jobpitality Email Server")
    print("=" * 50)
    print(f"SMTP Server: {SMTP_SERVER}")
    print(f"Email: {EMAIL_ADDRESS}")
    print("Server running on http://localhost:5000")
    print("POST to http://localhost:5000/api/submit-application")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True)